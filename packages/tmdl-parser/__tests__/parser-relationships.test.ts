import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTmdl } from '../src/index.js';
import type { RelationshipNode } from '@pbip-tools/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../..', 'fixtures');

describe('parser-relationships', () => {
  let relationships: RelationshipNode[];

  beforeAll(() => {
    const text = readFileSync(
      resolve(FIXTURES, 'standard/AdventureWorks.SemanticModel/definition/relationships.tmdl'),
      'utf-8',
    );
    const result = parseTmdl(text, 'relationship');
    expect(result.type).toBe('relationship');
    relationships = (result as { type: 'relationship'; nodes: RelationshipNode[] }).nodes;
  });

  it('parses 4 relationships', () => {
    expect(relationships).toHaveLength(4);
  });

  describe('GUID-named relationship (18f9fb00-...)', () => {
    it('has correct from/to columns', () => {
      const rel = relationships.find((r) => r.name.startsWith('18f9fb00'));
      expect(rel).toBeDefined();
      expect(rel!.name).toBe('18f9fb00-5765-4e5e-8e8a-4a04302ec14a');
      expect(rel!.fromTable).toBe('FactSales');
      expect(rel!.fromColumn).toBe('DateKey');
      expect(rel!.toTable).toBe('DimDate');
      expect(rel!.toColumn).toBe('DateKey');
    });

    it('has no special attributes', () => {
      const rel = relationships.find((r) => r.name.startsWith('18f9fb00'))!;
      expect(rel.isActive).toBeUndefined();
      expect(rel.crossFilteringBehavior).toBeUndefined();
      expect(rel.toCardinality).toBeUndefined();
    });
  });

  describe('descriptive-named relationship (FactSales_DimCustomer)', () => {
    it('has correct from/to columns', () => {
      const rel = relationships.find((r) => r.name === 'FactSales_DimCustomer');
      expect(rel).toBeDefined();
      expect(rel!.fromTable).toBe('FactSales');
      expect(rel!.fromColumn).toBe('CustomerKey');
      expect(rel!.toTable).toBe('DimCustomer');
      expect(rel!.toColumn).toBe('CustomerKey');
    });
  });

  describe('inactive relationship', () => {
    it('has isActive: false', () => {
      const rel = relationships.find((r) => r.name === 'Inactive Date');
      expect(rel).toBeDefined();
      expect(rel!.isActive).toBe(false);
      expect(rel!.crossFilteringBehavior).toBe('bothDirections');
      expect(rel!.fromTable).toBe('FactSales');
      expect(rel!.fromColumn).toBe('DateKey');
      expect(rel!.toTable).toBe('DimDate');
      expect(rel!.toColumn).toBe('DateKey');
    });
  });

  describe('many-to-many with bothDirections', () => {
    it('has toCardinality many and bothDirections', () => {
      const rel = relationships.find((r) => r.name === 'ManyToMany_Example');
      expect(rel).toBeDefined();
      expect(rel!.toCardinality).toBe('many');
      expect(rel!.crossFilteringBehavior).toBe('bothDirections');
      expect(rel!.fromTable).toBe('DimCustomer');
      expect(rel!.fromColumn).toBe('Region');
      expect(rel!.toTable).toBe('FactSales');
      expect(rel!.toColumn).toBe('CustomerKey');
    });
  });
});
