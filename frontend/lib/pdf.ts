import { jsPDF } from "jspdf";
import {
  buildStandardTerms,
  confidentialityText,
  formatDate,
  NdaData,
  termText,
  toPlainText,
} from "./nda";

const MARGIN = 54;
const LINE = 14;

export function generateNdaPdf(d: NdaData): jsPDF {
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
  const text = (value: string, opts: { size?: number; bold?: boolean; gap?: number } = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 10.5);
    for (const line of doc.splitTextToSize(value, width) as string[]) {
      ensure(LINE);
      doc.text(line, MARGIN, y);
      y += LINE;
    }
    y += opts.gap ?? 4;
  };

  text("Mutual Non-Disclosure Agreement", { size: 18, bold: true, gap: 10 });
  text("Cover Page", { size: 13, bold: true });
  text(
    "This Mutual Non-Disclosure Agreement (the “MNDA”) consists of: (1) this Cover Page and (2) the Common Paper Mutual NDA Standard Terms Version 1.0 (“Standard Terms”). Any modifications of the Standard Terms should be made on the Cover Page, which will control over conflicts with the Standard Terms.",
    { gap: 10 },
  );

  const field = (label: string, value: string) => {
    text(label, { bold: true, gap: 0 });
    text(value.trim() || "—", { gap: 8 });
  };
  field("Purpose", d.purpose);
  field("Effective Date", formatDate(d.effectiveDate));
  field("MNDA Term", termText(d));
  field("Term of Confidentiality", confidentialityText(d));
  field("Governing Law", d.governingLaw);
  field("Jurisdiction", d.jurisdiction);
  field("MNDA Modifications", d.modifications);

  text("By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.", { gap: 10 });

  const colW = width / 3;
  const rows: [string, string, string][] = [
    ["", "PARTY 1", "PARTY 2"],
    ["Signature", "", ""],
    ["Print Name", d.party1.name, d.party2.name],
    ["Title", d.party1.title, d.party2.title],
    ["Company", d.party1.company, d.party2.company],
    ["Notice Address", d.party1.noticeAddress, d.party2.noticeAddress],
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
  text("Standard Terms", { size: 16, bold: true, gap: 10 });
  const body = toPlainText(buildStandardTerms(d))
    .replace(/^# Standard Terms\s*/, "")
    .split(/\n\s*\n/);
  for (const para of body) text(para.trim(), { gap: 8 });

  return doc;
}
