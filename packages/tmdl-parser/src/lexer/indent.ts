export function countTabs(line: string): number {
  let count = 0;
  for (const ch of line) {
    if (ch === '\t') {
      count++;
    } else {
      break;
    }
  }
  return count;
}

export function stripIndent(line: string): string {
  let i = 0;
  while (i < line.length && line[i] === '\t') {
    i++;
  }
  return line.substring(i);
}
