import tempfile
from pathlib import Path

from django.test import override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from .models import User, Company, Category, Ad, Application


class ApplicationCVTests(APITestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        override = override_settings(MEDIA_ROOT=directory.name)
        override.enable()
        self.addCleanup(override.disable)
        self.candidate = User.objects.create_user(email="candidate@example.com", password="test")
        self.recruiter = User.objects.create_user(email="recruiter@example.com", role="recruiter")
        company = Company.objects.create(name="Company", siret="12345678901234")
        category = Category.objects.create(name="IT", slug="it")
        self.ad = Ad.objects.create(title="Dev", company=company, recruiter=self.recruiter,
                                    category=category, contract_type="CDI")
        self.client.force_authenticate(self.candidate)
        self.payload = dict(first_name="Jane", last_name="Doe", email="candidate@example.com", message="Bonjour")

    def pdf(self, name="resume.pdf"):
        return SimpleUploadedFile(name, b"%PDF-1.4\nCV test", content_type="application/pdf")

    def apply(self, **extra):
        return self.client.post(f"/api/ads/{self.ad.pk}/apply", {**self.payload, **extra}, format="multipart")

    def test_upload_saves_file_and_profile_and_protects_download(self):
        response = self.apply(cv=self.pdf())
        self.assertEqual(response.status_code, 201, response.data)
        application = Application.objects.get()
        self.candidate.refresh_from_db()
        self.assertEqual(self.candidate.cv.name, application.cv.name)
        self.assertEqual(Path(application.cv.path).read_bytes(), b"%PDF-1.4\nCV test")
        url = response.data["cv_download_url"]
        for user in (self.candidate, self.recruiter):
            self.client.force_authenticate(user)
            download = self.client.get(url)
            self.assertEqual(download.status_code, 200)
            self.assertEqual(b"".join(download.streaming_content), b"%PDF-1.4\nCV test")
        other = User.objects.create_user(email="other@example.com", role="recruiter")
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(url).status_code, 401)

    def test_reuse_preserves_original_when_profile_changes(self):
        self.candidate.cv = self.pdf()
        self.candidate.save()
        original = self.candidate.cv.name
        response = self.apply(use_saved_cv="true")
        self.assertEqual(response.status_code, 201, response.data)
        self.candidate.cv = self.pdf("new.pdf")
        self.candidate.save()
        self.assertEqual(Application.objects.get().cv.name, original)

    def test_missing_saved_cv_and_conflicting_choices(self):
        self.assertEqual(self.apply(use_saved_cv="true").status_code, 400)
        self.assertEqual(self.apply(use_saved_cv="true", cv=self.pdf()).status_code, 400)
        self.assertFalse(Application.objects.exists())

    def test_invalid_and_oversize_files(self):
        for file in (self.pdf("resume.txt"), SimpleUploadedFile("fake.pdf", b"invalid"),
                     SimpleUploadedFile("big.pdf", b"%PDF-" + b"x" * (5 * 1024 * 1024))):
            self.assertEqual(self.apply(cv=file).status_code, 400)
        self.assertFalse(Application.objects.exists())

    def test_without_cv_and_duplicate(self):
        self.assertEqual(self.apply().status_code, 201)
        self.assertFalse(Application.objects.get().cv)
        self.assertEqual(self.apply(cv=self.pdf()).status_code, 400)
        self.candidate.refresh_from_db()
        self.assertFalse(self.candidate.cv)
