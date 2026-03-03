import type { PbipProject } from '@pbip-tools/core';

export type BpaCategory =
  | 'structural'
  | 'performance'
  | 'dax_expressions'
  | 'formatting'
  | 'maintenance'
  | 'naming'
  | 'error_prevention';

export interface TmdlValidationIssue {
  severity: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  entity?: string;
  category: BpaCategory;
}

export interface TmdlValidationResult {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: TmdlValidationIssue[];
}

export function validateTmdl(
  project: PbipProject,
  categories?: BpaCategory[],
  minSeverity?: 'error' | 'warning' | 'info',
): TmdlValidationResult {
  const issues: TmdlValidationIssue[] = [];

  // Structural validators (existing)
  validateCalcGroups(project, issues);
  validateTableRefs(project, issues);
  validateRelationships(project, issues);
  validateLineageTags(project, issues);

  // Performance validators (BPA)
  validatePerformance(project, issues);

  // DAX expression validators (BPA)
  validateDaxExpressions(project, issues);

  // Formatting validators (BPA)
  validateFormatting(project, issues);

  // Maintenance validators (BPA)
  validateMaintenance(project, issues);

  // Naming validators (BPA)
  validateNaming(project, issues);

  // Error prevention validators (BPA)
  validateErrorPrevention(project, issues);

  // Filter by category if specified
  let filtered = issues;
  if (categories && categories.length > 0) {
    const categorySet = new Set(categories);
    filtered = filtered.filter((i) => categorySet.has(i.category));
  }

  // Filter by minimum severity
  if (minSeverity === 'error') {
    filtered = filtered.filter((i) => i.severity === 'error');
  } else if (minSeverity === 'warning') {
    filtered = filtered.filter((i) => i.severity === 'error' || i.severity === 'warning');
  }

  const errorCount = filtered.filter((i) => i.severity === 'error').length;
  const warningCount = filtered.filter((i) => i.severity === 'warning').length;
  const infoCount = filtered.filter((i) => i.severity === 'info').length;

  return {
    isValid: errorCount === 0,
    errorCount,
    warningCount,
    infoCount,
    issues: filtered,
  };
}

// =============================================
// STRUCTURAL VALIDATORS (existing)
// =============================================

function validateCalcGroups(project: PbipProject, issues: TmdlValidationIssue[]): void {
  const calcGroupTables = project.model.tables.filter((t) => t.calculationGroup);

  if (calcGroupTables.length === 0) return;

  if (!project.model.model.discourageImplicitMeasures) {
    issues.push({
      severity: 'error',
      rule: 'calc_group_missing_discourage_implicit',
      message:
        'Model has calculation groups but discourageImplicitMeasures is not set. Power BI Desktop will fail to open this project.',
      category: 'structural',
    });
  }

  for (const table of calcGroupTables) {
    const hasRef = project.model.model.tableRefs?.some((r) => r.name === table.name);
    if (!hasRef) {
      issues.push({
        severity: 'error',
        rule: 'calc_group_missing_ref_table',
        message: `Calculation group table '${table.name}' is not listed in model.tableRefs`,
        entity: table.name,
        category: 'structural',
      });
    }

    const nameCol = table.columns.find((c) => c.sourceColumn === 'Name' && c.dataType === 'string');
    if (!nameCol) {
      issues.push({
        severity: 'error',
        rule: 'calc_group_missing_name_column',
        message: `Calculation group table '${table.name}' is missing required Name column (string, sourceColumn='Name')`,
        entity: table.name,
        category: 'structural',
      });
    }

    const ordinalCol = table.columns.find(
      (c) => c.sourceColumn === 'Ordinal' && c.dataType === 'int64',
    );
    if (!ordinalCol) {
      issues.push({
        severity: 'error',
        rule: 'calc_group_missing_ordinal_column',
        message: `Calculation group table '${table.name}' is missing required Ordinal column (int64, sourceColumn='Ordinal')`,
        entity: table.name,
        category: 'structural',
      });
    }

    const calcGroup = table.calculationGroup!;
    for (let i = 0; i < calcGroup.items.length; i++) {
      const item = calcGroup.items[i];
      if (!item.name) {
        issues.push({
          severity: 'error',
          rule: 'calc_item_missing_name',
          message: `Calculation item at index ${i} in table '${table.name}' has no name`,
          entity: table.name,
          category: 'structural',
        });
      }
      if (!item.expression) {
        issues.push({
          severity: 'error',
          rule: 'calc_item_missing_expression',
          message: `Calculation item '${item.name || `index ${i}`}' in table '${table.name}' has no expression`,
          entity: table.name,
          category: 'structural',
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
        category: 'structural',
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
        category: 'structural',
      });
    } else {
      const cols = columnLookup.get(rel.fromTable);
      if (cols && !cols.has(rel.fromColumn)) {
        issues.push({
          severity: 'error',
          rule: 'relationship_invalid_from_column',
          message: `Relationship '${rel.name}': column '${rel.fromColumn}' not found in table '${rel.fromTable}'`,
          entity: rel.name,
          category: 'structural',
        });
      }
    }

    if (!tableNames.has(rel.toTable)) {
      issues.push({
        severity: 'error',
        rule: 'relationship_missing_to_table',
        message: `Relationship '${rel.name}': toTable '${rel.toTable}' not found`,
        entity: rel.name,
        category: 'structural',
      });
    } else {
      const cols = columnLookup.get(rel.toTable);
      if (cols && !cols.has(rel.toColumn)) {
        issues.push({
          severity: 'error',
          rule: 'relationship_invalid_to_column',
          message: `Relationship '${rel.name}': column '${rel.toColumn}' not found in table '${rel.toTable}'`,
          entity: rel.name,
          category: 'structural',
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
        category: 'structural',
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
        category: 'structural',
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

// =============================================
// PERFORMANCE VALIDATORS (BPA)
// =============================================

function validatePerformance(project: PbipProject, issues: TmdlValidationIssue[]): void {
  for (const table of project.model.tables) {
    // P1: Flag float (double) columns — prefer Int64 or Decimal
    for (const col of table.columns) {
      if (col.dataType === 'double' && col.columnType !== 'calculated') {
        issues.push({
          severity: 'warning',
          rule: 'perf_avoid_float_columns',
          message: `Column '${table.name}'.${col.name} uses 'double' data type. Consider Int64 or Decimal for better compression and accuracy.`,
          entity: `${table.name}.${col.name}`,
          category: 'performance',
        });
      }
    }

    // P2: Calculated columns with aggregation functions
    for (const col of table.columns) {
      if (col.columnType === 'calculated' && col.expression) {
        const aggPattern =
          /\b(SUM|AVERAGE|COUNT|COUNTROWS|MIN|MAX|SUMX|AVERAGEX|COUNTX|MAXX|MINX)\s*\(/i;
        if (aggPattern.test(col.expression)) {
          issues.push({
            severity: 'warning',
            rule: 'perf_calc_column_with_aggregation',
            message: `Calculated column '${table.name}'.${col.name} uses aggregation functions. Consider using a measure instead.`,
            entity: `${table.name}.${col.name}`,
            category: 'performance',
          });
        }
      }
    }

    // P3: Too many columns (>100 in a single table)
    if (table.columns.length > 100) {
      issues.push({
        severity: 'warning',
        rule: 'perf_too_many_columns',
        message: `Table '${table.name}' has ${table.columns.length} columns. Consider reducing to improve model performance.`,
        entity: table.name,
        category: 'performance',
      });
    }
  }

  // P4: Many-to-many relationships
  for (const rel of project.model.relationships) {
    if (rel.fromCardinality === 'many' && rel.toCardinality === 'many') {
      issues.push({
        severity: 'warning',
        rule: 'perf_many_to_many_relationship',
        message: `Relationship '${rel.name}' is many-to-many. This can cause ambiguity and performance issues.`,
        entity: rel.name,
        category: 'performance',
      });
    }
  }

  // P5: Bi-directional cross-filtering
  for (const rel of project.model.relationships) {
    if (rel.crossFilteringBehavior === 'bothDirections') {
      issues.push({
        severity: 'warning',
        rule: 'perf_bidirectional_crossfilter',
        message: `Relationship '${rel.name}' uses bi-directional cross-filtering. This can cause ambiguity and performance issues.`,
        entity: rel.name,
        category: 'performance',
      });
    }
  }

  // P6: summarizeBy: sum on ID/key columns
  for (const table of project.model.tables) {
    for (const col of table.columns) {
      if (col.summarizeBy === 'sum' && /(?:ID|Key|Code|Num)$/i.test(col.name)) {
        issues.push({
          severity: 'warning',
          rule: 'perf_summarize_id_column',
          message: `Column '${table.name}'.${col.name} appears to be an identifier but has summarizeBy='sum'. Set to 'none' to prevent accidental aggregation.`,
          entity: `${table.name}.${col.name}`,
          category: 'performance',
        });
      }
    }
  }

  // P7: Inactive relationships count
  const inactiveRels = project.model.relationships.filter((r) => r.isActive === false);
  if (inactiveRels.length > 5) {
    issues.push({
      severity: 'info',
      rule: 'perf_many_inactive_relationships',
      message: `Model has ${inactiveRels.length} inactive relationships. Review whether all are necessary.`,
      category: 'performance',
    });
  }

  // P8: Too many tables (>30)
  if (project.model.tables.length > 30) {
    issues.push({
      severity: 'info',
      rule: 'perf_many_tables',
      message: `Model has ${project.model.tables.length} tables. Consider consolidating to improve performance.`,
      category: 'performance',
    });
  }
}

// =============================================
// DAX EXPRESSION VALIDATORS (BPA)
// =============================================

function getAllExpressions(project: PbipProject): Array<{ label: string; expression: string }> {
  const exprs: Array<{ label: string; expression: string }> = [];
  for (const table of project.model.tables) {
    for (const m of table.measures) {
      exprs.push({ label: `Measure '${table.name}'.[${m.name}]`, expression: m.expression });
    }
    for (const col of table.columns) {
      if (col.columnType === 'calculated' && col.expression) {
        exprs.push({
          label: `CalcColumn '${table.name}'.${col.name}`,
          expression: col.expression,
        });
      }
    }
    if (table.calculationGroup) {
      for (const item of table.calculationGroup.items) {
        exprs.push({
          label: `CalcItem '${table.name}'.${item.name}`,
          expression: item.expression,
        });
      }
    }
  }
  return exprs;
}

function validateDaxExpressions(project: PbipProject, issues: TmdlValidationIssue[]): void {
  const exprs = getAllExpressions(project);

  for (const { label, expression } of exprs) {
    // D1: Use DIVIDE instead of /
    if (/[^/]\/[^/*]/.test(expression) && !/DIVIDE/i.test(expression)) {
      // Check for actual division (not comments or string)
      const stripped = expression
        .replace(/"[^"]*"/g, '')
        .replace(/\/\/.*/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');
      if (/[^<>!]=?\s*\//.test(stripped) || /\)\s*\//.test(stripped) || /\]\s*\//.test(stripped)) {
        issues.push({
          severity: 'warning',
          rule: 'dax_use_divide_function',
          message: `${label}: Uses '/' for division. Consider DIVIDE() for safer division with zero-handling.`,
          entity: label,
          category: 'dax_expressions',
        });
      }
    }

    // D2: IFERROR should be ISERROR
    if (/\bIFERROR\s*\(/i.test(expression)) {
      issues.push({
        severity: 'warning',
        rule: 'dax_iferror_to_iserror',
        message: `${label}: Uses IFERROR(). Consider IF(ISERROR()) for more explicit error handling.`,
        entity: label,
        category: 'dax_expressions',
      });
    }

    // D3: Avoid nested CALCULATE
    const calcCount = (expression.match(/\bCALCULATE\s*\(/gi) || []).length;
    if (calcCount > 2) {
      issues.push({
        severity: 'info',
        rule: 'dax_nested_calculate',
        message: `${label}: Contains ${calcCount} CALCULATE calls. Deeply nested CALCULATE can be hard to maintain and may have unexpected context transitions.`,
        entity: label,
        category: 'dax_expressions',
      });
    }

    // D4: Use SELECTEDVALUE instead of IF(HASONEVALUE)
    if (/\bIF\s*\(\s*HASONEVALUE\s*\(/i.test(expression)) {
      issues.push({
        severity: 'info',
        rule: 'dax_use_selectedvalue',
        message: `${label}: Uses IF(HASONEVALUE(...)). Consider SELECTEDVALUE() for simpler syntax.`,
        entity: label,
        category: 'dax_expressions',
      });
    }

    // D5: Use TREATAS instead of INTERSECT for virtual relationships
    if (/\bINTERSECT\s*\(/i.test(expression) && /\bFILTER\s*\(/i.test(expression)) {
      issues.push({
        severity: 'info',
        rule: 'dax_treatas_over_intersect',
        message: `${label}: Uses INTERSECT with FILTER. Consider TREATAS() for virtual relationships — more efficient.`,
        entity: label,
        category: 'dax_expressions',
      });
    }

    // D6: VALUES() in CALCULATE filter — prefer KEEPFILTERS or ALL
    if (/\bCALCULATE\s*\([\s\S]*\bVALUES\s*\(/i.test(expression)) {
      issues.push({
        severity: 'info',
        rule: 'dax_values_in_calculate',
        message: `${label}: Uses VALUES() inside CALCULATE filter. This overrides existing filters — use KEEPFILTERS(VALUES(...)) if that's not intended.`,
        entity: label,
        category: 'dax_expressions',
      });
    }

    // D7: Hardcoded year values in calculation items
    if (/\b(YEAR|Year)\b.*=\s*(20\d{2})\b/.test(expression) || /\b(20\d{2})\b/.test(expression)) {
      const yearMatch = expression.match(/\b(20[2-9]\d)\b/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        if (year >= 2020 && year <= 2030) {
          issues.push({
            severity: 'info',
            rule: 'dax_hardcoded_year',
            message: `${label}: Contains hardcoded year value '${year}'. Consider using dynamic date logic (e.g., YEAR(TODAY())) for maintainability.`,
            entity: label,
            category: 'dax_expressions',
          });
        }
      }
    }

    // D8: COUNTROWS vs COUNT for table row counting
    if (/\bCOUNT\s*\(\s*'?[^)]+\[/i.test(expression) && !/\bCOUNTROWS\b/i.test(expression)) {
      // Only flag if it looks like they're counting all rows, not a specific column
    }
  }
}

// =============================================
// FORMATTING VALIDATORS (BPA)
// =============================================

function validateFormatting(project: PbipProject, issues: TmdlValidationIssue[]): void {
  for (const table of project.model.tables) {
    for (const m of table.measures) {
      // F1: Missing format string on visible measures
      if (!m.formatString && !m.isHidden) {
        issues.push({
          severity: 'info',
          rule: 'fmt_missing_format_string',
          message: `Measure '${table.name}'.[${m.name}] has no format string. Add one for consistent user display.`,
          entity: `${table.name}.${m.name}`,
          category: 'formatting',
        });
      }

      // F2: Percentage measure without % format
      if (
        /(percent|pct|%|ratio)/i.test(m.name) &&
        m.formatString &&
        !m.formatString.includes('%')
      ) {
        issues.push({
          severity: 'warning',
          rule: 'fmt_percentage_mismatch',
          message: `Measure '${table.name}'.[${m.name}] name suggests a percentage but format string '${m.formatString}' doesn't include '%'.`,
          entity: `${table.name}.${m.name}`,
          category: 'formatting',
        });
      }

      // F3: SVG measures missing dataCategory: ImageUrl
      if (
        m.expression &&
        /data:image\/svg\+xml/i.test(m.expression) &&
        !hasAnnotation(m, 'dataCategory', 'ImageUrl')
      ) {
        // Check if there's a dataCategory property
        const hasDataCategory = m.properties?.some(
          (p) => p.name === 'dataCategory' && p.value === 'ImageUrl',
        );
        if (!hasDataCategory) {
          issues.push({
            severity: 'warning',
            rule: 'fmt_svg_missing_image_url',
            message: `Measure '${table.name}'.[${m.name}] generates SVG content but is missing dataCategory='ImageUrl'. Add it for Power BI to render the SVG.`,
            entity: `${table.name}.${m.name}`,
            category: 'formatting',
          });
        }
      }
    }

    for (const col of table.columns) {
      // F4: Integer column with decimal format
      if (col.dataType === 'int64' && col.formatString && /\.0+/.test(col.formatString)) {
        issues.push({
          severity: 'info',
          rule: 'fmt_integer_decimal_format',
          message: `Column '${table.name}'.${col.name} is int64 but has decimal format string '${col.formatString}'.`,
          entity: `${table.name}.${col.name}`,
          category: 'formatting',
        });
      }

      // F5: Currency column without $ or currency symbol
      if (
        /(amount|price|cost|revenue|sales|total)/i.test(col.name) &&
        col.dataType === 'double' &&
        col.formatString &&
        !/[$€£¥]/.test(col.formatString) &&
        !/currency/i.test(col.formatString)
      ) {
        issues.push({
          severity: 'info',
          rule: 'fmt_currency_without_symbol',
          message: `Column '${table.name}'.${col.name} appears monetary but format string '${col.formatString}' has no currency symbol.`,
          entity: `${table.name}.${col.name}`,
          category: 'formatting',
        });
      }
    }
  }
}

function hasAnnotation(
  node: { annotations?: Array<{ name: string; value: string }> },
  name: string,
  value: string,
): boolean {
  return node.annotations?.some((a) => a.name === name && a.value === value) ?? false;
}

// =============================================
// MAINTENANCE VALIDATORS (BPA)
// =============================================

function validateMaintenance(project: PbipProject, issues: TmdlValidationIssue[]): void {
  // M1: Unconnected tables (no relationships)
  const connectedTables = new Set<string>();
  for (const rel of project.model.relationships) {
    connectedTables.add(rel.fromTable);
    connectedTables.add(rel.toTable);
  }
  for (const table of project.model.tables) {
    // Skip calc groups, disconnected by design
    if (table.calculationGroup) continue;
    // Skip tables with calculated partitions (field parameters, etc.)
    if (table.partitions.some((p) => p.source.type === 'calculated')) continue;
    // Skip if table only has measures (measure host table)
    if (table.columns.length === 0 && table.measures.length > 0) continue;

    if (!connectedTables.has(table.name) && table.columns.length > 0) {
      issues.push({
        severity: 'info',
        rule: 'maint_unconnected_table',
        message: `Table '${table.name}' has no relationships. If this is intentional (e.g., disconnected slicer table), ignore this.`,
        entity: table.name,
        category: 'maintenance',
      });
    }
  }

  // M2: Measures without display folders (when table has many measures)
  for (const table of project.model.tables) {
    const visibleMeasures = table.measures.filter((m) => !m.isHidden);
    const measuresWithoutFolder = visibleMeasures.filter((m) => !m.displayFolder);
    if (visibleMeasures.length >= 10 && measuresWithoutFolder.length > 5) {
      issues.push({
        severity: 'info',
        rule: 'maint_measures_without_folders',
        message: `Table '${table.name}' has ${measuresWithoutFolder.length} visible measures without display folders. Organize them for better discoverability.`,
        entity: table.name,
        category: 'maintenance',
      });
    }
  }

  // M3: Empty calculation groups
  for (const table of project.model.tables) {
    if (table.calculationGroup && table.calculationGroup.items.length === 0) {
      issues.push({
        severity: 'warning',
        rule: 'maint_empty_calc_group',
        message: `Calculation group '${table.name}' has no calculation items.`,
        entity: table.name,
        category: 'maintenance',
      });
    }
  }

  // M4: Missing descriptions on visible measures
  for (const table of project.model.tables) {
    for (const m of table.measures) {
      if (!m.isHidden && !m.description) {
        issues.push({
          severity: 'info',
          rule: 'maint_missing_measure_description',
          message: `Measure '${table.name}'.[${m.name}] has no description. Descriptions help end-users understand measures.`,
          entity: `${table.name}.${m.name}`,
          category: 'maintenance',
        });
      }
    }
  }

  // M5: Tables with no measures and no visible columns (potentially unused)
  for (const table of project.model.tables) {
    if (table.calculationGroup) continue;
    const visibleCols = table.columns.filter((c) => !c.isHidden);
    if (table.measures.length === 0 && visibleCols.length === 0 && table.columns.length > 0) {
      issues.push({
        severity: 'info',
        rule: 'maint_fully_hidden_table',
        message: `Table '${table.name}' has no measures and all columns are hidden. Verify it's still needed.`,
        entity: table.name,
        category: 'maintenance',
      });
    }
  }

  // M6: Duplicate measures across tables
  const measureNames = new Map<string, string[]>();
  for (const table of project.model.tables) {
    for (const m of table.measures) {
      if (!measureNames.has(m.name)) measureNames.set(m.name, []);
      measureNames.get(m.name)!.push(table.name);
    }
  }
  for (const [name, tables] of measureNames) {
    if (tables.length > 1) {
      issues.push({
        severity: 'warning',
        rule: 'maint_duplicate_measure_name',
        message: `Measure name '${name}' exists in multiple tables: ${tables.join(', ')}. This can cause ambiguity.`,
        entity: name,
        category: 'maintenance',
      });
    }
  }
}

// =============================================
// NAMING VALIDATORS (BPA)
// =============================================

function validateNaming(project: PbipProject, issues: TmdlValidationIssue[]): void {
  for (const table of project.model.tables) {
    // N1: Leading/trailing whitespace in table names
    if (table.name !== table.name.trim()) {
      issues.push({
        severity: 'warning',
        rule: 'name_whitespace',
        message: `Table '${table.name}' has leading or trailing whitespace in its name.`,
        entity: table.name,
        category: 'naming',
      });
    }

    for (const col of table.columns) {
      // N2: Leading/trailing whitespace in column names
      if (col.name !== col.name.trim()) {
        issues.push({
          severity: 'warning',
          rule: 'name_whitespace',
          message: `Column '${table.name}'.${col.name} has leading or trailing whitespace.`,
          entity: `${table.name}.${col.name}`,
          category: 'naming',
        });
      }
    }

    for (const m of table.measures) {
      // N3: Leading/trailing whitespace in measure names
      if (m.name !== m.name.trim()) {
        issues.push({
          severity: 'warning',
          rule: 'name_whitespace',
          message: `Measure '${table.name}'.[${m.name}] has leading or trailing whitespace.`,
          entity: `${table.name}.${m.name}`,
          category: 'naming',
        });
      }

      // N4: Special characters in measure names (besides space, _, -, #, %, .)
      if (/[<>{}|&~`^]/.test(m.name)) {
        issues.push({
          severity: 'warning',
          rule: 'name_special_characters',
          message: `Measure '${table.name}'.[${m.name}] contains special characters that may cause issues.`,
          entity: `${table.name}.${m.name}`,
          category: 'naming',
        });
      }
    }
  }
}

// =============================================
// ERROR PREVENTION VALIDATORS (BPA)
// =============================================

function validateErrorPrevention(project: PbipProject, issues: TmdlValidationIssue[]): void {
  // E1: Columns without explicit data type
  for (const table of project.model.tables) {
    for (const col of table.columns) {
      if (!col.dataType) {
        issues.push({
          severity: 'warning',
          rule: 'err_missing_data_type',
          message: `Column '${table.name}'.${col.name} has no explicit data type.`,
          entity: `${table.name}.${col.name}`,
          category: 'error_prevention',
        });
      }
    }
  }

  // E2: Relationships with type mismatches (different data types)
  const columnTypes = new Map<string, string>();
  for (const table of project.model.tables) {
    for (const col of table.columns) {
      columnTypes.set(`${table.name}.${col.name}`, col.dataType);
    }
  }
  for (const rel of project.model.relationships) {
    const fromType = columnTypes.get(`${rel.fromTable}.${rel.fromColumn}`);
    const toType = columnTypes.get(`${rel.toTable}.${rel.toColumn}`);
    if (fromType && toType && fromType !== toType) {
      issues.push({
        severity: 'warning',
        rule: 'err_relationship_type_mismatch',
        message: `Relationship '${rel.name}': '${rel.fromTable}.${rel.fromColumn}' (${fromType}) → '${rel.toTable}.${rel.toColumn}' (${toType}). Type mismatch may cause errors.`,
        entity: rel.name,
        category: 'error_prevention',
      });
    }
  }

  // E3: USERELATIONSHIP referencing active relationship (redundant)
  const exprs = getAllExpressions(project);
  for (const { label, expression } of exprs) {
    if (/\bUSERELATIONSHIP\s*\(/i.test(expression)) {
      issues.push({
        severity: 'info',
        rule: 'err_userelationship_check',
        message: `${label}: Uses USERELATIONSHIP(). Verify it references an inactive relationship and doesn't conflict with RLS.`,
        entity: label,
        category: 'error_prevention',
      });
    }
  }

  // E4: Measures with empty expressions
  for (const table of project.model.tables) {
    for (const m of table.measures) {
      if (!m.expression || m.expression.trim() === '') {
        issues.push({
          severity: 'error',
          rule: 'err_empty_measure_expression',
          message: `Measure '${table.name}'.[${m.name}] has an empty expression.`,
          entity: `${table.name}.${m.name}`,
          category: 'error_prevention',
        });
      }
    }
  }
}
