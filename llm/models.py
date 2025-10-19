from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class LocalModelTag(BaseModel):
    name: str
    size: Optional[int] = None
    digest: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class ListLocalModelsResponse(BaseModel):
    models: List[LocalModelTag] = []

class GenerateOptions(BaseModel):
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    top_k: Optional[int] = None
    num_ctx: Optional[int] = None
    repeat_penalty: Optional[float] = None
    seed: Optional[int] = None

class ChatMessage(BaseModel):
    role: str  # "system" | "user" | "assistant"
    content: str

class RemoteModel(BaseModel):
    slug: str
    name: str
    url: Optional[str] = None
    size: Optional[str] = None
