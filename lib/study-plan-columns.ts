/**
 * Study-plan PDFs print two semesters side by side, so extracted text reads
 * across both columns ("GEAE101 ... CENG202 ..."). A model reading such a row
 * can attach a first-semester course to the second semester. This splits each
 * two-column block into one list per semester, keeping every line's text.
 */
const LABEL = /Year\s*\d+\s*[-–—]\s*(?:First|Second|Third|Summer|Fall|Spring|1st|2nd)\s+(?:Semester|Session|Term)|Summer\s+(?:Semester|Session|Term)/giu;

function labels(line: string): number[] {
  return [...line.matchAll(LABEL)].map((m) => m.index ?? 0);
}

/** Split point at or just before `col`, moved back to the start of a word straddling it. */
function splitAt(line: string, col: number): number {
  if (line.length <= col) return line.length;
  let p = col;
  while (p > 0 && line[p - 1] !== " " && line[p] !== " ") p--;
  return p;
}

export function splitSemesterColumns(text: string): string {
  if (!/Semester|Session|Term/u.test(text)) return text;
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;
  let changed = false;
  while (i < lines.length) {
    const header = lines[i];
    const at = labels(header);
    if (at.length !== 2 || at[1] - at[0] < 20) { out.push(header); i++; continue; }
    const col = at[1];
    const left = [header.slice(0, col).trim()];
    const right = [header.slice(col).trim()];
    i++;
    while (i < lines.length && labels(lines[i]).length === 0) {
      const line = lines[i];
      const p = splitAt(line, col);
      const l = line.slice(0, p).trimEnd();
      const r = line.slice(p).trim();
      if (l.trim()) left.push(l.trim());
      if (r) right.push(r);
      i++;
    }
    out.push(left.join("\n"), "", right.join("\n"), "");
    changed = true;
  }
  return changed ? out.join("\n").replace(/\n{3,}/g, "\n\n").trim() : text;
}
