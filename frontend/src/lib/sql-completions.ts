import { CompletionContext } from "@codemirror/autocomplete";
import { TableInfo } from "@/types/table-info";

export const createSqlCompletions = (tableInfo: TableInfo[]) => {
  return (context: CompletionContext) => {
    const word = context.matchBefore(/\w*/);
    if (!word) return null;

    const beforeText = context.state.doc.sliceString(0, context.pos);

    // Suggestions au début de la requête ou sur Option+Escape
    if (beforeText.trim() === "" || context.explicit) {
      return {
        from: word.from,
        options: [
          { label: "SELECT", type: "keyword" },
          { label: "INSERT", type: "keyword" },
          { label: "UPDATE", type: "keyword" },
          { label: "DELETE", type: "keyword" },
          { label: "CREATE", type: "keyword" },
          { label: "DROP", type: "keyword" },
          { label: "ALTER", type: "keyword" },
        ],
      };
    }

    // Suggestions après CREATE
    if (/CREATE\s+\w*$/i.test(beforeText)) {
      return {
        from: word.from,
        options: [
          { label: "TABLE", type: "keyword" },
          { label: "DATABASE", type: "keyword" },
          { label: "INDEX", type: "keyword" },
          { label: "VIEW", type: "keyword" },
          { label: "FUNCTION", type: "keyword" },
          { label: "TRIGGER", type: "keyword" },
          { label: "SCHEMA", type: "keyword" },
        ],
      };
    }

    // Suggestions après CREATE TABLE
    if (/CREATE\s+TABLE\s+\w*$/i.test(beforeText)) {
      return {
        from: word.from,
        options: [
          { label: "IF NOT EXISTS", type: "keyword" },
          ...tableInfo.map((table) => ({
            label: table.name,
            type: "table",
            detail: "Existing table name",
          })),
        ],
      };
    }

    // Suggestions pour les types de colonnes dans CREATE TABLE
    if (/CREATE\s+TABLE\s+[\w\s]+\(\s*[\w\s,]*\w+\s+\w*$/i.test(beforeText)) {
      return {
        from: word.from,
        options: [
          { label: "INTEGER", type: "type" },
          { label: "SERIAL", type: "type" },
          { label: "BIGINT", type: "type" },
          { label: "DECIMAL", type: "type" },
          { label: "NUMERIC", type: "type" },
          { label: "REAL", type: "type" },
          { label: "DOUBLE PRECISION", type: "type" },
          { label: "SMALLINT", type: "type" },
          { label: "VARCHAR", type: "type" },
          { label: "CHAR", type: "type" },
          { label: "TEXT", type: "type" },
          { label: "BOOLEAN", type: "type" },
          { label: "DATE", type: "type" },
          { label: "TIME", type: "type" },
          { label: "TIMESTAMP", type: "type" },
          { label: "JSON", type: "type" },
          { label: "JSONB", type: "type" },
          { label: "UUID", type: "type" },
        ],
      };
    }

    // Suggestions après SELECT
    if (/SELECT\s+\w*$/i.test(beforeText)) {
      return {
        from: word.from,
        options: [
          { label: "*", type: "keyword" },
          ...tableInfo.flatMap((table) =>
            table.columns.map((column) => ({
              label: column,
              type: "field",
              detail: `Column from ${table.name}`,
            })),
          ),
          { label: "DISTINCT", type: "keyword" },
          { label: "COUNT", type: "function" },
          { label: "SUM", type: "function" },
          { label: "AVG", type: "function" },
          { label: "MAX", type: "function" },
          { label: "MIN", type: "function" },
        ],
      };
    }

    // Suggestions après SELECT * ou après une virgule dans la liste des colonnes
    if (/SELECT\s+\*\s+\w*$|SELECT\s+(?:[\w\s,])+\s+\w*$/i.test(beforeText)) {
      return {
        from: word.from,
        options: [
          { label: "FROM", type: "keyword" },
          { label: "WHERE", type: "keyword" },
          { label: "GROUP BY", type: "keyword" },
          { label: "HAVING", type: "keyword" },
          { label: "ORDER BY", type: "keyword" },
          { label: "LIMIT", type: "keyword" },
        ],
      };
    }

    // Suggestions après FROM
    if (/FROM\s+\w*$/i.test(beforeText)) {
      return {
        from: word.from,
        options: tableInfo.map((table) => ({
          label: table.name,
          type: "table",
          detail: `${table.columns.length} columns`,
        })),
      };
    }

    // Suggestions après FROM <table>
    if (/FROM\s+\w+\s+\w*$/i.test(beforeText)) {
      return {
        from: word.from,
        options: [
          { label: "WHERE", type: "keyword" },
          { label: "GROUP BY", type: "keyword" },
          { label: "ORDER BY", type: "keyword" },
          { label: "LIMIT", type: "keyword" },
          { label: "JOIN", type: "keyword" },
          { label: "LEFT JOIN", type: "keyword" },
          { label: "RIGHT JOIN", type: "keyword" },
          { label: "INNER JOIN", type: "keyword" },
        ],
      };
    }

    // Suggestions après WHERE ou AND/OR
    if (/WHERE\s+\w*$|AND\s+\w*$|OR\s+\w*$/i.test(beforeText)) {
      return {
        from: word.from,
        options: tableInfo.flatMap((table) =>
          table.columns.map((column) => ({
            label: column,
            type: "field",
            detail: `Column from ${table.name}`,
          })),
        ),
      };
    }

    // Suggestions après WHERE <column>
    if (/WHERE\s+[\w.]+\s+\w*$/i.test(beforeText)) {
      return {
        from: word.from,
        options: [
          { label: "=", type: "operator" },
          { label: ">", type: "operator" },
          { label: "<", type: "operator" },
          { label: ">=", type: "operator" },
          { label: "<=", type: "operator" },
          { label: "<>", type: "operator" },
          { label: "LIKE", type: "operator" },
          { label: "IN", type: "operator" },
          { label: "IS NULL", type: "operator" },
          { label: "IS NOT NULL", type: "operator" },
        ],
      };
    }

    return null;
  };
};
