# Generated by Django 3.2.19 on 2023-07-13 21:12

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import posthog.models.utils


class Migration(migrations.Migration):

    dependencies = [
        ("posthog", "0336_alter_survey_type"),
    ]

    operations = [
        migrations.CreateModel(
            name="DataWarehouseView",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("deleted", models.BooleanField(blank=True, null=True)),
                (
                    "id",
                    models.UUIDField(
                        default=posthog.models.utils.UUIDT, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("name", models.CharField(max_length=128)),
                (
                    "columns",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Dict of all columns with Clickhouse type (including Nullable())",
                        null=True,
                    ),
                ),
                ("query", models.JSONField(blank=True, default=dict, help_text="HogQL query", null=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL
                    ),
                ),
                ("team", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="posthog.team")),
            ],
            options={
                "abstract": False,
            },
        ),
    ]
