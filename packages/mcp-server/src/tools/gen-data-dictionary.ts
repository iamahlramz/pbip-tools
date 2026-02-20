import type { PbipProject } from '@pbip-tools/core';

export function genDataDictionary(
  project: PbipProject,
  format: 'markdown' | 'json',
  tableName?: string,
  includeExpressions?: boolean,
): string | object {
  const tables = tableName
    ? project.model.tables.filter((t) => t.name === tableName)
    : project.model.tables;

  if (tableName && tables.length === 0) {
    throw new Error(`Table '${tableName}' not found in the model`);
  }

  const dictionary = {
    modelName: project.model.database.name,
    tables: tables.map((table) => ({
      name: table.name,
      isHidden: table.isHidden ?? false,
      isCalculationGroup: !!table.calculationGroup,
      columns: table.columns.map((col) => ({
        name: col.name,
        dataType: col.dataType,
        columnType: col.columnType ?? 'data',
        isHidden: col.isHidden ?? false,
        ...(col.displayFolder ? { displayFolder: col.displayFolder } : {}),
        ...(includeExpressions && col.expression ? { expression: col.expression } : {}),
      })),
      measures: table.measures.map((m) => ({
        name: m.name,
        displayFolder: m.displayFolder ?? null,
        formatString: m.formatString ?? null,
        isHidden: m.isHidden ?? false,
        ...(m.description ? { description: m.description } : {}),
        ...(includeExpressions ? { expression: m.expression } : {}),
      })),
      ...(table.calculationGroup
        ? {
            calculationGroup: {
              precedence: table.calculationGroup.precedence ?? 0,
              items: table.calculationGroup.items.map((item) => ({
                name: item.name,
                ordinal: item.ordinal ?? 0,
                ...(includeExpressions ? { expression: item.expression } : {}),
              })),
            },
          }
        : {}),
    })),
    relationships: tableName
      ? project.model.relationships.filter(
          (r) => r.fromTable === tableName || r.toTable === tableName,
        )
      : project.model.relationships,
  };

  // Map relationships to clean output
  const cleanRelationships = dictionary.relationships.map((r) => ({
    name: r.name,
    from: `${r.fromTable}[${r.fromColumn}]`,
    to: `${r.toTable}[${r.toColumn}]`,
    cardinality: `${r.fromCardinality ?? 'many'}-to-${r.toCardinality ?? 'one'}`,
    crossFilter: r.crossFilteringBehavior ?? 'oneDirection',
    isActive: r.isActive ?? true,
  }));

  if (format === 'json') {
    return { ...dictionary, relationships: cleanRelationships };
  }

  // Generate markdown
  const lines: string[] = [];
  lines.push(`# Data Dictionary: ${dictionary.modelName}`);
  lines.push('');

  for (const table of dictionary.tables) {
    lines.push(`## ${table.name}${table.isHidden ? ' (hidden)' : ''}`);
    if (table.isCalculationGroup) lines.push('*Calculation Group*');
    lines.push('');

    if (table.columns.length > 0) {
      lines.push('### Columns');
      lines.push('| Name | Type | Hidden |');
      lines.push('|------|------|--------|');
      for (const col of table.columns) {
        lines.push(
          `| ${col.name} | ${col.dataType} (${col.columnType}) | ${col.isHidden ? 'Yes' : 'No'} |`,
        );
        if (includeExpressions && 'expression' in col && col.expression) {
          lines.push(`| | \`${col.expression}\` | |`);
        }
      }
      lines.push('');
    }

    if (table.measures.length > 0) {
      lines.push('### Measures');
      lines.push('| Name | Folder | Format | Hidden |');
      lines.push('|------|--------|--------|--------|');
      for (const m of table.measures) {
        lines.push(
          `| ${m.name} | ${m.displayFolder ?? '—'} | ${m.formatString ?? '—'} | ${m.isHidden ? 'Yes' : 'No'} |`,
        );
        if (includeExpressions) {
          lines.push(`| | \`${m.expression}\` | | |`);
        }
      }
      lines.push('');
    }

    if (table.calculationGroup) {
      lines.push('### Calculation Items');
      lines.push('| Name | Ordinal |');
      lines.push('|------|---------|');
      for (const item of table.calculationGroup.items) {
        lines.push(`| ${item.name} | ${item.ordinal} |`);
        if (includeExpressions && 'expression' in item) {
          lines.push(`| | \`${item.expression}\` |`);
        }
      }
      lines.push('');
    }
  }

  if (cleanRelationships.length > 0) {
    lines.push('## Relationships');
    lines.push('| From | To | Cardinality | Cross-Filter | Active |');
    lines.push('|------|-----|-------------|--------------|--------|');
    for (const r of cleanRelationships) {
      lines.push(
        `| ${r.from} | ${r.to} | ${r.cardinality} | ${r.crossFilter} | ${r.isActive ? 'Yes' : 'No'} |`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
