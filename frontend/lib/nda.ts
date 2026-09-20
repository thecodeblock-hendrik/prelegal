import { STANDARD_TERMS } from "./generated/standardTerms";

export type TermChoice = "expires" | "continues";
export type ConfidentialityChoice = "years" | "perpetuity";

export interface Party {
  name: string;
  title: string;
  company: string;
  noticeAddress: string;
}

export interface NdaData {
  purpose: string;
  effectiveDate: string;
  termChoice: TermChoice;
  termYears: number;
  confidentialityChoice: ConfidentialityChoice;
  confidentialityYears: number;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  party1: Party;
  party2: Party;
}

const emptyParty: Party = { name: "", title: "", company: "", noticeAddress: "" };

function localIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function defaultNdaData(today: Date = new Date()): NdaData {
  return {
    purpose: "Evaluating whether to enter into a business relationship with the other party.",
    effectiveDate: localIsoDate(today),
    termChoice: "expires",
    termYears: 1,
    confidentialityChoice: "years",
    confidentialityYears: 1,
    governingLaw: "",
    jurisdiction: "",
    modifications: "",
    party1: { ...emptyParty },
    party2: { ...emptyParty },
  };
}

const blank = "________";
const orBlank = (value: string) => value.trim() || blank;

// A cleared number input is stored as 0 while editing; render it as at least 1 year.
const plural = (n: number) => {
  const years = Math.max(1, n);
  return `${years} year${years === 1 ? "" : "s"}`;
};

export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (!iso || Number.isNaN(date.getTime())) return blank;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function termText(d: NdaData): string {
  return d.termChoice === "expires"
    ? `Expires ${plural(d.termYears)} from Effective Date.`
    : "Continues until terminated in accordance with the terms of the MNDA.";
}

export function confidentialityText(d: NdaData): string {
  return d.confidentialityChoice === "years"
    ? `${plural(d.confidentialityYears)} from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`
    : "In perpetuity.";
}

/** Standard terms with the cover-page references replaced by the user's values. */
export function buildStandardTerms(d: NdaData): string {
  const values: Record<string, string> = {
    Purpose: orBlank(d.purpose),
    "Effective Date": formatDate(d.effectiveDate),
    "MNDA Term": termText(d),
    "Term of Confidentiality": confidentialityText(d),
    "Governing Law": orBlank(d.governingLaw),
    Jurisdiction: orBlank(d.jurisdiction),
  };
  return STANDARD_TERMS.replace(
    /<span class="coverpage_link">([^<]+)<\/span>/g,
    (_, key: string) => values[key] ?? key,
  );
}

/** Strips the small amount of markdown syntax the templates use, for PDF output. */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

export function isComplete(d: NdaData): boolean {
  return [d.purpose, d.governingLaw, d.jurisdiction, d.party1.company, d.party2.company].every(
    (v) => v.trim() !== "",
  );
}
