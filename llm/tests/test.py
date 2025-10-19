# optimize_infos_plan.py
from pathlib import Path
from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama
from llm.prompts.types import SQLQuery, ExecutedQuery, TableQuery


SYSTEM = """You are an expert database performance engineer. Focus only on infos and statistics that directly impact query planning and optimization—such as indexes, key relationships, table sizes, column data types, and distribution statistics.
Avoid any theoretical discussion or project management details. Output must be concrete and minimal."""

USER = """Here are the available database tables:

{tables_context}

Task:
From this schema, determine precisely which infos you need to collect to design, benchmark, and optimize queries.

Return a JSON object with these keys:

1) "required_infos" — a list of infos categories, each with:
   - name: short label (e.g., "indexes", "table_stats", "foreign_keys")
   - purpose: why this data is needed for query optimization
   - sample_query: SQL or command snippet to collect it (PostgreSQL-style if unsure)
   - priority: one of ["must", "should", "nice_to_have"]

2) "sample_optimization_queries" — 3–5 SQL statements that could actually benefit from this infos (e.g., joins, filters, aggregations).

Rules:
- Focus only on useful infos for cost estimation, join planning, and indexing.
- Do not include risks, validation steps, or workflow instructions.
- Output must be valid JSON (no comments, no trailing commas)."""

prompt = ChatPromptTemplate.from_messages(
    [("system", SYSTEM), ("user", USER)]
)

llm = ChatOllama(
    model="llama3.2:3b",
    temperature=0.1,
    format="json",
    num_ctx=8192,
    base_url="http://localhost:11434",
)

structured = llm.with_structured_output(SQLQuery=SQLQuery, strict=True)

chain = prompt | structured

def run(tables_context: str) -> SQLQuery:
    return chain.invoke({"tables_context": tables_context})

if __name__ == "__main__":
    maybe_file = Path("tables_context.txt")
    if maybe_file.exists():
        tables_ctx = maybe_file.read_text()
    else:
        tables_ctx = "/* put your CREATE TABLE ... statements or a textual schema summary here */"

    result: SQLQuery = run(tables_context=tables_ctx)
    print(result.model_dump_json(indent=2, ensure_ascii=False))
