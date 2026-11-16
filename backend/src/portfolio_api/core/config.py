"""Configuration centralisée (variables d'environnement / .env)."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Portfolio Polyglotte API"
    debug: bool = False

    mongo_url: str = "mongodb://localhost:27018"
    mongo_db: str = "portfolio"

    neo4j_uri: str = "bolt://localhost:7688"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"

    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:8501"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
