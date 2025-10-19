from typing import List, Literal
from pydantic import BaseModel, Field, FieldValidationInfo, FieldValidator

class SQLQuery(BaseModel):
    query: str

    def validate_sql_like(query: str) -> str:
        sql_keywords = ["SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER", "WITH"]
        if not any(keyword in query.upper() for keyword in sql_keywords):
            raise ValueError("Query does not appear to be a valid SQL statement.")
        return query


class TableQuery(BaseModel):
    table_name: str
    query: List[SQLQuery]



class ExecutedQuery(BaseModel):
    query: str
    execution_time_ms: float
    rows_returned: int
    returned_sample: List[dict] = Field(default_factory=list)

