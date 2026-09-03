const encoder = new TextEncoder();

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, " ");
}

export type PdfText = {
  text: string;
  x: number;
  y: number;
  size?: number;
  bold?: boolean;
};

export type PdfLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width?: number;
};

export function createPdfPage(texts: PdfText[], lines: PdfLine[] = []): string {
  const commands: string[] = ["BT"];
  for (const item of texts) {
    const font = item.bold ? "/F2" : "/F1";
    const size = item.size ?? 10;
    commands.push(`${font} ${size} Tf 1 0 0 1 ${item.x} ${item.y} Tm (${escapePdfText(item.text)}) Tj`);
  }
  commands.push("ET");
  for (const line of lines) {
    commands.push(`${line.width ?? 1} w ${line.x1} ${line.y1} m ${line.x2} ${line.y2} l S`);
  }
  return commands.join("\n");
}

export function buildPdf(pages: string[]): Uint8Array {
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  const pageObjectNumbers: number[] = [];
  const fontRegular = 3 + pages.length * 2;
  const fontBold = fontRegular + 1;

  pages.forEach((content, index) => {
    const pageObject = 3 + index * 2;
    const contentObject = pageObject + 1;
    pageObjectNumbers.push(pageObject);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentObject} 0 R >>`);
    const length = encoder.encode(content).length;
    objects.push(`<< /Length ${length} >>\nstream\n${content}\nendstream`);
  });

  const kids = pageObjectNumbers.map((number) => `${number} 0 R`).join(" ");
  objects[1] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`;
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  let output = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(encoder.encode(output).length);
    output += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = encoder.encode(output).length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    output += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return encoder.encode(output);
}
