import type { PbipProject, MeasureNode, BindingUpdateOp } from '@pbip-tools/core';

export function moveMeasure(
  project: PbipProject,
  measureName: string,
  targetTable: string,
): {
  sourceTable: string;
  targetTable: string;
  measure: MeasureNode;
  bindingOps: BindingUpdateOp[];
} {
  const target = project.model.tables.find((t) => t.name === targetTable);
  if (!target) {
    throw new Error(`Target table '${targetTable}' not found`);
  }

  for (const table of project.model.tables) {
    const idx = table.measures.findIndex((m) => m.name === measureName);
    if (idx >= 0) {
      if (table.name === targetTable) {
        throw new Error(`Measure '${measureName}' is already in table '${targetTable}'`);
      }

      const [measure] = table.measures.splice(idx, 1);

      // Check for duplicate in target
      if (target.measures.find((m) => m.name === measureName)) {
        // Put it back
        table.measures.splice(idx, 0, measure);
        throw new Error(`Measure '${measureName}' already exists in target table '${targetTable}'`);
      }

      target.measures.push(measure);

      const bindingOps: BindingUpdateOp[] = [
        {
          oldEntity: table.name,
          oldProperty: measureName,
          newEntity: targetTable,
          newProperty: measureName,
        },
      ];

      return {
        sourceTable: table.name,
        targetTable,
        measure,
        bindingOps,
      };
    }
  }

  throw new Error(`Measure '${measureName}' not found in any table`);
}
