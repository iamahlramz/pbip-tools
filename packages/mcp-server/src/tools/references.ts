import type { PbipProject, TableNode } from '@pbip-tools/core';

/**
 * Shared model lookups + "what still references X" scans.
 *
 * Every destructive tool that promises to refuse while an object is still in
 * use goes through here, so the guards can't drift apart — the first versions
 * of these scans disagreed with each other, and deleteColumn's simply never
 * looked at measure DAX, so it happily deleted a column ten measures used.
 */

export function findTableOrThrow(project: PbipProject, tableName: string): TableNode {
  const table = project.model.tables.find((t) => t.name === tableName);
  if (!table) {
    throw new Error(`Table '${tableName}' not found`);
  }
  return table;
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Every DAX expression in the model, labelled with where it lives. */
function* allDaxExpressions(project: PbipProject): Generator<{ label: string; dax: string }> {
  for (const table of project.model.tables) {
    for (const m of table.measures) {
      yield { label: `measure ${table.name}[${m.name}]`, dax: m.expression };
    }
    for (const col of table.columns) {
      if (col.expression) {
        yield { label: `calculated column ${table.name}.${col.name}`, dax: col.expression };
      }
    }
    for (const item of table.calculationGroup?.items ?? []) {
      yield { label: `calculation item '${table.name}'.${item.name}`, dax: item.expression };
      if (item.formatStringExpression) {
        yield {
          label: `format string of '${table.name}'.${item.name}`,
          dax: item.formatStringExpression,
        };
      }
    }
  }
  for (const role of project.model.roles) {
    for (const tp of role.tablePermissions) {
      if (tp.filterExpression) {
        yield {
          label: `RLS filter on role '${role.name}' (${tp.tableName})`,
          dax: tp.filterExpression,
        };
      }
    }
  }
  for (const fn of project.model.functions) {
    yield { label: `function ${fn.name}`, dax: fn.expression };
  }
}

/**
 * Everything that still references a column: relationship endpoints, hierarchy
 * levels, sortByColumn, and any DAX that names it.
 *
 * DAX names a column as `Table[Col]` or `'Table Name'[Col]`. A bare `[Col]` is
 * only a column reference inside the SAME table (elsewhere it means a measure),
 * so that form is only matched against expressions belonging to that table.
 */
export function findColumnReferrers(
  project: PbipProject,
  tableName: string,
  columnName: string,
): string[] {
  const table = findTableOrThrow(project, tableName);
  const referrers: string[] = [];

  for (const rel of project.model.relationships) {
    if (
      (rel.fromTable === tableName && rel.fromColumn === columnName) ||
      (rel.toTable === tableName && rel.toColumn === columnName)
    ) {
      referrers.push(`relationship '${rel.name}'`);
    }
  }

  for (const hier of table.hierarchies) {
    if (hier.levels.some((l) => l.column === columnName)) {
      referrers.push(`hierarchy '${hier.name}'`);
    }
  }

  for (const col of table.columns) {
    if (col.name !== columnName && col.sortByColumn === columnName) {
      referrers.push(`sortByColumn of '${col.name}'`);
    }
  }

  const qualified = new RegExp(
    `(?:'${escapeRegex(tableName)}'|\\b${escapeRegex(tableName)})\\s*\\[${escapeRegex(columnName)}\\]`,
  );
  const bare = new RegExp(`\\[${escapeRegex(columnName)}\\]`);
  const ownLabels = new Set(
    [
      ...table.measures.map((m) => `measure ${tableName}[${m.name}]`),
      ...table.columns.map((c) => `calculated column ${tableName}.${c.name}`),
    ].filter(Boolean),
  );

  for (const { label, dax } of allDaxExpressions(project)) {
    // Don't let the column's own expression count as a reference to itself.
    if (label === `calculated column ${tableName}.${columnName}`) continue;

    if (qualified.test(dax) || (ownLabels.has(label) && bare.test(dax))) {
      referrers.push(label);
    }
  }

  return referrers;
}

/** Everything that still CALLS a DAX user-defined function. */
export function findFunctionCallers(project: PbipProject, functionName: string): string[] {
  // A call is the name followed by `(` — so `Div` is not "called" by `Division(`.
  const call = new RegExp(`(?<![\\w'\\[])${escapeRegex(functionName)}\\s*\\(`);

  return [...allDaxExpressions(project)]
    .filter(({ label, dax }) => label !== `function ${functionName}` && call.test(dax))
    .map(({ label }) => label);
}

/**
 * Everything that still references a named M expression / Power Query parameter.
 *
 * An M query that DEFINES a step of the same name shadows the shared
 * expression, so it isn't a referrer. That distinction matters: virtually every
 * partition starts `let Source = …`, so without it a parameter named `Source`
 * (or `Date`, `Type`, `Value`) would be permanently undeletable.
 */
export function findExpressionReferrers(project: PbipProject, expressionName: string): string[] {
  const name = escapeRegex(expressionName);
  const ref = new RegExp(`(?<![\\w.])${name}(?![\\w.])`);
  const shadowed = new RegExp(`(?<![\\w.])${name}\\s*=`);

  const references = (text: string) => !!text && ref.test(text) && !shadowed.test(text);

  const referrers: string[] = [];

  for (const table of project.model.tables) {
    for (const part of table.partitions) {
      const source = part.source;
      const text =
        source.type === 'mCode' || source.type === 'calculated'
          ? source.expression
          : (source.expressionSource ?? '');
      if (references(text)) {
        referrers.push(`partition '${table.name}'.${part.name}`);
      }
    }
  }

  for (const e of project.model.expressions) {
    if (e.name !== expressionName && references(e.expression)) {
      referrers.push(`expression ${e.name}`);
    }
  }

  return referrers;
}

/** Everything whose DAX still references a calculation group by name. */
export function findCalcGroupReferrers(project: PbipProject, groupName: string): string[] {
  const ref = new RegExp(`(?:'${escapeRegex(groupName)}'|\\b${escapeRegex(groupName)})\\s*\\[`);

  return [...allDaxExpressions(project)]
    .filter(({ label, dax }) => !label.includes(`'${groupName}'`) && ref.test(dax))
    .map(({ label }) => label);
}
