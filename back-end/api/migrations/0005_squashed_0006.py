from django.db import migrations, models


class Migration(migrations.Migration):
    # Keep the original files for databases that already recorded these migrations.
    replaces = [
        ("api", "0005_application_email_application_first_name_and_more"),
        ("api", "0005_remove_application_one_application_per_ad_and_more"),
        ("api", "0006_category_slug_application_unique_candidate_ad"),
    ]

    dependencies = [
        ("api", "0004_user_city_user_postal_code_alter_company_city"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="application",
            name="one_application_per_ad",
        ),
        migrations.AddField(
            model_name="application",
            name="email",
            field=models.EmailField(default="", max_length=150),
        ),
        migrations.AddField(
            model_name="application",
            name="first_name",
            field=models.CharField(default="", max_length=150),
        ),
        migrations.AddField(
            model_name="application",
            name="last_name",
            field=models.CharField(default="", max_length=150),
        ),
        migrations.AddField(
            model_name="application",
            name="telephone",
            field=models.CharField(blank=True, default="", max_length=30),
        ),
        migrations.AddField(
            model_name="category",
            name="slug",
            field=models.SlugField(null=True, unique=True),
        ),
        migrations.AddConstraint(
            model_name="application",
            constraint=models.UniqueConstraint(
                fields=("candidate", "ad"), name="unique_candidate_ad",
            ),
        ),
    ]
