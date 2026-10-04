# prelegal
Platform for drafting prelegal documents

> **Status: Complete.** v1 is finished and merged to main (KAN-4 to KAN-11). Future enhancements may follow, but the project is complete as it stands.

## Features

- AI chat drafts any of the 12 Common Paper documents in `catalog.json` and fills in the fields as you answer.
- Live document preview with PDF download.
- Accounts with sign up and sign in, plus a dashboard to reopen or delete saved drafts.
- SQLite database with versioned migrations, persisted in a Docker volume.
- Corporate UI built on shared design tokens (see `UI.md`).

## Run

Requires Docker and a `.env` file in the project root containing `OPENROUTER_API_KEY`.

```bash
scripts/start-mac.sh     # or start-linux.sh / start-windows.ps1
scripts/stop-mac.sh      # or stop-linux.sh / stop-windows.ps1
```

The app is served at http://localhost:8000. The SQLite database persists in the `prelegal-data` Docker volume; reset it with `docker volume rm prelegal-data`.

## Develop

```bash
cd backend && uv run pytest        # backend tests
cd frontend && npm test            # frontend tests
```

## Possible future enhancements

- Serve over HTTPS and set the `Secure` flag on the session cookie.
- Host on a single instance with a persistent disk mounted at `/data`.
- Automated database backups.
