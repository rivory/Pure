# README

## About

This is the official Wails React-TS template.

You can configure the project by editing `wails.json`. More information about the project settings can be found
here: <https://wails.io/docs/reference/project-config>

## Live Development

To run in live development mode, run `wails dev` in the project directory. This will run a Vite development
server that will provide very fast hot reload of your frontend changes. If you want to develop in a browser
and have access to your Go methods, there is also a dev server that runs on <http://localhost:34115>. Connect
to this in your browser, and you can call your Go code from devtools.

## Building

To build a redistributable, production mode package, use `wails build`.

### Front end

The frontend is using shadcn ui components library <https://ui.shadcn.com/docs/components>

To add new ui components

```bash
npx shadcn@latest add button
```

## Feature to build

- [x] Add ui kit
- [x] Default layout with sidebar nav
- [x] Add and Retrieve Connection list
- [x] Test connection when adding it
- [x] basic error handling to show as Toaster
- [x] cold storage connections info
  - [ ] encrypt password
  - [ ] find a better path where to store
- [ ] List Db for active connection
- [ ] List table from DB for active DB
- [ ] Run Query and get results
  - [ ] Add monaco editor with SQL autocompletion (react code mirror package)

created DB

```bash
docker run --rm -P -p 127.0.0.1:5432:5432 -e POSTGRES_PASSWORD="1234" --name pg postgres:alpine
```

connect to db

```bash
psql postgresql://postgres:1234@localhost:5432/postgres
```

db list :

```bash
test
another_test
```
