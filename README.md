# README

## Overview 

Pure is a graphical user interface (GUI) designed to help users create, access, query, and edit relational databases. With a powerful AI assistant integrated into the application, you can generate SQL queries based on human-readable descriptions, making it easier to interact with databases without needing to write complex queries manually. Additionally, users can save queries to their personal collection for future use.

## Features

- Graphical User Interface (GUI): Easy-to-use interface for managing and interacting with relational databases.
- AI-Powered Query Generation: Provide a natural language description, and the AI assistant will generate the corresponding SQL query for you.
- Query Collection: Save your queries for quick access and reuse in future database interactions.
- Database Connectivity: Supports connecting to multiple types of relational databases (e.g., MySQL, PostgreSQL, SQLite).
- Real-time Results: View query results instantly within the interface.



## Installation 


### Prerequisites 


## Contribute

### Technologies used 

- **App**: Wails (Go for backend, HTML/CSS/JS for frontend)
- **AI assistant**: Ollama
- **Database support**: PostgreSQL


### Installation

Before running the project, make sure you have the following installed:

Go (for backend development with Wails)
Node.js (for frontend development)
Wails (for building and running the Wails application)
A compatible database (e.g., PostgreSQL) with the correct drivers or connection configuration.

#### Step 1: Run the Application

To run in live development mode using wails:

```bash
wails dev
```

This will run a Vite development server that will provide very fast hot reload of your frontend changes. If you want to develop in a browser
and have access to your Go methods, there is also a dev server that runs on <http://localhost:34115>.


#### Step 2: Set up a database

1. **Create a Database**: Set up your database (e.g.,PostgreSQL) by creating a new database for the project.

```bash
docker run -d -P -p 127.0.0.1:5432:5432 -e POSTGRES_PASSWORD="1234" --name pg postgres:alpine
```

2. **Load Test Data**: To make testing easier, the project includes a dump.sql file that contains sample data for your database. You can import this dump into your database by running the following command:

```bash
docker exec -i pg psql -U postgres < dump.sql
```

#### Step 3: Build the Application (Optional)

To build a redistributable, production mode package:

```bash
wails build
```


## Contributing
We welcome contributions! If you have ideas for improvements, bug fixes, or new features, feel free to fork the repository and submit a pull request.


### Steps to Contribute:

1. Fork the repository.
2. Clone your forked repository locally.
3. Create a new branch for your changes.
4. Implement your changes and test them.
5. Submit a pull request with a detailed description of your changes. 

### Frontend Contributions:

If your pull request involves changes to the frontend (UI/UX), **please include screenshots or GIFs** demonstrating the changes you made. This helps reviewers quickly understand the visual impact of the changes and ensures consistency with the overall design.

The frontend is using shadcn ui components library <https://ui.shadcn.com/docs/components>

To add new ui components

```bash
npx shadcn@latest add button
```

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Roadmap
### Planned Features
- Advanced Query Templates: Offer users a set of pre-built query templates for common use cases (e.g., aggregations, joins, etc.).
- Query Optimization Suggestions: Provide AI-driven suggestions to optimize SQL queries for performance.
- Database Schema Visualization: Add a feature to visualize the structure of the database (tables, columns, relationships).
- Cross-Database Compatibility: Extend support to other databases like MySQL, SQLite, Microsoft SQL Server, Oracle, and MongoDB.
- Query History: Track and display the user's query history for easy access to previously run queries.
- Export Query Results: Allow users to export query results in various formats (CSV, JSON, etc.).


### Future Improvements
- Collaboration Features: Allow multiple users to collaborate on database queries and share saved queries with teammates.
- Customizable Themes: Provide users with the ability to choose or create custom themes for the UI.
