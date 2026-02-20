import type { CultureNode } from '@pbip-tools/core';
import type { Token } from '../lexer/index.js';
import { TokenType } from '../lexer/index.js';
import type { ParseWarning } from '../errors.js';

export function parseCulture(
  tokens: Token[],
  _warnings: ParseWarning[],
  _file?: string,
): CultureNode {
  const cultureToken = tokens.find((t) => t.type === TokenType.CULTURE);
  if (!cultureToken) {
    return {
      kind: 'culture',
      name: 'unknown',
    };
  }

  const node: CultureNode = {
    kind: 'culture',
    name: cultureToken.name ?? 'unknown',
    range: {
      start: { line: cultureToken.line, column: 0 },
      end: { line: cultureToken.line, column: 0 },
    },
  };

  const baseIndent = cultureToken.indent;
  let i = tokens.indexOf(cultureToken) + 1;

  // Collect linguisticMetadata
  const metadataLines: string[] = [];
  let collectingMetadata = false;

  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === TokenType.BLANK_LINE && !collectingMetadata) {
      i++;
      continue;
    }
    if (t.indent <= baseIndent && t.type !== TokenType.BLANK_LINE && !collectingMetadata) break;

    if (
      t.type === TokenType.PROPERTY &&
      t.keyword === 'linguisticMetadata' &&
      (t.value === '' || !t.value)
    ) {
      collectingMetadata = true;
      i++;
      continue;
    }

    if (collectingMetadata && t.type === TokenType.EXPRESSION_CONTENT) {
      metadataLines.push(t.value ?? t.raw);
      i++;
      continue;
    }

    if (collectingMetadata && t.type !== TokenType.EXPRESSION_CONTENT) {
      collectingMetadata = false;
      // Don't increment — re-process this token
      continue;
    }

    i++;
  }

  if (metadataLines.length > 0) {
    // Normalize the JSON — strip leading tabs
    let minIndent = Infinity;
    for (const line of metadataLines) {
      if (line.trim() === '') continue;
      let tabs = 0;
      for (const ch of line) {
        if (ch === '\t') tabs++;
        else break;
      }
      minIndent = Math.min(minIndent, tabs);
    }
    if (!isFinite(minIndent)) minIndent = 0;

    const normalized = metadataLines.map((line) => {
      if (line.trim() === '') return '';
      return line.substring(minIndent);
    });

    node.linguisticMetadata = normalized.join('\n').trim();
  }

  return node;
}
