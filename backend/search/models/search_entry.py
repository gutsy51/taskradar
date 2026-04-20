import hashlib
import json
from typing import Any

from django.db import IntegrityError, models, transaction
from django.utils import timezone

from accounts.models import User


class SearchEntryManager(models.Manager["SearchEntry"]):
    def record_history(
        self, user: User, params_json: dict[str, Any], name: str = ""
    ) -> "SearchEntry":
        entry = self.model(
            user=user,
            params_json=params_json,
            name=name,
            is_saved=False,
        )
        entry.mark_executed()
        entry.save()
        return entry


class SearchEntry(models.Model):
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="search_entries",
        verbose_name="Пользователь",
    )
    name = models.CharField("Название", max_length=120, blank=True, default="")
    params_json = models.JSONField("Параметры поиска", default=dict, blank=True)
    params_hash = models.CharField("Хэш параметров", max_length=64, editable=False)
    is_saved = models.BooleanField("Сохранённый поиск", default=False)
    created_at = models.DateTimeField("Создано", default=timezone.now, db_index=True)
    executed_at = models.DateTimeField("Последний запуск", default=timezone.now, db_index=True)

    objects = SearchEntryManager()

    class Meta:
        db_table = "search_entries"
        verbose_name = "Поисковый запрос"
        verbose_name_plural = "Поисковые запросы"
        ordering = ("user_id", "-executed_at", "-id")
        constraints = [
            models.UniqueConstraint(
                fields=("user", "params_hash"),
                name="uniq_search_entry_user_params_hash",
            ),
        ]
        indexes = [
            models.Index(fields=("user", "-executed_at"), name="idx_search_entry_user_updated"),
            models.Index(fields=("user", "is_saved"), name="idx_search_entry_user_saved"),
        ]

    def mark_executed(self) -> None:
        self.executed_at = timezone.now()

    def mark_saved(self, name: str | None = None) -> None:
        self.name = name or self.name
        self.is_saved = True
        self.save()

    def save(self, *args: object, **kwargs: object) -> None:
        self.params_hash = self.__calculate_params_hash()
        self.updated_at = timezone.now()

        if self.user_id is None:
            super().save(*args, **kwargs)
            return

        try:
            with transaction.atomic():
                duplicate = self.__get_duplicate()

                if duplicate is not None:
                    self.__merge_duplicate(duplicate)

                super().save(*args, **kwargs)

        except IntegrityError:
            duplicate = self.__get_duplicate()
            if duplicate is None:
                raise

            self.__merge_duplicate(duplicate)
            super().save(*args, **kwargs)

    def __get_duplicate(self) -> "SearchEntry | None":
        queryset = SearchEntry.objects.select_for_update().filter(
            user_id=self.user_id,
            params_hash=self.params_hash,
        )

        if self.id is not None:
            queryset = queryset.exclude(id=self.id)

        return queryset.first()

    def __merge_duplicate(self, duplicate: "SearchEntry") -> None:
        self.id = duplicate.id
        self.created_at = duplicate.created_at
        self.is_saved = self.is_saved or duplicate.is_saved
        self.executed_at = self.executed_at or duplicate.executed_at

        if not self.name:
            self.name = duplicate.name

    def __calculate_params_hash(self) -> str:
        payload = self.params_json or {}
        serialized = json.dumps(
            payload,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            default=str,
        )

        return hashlib.blake2b(serialized.encode("utf-8"), digest_size=32).hexdigest()

    def __str__(self) -> str:
        return self.name or self.params_hash
