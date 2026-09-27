from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    mongo_uri: str = "mongodb://localhost:27017"
    database_name: str = "task_manager"
    jwt_secret_key: str = "insecure-dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
