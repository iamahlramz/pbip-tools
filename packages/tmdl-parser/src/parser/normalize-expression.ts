/**
 * Normalize a multi-line expression by stripping common leading tab indentation
 * and trimming leading/trailing blank lines.
 */
export function normalizeExpression(lines: string[]): string {
  if (lines.length === 0) return '';

  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim() === '') continue;
    let tabs = 0;
    for (const ch of line) {
      if (ch === '\t') tabs++;
      else break;
    }
    minIndent = Math.min(minIndent, tabs);
  }
  if (!isFinite(minIndent)) minIndent = 0;

  const normalized = lines.map((line) => {
    if (line.trim() === '') return '';
    return line.substring(minIndent);
  });

  while (normalized.length > 0 && normalized[normalized.length - 1].trim() === '') {
    normalized.pop();
  }
  while (normalized.length > 0 && normalized[0].trim() === '') {
    normalized.shift();
  }

  return normalized.join('\n');
}
