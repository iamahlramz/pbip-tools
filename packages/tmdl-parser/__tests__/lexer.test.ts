import { tokenize } from '../src/index.js';
import { TokenType } from '../src/index.js';

describe('tokenize', () => {
  it('tokenizes a simple database declaration', () => {
    const input = 'database Minimal\n\tcompatibilityLevel: 1601\n';
    const tokens = tokenize(input);

    expect(tokens.length).toBeGreaterThanOrEqual(2);
    expect(tokens[0].type).toBe(TokenType.DATABASE);
    expect(tokens[0].name).toBe('Minimal');
    expect(tokens[0].indent).toBe(0);

    const propToken = tokens.find(
      (t) => t.type === TokenType.PROPERTY && t.keyword === 'compatibilityLevel',
    );
    expect(propToken).toBeDefined();
    expect(propToken!.value).toBe('1601');
    expect(propToken!.indent).toBe(1);
  });

  it('tokenizes a column with boolean flags (isKey, isHidden)', () => {
    const input = ['\tcolumn ProductKey', '\t\tdataType: int64', '\t\tisKey', '\t\tisHidden'].join(
      '\n',
    );

    const tokens = tokenize(input);

    const colToken = tokens.find((t) => t.type === TokenType.COLUMN);
    expect(colToken).toBeDefined();
    expect(colToken!.name).toBe('ProductKey');
    expect(colToken!.indent).toBe(1);

    const dataTypeToken = tokens.find(
      (t) => t.type === TokenType.PROPERTY && t.keyword === 'dataType',
    );
    expect(dataTypeToken).toBeDefined();
    expect(dataTypeToken!.value).toBe('int64');

    const boolFlags = tokens.filter((t) => t.type === TokenType.BOOLEAN_FLAG);
    expect(boolFlags).toHaveLength(2);
    expect(boolFlags[0].keyword).toBe('isKey');
    expect(boolFlags[0].value).toBe('true');
    expect(boolFlags[1].keyword).toBe('isHidden');
    expect(boolFlags[1].value).toBe('true');
  });

  it('tokenizes a measure with inline DAX', () => {
    const input = "\tmeasure 'Total Products' = COUNTROWS(Products)\n\t\tformatString: #,0\n";
    const tokens = tokenize(input);

    const measureToken = tokens.find((t) => t.type === TokenType.MEASURE);
    expect(measureToken).toBeDefined();
    expect(measureToken!.name).toBe('Total Products');
    expect(measureToken!.value).toBe('COUNTROWS(Products)');

    const fmtToken = tokens.find(
      (t) => t.type === TokenType.PROPERTY && t.keyword === 'formatString',
    );
    expect(fmtToken).toBeDefined();
    expect(fmtToken!.value).toBe('#,0');
  });

  it('tokenizes a measure with backtick-delimited DAX', () => {
    const input = [
      "\tmeasure 'Product Share' = ```",
      '\t\tVAR _total = COUNTROWS(ALL(Products))',
      '\t\tRETURN',
      '\t\t\tDIVIDE(_total, 1, 0)',
      '\t```',
      '\t\tformatString: 0.0%',
    ].join('\n');

    const tokens = tokenize(input);

    const measureToken = tokens.find((t) => t.type === TokenType.MEASURE);
    expect(measureToken).toBeDefined();
    expect(measureToken!.name).toBe('Product Share');
    // Value is cleared for backtick blocks
    expect(measureToken!.value).toBe('');

    const fences = tokens.filter((t) => t.type === TokenType.BACKTICK_FENCE);
    expect(fences).toHaveLength(2);

    const exprContent = tokens.filter((t) => t.type === TokenType.EXPRESSION_CONTENT);
    expect(exprContent.length).toBeGreaterThanOrEqual(3);
    expect(exprContent[0].value).toContain('VAR _total');
  });

  it('tokenizes doc comments (///)', () => {
    const input = ['\t/// The unique product identifier', '\tcolumn ProductKey'].join('\n');

    const tokens = tokenize(input);

    const docComment = tokens.find((t) => t.type === TokenType.DOC_COMMENT);
    expect(docComment).toBeDefined();
    expect(docComment!.value).toBe('The unique product identifier');
    expect(docComment!.indent).toBe(1);
  });

  it('handles blank lines correctly', () => {
    const input = 'database Test\n\n\tcompatibilityLevel: 1601\n';
    const tokens = tokenize(input);

    const blankTokens = tokens.filter((t) => t.type === TokenType.BLANK_LINE);
    expect(blankTokens.length).toBeGreaterThanOrEqual(1);
  });

  it('handles multi-line DAX (indent-based)', () => {
    const input = [
      "\tmeasure 'Grand Total' =",
      '\t\tSUMX(',
      '\t\t\tProducts,',
      '\t\t\tProducts[ProductKey]',
      '\t\t)',
      '\t\tformatString: #,0',
    ].join('\n');

    const tokens = tokenize(input);

    const measureToken = tokens.find((t) => t.type === TokenType.MEASURE);
    expect(measureToken).toBeDefined();
    expect(measureToken!.name).toBe('Grand Total');
    // Empty value means multi-line follows
    expect(measureToken!.value).toBe('');

    const exprContent = tokens.filter((t) => t.type === TokenType.EXPRESSION_CONTENT);
    expect(exprContent.length).toBeGreaterThanOrEqual(4);
    expect(exprContent[0].value).toContain('SUMX(');

    // formatString should be recognized as a property, not expression content
    const fmtToken = tokens.find(
      (t) => t.type === TokenType.PROPERTY && t.keyword === 'formatString',
    );
    expect(fmtToken).toBeDefined();
    expect(fmtToken!.value).toBe('#,0');
  });
});
