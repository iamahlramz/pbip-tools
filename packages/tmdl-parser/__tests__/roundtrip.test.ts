import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseTmdl,
  serializeDatabase,
  serializeRelationships,
} from '../src/index.js';
import type { DatabaseNode, RelationshipNode } from '@pbip-tools/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../..', 'fixtures');

describe('roundtrip', () => {
  describe('minimal database.tmdl', () => {
    it('parse -> serialize -> parse again -> compare AST', () => {
      const text = readFileSync(
        resolve(FIXTURES, 'minimal/Minimal.SemanticModel/definition/database.tmdl'),
        'utf-8',
      );

      // First parse
      const result1 = parseTmdl(text, 'database');
      expect(result1.type).toBe('database');
      const node1 = (result1 as { type: 'database'; node: DatabaseNode }).node;

      // Serialize
      const serialized = serializeDatabase(node1);

      // Second parse
      const result2 = parseTmdl(serialized, 'database');
      expect(result2.type).toBe('database');
      const node2 = (result2 as { type: 'database'; node: DatabaseNode }).node;

      // Compare AST (ignoring range/rawLines metadata)
      expect(node2.name).toBe(node1.name);
      expect(node2.compatibilityLevel).toBe(node1.compatibilityLevel);
      expect(node2.kind).toBe(node1.kind);
    });
  });

  describe('standard relationships.tmdl', () => {
    it('parse -> serialize -> parse again -> compare relationship nodes', () => {
      const text = readFileSync(
        resolve(FIXTURES, 'standard/AdventureWorks.SemanticModel/definition/relationships.tmdl'),
        'utf-8',
      );

      // First parse
      const result1 = parseTmdl(text, 'relationship');
      expect(result1.type).toBe('relationship');
      const nodes1 = (result1 as { type: 'relationship'; nodes: RelationshipNode[] }).nodes;

      // Serialize
      const serialized = serializeRelationships(nodes1);

      // Second parse
      const result2 = parseTmdl(serialized, 'relationship');
      expect(result2.type).toBe('relationship');
      const nodes2 = (result2 as { type: 'relationship'; nodes: RelationshipNode[] }).nodes;

      // Compare: same count
      expect(nodes2).toHaveLength(nodes1.length);

      // Compare each relationship node (same names, same from/to columns)
      for (let i = 0; i < nodes1.length; i++) {
        const r1 = nodes1[i];
        const r2 = nodes2[i];

        expect(r2.name).toBe(r1.name);
        expect(r2.fromTable).toBe(r1.fromTable);
        expect(r2.fromColumn).toBe(r1.fromColumn);
        expect(r2.toTable).toBe(r1.toTable);
        expect(r2.toColumn).toBe(r1.toColumn);
        expect(r2.isActive).toBe(r1.isActive);
        expect(r2.crossFilteringBehavior).toBe(r1.crossFilteringBehavior);
        expect(r2.toCardinality).toBe(r1.toCardinality);
      }
    });
  });
});
