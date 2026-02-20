import type { SemanticModel, SecurityConfig } from '@pbip-tools/core';
import {
  REDACTED_MCODE_PLACEHOLDER,
  REDACTED_CONNECTION_PLACEHOLDER,
} from '@pbip-tools/core';

/**
 * Apply security filtering to a SemanticModel, redacting sensitive content
 * like M-code expressions and connection strings before AI context use.
 */
export function applySecurityFilter(
  model: SemanticModel,
  config: SecurityConfig,
): SemanticModel {
  // Deep clone to avoid mutating the original
  const filtered: SemanticModel = JSON.parse(JSON.stringify(model));

  if (config.redactMCode) {
    redactMCode(filtered);
  }

  if (config.redactConnectionStrings) {
    redactConnectionStrings(filtered);
  }

  return filtered;
}

// --- M-code patterns ---

const MCODE_PATTERNS = [
  /\blet\b[\s\S]*\bin\b/i,     // let ... in (M-code block)
  /\bSource\s*=/i,              // Source = (common M-code start)
];

function isMCodeExpression(expr: string): boolean {
  return MCODE_PATTERNS.some((pattern) => pattern.test(expr));
}

function isSimpleParameterExpression(expr: string): boolean {
  // Simple parameter values look like: "value" meta [...]
  // They are quoted strings with optional meta blocks
  const trimmed = expr.trim();
  return /^"[^"]*"\s*meta\s*\[/.test(trimmed);
}

function redactMCode(model: SemanticModel): void {
  // Redact partition source expressions of type mCode
  for (const table of model.tables) {
    for (const partition of table.partitions) {
      if (partition.source.type === 'mCode') {
        partition.source.expression = REDACTED_MCODE_PLACEHOLDER;
      }
    }
  }

  // Redact expression nodes that contain M-code patterns
  for (const expr of model.expressions) {
    if (isSimpleParameterExpression(expr.expression)) {
      // Preserve simple parameter values (quoted strings with meta)
      continue;
    }
    if (isMCodeExpression(expr.expression)) {
      expr.expression = REDACTED_MCODE_PLACEHOLDER;
    }
  }
}

// --- Connection string patterns ---

const CONNECTION_PATTERNS = [
  /Server\s*=[^\s;]+/gi,
  /Data Source\s*=[^\s;]+/gi,
  /Sql\.Database\s*\([^)]*\)/gi,
  /SharePoint\.Files\s*\([^)]*\)/gi,
  /https?:\/\/[^\s"',)]+/gi,
];

function redactConnectionStrings(model: SemanticModel): void {
  // Redact connection strings in expression nodes
  for (const expr of model.expressions) {
    expr.expression = redactConnectionInString(expr.expression);
  }

  // Redact connection strings in partition source expressions
  for (const table of model.tables) {
    for (const partition of table.partitions) {
      if (partition.source.type === 'mCode' || partition.source.type === 'calculated') {
        partition.source.expression = redactConnectionInString(partition.source.expression);
      }
    }
  }
}

function redactConnectionInString(value: string): string {
  let result = value;
  for (const pattern of CONNECTION_PATTERNS) {
    // Reset lastIndex since we use the global flag
    pattern.lastIndex = 0;
    result = result.replace(pattern, REDACTED_CONNECTION_PLACEHOLDER);
  }
  return result;
}
