from django.db import models
from django.utils import timezone


class Post(models.Model):
    """
    Example rows from the draft dataset:

    id,title,description,price_currency,url,source,published_at,content_hash,price,is_deleted
    1,"Архитектор ИИ-интеграций / Senior AI Engineer (Node.js, Claude)","Ищем Senior-разработчика...",,"https://www.freelancejob.ru/vacancy/76882/",freelancejob.ru,2026-04-12 05:08:40,4a4ec1f67b91853417773cb1a3645eac,,0
    2,"питон скрипт","написать питон скрипт",,"https://www.freelancejob.ru/vacancy/76876/",freelancejob.ru,2026-04-12 05:08:40,35d0056af78354caa17f94d73f8a6862,,0
    3,"Настроить создание сделок из тильды в AmoCRM используя сервис ApiMonster","Настроить создание сделок...",RUB,"https://www.freelancejob.ru/vacancy/76866/",freelancejob.ru,2026-04-12 05:08:40,5eb30c46db78ff40a503c315a95d1d63,10000,0
    """

    source = models.ForeignKey(
        "datasets.Source",
        verbose_name="Источник",
        related_name="posts",
        on_delete=models.CASCADE,
    )
    title = models.CharField("Заголовок", max_length=512)
    description = models.TextField("Описание", blank=True)
    url = models.URLField("URL", max_length=500)
    price = models.PositiveIntegerField("Цена", null=True, blank=True)
    price_currency = models.CharField("Валюта", max_length=8, blank=True)
    content_hash = models.CharField("Хэш контента", max_length=64, blank=True, db_index=True)
    published_at = models.DateTimeField("Опубликовано", null=True, blank=True, db_index=True)
    collected_at = models.DateTimeField("Собрано", default=timezone.now, db_index=True)
    is_deleted = models.BooleanField("Удалено", default=False, db_index=True)

    class Meta:
        db_table = "dataset_posts"
        verbose_name = "Пост"
        verbose_name_plural = "Посты"
        ordering = ("-published_at", "-id")
        constraints = [
            models.UniqueConstraint(
                fields=("source", "url"),
                name="uniq_post_source_url",
            )
        ]
        indexes = [
            models.Index(fields=("-published_at", "-id"), name="idx_post_published_at"),
            models.Index(fields=("source", "is_deleted"), name="idx_post_is_deleted"),
            models.Index(fields=("price",), name="idx_post_price"),
        ]

    def __str__(self) -> str:
        return self.title
