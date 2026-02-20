import { DAX_FUNCTIONS } from './dax-functions.js';
import type { DaxValidationResult, DaxValidationIssue } from './types.js';

/**
 * Validate DAX syntax locally (offline, no API call).
 * Checks: bracket/paren balance, unclosed strings, empty expressions, unknown functions.
 */
export function validateDax(expression: string): DaxValidationResult {
  const issues: DaxValidationIssue[] = [];

  if (!expression || expression.trim().length === 0) {
    issues.push({ severity: 'error', message: 'Expression is empty', line: 1, column: 1 });
    return { valid: false, issues };
  }

  checkDelimiterBalance(expression, issues);
  checkUnclosedStrings(expression, issues);
  checkUnknownFunctions(expression, issues);

  const valid = issues.every((i) => i.severity !== 'error');
  return { valid, issues };
}

interface DelimiterEntry {
  char: string;
  line: number;
  column: number;
}

function checkDelimiterBalance(expression: string, issues: DaxValidationIssue[]): void {
  const stack: DelimiterEntry[] = [];
  const openers: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const closers: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

  let line = 1;
  let column = 1;
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < expression.length; i++) {
    const ch = expression[i];
    const next = i + 1 < expression.length ? expression[i + 1] : '';

    if (ch === '\n') {
      line++;
      column = 1;
      inLineComment = false;
      continue;
    }

    if (inLineComment) {
      column++;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
        column += 2;
        continue;
      }
      column++;
      continue;
    }

    if (inString) {
      if (ch === '"') {
        if (next === '"') {
          // Escaped double quote
          i++;
          column += 2;
          continue;
        }
        inString = false;
      }
      column++;
      continue;
    }

    // Not in string or comment
    if (ch === '"') {
      inString = true;
      column++;
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      column += 2;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      column += 2;
      continue;
    }

    if (ch in openers) {
      stack.push({ char: ch, line, column });
    } else if (ch in closers) {
      const expected = closers[ch];
      if (stack.length === 0) {
        issues.push({
          severity: 'error',
          message: `Unexpected '${ch}' without matching '${expected}'`,
          line,
          column,
        });
      } else {
        const top = stack[stack.length - 1];
        if (top.char !== expected) {
          issues.push({
            severity: 'error',
            message: `Mismatched '${ch}' — expected closing for '${top.char}' opened at line ${top.line}, column ${top.column}`,
            line,
            column,
          });
          stack.pop();
        } else {
          stack.pop();
        }
      }
    }

    column++;
  }

  // Report unclosed delimiters
  for (const entry of stack) {
    issues.push({
      severity: 'error',
      message: `Unclosed '${entry.char}'`,
      line: entry.line,
      column: entry.column,
    });
  }
}

function checkUnclosedStrings(expression: string, issues: DaxValidationIssue[]): void {
  let line = 1;
  let column = 1;
  let inString = false;
  let stringStartLine = 1;
  let stringStartColumn = 1;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < expression.length; i++) {
    const ch = expression[i];
    const next = i + 1 < expression.length ? expression[i + 1] : '';

    if (ch === '\n') {
      if (inString) {
        // DAX strings cannot span lines without continuation
        issues.push({
          severity: 'error',
          message: 'Unclosed string literal',
          line: stringStartLine,
          column: stringStartColumn,
        });
        inString = false;
      }
      line++;
      column = 1;
      inLineComment = false;
      continue;
    }

    if (inLineComment) {
      column++;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
        column += 2;
        continue;
      }
      column++;
      continue;
    }

    if (inString) {
      if (ch === '"') {
        if (next === '"') {
          i++;
          column += 2;
          continue;
        }
        inString = false;
      }
      column++;
      continue;
    }

    if (ch === '"') {
      inString = true;
      stringStartLine = line;
      stringStartColumn = column;
      column++;
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      column += 2;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      column += 2;
      continue;
    }

    column++;
  }

  if (inString) {
    issues.push({
      severity: 'error',
      message: 'Unclosed string literal',
      line: stringStartLine,
      column: stringStartColumn,
    });
  }
}

function checkUnknownFunctions(expression: string, issues: DaxValidationIssue[]): void {
  // Match identifiers followed by '(' — these are function calls
  // DAX functions can contain dots (e.g., IF.EAGER, NORM.DIST)
  const funcPattern = /\b([A-Za-z][A-Za-z0-9.]*)\s*\(/g;
  let match: RegExpExecArray | null;

  // Build a line/column map for the expression
  const lineStarts: number[] = [0];
  for (let i = 0; i < expression.length; i++) {
    if (expression[i] === '\n') {
      lineStarts.push(i + 1);
    }
  }

  while ((match = funcPattern.exec(expression)) !== null) {
    const funcName = match[1];
    const offset = match.index;

    // Skip if inside a string or comment — simple heuristic:
    // count unescaped quotes before this position
    if (isInsideStringOrComment(expression, offset)) {
      continue;
    }

    // Skip DAX keywords that look like functions
    const upper = funcName.toUpperCase();
    if (upper === 'VAR' || upper === 'RETURN' || upper === 'DEFINE' || upper === 'EVALUATE') {
      continue;
    }

    if (!DAX_FUNCTIONS.has(upper)) {
      const line = lineStarts.findIndex((start, idx) => {
        const nextStart = lineStarts[idx + 1] ?? expression.length + 1;
        return offset >= start && offset < nextStart;
      });
      const column = offset - lineStarts[line] + 1;

      issues.push({
        severity: 'warning',
        message: `Unknown function '${funcName}'`,
        line: line + 1,
        column,
      });
    }
  }
}

function isInsideStringOrComment(expression: string, targetOffset: number): boolean {
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < targetOffset; i++) {
    const ch = expression[i];
    const next = i + 1 < expression.length ? expression[i + 1] : '';

    if (ch === '\n') {
      inLineComment = false;
      continue;
    }

    if (inLineComment) continue;

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (inString) {
      if (ch === '"') {
        if (next === '"') {
          i++;
          continue;
        }
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
  }

  return inString || inLineComment || inBlockComment;
}
