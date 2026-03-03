import type { PbipProject } from '@pbip-tools/core';

export interface TmdlValidationIssue {
  severity: 'error' | 'warning';
  rule: string;
  message: string;
  entity?: string;
}

export interface TmdlValidationResult {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  issues: TmdlValidationIssue[];
}

export function validateTmdl(project: PbipProject): TmdlValidationResult {
  const issues: TmdlValidationIssue[] = [];

  validateCalcGroups(project, issues);
  validateTableRefs(project, issues);
  validateRelationships(project, issues);
  validateLineageTags(project, issues);

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return {
    isValid: errorCount === 0,
    errorCount,
    warningCount,
    issues,
  };
}

function validateCalcGroups(project: PbipProject, issues: TmdlValidationIssue[]): void {
  const calcGroupTables = project.model.tables.filter((t) => t.calculationGroup);

  if (calcGroupTables.length === 0) return;

  // Check discourageImplicitMeasures
  if (!project.model.model.discourageImplicitMeasures) {
    issues.push({
      severity: 'error',
      rule: 'calc_group_missing_discourage_implicit',
      message:
        'Model has calculation groups but discourageImplicitMeasures is not set. Power BI Desktop will fail to open this project.',
    });
  }

  for (const table of calcGroupTables) {
    // Check ref table entry
    const hasRef = project.model.model.tableRefs?.some((r) => r.name === table.name);
    if (!hasRef) {
      issues.push({
        severity: 'error',
        rule: 'calc_group_missing_ref_table',
        message: `Calculation group table '${table.name}' is not listed in model.tableRefs`,
        entity: table.name,
      });
    }

    // Check Name column
    const nameCol = table.columns.find(
      (c) => c.sourceColumn === 'Name' && c.dataType === 'string',
    );
    if (!nameCol) {
      issues.push({
        severity: 'error',
        rule: 'calc_group_missing_name_column',
        message: `Calculation group table '${table.name}' is missing required Name column (string, sourceColumn='Name')`,
        entity: table.name,
      });
    }

    // Check Ordinal column
    const ordinalCol = table.columns.find(
      (c) => c.sourceColumn === 'Ordinal' && c.dataType === 'int64',
    );
    if (!ordinalCol) {
      issues.push({
        severity: 'error',
        rule: 'calc_group_missing_ordinal_column',
        message: `Calculation group table '${table.name}' is missing required Ordinal column (int64, sourceColumn='Ordinal')`,
        entity: table.name,
      });
    }

    // Check calc items have names and expressions
    const calcGroup = table.calculationGroup!;
    for (let i = 0; i < calcGroup.items.length; i++) {
      const item = calcGroup.items[i];
      if (!item.name) {
        issues.push({
          severity: 'error',
          rule: 'calc_item_missing_name',
          message: `Calculation item at index ${i} in table '${table.name}' has no name`,
          entity: table.name,
        });
      }
      if (!item.expression) {
        issues.push({
          severity: 'error',
          rule: 'calc_item_missing_expression',
          message: `Calculation item '${item.name || `index ${i}`}' in table '${table.name}' has no expression`,
          entity: table.name,
        });
      }
    }
  }
}

function validateTableRefs(project: PbipProject, issues: TmdlValidationIssue[]): void {
  const tableRefs = project.model.model.tableRefs ?? [];
  const tableNames = new Set(project.model.tables.map((t) => t.name));

  for (const ref of tableRefs) {
    if (!tableNames.has(ref.name)) {
      issues.push({
        severity: 'error',
        rule: 'orphaned_table_ref',
        message: `model.tableRefs contains '${ref.name}' but no such table exists`,
        entity: ref.name,
      });
    }
  }
}

function validateRelationships(project: PbipProject, issues: TmdlValidationIssue[]): void {
  const tableNames = new Set(project.model.tables.map((t) => t.name));
  const columnLookup = new Map<string, Set<string>>();
  for (const table of project.model.tables) {
    columnLookup.set(table.name, new Set(table.columns.map((c) => c.name)));
  }

  for (const rel of project.model.relationships) {
    if (!tableNames.has(rel.fromTable)) {
      issues.push({
        severity: 'error',
        rule: 'relationship_missing_from_table',
        message: `Relationship '${rel.name}': fromTable '${rel.fromTable}' not found`,
        entity: rel.name,
      });
    } else {
      const cols = columnLookup.get(rel.fromTable);
      if (cols && !cols.has(rel.fromColumn)) {
        issues.push({
          severity: 'error',
          rule: 'relationship_invalid_from_column',
          message: `Relationship '${rel.name}': column '${rel.fromColumn}' not found in table '${rel.fromTable}'`,
          entity: rel.name,
        });
      }
    }

    if (!tableNames.has(rel.toTable)) {
      issues.push({
        severity: 'error',
        rule: 'relationship_missing_to_table',
        message: `Relationship '${rel.name}': toTable '${rel.toTable}' not found`,
        entity: rel.name,
      });
    } else {
      const cols = columnLookup.get(rel.toTable);
      if (cols && !cols.has(rel.toColumn)) {
        issues.push({
          severity: 'error',
          rule: 'relationship_invalid_to_column',
          message: `Relationship '${rel.name}': column '${rel.toColumn}' not found in table '${rel.toTable}'`,
          entity: rel.name,
        });
      }
    }
  }
}

function validateLineageTags(project: PbipProject, issues: TmdlValidationIssue[]): void {
  const seen = new Map<string, string>();

  function check(tag: string | undefined, label: string): void {
    if (!tag) {
      issues.push({
        severity: 'warning',
        rule: 'missing_lineage_tag',
        message: `${label}: missing lineageTag`,
        entity: label,
      });
      return;
    }
    const existing = seen.get(tag);
    if (existing) {
      issues.push({
        severity: 'error',
        rule: 'duplicate_lineage_tag',
        message: `Duplicate lineageTag '${tag}' shared by '${existing}' and '${label}'`,
        entity: label,
      });
    } else {
      seen.set(tag, label);
    }
  }

  for (const table of project.model.tables) {
    check(table.lineageTag, `Table '${table.name}'`);

    for (const col of table.columns) {
      check(col.lineageTag, `Column '${table.name}'.${col.name}`);
    }
    for (const m of table.measures) {
      check(m.lineageTag, `Measure '${table.name}'.${m.name}`);
    }
    for (const h of table.hierarchies) {
      check(h.lineageTag, `Hierarchy '${table.name}'.${h.name}`);
      for (const level of h.levels) {
        check(level.lineageTag, `HierarchyLevel '${table.name}'.${h.name}.${level.name}`);
      }
    }
  }

  for (const expr of project.model.expressions) {
    check(expr.lineageTag, `Expression '${expr.name}'`);
  }

  for (const fn of project.model.functions) {
    check(fn.lineageTag, `Function '${fn.name}'`);
  }
}
