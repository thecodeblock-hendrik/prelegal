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
- Frontend: fake login at `/` (accepts any input, no backend call) that routes to the Mutual NDA creator at `/nda/`, with a form, live preview and PDF download (jsPDF). Logic in `frontend/lib/`, tests via `npm test` (vitest).
- Backend: `backend/app/main.py` serves `/api/health` and mounts the static frontend; `backend/app/db.py` recreates the SQLite users table on startup. Tests via `uv run pytest`.
- Docker: Node stage builds the frontend, uv Python stage runs uvicorn on port 8000; start scripts pass `.env` to the container.

AI chat for the Mutual NDA is complete (KAN-7):
- `/nda/` replaces the form with `NdaChat`: a freeform chat whose answers fill the live preview.
- `POST /api/chat` (`backend/app/chat.py`) is stateless: it takes the message history and current NDA values, and returns a reply plus nullable field updates via Structured Outputs. The frontend merges non-null values with `applyUpdate` in `frontend/lib/chat.ts`.
- `next dev` has no `/api` proxy; test the chat by serving `frontend/out` from FastAPI (`STATIC_DIR=../frontend/out uv run uvicorn app.main:app`).

Not built yet: real sign up / sign in endpoints, and document types other than the Mutual NDA.
