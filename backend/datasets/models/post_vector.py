from django.db import models
from pgvector.django import HnswIndex, VectorField


class PostVector(models.Model):
    post = models.OneToOneField(
        "datasets.Post",
        verbose_name="Пост",
        related_name="vector",
        on_delete=models.CASCADE,
    )
    cleaned_text = models.TextField("Очищенный текст", blank=True, default="")
    vector = VectorField("Вектор", dimensions=768, null=True, blank=True)
    published_at = models.DateTimeField("Дата публикации", null=True, blank=True, db_index=True)

    class Meta:
        db_table = "dataset_post_vectors"
        verbose_name = "Вектор поста"
        verbose_name_plural = "Векторы постов"
        ordering = ("-published_at", "-id")
        indexes = [
            models.Index(fields=("-published_at",), name="idx_post_vector_published_at"),
            HnswIndex(
                name="idx_post_vector_hnsw",
                fields=["vector"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
        ]

    def __str__(self) -> str:
        return f"vector:{self.post_id}"
