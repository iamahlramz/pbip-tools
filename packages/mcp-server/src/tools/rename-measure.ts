import type { PbipProject, MeasureNode, BindingUpdateOp } from '@pbip-tools/core';

/**
 * Rename a measure and emit the binding ops needed to re-point every visual
 * that referenced it. Renaming without rewriting visual.json bindings would
 * leave the report full of broken references — the same reason move_measure
 * rewrites bindings.
 *
 * DAX references in other measures are NOT rewritten (a `[Old Name]` reference
 * elsewhere would still break); callers get the referencing measures back so
 * they can decide. Reported via `daxReferences`.
 */
export function renameMeasure(
  project: PbipProject,
  measureName: string,
  newName: string,
): {
  table: string;
  oldName: string;
  newName: string;
  measure: MeasureNode;
  bindingOps: BindingUpdateOp[];
  daxReferences: string[];
} {
  if (measureName === newName) {
    throw new Error(`Measure is already named '${newName}'`);
  }

  for (const table of project.model.tables) {
    const measure = table.measures.find((m) => m.name === measureName);
    if (!measure) continue;

    // A measure name must be unique across the whole model, not just its table.
    for (const t of project.model.tables) {
      if (t.measures.some((m) => m.name === newName)) {
        throw new Error(`A measure named '${newName}' already exists in table '${t.name}'`);
      }
    }

    // Other measures referencing [Old Name] in their DAX — surfaced, not rewritten.
    const needle = `[${measureName}]`;
    const daxReferences: string[] = [];
    for (const t of project.model.tables) {
      for (const m of t.measures) {
        if (m.name !== measureName && m.expression.includes(needle)) {
          daxReferences.push(`${t.name}[${m.name}]`);
        }
      }
    }

    measure.name = newName;

    const bindingOps: BindingUpdateOp[] = [
      {
        oldEntity: table.name,
        oldProperty: measureName,
        newEntity: table.name,
        newProperty: newName,
      },
    ];

    return {
      table: table.name,
      oldName: measureName,
      newName,
      measure,
      bindingOps,
      daxReferences,
    };
  }

  throw new Error(`Measure '${measureName}' not found in any table`);
}
