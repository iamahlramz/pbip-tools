import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRelationship, deleteRelationship } from '../../src/tools/create-relationship.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;
let project: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

beforeEach(() => {
  project = structuredClone(standardProject);
});

// Use FactSales.SalesKey -> DimCustomer.CustomerKey (no existing relationship for this pair)
describe('createRelationship', () => {
  it('should create a basic relationship', () => {
    const result = createRelationship(
      project,
      'FactSales',
      'SalesKey',
      'DimCustomer',
      'CustomerKey',
    );

    expect(result.from).toBe('FactSales.SalesKey');
    expect(result.to).toBe('DimCustomer.CustomerKey');
    expect(result.fromCardinality).toBe('many');
    expect(result.toCardinality).toBe('one');
    expect(result.crossFilteringBehavior).toBe('oneDirection');
    expect(result.isActive).toBe(true);
    expect(result.name).toBeDefined();
  });

  it('should add relationship to project model', () => {
    const before = project.model.relationships.length;
    createRelationship(project, 'FactSales', 'SalesKey', 'DimCustomer', 'CustomerKey');
    expect(project.model.relationships.length).toBe(before + 1);
  });

  it('should accept custom name', () => {
    const result = createRelationship(
      project,
      'FactSales',
      'SalesKey',
      'DimCustomer',
      'CustomerKey',
      { name: 'FK_Sales_Customer_Alt' },
    );
    expect(result.name).toBe('FK_Sales_Customer_Alt');
  });

  it('should accept cardinality options', () => {
    const result = createRelationship(
      project,
      'FactSales',
      'SalesKey',
      'DimCustomer',
      'CustomerKey',
      { fromCardinality: 'many', toCardinality: 'many' },
    );
    expect(result.fromCardinality).toBe('many');
    expect(result.toCardinality).toBe('many');
  });

  it('should accept crossFilteringBehavior', () => {
    const result = createRelationship(
      project,
      'FactSales',
      'SalesKey',
      'DimCustomer',
      'CustomerKey',
      { crossFilteringBehavior: 'bothDirections' },
    );
    expect(result.crossFilteringBehavior).toBe('bothDirections');
  });

  it('should accept isActive=false', () => {
    const result = createRelationship(
      project,
      'FactSales',
      'SalesKey',
      'DimCustomer',
      'CustomerKey',
      { isActive: false },
    );
    expect(result.isActive).toBe(false);
  });

  it('should throw for non-existent fromTable', () => {
    expect(() =>
      createRelationship(project, 'NonExistent', 'Col', 'DimCustomer', 'CustomerKey'),
    ).toThrow("Table 'NonExistent' not found");
  });

  it('should throw for non-existent toTable', () => {
    expect(() =>
      createRelationship(project, 'FactSales', 'SalesKey', 'NonExistent', 'Col'),
    ).toThrow("Table 'NonExistent' not found");
  });

  it('should throw for non-existent fromColumn', () => {
    expect(() =>
      createRelationship(project, 'FactSales', 'NonExistentCol', 'DimCustomer', 'CustomerKey'),
    ).toThrow("Column 'NonExistentCol' not found in table 'FactSales'");
  });

  it('should throw for non-existent toColumn', () => {
    expect(() =>
      createRelationship(project, 'FactSales', 'SalesKey', 'DimCustomer', 'NonExistentCol'),
    ).toThrow("Column 'NonExistentCol' not found in table 'DimCustomer'");
  });

  it('should throw for duplicate relationship', () => {
    createRelationship(project, 'FactSales', 'SalesKey', 'DimCustomer', 'CustomerKey');
    expect(() =>
      createRelationship(project, 'FactSales', 'SalesKey', 'DimCustomer', 'CustomerKey'),
    ).toThrow('Relationship already exists');
  });
});

describe('deleteRelationship', () => {
  it('should delete relationship by name', () => {
    createRelationship(project, 'FactSales', 'SalesKey', 'DimCustomer', 'CustomerKey', {
      name: 'TestRel',
    });
    const before = project.model.relationships.length;

    const result = deleteRelationship(project, 'TestRel');
    expect(result.removed).toBe('TestRel');
    expect(result.from).toBe('FactSales.SalesKey');
    expect(result.to).toBe('DimCustomer.CustomerKey');
    expect(project.model.relationships.length).toBe(before - 1);
  });

  it('should delete relationship by endpoint descriptor', () => {
    createRelationship(project, 'FactSales', 'SalesKey', 'DimCustomer', 'CustomerKey');
    const before = project.model.relationships.length;

    const result = deleteRelationship(project, 'FactSales.SalesKey -> DimCustomer.CustomerKey');
    expect(result.from).toBe('FactSales.SalesKey');
    expect(result.to).toBe('DimCustomer.CustomerKey');
    expect(project.model.relationships.length).toBe(before - 1);
  });

  it('should delete an existing fixture relationship by name', () => {
    const before = project.model.relationships.length;
    const result = deleteRelationship(project, 'FactSales_DimCustomer');
    expect(result.removed).toBe('FactSales_DimCustomer');
    expect(project.model.relationships.length).toBe(before - 1);
  });

  it('should throw for non-existent relationship', () => {
    expect(() => deleteRelationship(project, 'NonExistent')).toThrow(
      "Relationship 'NonExistent' not found",
    );
  });
});
