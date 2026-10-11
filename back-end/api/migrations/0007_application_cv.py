from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("api", "0005_squashed_0006")]
    operations = [
        migrations.AddField(
            model_name="application", name="cv",
            field=models.FileField(upload_to="cv/", blank=True, null=True),
        ),
    ]
