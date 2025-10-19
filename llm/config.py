from pydantic import BaseModel
import os

class Settings(BaseModel):
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    request_timeout: int = int(os.getenv("OLLAMA_TIMEOUT", "60"))
    remote_scrape_enabled: bool = os.getenv("OLLAMA_REMOTE_SCRAPE", "1") == "1"

settings = Settings()
