import json
from typing import Any, Dict, Iterable, Optional
import requests

from .config import settings

class OllamaClient:
    def __init__(self, base_url: Optional[str] = None, timeout: Optional[int] = None):
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self.timeout = timeout or settings.request_timeout

    def list_local_models(self) -> Dict[str, Any]:
        """
        GET /api/tags
        Returns JSON with installed models.
        """
        url = f"{self.base_url}/api/tags"
        r = requests.get(url, timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def pull(self, model: str, stream: bool = True) -> Iterable[Dict[str, Any]]:
        """
        POST /api/pull {"model": "<name>"}
        Yields streaming JSON events until done.
        """
        url = f"{self.base_url}/api/pull"
        payload = {"model": model}
        with requests.post(url, json=payload, stream=True, timeout=self.timeout) as r:
            r.raise_for_status()
            for line in r.iter_lines(decode_unicode=True):
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    # some lines may be partial or blank; ignore
                    continue

    def generate(self, model: str, prompt: str, options: Optional[Dict[str, Any]] = None,
                 stream: bool = False) -> Iterable[str] | str:
        """
        POST /api/generate with streaming or one-shot.
        Returns either a string (non-stream) or an iterator yielding chunks.
        """
        url = f"{self.base_url}/api/generate"
        payload = {"model": model, "prompt": prompt}
        if options:
            payload["options"] = options

        if stream:
            payload["stream"] = True
            def _gen():
                with requests.post(url, json=payload, stream=True, timeout=self.timeout) as r:
                    r.raise_for_status()
                    for line in r.iter_lines(decode_unicode=True):
                        if not line:
                            continue
                        try:
                            msg = json.loads(line)
                            chunk = msg.get("response")
                            if chunk:
                                yield chunk
                        except json.JSONDecodeError:
                            continue
            return _gen()

        # non-stream
        payload["stream"] = False
        r = requests.post(url, json=payload, timeout=self.timeout)
        r.raise_for_status()
        data = r.json()
        return data.get("response", "")

    # ----- CHAT COMPLETIONS -----
    def chat(self, model: str, messages: list[dict], options: Optional[Dict[str, Any]] = None,
             stream: bool = False) -> Iterable[str] | str:
        """
        POST /api/chat
        messages: [{"role":"system|user|assistant","content":"..."}]
        """
        url = f"{self.base_url}/api/chat"
        payload = {"model": model, "messages": messages}
        if options:
            payload["options"] = options

        if stream:
            payload["stream"] = True
            def _gen():
                with requests.post(url, json=payload, stream=True, timeout=self.timeout) as r:
                    r.raise_for_status()
                    for line in r.iter_lines(decode_unicode=True):
                        if not line:
                            continue
                        try:
                            msg = json.loads(line)
                            delta = msg.get("message", {}).get("content", "")
                            if delta:
                                yield delta
                        except json.JSONDecodeError:
                            continue
            return _gen()

        payload["stream"] = False
        r = requests.post(url, json=payload, timeout=self.timeout)
        r.raise_for_status()
        data = r.json()
        return data.get("message", {}).get("content", "")
