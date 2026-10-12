import tempfile
from pathlib import Path

from django.test import override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from .models import User, Company, Category, Ad, Application, Message


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


class ApplicationStatusTests(APITestCase):
    def setUp(self):
        self.recruiter = User.objects.create_user(email="rh@example.com", password="test", role="recruiter")
        self.candidate = User.objects.create_user(email="cand@example.com", password="test")
        company = Company.objects.create(name="Company", siret="12345678901234")
        category = Category.objects.create(name="IT", slug="it")
        ad = Ad.objects.create(title="Dev", company=company, recruiter=self.recruiter,
                               category=category, contract_type="CDI")
        self.application = Application.objects.create(candidate=self.candidate, ad=ad, message="Bonjour")
        self.url = f"/api/applications/{self.application.pk}/status"

    def test_recruiter_can_change_status(self):
        self.client.force_authenticate(self.recruiter)
        response = self.client.patch(self.url, {"status": "interview"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, "interview")
    
    def test_candidate_cannot_change_status(self):
        self.client.force_authenticate(self.candidate)
        response = self.client.patch(self.url, {"status": "accepted"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_invalid_status_is_rejected(self):
        self.client.force_authenticate(self.recruiter)
        response = self.client.patch(self.url, {"status": "nimportequoi"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_other_recruiter_gets_404(self):
        other = User.objects.create_user(email="autre@example.com", password="test", role="recruiter")
        self.client.force_authenticate(other)
        response = self.client.patch(self.url, {"status": "accepted"}, format="json")
        self.assertEqual(response.status_code, 404)

class MessageReadTests(APITestCase):
    def setUp(self):
        self.recruiter = User.objects.create_user(email="rh@example.com", password="test", role="recruiter")
        self.candidate = User.objects.create_user(email="cand@example.com", password="test")
        company = Company.objects.create(name="Company", siret="12345678901234")
        category = Category.objects.create(name="IT", slug="it")
        ad = Ad.objects.create(title="Dev", company=company, recruiter=self.recruiter,
                               category=category, contract_type="CDI")
        self.message = Message.objects.create(candidate=self.candidate, ad=ad,
                                              object="Candidature : Dev", content="Bonjour")
        self.url = f"/api/messages/{self.message.pk}/read"

    def test_recruiter_can_mark_message_read(self):
        self.client.force_authenticate(self.recruiter)
        response = self.client.patch(self.url)
        self.assertEqual(response.status_code, 200)
        self.message.refresh_from_db()
        self.assertEqual(self.message.status, "read")

    def test_candidate_cannot_mark_message_read(self):
        self.client.force_authenticate(self.candidate)
        response = self.client.patch(self.url)
        self.assertEqual(response.status_code, 403)

    def test_other_recruiter_gets_404(self):
        other = User.objects.create_user(email="autre@example.com", password="test", role="recruiter")
        self.client.force_authenticate(other)
        response = self.client.patch(self.url)
        self.assertEqual(response.status_code, 404)

class AdSearchTests(APITestCase):
    def setUp(self):
        recruiter = User.objects.create_user(email="rh@example.com", password="test", role="recruiter")
        company = Company.objects.create(name="Company", siret="12345678901234")
        category = Category.objects.create(name="IT", slug="it")
        Ad.objects.create(title="Dev Python", short_description="Poste de dev",
                          company=company, recruiter=recruiter, category=category, contract_type="CDI")
        Ad.objects.create(title="Comptable", short_description="Gestion des comptes",
                          company=company, recruiter=recruiter, category=category, contract_type="CDI")

    def test_search_finds_matching_ad(self):
        response = self.client.get("/api/ads?search=python")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Dev Python")

    def test_search_looks_in_description(self):
        response = self.client.get("/api/ads?search=gestion")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Comptable")

    def test_search_without_result_returns_empty_list(self):
        response = self.client.get("/api/ads?search=zzzz")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

class AdminApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(email="admin@example.com", role="admin")
        self.candidate = User.objects.create_user(email="candidate@example.com", role="candidate")
        Company.objects.create(name="Danone", siret="11111111111111")
        Company.objects.create(name="Ubisoft", siret="22222222222222")

    def test_anonymous_is_refused(self):
        self.assertEqual(self.client.get("/api/admin/companies").status_code, 401)

    def test_non_admin_is_refused(self):
        self.client.force_authenticate(self.candidate)
        self.assertEqual(self.client.get("/api/admin/companies").status_code, 403)

    def test_admin_lists_with_pagination(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/admin/companies?page_size=1")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIsNotNone(response.data["next"])

    def test_admin_creates_updates_deletes(self):
        self.client.force_authenticate(self.admin)
        data = {"name": "Nouvelle", "siret": "33333333333333", "city": "Lyon", "postal_code": "69000"}
        created = self.client.post("/api/admin/companies", data, format="json")
        self.assertEqual(created.status_code, 201, created.data)
        url = f"/api/admin/companies/{created.data['id']}"
        self.assertEqual(self.client.patch(url, {"city": "Paris"}, format="json").status_code, 200)
        self.assertEqual(Company.objects.get(pk=created.data["id"]).city, "Paris")
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertFalse(Company.objects.filter(pk=created.data["id"]).exists())

    def test_user_password_is_hidden_and_hashed(self):
        self.client.force_authenticate(self.admin)
        data = {"email": "new@example.com", "password": "motdepasse123", "role": "candidate",
                "city": "Nice", "postal_code": "06000"}
        response = self.client.post("/api/admin/users", data, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertNotIn("password", response.data)
        self.assertTrue(User.objects.get(email="new@example.com").check_password("motdepasse123"))