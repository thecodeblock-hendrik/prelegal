"""AI chat that picks a supported legal document and extracts its field values."""

import json
from typing import Literal

from litellm import completion
from pydantic import BaseModel

from app.documents import DOCUMENTS, Document

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

SYSTEM_PROMPT = """You are a friendly legal assistant helping the user draft a legal agreement \
from the Common Paper templates. Hold a natural conversation in plain language, asking one or \
two questions at a time.

Supported documents (id: name - description):
{catalog}

First find out which document the user needs. When it matches a supported document, confirm \
it and set "documentId" to its id. If the user wants a document that is not supported, explain \
that we can't generate it, name the single closest supported document, explain briefly why it \
fits and ask whether they want it; only set "documentId" once the user agrees. Keep returning the current "documentId" on later turns (null until chosen)."""

DOCUMENT_PROMPT = """The selected document is the {name}.
party1 is the {role1} and party2 is the {role2}. For each party gather company, name (signer), \
title and noticeAddress (email or postal).
Cover page variables to gather, using these exact names in "variables":
{variables}

Required before download: both party company names. In "variables", return only values the \
user gave or confirmed in their latest message. For party1 and party2 use null when nothing \
changed, and null for each unchanged party field. Once both company names are filled, tell the \
user the document is ready to download and offer to fill any remaining variables."""

DocumentId = Literal[tuple(DOCUMENTS)]


class PartyUpdate(BaseModel):
    """Party details learned this turn; null means unchanged."""

    company: str | None
    name: str | None
    title: str | None
    noticeAddress: str | None


class VariableUpdate(BaseModel):
    """A cover page variable value learned this turn."""

    name: str
    value: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """The conversation so far, the chosen document and its current values."""

    messages: list[ChatMessage]
    documentId: DocumentId | None = None
    fields: dict


class ChatResponse(BaseModel):
    """The assistant's reply, the chosen document and any values it extracted."""

    reply: str
    documentId: DocumentId | None
    variables: list[VariableUpdate]
    party1: PartyUpdate | None
    party2: PartyUpdate | None


def document_prompt(document: Document) -> str:
    """Instructions for filling in the chosen document."""
    return DOCUMENT_PROMPT.format(
        name=document.name,
        role1=document.parties[0],
        role2=document.parties[1],
        variables="\n".join(f"- {v}" for v in document.variables),
    )


def build_messages(request: ChatRequest) -> list[dict]:
    """Prefix the conversation with the system prompt, chosen document and current values."""
    catalog = "\n".join(f"- {d.id}: {d.name} - {d.description}" for d in DOCUMENTS.values())
    system = SYSTEM_PROMPT.format(catalog=catalog)
    if request.documentId:
        system += "\n\n" + document_prompt(DOCUMENTS[request.documentId])
    system += f"\n\nCurrent values:\n{json.dumps(request.fields, indent=2)}"
    return [{"role": "system", "content": system}] + [m.model_dump() for m in request.messages]


def keep_known_variables(response: ChatResponse, current_id: str | None) -> ChatResponse:
    """Drop variables that the chosen document does not have."""
    document_id = response.documentId or current_id
    known = DOCUMENTS[document_id].variables if document_id else []
    variables = [v for v in response.variables if v.name in known]
    return response.model_copy(update={"variables": variables})


def reply(request: ChatRequest) -> ChatResponse:
    """Ask the LLM for the next reply and structured field updates."""
    response = completion(
        model=MODEL,
        messages=build_messages(request),
        response_format=ChatResponse,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    parsed = ChatResponse.model_validate_json(response.choices[0].message.content)
    return keep_known_variables(parsed, request.documentId)
