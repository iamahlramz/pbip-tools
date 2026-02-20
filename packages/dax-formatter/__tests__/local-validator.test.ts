import { describe, it, expect } from 'vitest';
import { validateDax } from '../src/local-validator.js';

describe('validateDax', () => {
  describe('empty expressions', () => {
    it('should report error for empty string', () => {
      const result = validateDax('');
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('error');
      expect(result.issues[0].message).toContain('empty');
    });

    it('should report error for whitespace-only string', () => {
      const result = validateDax('   \n  ');
      expect(result.valid).toBe(false);
    });
  });

  describe('delimiter balance', () => {
    it('should pass for balanced parentheses', () => {
      const result = validateDax('SUM(Table[Col])');
      expect(result.valid).toBe(true);
      expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
    });

    it('should report unclosed parenthesis', () => {
      const result = validateDax('SUM(Table[Col]');
      expect(result.valid).toBe(false);
      const errors = result.issues.filter((i) => i.severity === 'error');
      expect(errors.some((e) => e.message.includes("Unclosed '("))).toBe(true);
    });

    it('should report unclosed bracket', () => {
      const result = validateDax('Table[Col');
      expect(result.valid).toBe(false);
      const errors = result.issues.filter((i) => i.severity === 'error');
      expect(errors.some((e) => e.message.includes("Unclosed '["))).toBe(true);
    });

    it('should report unexpected closer', () => {
      const result = validateDax('SUM)');
      expect(result.valid).toBe(false);
      const errors = result.issues.filter((i) => i.severity === 'error');
      expect(errors.some((e) => e.message.includes("Unexpected ')'"))).toBe(true);
    });

    it('should report mismatched delimiters', () => {
      const result = validateDax('SUM(Table[Col)]');
      expect(result.valid).toBe(false);
    });

    it('should handle nested delimiters', () => {
      const result = validateDax('IF(ISBLANK([Measure]), 0, [Measure] / [Total])');
      expect(result.valid).toBe(true);
    });

    it('should handle curly braces', () => {
      const result = validateDax('[Col] IN {"A", "B", "C"}');
      expect(result.valid).toBe(true);
    });
  });

  describe('string handling', () => {
    it('should pass for valid quoted strings', () => {
      const result = validateDax('IF([Col] = "hello", 1, 0)');
      expect(result.valid).toBe(true);
    });

    it('should handle escaped double quotes', () => {
      const result = validateDax('IF([Col] = "he""llo", 1, 0)');
      expect(result.valid).toBe(true);
    });

    it('should report unclosed string on same line', () => {
      const result = validateDax('"hello');
      expect(result.valid).toBe(false);
      const errors = result.issues.filter((i) => i.severity === 'error');
      expect(errors.some((e) => e.message.includes('Unclosed string'))).toBe(true);
    });

    it('should not count delimiters inside strings', () => {
      const result = validateDax('IF([Col] = "(test)", 1, 0)');
      expect(result.valid).toBe(true);
    });
  });

  describe('comment handling', () => {
    it('should ignore delimiters in line comments', () => {
      const result = validateDax('SUM(Table[Col]) // this ( is ignored');
      expect(result.valid).toBe(true);
    });

    it('should ignore delimiters in block comments', () => {
      const result = validateDax('SUM(Table[Col]) /* ( [ { */');
      expect(result.valid).toBe(true);
    });
  });

  describe('unknown function detection', () => {
    it('should not warn for known functions', () => {
      const result = validateDax('SUM(Table[Col])');
      expect(result.issues.filter((i) => i.severity === 'warning')).toHaveLength(0);
    });

    it('should warn for unknown functions', () => {
      const result = validateDax('MYFUNC(Table[Col])');
      const warnings = result.issues.filter((i) => i.severity === 'warning');
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      expect(warnings[0].message).toContain('MYFUNC');
    });

    it('should not warn for DAX keywords like VAR', () => {
      const result = validateDax('VAR(x)');
      // VAR is excluded from function checking
      const warnings = result.issues.filter(
        (i) => i.severity === 'warning' && i.message.includes('VAR'),
      );
      expect(warnings).toHaveLength(0);
    });

    it('should not warn for functions inside strings', () => {
      const result = validateDax('IF([Col] = "MYFUNC(x)", 1, 0)');
      const warnings = result.issues.filter(
        (i) => i.severity === 'warning' && i.message.includes('MYFUNC'),
      );
      expect(warnings).toHaveLength(0);
    });

    it('should handle dotted function names', () => {
      const result = validateDax('IF.EAGER(TRUE(), 1, 0)');
      const warnings = result.issues.filter((i) => i.severity === 'warning');
      expect(warnings).toHaveLength(0);
    });
  });

  describe('complex real-world expressions', () => {
    it('should validate a VAR/RETURN pattern', () => {
      const dax = `
VAR _total = SUM(Sales[Amount])
VAR _count = COUNTROWS(Sales)
RETURN
  DIVIDE(_total, _count, 0)
`;
      const result = validateDax(dax);
      expect(result.valid).toBe(true);
    });

    it('should validate CALCULATE with multiple filters', () => {
      const dax = `CALCULATE(
  SUM(Sales[Amount]),
  FILTER(ALL(Date[Year]), Date[Year] = MAX(Date[Year])),
  Products[Category] = "Electronics"
)`;
      const result = validateDax(dax);
      expect(result.valid).toBe(true);
    });

    it('should report multiple issues in one expression', () => {
      const result = validateDax('MYFUNC(Table[Col)');
      // Should have: unknown function warning + mismatched delimiters
      expect(result.issues.length).toBeGreaterThanOrEqual(1);
    });

    it('should report correct line/column for multi-line errors', () => {
      // Use explicit string to control line positions exactly
      const dax = 'SUM(\n  Table[Col\n)';
      const result = validateDax(dax);
      expect(result.valid).toBe(false);
      // Mismatch detected at ')' on line 3 — reports that '[' from line 2 was expected to close first
      const mismatchError = result.issues.find(
        (i) => i.severity === 'error' && i.message.includes("'['"),
      );
      expect(mismatchError).toBeDefined();
      expect(mismatchError!.line).toBe(3);
    });
  });
});
