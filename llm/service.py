from typing import List, Optional, Dict, Any, Iterable

from .ollama_client import OllamaClient
from .models import ListLocalModelsResponse, LocalModelTag, ChatMessage, GenerateOptions, RemoteModel
from .remote_catalog import list_remote_models

_client = OllamaClient()

def list_local_models() -> ListLocalModelsResponse:
    raw = _client.list_local_models()
    models = [LocalModelTag(**m) for m in raw.get("models", [])]
    return ListLocalModelsResponse(models=models)

def list_remote_models_best_effort() -> List[RemoteModel]:
    return list_remote_models()

def pull_model(model: str) -> Iterable[Dict[str, Any]]:
    """
    Streams pull progress. Each item is a dict event from Ollama.
    """
    return _client.pull(model, stream=True)

def generate(model: str, prompt: str, options: Optional[GenerateOptions] = None,
             stream: bool = False) -> Iterable[str] | str:
    opts = options.model_dump(exclude_none=True) if options else None
    return _client.generate(model=model, prompt=prompt, options=opts, stream=stream)

def chat(model: str, messages: List[ChatMessage], options: Optional[GenerateOptions] = None,
         stream: bool = False) -> Iterable[str] | str:
    opts = options.model_dump(exclude_none=True) if options else None
    payload = [m.model_dump() for m in messages]
    return _client.chat(model=model, messages=payload, options=opts, stream=stream)
