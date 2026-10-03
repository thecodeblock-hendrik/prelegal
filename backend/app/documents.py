"""Supported legal documents, built from catalog.json and the Common Paper templates."""

import json
import re
from pathlib import Path

from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[2]
VARIABLE = re.compile(r'<span class="[a-z]+_link">([^<]+)</span>')
POSSESSIVE = re.compile(r"(’s|'s|’|')$")
ROLES = ("Provider", "Customer", "Partner", "Company")
NDA_COVER_PAGE = "Mutual-NDA-coverpage.md"
NDA_EXTRA_VARIABLES = ["MNDA Modifications"]


class Document(BaseModel):
    """A document the user can draft: its parties, cover page variables and standard terms."""

    id: str
    name: str
    description: str
    parties: list[str]
    variables: list[str]
    body: str


def variable_names(markdown: str) -> list[str]:
    """Unique variable names referenced by a template, without possessives or plural duplicates."""
    names = list(dict.fromkeys(POSSESSIVE.sub("", name) for name in VARIABLE.findall(markdown)))
    return [n for n in names if not (n.endswith("s") and n[:-1] in names)]


def build_document(entry: dict) -> Document:
    """Turn a catalog entry into a Document by reading its template."""
    body = (ROOT / "templates" / entry["filename"]).read_text()
    names = variable_names(body)
    variables = [n for n in names if n not in ROLES]
    if entry["filename"] == "Mutual-NDA.md":
        variables += NDA_EXTRA_VARIABLES
    return Document(
        id=Path(entry["filename"]).stem.lower(),
        name=entry["name"].removesuffix(" (Standard Terms)"),
        description=entry["description"],
        parties=[r for r in ROLES if r in names] or ["Party 1", "Party 2"],
        variables=variables,
        body=body,
    )


def load_documents() -> dict[str, Document]:
    """All supported documents keyed by id; the NDA cover page is folded into the Mutual NDA."""
    catalog = json.loads((ROOT / "catalog.json").read_text())
    documents = [build_document(e) for e in catalog if e["filename"] != NDA_COVER_PAGE]
    return {d.id: d for d in documents}


DOCUMENTS = load_documents()
