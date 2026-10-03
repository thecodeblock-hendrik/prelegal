import { jsPDF } from "jspdf";
import { DISCLAIMER, DocumentDef, Draft, toPlainText, variableValue } from "./documents";

const MARGIN = 54;
const LINE = 14;
const INDENT = 14;
export const FOOTER = "Draft - subject to legal review. Not legal advice.";

export function generateDocumentPdf(document: DocumentDef, draft: Draft): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2;
  const bottom = doc.internal.pageSize.getHeight() - MARGIN;
  let y = MARGIN;

  const ensure = (h: number) => {
    if (y + h > bottom) {
      doc.addPage();
      y = MARGIN;
    }
  };
  const text = (value: string, opts: { size?: number; bold?: boolean; gap?: number; indent?: number } = {}) => {
    const left = MARGIN + (opts.indent ?? 0);
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 10.5);
    for (const line of doc.splitTextToSize(value, width - (opts.indent ?? 0)) as string[]) {
      ensure(LINE);
      doc.text(line, left, y);
      y += LINE;
    }
    y += opts.gap ?? 4;
  };

  text(document.name, { size: 18, bold: true, gap: 4 });
  text(DISCLAIMER, { size: 9, gap: 12 });
  text("Cover Page", { size: 13, bold: true });
  text(
    `This ${document.name} consists of this Cover Page and the Common Paper standard terms that follow. The values on this Cover Page define the capitalized terms used in the standard terms and control over any conflict with them.`,
    { gap: 10 },
  );
  for (const name of document.variables) {
    text(name, { bold: true, gap: 0 });
    text(variableValue(draft, name), { gap: 8 });
  }
  text(`By signing this Cover Page, each party agrees to enter into this ${document.name}.`, { gap: 10 });

  const [role1, role2] = document.parties;
  const colW = width / 3;
  const rows: [string, string, string][] = [
    ["", role1.toUpperCase(), role2.toUpperCase()],
    ["Signature", "", ""],
    ["Print Name", draft.party1.name, draft.party2.name],
    ["Title", draft.party1.title, draft.party2.title],
    ["Company", draft.party1.company, draft.party2.company],
    ["Notice Address", draft.party1.noticeAddress, draft.party2.noticeAddress],
    ["Date", "", ""],
  ];
  for (const [i, row] of rows.entries()) {
    doc.setFont("helvetica", i === 0 ? "bold" : "normal");
    doc.setFontSize(10);
    const cells = row.map((c) => doc.splitTextToSize(c, colW - 10) as string[]);
    const h = Math.max(...cells.map((c) => c.length), i === 1 ? 3 : 1) * 12 + 10;
    ensure(h);
    cells.forEach((lines, j) => {
      doc.rect(MARGIN + colW * j, y, colW, h);
      doc.text(lines, MARGIN + colW * j + 5, y + 14);
    });
    y += h;
  }

  doc.addPage();
  y = MARGIN;
  for (const line of toPlainText(document.body).split("\n")) {
    const heading = line.match(/^#+\s+(.*)/);
    if (heading) text(heading[1], { size: 16, bold: true, gap: 10 });
    else if (line.trim()) text(line.trim(), { indent: (line.search(/\S/) / 4) * INDENT, gap: 6 });
  }

  addFooters(doc);
  return doc;
}

/** Marks every page as a draft subject to legal review. */
function addFooters(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  const height = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(136);
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.text(`${FOOTER}    Page ${page} of ${pages}`, MARGIN, height - MARGIN / 2);
  }
}
