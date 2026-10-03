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
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project is packaged into a single multi-stage Docker container.  
The backend is in backend/ and is a uv project, using FastAPI.  
The frontend is in frontend/ and is a Next.js app, statically exported and served by FastAPI.  
The database uses SQLite and is created from scratch each time the container starts, with a users table for sign up and sign in.  
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

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation status

v1 foundation is complete (KAN-4, KAN-5, KAN-6):
- `templates/` holds the Common Paper markdown templates listed in catalog.json.
- Frontend: fake login at `/` (accepts any input, no backend call). Logic in `frontend/lib/`, tests via `npm test` (vitest).
- Backend: `backend/app/main.py` serves the API and mounts the static frontend; `backend/app/db.py` recreates the SQLite users table on startup. Tests via `uv run pytest`.
- Docker: Node stage builds the frontend, uv Python stage runs uvicorn on port 8000 with `catalog.json` and `templates/` alongside `backend/`; start scripts pass `.env` to the container.

AI chat drafts every supported document (KAN-7, KAN-8):
- `backend/app/documents.py` is the single source of document definitions: it reads catalog.json and each template at startup, extracts variables from the `<span class="*_link">` markers (party roles Provider/Customer/Partner/Company become signature columns) and folds the NDA cover page into one `mutual-nda` document. `GET /api/documents` serves them, including the markdown body.
- `/draft/` holds `DocumentChat` and a live `DocumentPreview` (generic cover page, signature table, standard terms). Download PDF (`frontend/lib/pdf.ts`, jsPDF) unlocks once a document is chosen and both party companies are known.
- `POST /api/chat` (`backend/app/chat.py`) is stateless: it takes the message history, `documentId` and current values, and returns a reply, the chosen `documentId` and field updates via Structured Outputs. Unsupported requests are redirected to the closest supported document by the prompt. Once a document is chosen, `remaining_sections` lists the open sections in interview order (both company names, each cover page variable, then each party's signer name, title and notice address) and the prompt asks for them one at a time; "not relevant" answers are recorded as "Not applicable". The page shows the same count via `sectionProgress` in `frontend/lib/documents.ts`. The frontend merges updates with `applyUpdate` in `frontend/lib/chat.ts`.
- Chat calls set `MAX_TOKENS` in `chat.py`: without a cap OpenRouter reserves Cerebras's 40k default against account credit and falls back to slower providers (3-8s vs ~1s per reply). Keep it.
- `DocumentChat` scrolls only its own message list (not `scrollIntoView`, which moves the whole page); `DocumentPreview` scrolls just enough to show the cover page section a reply filled in.
- `next dev` has no `/api` proxy; test the app by serving `frontend/out` from FastAPI (`STATIC_DIR=../frontend/out uv run uvicorn app.main:app`).

Not built yet: real sign up / sign in endpoints.
