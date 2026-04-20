from datetime import date, datetime
from enum import StrEnum
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .keywords import KeywordMatcher


class SearchSort(StrEnum):
    RELEVANCE = "relevance"
    FRESHNESS = "freshness"


class SearchDateRange(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_date: date | None = Field(default=None, alias="from")
    to_date: date | None = Field(default=None, alias="to")

    @model_validator(mode="after")
    def validate_range(self) -> Self:
        if (
            self.from_date is not None
            and self.to_date is not None
            and self.from_date > self.to_date
        ):
            raise ValueError("Дата начала не может быть позже даты окончания")
        return self


class SearchPriceFilter(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    is_specified: bool | None = None
    currency: list[str] = Field(default_factory=list)
    min_amount: int | None = Field(default=None, alias="min")
    max_amount: int | None = Field(default=None, alias="max")

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, value: str | list[str] | None) -> list[str]:
        if value is None:
            return []

        if isinstance(value, list):
            raw_items = value

        else:
            raw_items = str(value).split(",")

        normalized_items: list[str] = []

        for item in raw_items:
            normalized = str(item).strip().upper()

            if normalized and normalized not in normalized_items:
                normalized_items.append(normalized)

        return normalized_items

    @field_validator("min_amount", "max_amount")
    @classmethod
    def validate_amount(cls, value: int | None) -> int | None:
        if value is None:
            return None

        if value < 0:
            raise ValueError("Сумма не может быть отрицательной")

        return value

    @model_validator(mode="after")
    def validate_price(self) -> Self:
        if (
            self.min_amount is not None
            and self.max_amount is not None
            and self.min_amount > self.max_amount
        ):
            raise ValueError("Минимальная цена не может быть больше максимальной")

        if self.is_specified is False and (
            self.currency or self.min_amount is not None or self.max_amount is not None
        ):
            raise ValueError(
                "Фильтры валюты и суммы нельзя использовать вместе с is_specified=false"
            )

        return self


class SearchParams(BaseModel):
    model_config = ConfigDict(use_enum_values=True, populate_by_name=True)

    query: str = ""
    keywords: str = ""
    sort: SearchSort = SearchSort.RELEVANCE
    published_at: SearchDateRange = Field(default_factory=SearchDateRange)
    collected_at: SearchDateRange = Field(default_factory=SearchDateRange)
    price: SearchPriceFilter = Field(default_factory=SearchPriceFilter)
    source: list[str] = Field(default_factory=list)
    is_deleted: bool = False
    similarity_threshold: float = 0.7
    limit: int = 20
    offset: int = 0

    @model_validator(mode="before")
    @classmethod
    def normalize_legacy_filters(cls, value: object) -> object:
        if not isinstance(value, dict):
            return value

        payload = dict(value)

        published_at = cls.__extract_nested_filter(payload, "published_at")
        cls.__set_nested_value(published_at, "from", payload.pop("from_date", None))
        cls.__set_nested_value(published_at, "from", payload.pop("published_from", None))
        cls.__set_nested_value(published_at, "to", payload.pop("to_date", None))
        cls.__set_nested_value(published_at, "to", payload.pop("published_to", None))
        payload["published_at"] = published_at

        collected_at = cls.__extract_nested_filter(payload, "collected_at")
        cls.__set_nested_value(collected_at, "from", payload.pop("collected_from", None))
        cls.__set_nested_value(collected_at, "to", payload.pop("collected_to", None))
        payload["collected_at"] = collected_at

        price = cls.__extract_nested_filter(payload, "price")
        cls.__set_nested_value(price, "is_specified", payload.pop("price_is_specified", None))
        cls.__set_nested_value(price, "currency", payload.pop("price_currency", None))
        cls.__set_nested_value(price, "min", payload.pop("price_min", None))
        cls.__set_nested_value(price, "max", payload.pop("price_max", None))
        payload["price"] = price

        return payload

    @field_validator("query", "keywords")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("keywords")
    @classmethod
    def validate_keywords(cls, value: str) -> str:
        if value:
            KeywordMatcher.validate_expression(value)
        return value

    @field_validator("source", mode="before")
    @classmethod
    def normalize_source(cls, value: str | list[str] | None) -> list[str]:
        if value is None:
            return []

        if isinstance(value, list):
            raw_items = value
        else:
            raw_items = str(value).split(",")

        normalized_items: list[str] = []

        for item in raw_items:
            normalized = str(item).strip()

            if normalized and normalized not in normalized_items:
                normalized_items.append(normalized)

        return normalized_items

    @field_validator("similarity_threshold")
    @classmethod
    def validate_similarity_threshold(cls, value: float) -> float:
        if value < 0 or value > 1:
            raise ValueError("similarity_threshold должен быть в диапазоне от 0 до 1")

        return value

    @field_validator("limit")
    @classmethod
    def validate_limit(cls, value: int) -> int:
        if value < 1:
            raise ValueError("limit должен быть больше 0")

        return min(value, 100)

    @field_validator("offset")
    @classmethod
    def validate_offset(cls, value: int) -> int:
        if value < 0:
            raise ValueError("offset должен быть больше или равен 0")

        return value

    @property
    def has_keywords(self) -> bool:
        return bool(self.keywords)

    @staticmethod
    def __extract_nested_filter(payload: dict[str, object], key: str) -> dict[str, object]:
        raw_value = payload.pop(key, None)

        if raw_value is None:
            return {}

        if isinstance(raw_value, dict):
            return dict(raw_value)

        raise ValueError(f"Фильтр {key} должен быть объектом")

    @staticmethod
    def __set_nested_value(
        target: dict[str, object],
        key: str,
        value: object,
    ) -> None:
        if value is not None and key not in target:
            target[key] = value


class SearchResultItem(BaseModel):
    id: int
    source: str
    source_base_url: str
    title: str
    description: str
    url: str
    price: int | None
    price_currency: str
    published_at: datetime | None
    collected_at: datetime
    is_deleted: bool
    cleaned_text: str
    similarity: float | None


class SearchResult(BaseModel):
    total: int
    limit: int
    offset: int
    sort: SearchSort
    query: str
    applied_filters: dict[str, object]
    items: list[SearchResultItem]
