# prelegal
Platform for drafting prelegal documents

> **Status: In progress.** This project is under active development and is expected to be completed within one week.

## Run

Requires Docker and a `.env` file in the project root (see `CLAUDE.md`).

```bash
scripts/start-mac.sh     # or start-linux.sh / start-windows.ps1
scripts/stop-mac.sh      # or stop-linux.sh / stop-windows.ps1
```

The app is served at http://localhost:8000. The SQLite database is recreated on every start.

## Develop

```bash
cd backend && uv run pytest        # backend tests
cd frontend && npm test            # frontend tests
```
