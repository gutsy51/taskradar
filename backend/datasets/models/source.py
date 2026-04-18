from django.db import models


class Source(models.Model):
    name = models.CharField("Название", max_length=100, unique=True)
    base_url = models.URLField("Базовый URL", max_length=255, unique=True)
    is_active = models.BooleanField("Активен", default=True)
    created_at = models.DateTimeField("Создан", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлён", auto_now=True)

    class Meta:
        db_table = "dataset_sources"
        verbose_name = "Источник"
        verbose_name_plural = "Источники"
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name
