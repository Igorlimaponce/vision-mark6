from typing import Any, Dict, Optional
from pydantic_settings import BaseSettings
from pydantic import validator


class Settings(BaseSettings):
    # Application
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AIOS - Sistema de Análise e Inteligência Operacional"
    VERSION: str = "2.0.0"
    
    # Database - Use env vars or defaults
    POSTGRES_SERVER: str = "db"  # Default to docker service name
    POSTGRES_USER: str = "postgres"  # Default to postgres user
    POSTGRES_PASSWORD: str = "change_this_secure_password"
    POSTGRES_DB: str = "aios_dev"  # Default to development db
    POSTGRES_PORT: str = "5432"
    
    # Also support DATABASE_URL override
    DATABASE_URL: Optional[str] = None
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        # Use DATABASE_URL from environment if available
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def ASYNC_SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # Celery
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""
    
    @validator("CELERY_BROKER_URL", pre=True)
    def assemble_celery_broker(cls, v: Optional[str], values: Dict[str, Any]) -> str:
        if isinstance(v, str) and v:
            return v
        return f"redis://{values.get('REDIS_HOST', 'localhost')}:{values.get('REDIS_PORT', 6379)}/{values.get('REDIS_DB', 0)}"
    
    @validator("CELERY_RESULT_BACKEND", pre=True)
    def assemble_celery_backend(cls, v: Optional[str], values: Dict[str, Any]) -> str:
        if isinstance(v, str) and v:
            return v
        return f"redis://{values.get('REDIS_HOST', 'localhost')}:{values.get('REDIS_PORT', 6379)}/{values.get('REDIS_DB', 0)}"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"]
    
    # WebSocket
    WEBSOCKET_HEARTBEAT_INTERVAL: int = 30
    
    # Video Processing
    MAX_CONCURRENT_STREAMS: int = 10
    RTSP_TIMEOUT: int = 10
    
    # Computer Vision
    YOLO_MODEL_PATH: str = "./models/yolov8n.pt"
    DETECTION_CONFIDENCE_THRESHOLD: float = 0.5
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
