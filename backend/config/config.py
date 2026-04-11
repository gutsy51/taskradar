from pathlib import Path
from typing import Annotated, Any

from pydantic import BaseModel, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent  # taskradar/backend/
REPO_DIR = BASE_DIR.parent  # taskradar/
LOG_DIR = BASE_DIR / "logs"
ENV_FILE = BASE_DIR / ".env"


class DjangoConfig(BaseModel):
    SECRET_KEY: SecretStr
    DEBUG: bool = True
    ALLOWED_HOSTS: Annotated[list[str], NoDecode] = Field(default_factory=list)

    @field_validator("ALLOWED_HOSTS", mode="before")
    @classmethod
    def parse_allowed_hosts(cls, value: Any) -> Any:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


class LoggingConfig(BaseModel):
    DEBUG_MODE: bool = False


class PostgresConfig(BaseModel):
    HOST: str
    PORT: int
    DB: str
    USER: SecretStr
    PASSWORD: SecretStr


class Config(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        env_nested_delimiter="_",
        env_nested_max_split=1,
        extra="ignore",
        frozen=True,
    )

    DJANGO: DjangoConfig
    LOGGING: LoggingConfig = Field(default_factory=LoggingConfig)
    POSTGRES: PostgresConfig

    BASE_DIR: Path = BASE_DIR
    REPO_DIR: Path = REPO_DIR
    LOG_DIR: Path = LOG_DIR
    ENV_FILE: Path = ENV_FILE


def _get_config() -> Config:
    """Возвращает объект конфигурации.

    Это решение, рекомендованное разработчиком pydantic_settings, подробнее:
    https://github.com/pydantic/pydantic/issues/3753#issuecomment-1087417884
    """
    return Config.model_validate({})


CONFIG: Config = _get_config()
