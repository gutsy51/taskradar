from django.contrib import admin

from datasets.models import Post, PostVector, Source


@admin.register(Source)
class SourceAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "base_url", "is_active", "updated_at")
    list_display_links = ("id", "name")
    list_filter = ("is_active",)
    search_fields = ("name", "base_url")
    ordering = ("name",)


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "source",
        "title",
        "price",
        "price_currency",
        "published_at",
        "is_deleted",
    )
    list_display_links = ("id", "title")
    list_filter = ("source", "is_deleted")
    search_fields = ("title", "description", "url", "content_hash")
    ordering = ("-published_at", "-id")


@admin.register(PostVector)
class PostVectorAdmin(admin.ModelAdmin):
    list_display = ("id", "post", "published_at")
    list_display_links = ("id", "post")
    search_fields = ("post__title", "post__url", "cleaned_text")
    raw_id_fields = ("post",)
    ordering = ("-published_at", "-id")
