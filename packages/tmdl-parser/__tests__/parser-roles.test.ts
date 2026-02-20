import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll } from 'vitest';
import { parseTmdl } from '../src/parser/parser.js';
import type { RoleNode } from '@pbip-tools/core';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURES = resolve(__dirname, '../../../fixtures');

describe('parser-roles', () => {
  describe('Store Manager role (inline filter)', () => {
    let role: RoleNode;

    beforeAll(() => {
      const text = readFileSync(
        resolve(
          FIXTURES,
          'standard/AdventureWorks.SemanticModel/definition/roles/Store Manager.tmdl',
        ),
        'utf-8',
      );
      const result = parseTmdl(text, 'role');
      expect(result.type).toBe('role');
      if (result.type === 'role') {
        role = result.node;
      }
    });

    it('should parse role name', () => {
      expect(role.name).toBe('Store Manager');
    });

    it('should parse modelPermission', () => {
      expect(role.modelPermission).toBe('read');
    });

    it('should parse one table permission', () => {
      expect(role.tablePermissions).toHaveLength(1);
    });

    it('should parse table permission table name', () => {
      expect(role.tablePermissions[0].tableName).toBe('DimCustomer');
    });

    it('should parse inline filter expression', () => {
      expect(role.tablePermissions[0].filterExpression).toContain("'DimCustomer'[Region]");
      expect(role.tablePermissions[0].filterExpression).toContain('"West"');
    });

    it('should parse annotation', () => {
      expect(role.annotations).toBeDefined();
      expect(role.annotations).toHaveLength(1);
      expect(role.annotations![0].name).toBe('PBI_Id');
    });
  });

  describe('Regional Admin role (multi-line filter)', () => {
    let role: RoleNode;

    beforeAll(() => {
      const text = readFileSync(
        resolve(
          FIXTURES,
          'standard/AdventureWorks.SemanticModel/definition/roles/Regional Admin.tmdl',
        ),
        'utf-8',
      );
      const result = parseTmdl(text, 'role');
      expect(result.type).toBe('role');
      if (result.type === 'role') {
        role = result.node;
      }
    });

    it('should parse role name', () => {
      expect(role.name).toBe('Regional Admin');
    });

    it('should parse two table permissions', () => {
      expect(role.tablePermissions).toHaveLength(2);
    });

    it('should parse multi-line DAX filter on FactSales', () => {
      const tp = role.tablePermissions.find((t) => t.tableName === 'FactSales');
      expect(tp).toBeDefined();
      expect(tp!.filterExpression).toContain('VAR _allowedRegions');
      expect(tp!.filterExpression).toContain('RETURN');
      expect(tp!.filterExpression).toContain("'FactSales'[Region] IN _allowedRegions");
    });

    it('should parse inline filter on DimCustomer', () => {
      const tp = role.tablePermissions.find((t) => t.tableName === 'DimCustomer');
      expect(tp).toBeDefined();
      expect(tp!.filterExpression).toContain("'DimCustomer'[IsActive] = TRUE()");
    });

    it('should parse annotation', () => {
      expect(role.annotations).toBeDefined();
      expect(role.annotations![0].value).toBe('271e8a438bbc4d12a456789abcdef012');
    });
  });
});
