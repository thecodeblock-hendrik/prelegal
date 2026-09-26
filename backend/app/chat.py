"""AI chat that interviews the user and extracts Mutual NDA field values."""

import json
from typing import Literal

from litellm import completion
from pydantic import BaseModel

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

SYSTEM_PROMPT = """You are a friendly legal assistant helping the user draft a Common Paper \
Mutual Non-Disclosure Agreement (MNDA). Hold a natural conversation: ask about the deal and \
gather the cover page fields, one or two questions at a time, in plain language.

Fields to gather:
- purpose: how Confidential Information may be used
- effectiveDate: ISO date YYYY-MM-DD
- termChoice: "expires" (after termYears years) or "continues" (until terminated)
- confidentialityChoice: "years" (for confidentialityYears years) or "perpetuity"
- governingLaw: the US state name only, e.g. "Delaware"
- jurisdiction: courts for disputes, e.g. "courts located in New Castle, DE"
- modifications: optional changes to the standard terms
- party1 and party2: company, name (signer), title, noticeAddress (email or postal)

Required before download: purpose, governingLaw, jurisdiction, party1.company, party2.company.

The current document values are provided below. In "fields", return only values the user \
gave or confirmed in their latest message; use null for everything else. Once all required \
fields are filled, tell the user the NDA is ready to download and offer to refine anything."""


class PartyUpdate(BaseModel):
    """Party details learned this turn; null means unchanged."""

    company: str | None
    name: str | None
    title: str | None
    noticeAddress: str | None


class NdaUpdate(BaseModel):
    """NDA field values learned this turn; null means unchanged."""

    purpose: str | None
    effectiveDate: str | None
    termChoice: Literal["expires", "continues"] | None
    termYears: int | None
    confidentialityChoice: Literal["years", "perpetuity"] | None
    confidentialityYears: int | None
    governingLaw: str | None
    jurisdiction: str | None
    modifications: str | None
    party1: PartyUpdate | None
    party2: PartyUpdate | None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """The conversation so far and the document's current values."""

    messages: list[ChatMessage]
    fields: dict


class ChatResponse(BaseModel):
    """The assistant's reply and any field values it extracted."""

    reply: str
    fields: NdaUpdate


def build_messages(request: ChatRequest) -> list[dict]:
    """Prefix the conversation with the system prompt and current document values."""
    system = f"{SYSTEM_PROMPT}\n\nCurrent values:\n{json.dumps(request.fields, indent=2)}"
    return [{"role": "system", "content": system}] + [m.model_dump() for m in request.messages]


def reply(request: ChatRequest) -> ChatResponse:
    """Ask the LLM for the next reply and structured field updates."""
    response = completion(
        model=MODEL,
        messages=build_messages(request),
        response_format=ChatResponse,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    return ChatResponse.model_validate_json(response.choices[0].message.content)
