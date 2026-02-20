import type { PbipProject } from '@pbip-tools/core';

export function listTables(project: PbipProject, includeColumns: boolean) {
  return project.model.tables.map((table) => {
    const base = {
      name: table.name,
      measureCount: table.measures.length,
      columnCount: table.columns.length,
      partitionCount: table.partitions.length,
      hasCalculationGroup: !!table.calculationGroup,
      dataCategory: table.dataCategory ?? null,
      isHidden: table.isHidden ?? false,
    };

    if (includeColumns) {
      return {
        ...base,
        columns: table.columns.map((col) => ({
          name: col.name,
          dataType: col.dataType,
          isKey: col.isKey ?? false,
          isHidden: col.isHidden ?? false,
          sortByColumn: col.sortByColumn ?? null,
        })),
      };
    }

    return base;
  });
}
