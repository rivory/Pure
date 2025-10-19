"""
Thin LangChain helpers (Python).
"""
from typing import Optional
from langchain_ollama import ChatOllama
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from .config import settings

def make_chat_ollama(model: str, temperature: float = 0.2) -> ChatOllama:
    return ChatOllama(
        base_url=settings.ollama_base_url,
        model=model,
        temperature=temperature,
    )

def simple_chain(model: str, system: Optional[str] = None):
    """
    Returns a chain you can `.invoke({"input": "your question"})`.
    """
    tmpl = ChatPromptTemplate.from_messages([
        ("system", system or "You are a helpful assistant."),
        ("human", "{input}")
    ])
    llm = make_chat_ollama(model=model)
    return tmpl | llm | StrOutputParser()

def ask(model: str, text: str) -> str:
    chain = simple_chain(model=model)
    return chain.invoke({"input": text})
