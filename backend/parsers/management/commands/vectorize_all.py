from django.core.management.base import BaseCommand

from datasets.models import Post, PostVector
from parsers.vectorizer import build_cleaned_text, get_model


class Command(BaseCommand):
    help = "Векторизует все посты которые ещё не имеют вектора"

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch-size",
            type=int,
            default=128,
            help="Размер батча (по умолчанию 128)",
        )

    def handle(self, *args, **options):
        batch_size = options["batch_size"]

        total_pending = (
            Post.objects.filter(is_deleted=False)
            .exclude(vector__isnull=False)
            .count()
        )

        if total_pending == 0:
            self.stdout.write(self.style.SUCCESS("Все посты уже векторизованы."))
            return

        self.stdout.write(f"Постов без вектора: {total_pending}. Батч: {batch_size}")

        model = get_model()
        vectorized_total = 0

        while True:
            posts = list(
                Post.objects.filter(is_deleted=False)
                .exclude(vector__isnull=False)
                .only("id", "title", "description", "published_at")[:batch_size]
            )
            if not posts:
                break

            texts = [build_cleaned_text(p.title, p.description) for p in posts]
            vectors = model.encode(
                texts,
                batch_size=32,
                show_progress_bar=False,
                normalize_embeddings=True,
            )

            PostVector.objects.bulk_create(
                [
                    PostVector(
                        post=post,
                        cleaned_text=text,
                        vector=vec.tolist(),
                        published_at=post.published_at,
                    )
                    for post, text, vec in zip(posts, texts, vectors)
                ],
                ignore_conflicts=True,
            )

            vectorized_total += len(posts)
            self.stdout.write(
                f"  {vectorized_total}/{total_pending} ({vectorized_total * 100 // total_pending}%)"
            )

        self.stdout.write(self.style.SUCCESS(f"Готово. Векторизовано: {vectorized_total}"))
