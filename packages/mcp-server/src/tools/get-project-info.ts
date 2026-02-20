import type { PbipProject } from '@pbip-tools/core';

export function getProjectInfo(project: PbipProject) {
  const model = project.model;
  const totalMeasures = model.tables.reduce((sum, t) => sum + t.measures.length, 0);
  const totalColumns = model.tables.reduce((sum, t) => sum + t.columns.length, 0);

  return {
    name: project.name,
    pbipPath: project.pbipPath,
    semanticModelPath: project.semanticModelPath,
    reportPath: project.reportPath ?? null,
    database: {
      name: model.database.name,
      compatibilityLevel: model.database.compatibilityLevel,
    },
    model: {
      culture: model.model.culture ?? null,
      discourageImplicitMeasures: model.model.discourageImplicitMeasures ?? false,
    },
    counts: {
      tables: model.tables.length,
      measures: totalMeasures,
      columns: totalColumns,
      relationships: model.relationships.length,
      expressions: model.expressions.length,
      cultures: model.cultures.length,
    },
  };
}
