import {
  type Token,
  TokenType,
  STRUCTURAL_KEYWORDS,
  BOOLEAN_FLAGS,
  PROPERTY_KEYWORDS,
} from './tokens.js';
import { countTabs, stripIndent } from './indent.js';

export type LexerState = 'NORMAL' | 'DAX_BLOCK' | 'DAX_MULTILINE' | 'MCODE_BLOCK' | 'JSON_BLOB';

export interface LexerContext {
  state: LexerState;
  expressionIndent: number;
  blockStartIndent: number;
}

export function tokenize(text: string): Token[] {
  const lines = text.split(/\r?\n/);
  const tokens: Token[] = [];
  const ctx: LexerContext = {
    state: 'NORMAL',
    expressionIndent: 0,
    blockStartIndent: 0,
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNum = i + 1;

    // Handle empty/blank lines
    if (raw.trim() === '') {
      if (ctx.state === 'NORMAL') {
        tokens.push({
          type: TokenType.BLANK_LINE,
          indent: 0,
          line: lineNum,
          raw,
        });
        continue;
      }
      // In expression blocks, blank lines are part of the expression
    }

    const indent = countTabs(raw);
    const stripped = stripIndent(raw);

    // --- State machine ---
    switch (ctx.state) {
      case 'DAX_BLOCK': {
        // Inside backtick-delimited block — look for closing ```
        if (stripped.trimEnd() === '```') {
          tokens.push({
            type: TokenType.BACKTICK_FENCE,
            indent,
            line: lineNum,
            raw,
          });
          ctx.state = 'NORMAL';
        } else {
          tokens.push({
            type: TokenType.EXPRESSION_CONTENT,
            indent,
            value: raw,
            line: lineNum,
            raw,
          });
        }
        continue;
      }

      case 'DAX_MULTILINE': {
        // Multi-line DAX ends when indent drops back to or below the property level
        // AND the line starts with a recognized keyword at that indent
        if (raw.trim() === '') {
          tokens.push({
            type: TokenType.EXPRESSION_CONTENT,
            indent,
            value: raw,
            line: lineNum,
            raw,
          });
          continue;
        }

        if (indent <= ctx.expressionIndent && isKeywordLine(stripped)) {
          ctx.state = 'NORMAL';
          // Fall through to NORMAL processing
        } else {
          tokens.push({
            type: TokenType.EXPRESSION_CONTENT,
            indent,
            value: raw,
            line: lineNum,
            raw,
          });
          continue;
        }
        break;
      }

      case 'MCODE_BLOCK': {
        // M-code block (partition source or expression body)
        // Ends when indent drops back AND next line is a recognized keyword
        if (raw.trim() === '') {
          tokens.push({
            type: TokenType.EXPRESSION_CONTENT,
            indent,
            value: raw,
            line: lineNum,
            raw,
          });
          continue;
        }

        if (indent <= ctx.expressionIndent && isKeywordLine(stripped)) {
          ctx.state = 'NORMAL';
          // Fall through to NORMAL processing
        } else {
          tokens.push({
            type: TokenType.EXPRESSION_CONTENT,
            indent,
            value: raw,
            line: lineNum,
            raw,
          });
          continue;
        }
        break;
      }

      case 'JSON_BLOB': {
        // JSON blob (linguisticMetadata) — read until indent drops
        if (raw.trim() === '') {
          tokens.push({
            type: TokenType.EXPRESSION_CONTENT,
            indent,
            value: raw,
            line: lineNum,
            raw,
          });
          continue;
        }

        if (indent <= ctx.expressionIndent && isKeywordLine(stripped)) {
          ctx.state = 'NORMAL';
          // Fall through to NORMAL
        } else {
          tokens.push({
            type: TokenType.EXPRESSION_CONTENT,
            indent,
            value: raw,
            line: lineNum,
            raw,
          });
          continue;
        }
        break;
      }

      default:
        break;
    }

    // --- NORMAL state ---
    if (raw.trim() === '') {
      tokens.push({
        type: TokenType.BLANK_LINE,
        indent: 0,
        line: lineNum,
        raw,
      });
      continue;
    }

    // Doc comments (///)
    if (stripped.startsWith('///')) {
      tokens.push({
        type: TokenType.DOC_COMMENT,
        indent,
        value: stripped.substring(3).trim(),
        line: lineNum,
        raw,
      });
      continue;
    }

    // Try to parse as structural keyword or property
    const token = parseLine(stripped, indent, lineNum, raw);

    // Check if this line opens an expression block
    if (token.type === TokenType.PROPERTY && token.keyword === 'source' && token.value === '') {
      // `source =` on partition — M-code follows
      ctx.state = 'MCODE_BLOCK';
      ctx.expressionIndent = indent;
      ctx.blockStartIndent = indent;
    } else if (
      token.type === TokenType.PROPERTY &&
      token.keyword === 'linguisticMetadata' &&
      token.value === ''
    ) {
      // `linguisticMetadata =` — JSON blob follows
      ctx.state = 'JSON_BLOB';
      ctx.expressionIndent = indent;
      ctx.blockStartIndent = indent;
    } else if (
      token.type === TokenType.PROPERTY &&
      token.keyword === 'formatStringExpression' &&
      token.value === ''
    ) {
      // Multi-line formatStringExpression
      ctx.state = 'DAX_MULTILINE';
      ctx.expressionIndent = indent;
      ctx.blockStartIndent = indent;
    } else if (token.type === TokenType.MEASURE || token.type === TokenType.EXPRESSION) {
      // Check if expression value starts with ``` or ends with =
      if (token.value !== undefined) {
        const val = token.value.trim();
        if (val === '```' || val.startsWith('```\n') || val.startsWith('```\r')) {
          // Backtick block
          ctx.state = 'DAX_BLOCK';
          ctx.blockStartIndent = indent;
          // Clear the ``` from value — content will be collected as EXPRESSION_CONTENT
          token.value = '';
          tokens.push(token);
          tokens.push({
            type: TokenType.BACKTICK_FENCE,
            indent,
            line: lineNum,
            raw,
          });
          continue;
        } else if (val === '') {
          // `measure Name =` with no inline value — multi-line DAX follows
          ctx.state = 'DAX_MULTILINE';
          ctx.expressionIndent = indent + 1; // Properties at indent+1
          ctx.blockStartIndent = indent;
        }
      }
    } else if (token.type === TokenType.CALCULATION_ITEM) {
      // calculationItem may have inline or multi-line DAX
      if (token.value !== undefined) {
        const val = token.value.trim();
        if (val === '') {
          ctx.state = 'DAX_MULTILINE';
          ctx.expressionIndent = indent + 1;
          ctx.blockStartIndent = indent;
        }
      }
    } else if (token.type === TokenType.TABLE_PERMISSION) {
      // tablePermission may have inline or multi-line DAX filter
      if (token.value !== undefined) {
        const val = token.value.trim();
        if (val === '') {
          ctx.state = 'DAX_MULTILINE';
          ctx.expressionIndent = indent + 1;
          ctx.blockStartIndent = indent;
        }
      }
    }

    tokens.push(token);
  }

  return tokens;
}

function parseLine(stripped: string, indent: number, lineNum: number, raw: string): Token {
  // Check for structural keywords
  const firstWord = stripped.split(/[\s:]/)[0];

  // Detect if this is a "key: value" pattern (colon immediately after keyword)
  // This handles `column: Year` (property) vs `column ProductKey` (structural)
  const afterKeyword = stripped.substring(firstWord.length);
  const isColonSyntax = afterKeyword.startsWith(':');

  // If it's colon syntax and the keyword is in PROPERTY_KEYWORDS or is a structural keyword
  // used as a property reference, treat it as a property
  if (isColonSyntax && (PROPERTY_KEYWORDS.has(firstWord) || firstWord in STRUCTURAL_KEYWORDS)) {
    const colonIndex = stripped.indexOf(':');
    return {
      type: TokenType.PROPERTY,
      indent,
      keyword: firstWord,
      value: stripped.substring(colonIndex + 1).trim(),
      line: lineNum,
      raw,
    };
  }

  // Boolean flags (standalone keyword, no value)
  if (BOOLEAN_FLAGS.has(firstWord) && stripped.trim() === firstWord) {
    return {
      type: TokenType.BOOLEAN_FLAG,
      indent,
      keyword: firstWord,
      value: 'true',
      line: lineNum,
      raw,
    };
  }

  // Structural keywords
  if (firstWord in STRUCTURAL_KEYWORDS) {
    const token: Token = {
      type: STRUCTURAL_KEYWORDS[firstWord],
      indent,
      keyword: firstWord,
      line: lineNum,
      raw,
    };

    // Parse name and optional value
    const rest = stripped.substring(firstWord.length).trim();

    if (token.type === TokenType.REF) {
      // `ref table 'Name'` or `ref table Name`
      const refRest = rest;
      const refMatch = refRest.match(/^table\s+(.+)$/);
      if (refMatch) {
        token.name = unquoteName(refMatch[1].trim());
      }
    } else if (
      token.type === TokenType.MEASURE ||
      token.type === TokenType.EXPRESSION ||
      token.type === TokenType.CALCULATION_ITEM ||
      token.type === TokenType.TABLE_PERMISSION
    ) {
      // `measure 'Name' = VALUE` or `tablePermission Store = DAX`
      const eqIndex = rest.indexOf('=');
      if (eqIndex >= 0) {
        token.name = unquoteName(rest.substring(0, eqIndex).trim());
        token.value = rest.substring(eqIndex + 1).trim();
      } else {
        token.name = unquoteName(rest);
      }
    } else if (token.type === TokenType.PARTITION) {
      // `partition Name = m` or `partition Name = calculated`
      const eqIndex = rest.indexOf('=');
      if (eqIndex >= 0) {
        token.name = unquoteName(rest.substring(0, eqIndex).trim());
        token.value = rest.substring(eqIndex + 1).trim();
      } else {
        token.name = unquoteName(rest);
      }
    } else if (token.type === TokenType.ANNOTATION) {
      // `annotation Name = Value`
      const eqIndex = rest.indexOf('=');
      if (eqIndex >= 0) {
        token.name = rest.substring(0, eqIndex).trim();
        token.value = rest.substring(eqIndex + 1).trim();
      } else {
        token.name = rest.trim();
      }
    } else if (token.type === TokenType.CHANGED_PROPERTY) {
      // `changedProperty = Name`
      const eqIndex = rest.indexOf('=');
      if (eqIndex >= 0) {
        token.name = rest.substring(eqIndex + 1).trim();
      } else {
        token.name = rest.trim();
      }
    } else if (
      token.type === TokenType.CALCULATION_GROUP ||
      token.type === TokenType.DATA_ACCESS_OPTIONS
    ) {
      // No name
    } else if (token.type === TokenType.QUERY_GROUP) {
      // `queryGroup Name`
      token.name = unquoteName(rest);
    } else {
      // database, model, table, column, hierarchy, level, relationship, culture
      token.name = unquoteName(rest);
    }

    return token;
  }

  // Property keywords (key: value pattern)
  const colonIndex = stripped.indexOf(':');
  if (colonIndex > 0) {
    const key = stripped.substring(0, colonIndex).trim();
    if (PROPERTY_KEYWORDS.has(key)) {
      return {
        type: TokenType.PROPERTY,
        indent,
        keyword: key,
        value: stripped.substring(colonIndex + 1).trim(),
        line: lineNum,
        raw,
      };
    }
  }

  // Check for `key =` pattern (property with = assignment)
  const eqIndex = stripped.indexOf('=');
  if (eqIndex > 0) {
    const key = stripped.substring(0, eqIndex).trim();
    if (PROPERTY_KEYWORDS.has(key)) {
      return {
        type: TokenType.PROPERTY,
        indent,
        keyword: key,
        value: stripped.substring(eqIndex + 1).trim(),
        line: lineNum,
        raw,
      };
    }
  }

  // Boolean flags (may appear with indent)
  if (BOOLEAN_FLAGS.has(stripped.trim())) {
    return {
      type: TokenType.BOOLEAN_FLAG,
      indent,
      keyword: stripped.trim(),
      value: 'true',
      line: lineNum,
      raw,
    };
  }

  // Unknown
  return {
    type: TokenType.UNKNOWN,
    indent,
    value: stripped,
    line: lineNum,
    raw,
  };
}

function isKeywordLine(stripped: string): boolean {
  if (stripped.startsWith('///')) return true;

  const firstWord = stripped.split(/[\s:=]/)[0];
  if (firstWord in STRUCTURAL_KEYWORDS) return true;
  if (PROPERTY_KEYWORDS.has(firstWord)) return true;
  if (BOOLEAN_FLAGS.has(firstWord)) return true;

  return false;
}

export function unquoteName(name: string): string {
  const trimmed = name.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
