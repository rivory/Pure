from typing import List
import os

from .config import settings
from .models import RemoteModel

_FALLBACK = [
    RemoteModel(slug="llama3.2:1b",   name="Llama 3.2 1B"),
    RemoteModel(slug="llama3.2:3b",   name="Llama 3.2 3B"),
    RemoteModel(slug="llama3.1:8b",   name="Llama 3.1 8B"),
    RemoteModel(slug="mistral:7b",    name="Mistral 7B"),
    RemoteModel(slug="qwen2.5:7b",    name="Qwen2.5 7B"),
    RemoteModel(slug="codellama:7b",  name="CodeLlama 7B"),
    RemoteModel(slug="phi3:3.8b",     name="Phi-3 3.8B"),
    RemoteModel(slug="llava:7b",      name="LLaVA 7B (vision)"),
    RemoteModel(slug="gemma2:9b",     name="Gemma 2 9B"),
]

DEFAULT_MODEL = os.getenv("deepseek-coder:1.3b")


def list_remote_models() -> List[RemoteModel]:
    if not settings.remote_scrape_enabled:
        return _FALLBACK

    try:
        import requests
        from bs4 import BeautifulSoup
        resp = requests.get("https://ollama.com/library", timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        models: List[RemoteModel] = []
        for a in soup.select("a[href^='/library/']"):
            href = a.get("href", "")
            parts = [p for p in href.split("/") if p]
            if len(parts) >= 2 and parts[0] == "library":
                base = parts[1]  # e.g. llama3.2
                name = a.get_text(strip=True) or base
                models.append(RemoteModel(slug=base, name=name, url=f"https://ollama.com{href}"))

        seen = set()
        uniq: List[RemoteModel] = []
        for m in models:
            if m.slug not in seen:
                uniq.append(m)
                seen.add(m.slug)
        return uniq or _FALLBACK

    except Exception:
        return _FALLBACK
