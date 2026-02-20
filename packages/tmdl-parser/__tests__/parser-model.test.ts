import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTmdl } from '../src/index.js';
import type { ModelNode } from '@pbip-tools/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../..', 'fixtures');

describe('parser-model', () => {
  it('parses the standard model.tmdl', () => {
    const text = readFileSync(
      resolve(FIXTURES, 'standard/AdventureWorks.SemanticModel/definition/model.tmdl'),
      'utf-8',
    );

    const result = parseTmdl(text, 'model');
    expect(result.type).toBe('model');
    expect(result.warnings).toHaveLength(0);

    const node = (result as { type: 'model'; node: ModelNode }).node;
    expect(node.kind).toBe('model');
    expect(node.name).toBe('Model');

    // Verify culture
    expect(node.culture).toBe('en-US');

    // Verify defaultPowerBIDataSourceVersion
    expect(node.defaultPowerBIDataSourceVersion).toBe('powerBI_V3');

    // Verify discourageImplicitMeasures
    expect(node.discourageImplicitMeasures).toBe(true);
  });

  it('verifies 6 table refs including quoted name', () => {
    const text = readFileSync(
      resolve(FIXTURES, 'standard/AdventureWorks.SemanticModel/definition/model.tmdl'),
      'utf-8',
    );

    const result = parseTmdl(text, 'model');
    const node = (result as { type: 'model'; node: ModelNode }).node;

    expect(node.tableRefs).toBeDefined();
    expect(node.tableRefs).toHaveLength(6);

    const refNames = node.tableRefs!.map((r) => r.name);
    expect(refNames).toContain('DimDate');
    expect(refNames).toContain('DimCustomer');
    expect(refNames).toContain('FactSales');
    expect(refNames).toContain('_Measures');
    expect(refNames).toContain('_DisplayMeasures');
    // Quoted name: 'Time Comparison'
    expect(refNames).toContain('Time Comparison');
  });

  it('verifies queryGroup with doc comment', () => {
    const text = readFileSync(
      resolve(FIXTURES, 'standard/AdventureWorks.SemanticModel/definition/model.tmdl'),
      'utf-8',
    );

    const result = parseTmdl(text, 'model');
    const node = (result as { type: 'model'; node: ModelNode }).node;

    expect(node.queryGroups).toBeDefined();
    expect(node.queryGroups).toHaveLength(1);

    const qg = node.queryGroups![0];
    expect(qg.name).toBe('Parameters');
    expect(qg.docComment).toBe('Date intelligence parameters');
  });

  it('verifies annotation (PBI_QueryOrder)', () => {
    const text = readFileSync(
      resolve(FIXTURES, 'standard/AdventureWorks.SemanticModel/definition/model.tmdl'),
      'utf-8',
    );

    const result = parseTmdl(text, 'model');
    const node = (result as { type: 'model'; node: ModelNode }).node;

    expect(node.annotations).toBeDefined();
    expect(node.annotations).toHaveLength(1);

    const ann = node.annotations![0];
    expect(ann.name).toBe('PBI_QueryOrder');
    expect(ann.value).toBe('["DimDate","DimCustomer","FactSales"]');
  });

  it('verifies dataAccessOptions', () => {
    const text = readFileSync(
      resolve(FIXTURES, 'standard/AdventureWorks.SemanticModel/definition/model.tmdl'),
      'utf-8',
    );

    const result = parseTmdl(text, 'model');
    const node = (result as { type: 'model'; node: ModelNode }).node;

    expect(node.dataAccessOptions).toBeDefined();
    expect(node.dataAccessOptions!['legacyRedirects']).toBe(true);
    expect(node.dataAccessOptions!['returnErrorValuesAsNull']).toBe(true);
  });
});
