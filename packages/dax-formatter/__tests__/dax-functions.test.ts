import { describe, it, expect } from 'vitest';
import { DAX_FUNCTIONS } from '../src/dax-functions.js';

describe('DAX_FUNCTIONS catalog', () => {
  it('should contain at least 300 functions', () => {
    expect(DAX_FUNCTIONS.size).toBeGreaterThanOrEqual(300);
  });

  it('should have all entries in uppercase', () => {
    for (const fn of DAX_FUNCTIONS) {
      expect(fn).toBe(fn.toUpperCase());
    }
  });

  it('should contain core aggregation functions', () => {
    const coreFunctions = ['SUM', 'SUMX', 'AVERAGE', 'COUNT', 'COUNTROWS', 'MAX', 'MIN'];
    for (const fn of coreFunctions) {
      expect(DAX_FUNCTIONS.has(fn)).toBe(true);
    }
  });

  it('should contain key filter functions', () => {
    const filterFunctions = ['CALCULATE', 'CALCULATETABLE', 'FILTER', 'ALL', 'ALLEXCEPT', 'VALUES'];
    for (const fn of filterFunctions) {
      expect(DAX_FUNCTIONS.has(fn)).toBe(true);
    }
  });

  it('should contain dotted function names', () => {
    const dottedFunctions = ['IF.EAGER', 'NORM.DIST', 'STDEV.P', 'VAR.S'];
    for (const fn of dottedFunctions) {
      expect(DAX_FUNCTIONS.has(fn)).toBe(true);
    }
  });

  it('should have no duplicates', () => {
    const array = [...DAX_FUNCTIONS];
    const unique = new Set(array);
    expect(array.length).toBe(unique.size);
  });
});
