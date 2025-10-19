from __future__ import annotations

import re
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Mapping, Optional, Tuple

import yaml
from jinja2 import Environment, StrictUndefined
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import BaseMessage

_JINJA_ENV = Environment(undefined=StrictUndefined, trim_blocks=True, lstrip_blocks=True)

@dataclass(frozen=True)
class PromptMeta:
    name: str
    description: str
    inputs: List[str]
    path: Path

_FRONT_MAT_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL | re.IGNORECASE)
_SECTION_RE = re.compile(r"^##\s*(system|user)\s*$", re.IGNORECASE | re.MULTILINE)

def _parse_markdown_prompt(md_text: str) -> Tuple[Dict, str, str]:
    m = _FRONT_MAT_RE.match(md_text)
    if not m:
        raise ValueError("Prompt file must start with YAML front matter delimited by '---'.")
    front_matter_raw, body = m.groups()
    meta = yaml.safe_load(front_matter_raw) or {}
    parts = _SECTION_RE.split(body)
    if len(parts) < 5:
        raise ValueError("Prompt body must contain both '## system' and '## user' sections.")
    sections: Dict[str, str] = {}
    for i in range(1, len(parts), 2):
        sec_name = parts[i].strip().lower()
        sec_content = parts[i + 1].strip()
        sections[sec_name] = sec_content
    if "system" not in sections or "user" not in sections:
        raise ValueError("Both '## system' and '## user' sections are required.")
    return meta, sections["system"], sections["user"]

def _ensure_meta(meta: Dict, path: Path) -> PromptMeta:
    name = meta.get("name")
    description = meta.get("description", "")
    inputs = meta.get("inputs", [])
    if not name:
        raise ValueError(f"Missing 'name' in front matter: {path}")
    if not isinstance(inputs, list) or not all(isinstance(x, str) for x in inputs):
        raise ValueError(f"'inputs' must be a list of strings in: {path}")
    return PromptMeta(name=name, description=description, inputs=inputs, path=path)


_CACHE_BY_NAME: Dict[str, Tuple[PromptMeta, str, str]] = {}
_ROOT = Path(__file__).parent

def load_prompt_file(name: str) -> Tuple[PromptMeta, str, str]:
    if name in _CACHE_BY_NAME:
        return _CACHE_BY_NAME[name]
    path = (_ROOT / f"{name}.md").resolve()
    if not path.exists():
        alt = (_ROOT / f"{name.replace('/', '.').replace(':', '.')}.md").resolve()
        if alt.exists():
            path = alt
        else:
            raise FileNotFoundError(f"Prompt markdown not found: {path}")
    md_text = path.read_text(encoding="utf-8")
    meta_dict, system_t, user_t = _parse_markdown_prompt(md_text)
    meta = _ensure_meta(meta_dict, path)
    _CACHE_BY_NAME[meta.name] = (meta, system_t, user_t)
    if meta.name != name:
        _CACHE_BY_NAME[name] = (meta, system_t, user_t)
    return meta, system_t, user_t

def get_meta(name: str) -> PromptMeta:
    return load_prompt_file(name)[0]

def required_inputs(name: str) -> List[str]:
    return get_meta(name).inputs

def _render_jinja(template_str: str, variables: Mapping[str, object]) -> str:
    if "{{" in template_str or "{%" in template_str or "{#" in template_str:
        tmpl = _JINJA_ENV.from_string(template_str)
        return tmpl.render(**variables)
    return template_str

def render_messages(name: str, variables: Mapping[str, object]) -> List[Dict[str, str]]:
    meta, system_t, user_t = load_prompt_file(name)
    missing = [k for k in meta.inputs if k not in variables]
    if missing:
        raise KeyError(f"Missing prompt variables {missing} for '{meta.name}'")
    system_rendered = _render_jinja(system_t, variables)
    user_rendered = _render_jinja(user_t, variables)
    return [
        {"role": "system", "content": system_rendered},
        {"role": "user", "content": user_rendered},
    ]

def render_text(name: str, variables: Mapping[str, object]) -> str:
    meta = get_meta(name)
    msgs = render_messages(name, variables)
    return json.dumps(
        {"name": meta.name, "description": meta.description, "inputs": meta.inputs, "messages": msgs},
        ensure_ascii=False,
        indent=2,
    )


def get_chat_template(name: str) -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages([("system", "{system}"), ("human", "{user}")])

class PromptRegistry:
    def __init__(self, root: Optional[Path] = None) -> None:
        if root is not None:
            global _ROOT
            _ROOT = Path(root)
    def load_prompt_file(self, name: str): return load_prompt_file(name)
    def get_meta(self, name: str): return get_meta(name)
    def get_chat_template(self, name: str): return get_chat_template(name)
    def required_inputs(self, name: str): return required_inputs(name)
    def render_messages(self, name: str, variables: Mapping[str, object]): return render_messages(name, variables)
    def render_text(self, name: str, variables: Mapping[str, object]): return render_text(name, variables)

default_registry = PromptRegistry()

__all__ = [
    "PromptMeta",
    "PromptRegistry",
    "default_registry",
    "load_prompt_file",
    "get_meta",
    "get_chat_template",
    "required_inputs",
    "render_messages",
    "render_text",
]
