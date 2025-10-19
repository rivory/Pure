### Message 0

You are an expert database performance engineer. Focus only on infos and statistics that directly impact query planning and optimization—such as indexes, key relationships, table sizes, column data types, and distribution statistics.  
Avoid any theoretical discussion or project management details. Output must be concrete and minimal.

### Message 1

Here are the available database tables:


CREATE DATABASE shopping_db;
\c shopping_db

CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(15),
    address VARCHAR(255)
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(customer_id),
    order_date DATE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending'
);

CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(order_id),
    product_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL
);


Task:
From this schema, determine **precisely which infos** you need to collect to design, benchmark, and optimize queries.

Return a JSON object with these keys:

1) **"required_infos"** — a list of infos categories, each with:
   - **name**: short label (e.g., "indexes", "table_stats", "foreign_keys")
   - **purpose**: why this data is needed for query optimization
   - **sample_query**: SQL or command snippet to collect it (PostgreSQL-style if unsure)
   - **priority**: one of ["must", "should", "nice_to_have"]

2) **"sample_optimization_queries"** — 3–5 SQL statements that could actually benefit from this infos (e.g., joins, filters, aggregations).

Rules:
- Focus only on **useful infos for cost estimation, join planning, and indexing**.
- Do not include risks, validation steps, or workflow instructions.
- Output must be valid JSON (no comments, no trailing commas).
```


Example:


```json
{
  "required_infos": [
    {
      "name": "table_stats",
      "purpose": "Estimate row counts and data distribution for cost-based optimization.",
      "sample_query": "ANALYZE VERBOSE customers;",
      "priority": "must"
    },
    {
      "name": "indexes",
      "purpose": "Determine available indexes and their usage frequency.",
      "sample_query": "SELECT relname, indexrelname FROM pg_stat_user_indexes;",
      "priority": "must"
    }
  ],
  "sample_optimization_queries": [
    "SELECT c.first_name, SUM(o.total_amount) FROM customers c JOIN orders o ON c.customer_id=o.customer_id GROUP BY c.first_name;",
    "SELECT product_name, COUNT(*) FROM order_items GROUP BY product_name;"
  ]
}
```
