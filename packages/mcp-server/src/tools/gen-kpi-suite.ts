import type { PbipProject } from '@pbip-tools/core';
import { createMeasure } from './create-measure.js';

export interface KpiSuiteResult {
  table: string;
  measures: Array<{ name: string; lineageTag: string }>;
}

export function genKpiSuite(
  project: PbipProject,
  tableName: string,
  baseMeasure: string,
  targetExpression: string,
  kpiName: string,
  displayFolder?: string,
  formatString?: string,
  statusThresholds?: { behind: number; atRisk: number },
): KpiSuiteResult {
  // Validate base measure exists
  let baseMeasureFound = false;
  for (const table of project.model.tables) {
    if (table.measures.find((m) => m.name === baseMeasure)) {
      baseMeasureFound = true;
      break;
    }
  }
  if (!baseMeasureFound) {
    throw new Error(`Base measure '${baseMeasure}' not found in the model`);
  }

  const behind = statusThresholds?.behind ?? 0.8;
  const atRisk = statusThresholds?.atRisk ?? 0.95;

  const targetName = `${kpiName} Target`;
  const varianceName = `${kpiName} Variance`;
  const variancePctName = `${kpiName} Variance %`;
  const statusColorName = `${kpiName} Status Color`;
  const gaugeMaxName = `${kpiName} Gauge Max`;

  const created: Array<{ name: string; lineageTag: string }> = [];

  // 1. Target
  const target = createMeasure(
    project,
    tableName,
    targetName,
    targetExpression,
    formatString,
    displayFolder,
  );
  created.push({ name: target.measure.name, lineageTag: target.measure.lineageTag! });

  // 2. Variance
  const variance = createMeasure(
    project,
    tableName,
    varianceName,
    `[${baseMeasure}] - [${targetName}]`,
    formatString,
    displayFolder,
  );
  created.push({ name: variance.measure.name, lineageTag: variance.measure.lineageTag! });

  // 3. Variance %
  const variancePct = createMeasure(
    project,
    tableName,
    variancePctName,
    `DIVIDE([${varianceName}], [${targetName}], BLANK())`,
    '0.0%',
    displayFolder,
  );
  created.push({
    name: variancePct.measure.name,
    lineageTag: variancePct.measure.lineageTag!,
  });

  // 4. Status Color (Tonkin 5-tier palette)
  const statusColorExpr = [
    'VAR _Ratio = DIVIDE([' + baseMeasure + '], [' + targetName + '], BLANK())',
    'RETURN',
    '    SWITCH(',
    '        TRUE(),',
    `        _Ratio >= 1, "#80004B",`,
    `        _Ratio >= ${atRisk}, "#0D9F6E",`,
    `        _Ratio >= ${behind}, "#C97A1E",`,
    `        _Ratio > 0, "#C92A2A",`,
    `        "#9E9E9E"`,
    '    )',
  ].join('\n');

  const statusColor = createMeasure(
    project,
    tableName,
    statusColorName,
    statusColorExpr,
    undefined,
    displayFolder,
  );
  created.push({
    name: statusColor.measure.name,
    lineageTag: statusColor.measure.lineageTag!,
  });

  // 5. Gauge Max
  const gaugeMax = createMeasure(
    project,
    tableName,
    gaugeMaxName,
    `MAX([${baseMeasure}], [${targetName}]) * 1.1`,
    formatString,
    displayFolder,
  );
  created.push({ name: gaugeMax.measure.name, lineageTag: gaugeMax.measure.lineageTag! });

  return { table: tableName, measures: created };
}
