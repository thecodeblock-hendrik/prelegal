# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools (the `gh` CLI is not installed; use the GitHub MCP `create_pull_request`)

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project is packaged into a single multi-stage Docker container.  
The backend is in backend/ and is a uv project, using FastAPI.  
The frontend is in frontend/ and is a Next.js app, statically exported and served by FastAPI.  
The database uses SQLite and persists in the `prelegal-data` Docker volume (`DB_PATH=/data/prelegal.db`), with users, sessions and drafts tables. Schema changes are versioned migrations.  
There are scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme and UI

All colours, font sizes, radii and shadows are design tokens in `frontend/app/globals.css` (`@theme`); see UI.md. Tailwind's default palette and scales are reset, so only token classes work. Never hardcode colours in components.
- Primary `#0B2545`: header, main buttons (`btn-primary`), active states, headings
- Secondary `#0F766E`: secondary actions (`btn-secondary`), highlights such as progress
- Accent `#2563EB`: links (`link`) and focus rings
- Background `#F5F7FA`, Surface `#FFFFFF`, Border `#D9DEE5`, Text `#1A2433`, Muted `#5B6676`, input border `#8A94A3`
- Warning `#B45309` (disclaimer), Error `#B91C1C` (errors, `btn-danger`)
- Inter, self-hosted in `frontend/app/fonts/`; type scale `text-caption` 12, `text-body` 14, `text-heading` 16, `text-title` 20, `text-display` 24
- Shared utilities: `page`, `btn-*`, `link`, `nav-link`, `input`, `card`, `data-table`, `alert-warning`, `alert-error`, `modal`; delete confirmation uses `ConfirmDialog`

## Implementation status

KAN-4 to KAN-11 are complete and merged to main.

v1 foundation is complete (KAN-4, KAN-5, KAN-6):
- `templates/` holds the Common Paper markdown templates listed in catalog.json.
- Frontend: logic in `frontend/lib/` as pure functions, tests via `npm test` (vitest, node environment, no component tests).
- Backend: `backend/app/main.py` serves the API and mounts the static frontend; `backend/app/db.py` migrates the SQLite database on startup. Tests via `uv run pytest`.
- Docker: Node stage builds the frontend, uv Python stage runs uvicorn on port 8000 with `catalog.json` and `templates/` alongside `backend/`; start scripts pass `.env` to the container.

AI chat drafts every supported document (KAN-7, KAN-8):
- `backend/app/documents.py` is the single source of document definitions: it reads catalog.json and each template at startup, extracts variables from the `<span class="*_link">` markers (party roles Provider/Customer/Partner/Company become signature columns) and folds the NDA cover page into one `mutual-nda` document. `GET /api/documents` serves them, including the markdown body.
- `/draft/` holds `DocumentChat` and a live `DocumentPreview` (generic cover page, signature table, standard terms). Download PDF (`frontend/lib/pdf.ts`, jsPDF) unlocks once a document is chosen and both party companies are known.
- `POST /api/chat` (`backend/app/chat.py`) is stateless: it takes the message history, `documentId` and current values, and returns a reply, the chosen `documentId` and field updates via Structured Outputs. Unsupported requests are redirected to the closest supported document by the prompt. Once a document is chosen, `remaining_sections` lists the open sections in interview order (both company names, each cover page variable, then each party's signer name, title and notice address) and the prompt asks for them one at a time; "not relevant" answers are recorded as "Not applicable". The page shows the same count via `sectionProgress` in `frontend/lib/documents.ts`. The frontend merges updates with `applyUpdate` in `frontend/lib/chat.ts`.
- Chat calls set `MAX_TOKENS` in `chat.py`: without a cap OpenRouter reserves Cerebras's 40k default against account credit and falls back to slower providers (3-8s vs ~1s per reply). Keep it.
- `DocumentChat` scrolls only its own message list (not `scrollIntoView`, which moves the whole page); `DocumentPreview` scrolls just enough to show the cover page section a reply filled in.
- `next dev` has no `/api` proxy; test the app by serving `frontend/out` from FastAPI (`STATIC_DIR=../frontend/out uv run uvicorn app.main:app`).

Accounts, document history and polish (KAN-9):
- `backend/app/auth.py`: `/api/auth/signup|signin|signout|me`. Passwords hashed with stdlib scrypt; sign in creates a row in `sessions` and sets an HttpOnly `session` cookie (no `Secure` flag, the app runs on http). Protected routes take the `UserId` dependency; `/api/chat` and `/api/drafts` require it, `/api/health` and `/api/documents` stay public.
- `backend/app/drafts.py`: CRUD under `/api/drafts`, scoped to the signed in user (another user's draft is a 404). A draft stores `documentId`, `fields` and `messages` as JSON, using `ChatRequest` as the request body; the list omits messages.
- Frontend: `/` signs in or up, `/documents/` is the dashboard (reopen, delete via `ConfirmDialog`), `/draft/?id=N` reopens a draft. `DocumentChat` calls `onTurn` after each reply and keeps input locked until the page has saved, so the first save cannot be duplicated. `AppShell` guards signed in pages via `GET /api/auth/me`, and `lib/api.ts` sends any other 401 back to `/`.
- The disclaimer (`DISCLAIMER` in `lib/documents.ts`) shows above the preview and on the dashboard, and the PDF repeats it under the title with a footer on every page.
- Styling: see Color Scheme and UI above. Shared classes are defined with `@utility` because Tailwind 4 cannot `@apply` plain classes.

Corporate UI refresh (KAN-10):
- Visual only: no changes to routes, API calls or the `section-*` ids that drive preview scrolling. Tokens and utilities are listed in Color Scheme and UI above; the plan and before/after notes are in UI.md.
- `ConfirmDialog` (native `<dialog>`) replaces `window.confirm` for deletes. Inter is self-hosted, so the build needs no Google Fonts download.
- Before and after screenshots at 1920, 1366, 768 and 375px are in `docs/screenshots/KAN-10/`.

Persistent database (KAN-11):
- Data survives restarts in the `prelegal-data` volume; the start scripts mount it and the stop scripts never remove it. Reset with `docker volume rm prelegal-data`.
- Schema changes go in a new `backend/app/migrations/NNN_name.sql`; never edit an applied one. `migrate()` runs each file newer than `PRAGMA user_version` in its own transaction and bumps the version.
- Tables are `STRICT` with `ON DELETE CASCADE` foreign keys, `COLLATE NOCASE` emails and `json_valid` checks on draft JSON. Timestamps come from `utc_now()` (fixed-width UTC ISO-8601, so they compare as text).
- `connect()` applies `foreign_keys`, `journal_mode = WAL`, `busy_timeout` and `synchronous` on every connection. It uses `isolation_level="IMMEDIATE"`, not `autocommit=False`: a deferred `BEGIN` that reads then writes fails at once with `SQLITE_BUSY_SNAPSHOT` under concurrent writes (seen in a load test). `check_same_thread=False` because FastAPI's threadpool may open and use a request's connection on different threads.
- Handlers take the `Db` dependency: one connection per request, shared with `current_user`, committed or rolled back and closed. It uses `scope="function"` so the commit happens before the response is sent.
- Migration files must not contain `BEGIN`/`COMMIT`; `migrate()` wraps each one.
- Sessions store only the SHA-256 of the cookie token and expire after 7 days; expired rows are deleted on startup and sign in.

## Known gaps before public hosting

- The session cookie has no `Secure` flag; add `secure=True` in `start_session` once the app is served over HTTPS.
- Run a single instance on a host with a persistent disk mounted at `/data` (e.g. Fly.io, Railway, a VPS). Serverless containers without a disk would lose the database, and SQLite cannot be shared between instances.
- No automated database backups yet.
