"""AI chat that picks a supported legal document and extracts its field values."""

from typing import Literal

from litellm import completion
from pydantic import BaseModel

from app.documents import DOCUMENTS, Document

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}
# Replies are a few hundred tokens. Without a cap OpenRouter reserves Cerebras's 40k default
# against the account's credit and, when that is short, silently falls back to a slower provider.
MAX_TOKENS = 2000

SYSTEM_PROMPT = """You are a friendly legal assistant helping the user draft a legal agreement \
from the Common Paper templates. Hold a natural conversation in plain language, asking one or \
two questions at a time.

Supported documents (id: name (parties) - description):
{catalog}

First find out which document the user needs. When it matches a supported document, confirm \
it and set "documentId" to its id, then straight away ask for the company names of both parties \
(using the role names in brackets). If the user wants a document that is not supported, explain \
that we can't generate it, name the single closest supported document, explain briefly why it \
fits and ask whether they want it; only set "documentId" once the user agrees. Keep returning \
the current "documentId" on later turns (null until chosen)."""

DOCUMENT_PROMPT = """The selected document is the {name}. party1 is the {role1} and party2 \
is the {role2}.

Guide the user through the document one section at a time. Sections that were open before the \
user's latest message, in order:
{remaining}

On each turn:
1. Record every value in the user's latest message in "variables", party1 or party2. If they \
say a section does not apply or is not relevant, record "Not applicable" for it.
2. In "reply", briefly confirm what you recorded (only this turn's values), then ask about the \
first section on the list that the latest message did not answer. Ask about one section per reply (at most two \
closely related ones), explain briefly in plain language what it covers, and suggest a typical \
value when helpful.
3. While any section remains unanswered, the reply must end with that question. When the \
latest message answered all remaining sections, or none remain, \
tell the user the document is complete and ready to download, and ask whether they want to \
change anything.

Cover page variables go in "variables" using these exact names: {variables}. Party details go \
in party1 and party2: company, name (the signer), title and noticeAddress (email or postal). \
Return only values the user gave or confirmed in their latest message; use null for party1, \
party2 or any party field that did not change."""

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


class Party(BaseModel):
    """A party's current details."""

    company: str = ""
    name: str = ""
    title: str = ""
    noticeAddress: str = ""


class Fields(BaseModel):
    """The document's current values."""

    variables: dict[str, str] = {}
    party1: Party = Party()
    party2: Party = Party()


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """The conversation so far, the chosen document and its current values."""

    messages: list[ChatMessage]
    documentId: DocumentId | None = None
    fields: Fields


class ChatResponse(BaseModel):
    """The chosen document, any values extracted this turn, and the assistant's reply.

    The reply comes last so the model records the values before it writes about them.
    """

    documentId: DocumentId | None
    variables: list[VariableUpdate]
    party1: PartyUpdate | None
    party2: PartyUpdate | None
    reply: str


def remaining_sections(document: Document, fields: Fields) -> list[str]:
    """Sections without a value yet, in interview order: companies, variables, then signers."""
    parties = list(zip(document.parties, (fields.party1, fields.party2)))
    sections = [(f"{role} company name", p.company) for role, p in parties]
    sections += [(v, fields.variables.get(v, "")) for v in document.variables]
    sections += [
        (f"{role} signer name, title and notice address (email or postal)", p.name and p.title and p.noticeAddress)
        for role, p in parties
    ]
    return [name for name, value in sections if not value.strip()]


def document_prompt(document: Document, fields: Fields) -> str:
    """Instructions for guiding the user through the chosen document's remaining sections."""
    remaining = remaining_sections(document, fields)
    return DOCUMENT_PROMPT.format(
        name=document.name,
        role1=document.parties[0],
        role2=document.parties[1],
        remaining="\n".join(f"- {r}" for r in remaining) or "(none, all sections are complete)",
        variables=", ".join(document.variables),
    )


def build_messages(request: ChatRequest) -> list[dict]:
    """Prefix the conversation with the system prompt, chosen document and current values."""
    catalog = "\n".join(
        f"- {d.id}: {d.name} ({' and '.join(d.parties)}) - {d.description}" for d in DOCUMENTS.values()
    )
    system = SYSTEM_PROMPT.format(catalog=catalog)
    if request.documentId:
        system += "\n\n" + document_prompt(DOCUMENTS[request.documentId], request.fields)
    system += f"\n\nCurrent values:\n{request.fields.model_dump_json(indent=2)}"
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
        max_tokens=MAX_TOKENS,
        extra_body=EXTRA_BODY,
    )
    parsed = ChatResponse.model_validate_json(response.choices[0].message.content)
    return keep_known_variables(parsed, request.documentId)
