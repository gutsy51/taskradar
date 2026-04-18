from django.db import models


class PostVector(models.Model):
    post = models.OneToOneField(
        "datasets.Post",
        verbose_name="Пост",
        related_name="vector",
        on_delete=models.CASCADE,
    )
    cleaned_text = models.TextField("Очищенный текст", blank=True, default="")
    vector = models.JSONField("Вектор", null=True, blank=True)
    published_at = models.DateTimeField(
        "Дата публикации поста", null=True, blank=True, db_index=True
    )

    class Meta:
        db_table = "dataset_post_vectors"
        verbose_name = "Вектор поста"
        verbose_name_plural = "Векторы постов"
        ordering = ("-published_at", "-id")
        indexes = [
            models.Index(fields=("-published_at",), name="idx_post_vector_published_at"),
        ]

        #     __table_args__ = (
        #         Index('idx_post_date', 'post_date'),
        #         Index(
        #             'ix_vector_embeddings_hnsw',
        #             'embedding',
        #             postgresql_using='hnsw',
        #             postgresql_with={'m': 16, 'ef_construction': 64},
        #             postgresql_ops={'embedding': 'vector_cosine_ops'},
        #         ),
        #     )

    def __str__(self) -> str:
        return f"vector:{self.post_id}"
