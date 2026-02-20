import type { PbipProject } from '@pbip-tools/core';
import { createMeasure } from './create-measure.js';

export type TimeIntelligenceVariant =
  | 'MTD'
  | 'QTD'
  | 'YTD'
  | 'PY'
  | 'PY_MTD'
  | 'PY_QTD'
  | 'PY_YTD'
  | 'YoY'
  | 'YoY%';

export interface TimeIntelligenceResult {
  table: string;
  measures: Array<{ name: string; variant: string; lineageTag: string }>;
}

function buildVariantExpression(
  baseMeasure: string,
  dateColumn: string,
  variant: TimeIntelligenceVariant,
): { suffix: string; expression: string; formatString?: string } {
  switch (variant) {
    case 'MTD':
      return {
        suffix: 'MTD',
        expression: `TOTALMTD([${baseMeasure}], ${dateColumn})`,
      };
    case 'QTD':
      return {
        suffix: 'QTD',
        expression: `TOTALQTD([${baseMeasure}], ${dateColumn})`,
      };
    case 'YTD':
      return {
        suffix: 'YTD',
        expression: `TOTALYTD([${baseMeasure}], ${dateColumn})`,
      };
    case 'PY':
      return {
        suffix: 'PY',
        expression: `CALCULATE([${baseMeasure}], SAMEPERIODLASTYEAR(${dateColumn}))`,
      };
    case 'PY_MTD':
      return {
        suffix: 'PY MTD',
        expression: `TOTALMTD([${baseMeasure}], SAMEPERIODLASTYEAR(${dateColumn}))`,
      };
    case 'PY_QTD':
      return {
        suffix: 'PY QTD',
        expression: `TOTALQTD([${baseMeasure}], SAMEPERIODLASTYEAR(${dateColumn}))`,
      };
    case 'PY_YTD':
      return {
        suffix: 'PY YTD',
        expression: `TOTALYTD([${baseMeasure}], SAMEPERIODLASTYEAR(${dateColumn}))`,
      };
    case 'YoY':
      return {
        suffix: 'YoY',
        expression: `[${baseMeasure}] - CALCULATE([${baseMeasure}], SAMEPERIODLASTYEAR(${dateColumn}))`,
      };
    case 'YoY%':
      return {
        suffix: 'YoY %',
        expression: `VAR _Current = [${baseMeasure}]\nVAR _PY = CALCULATE([${baseMeasure}], SAMEPERIODLASTYEAR(${dateColumn}))\nRETURN\n    DIVIDE(_Current - _PY, _PY, BLANK())`,
        formatString: '0.0%',
      };
  }
}

export function genTimeIntelligence(
  project: PbipProject,
  tableName: string,
  baseMeasure: string,
  dateColumn: string,
  variants: TimeIntelligenceVariant[],
  displayFolder?: string,
): TimeIntelligenceResult {
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

  const created: Array<{ name: string; variant: string; lineageTag: string }> = [];

  for (const variant of variants) {
    const { suffix, expression, formatString } = buildVariantExpression(
      baseMeasure,
      dateColumn,
      variant,
    );
    const measureName = `${baseMeasure} ${suffix}`;

    const result = createMeasure(
      project,
      tableName,
      measureName,
      expression,
      formatString,
      displayFolder,
    );

    created.push({
      name: result.measure.name,
      variant,
      lineageTag: result.measure.lineageTag!,
    });
  }

  return { table: tableName, measures: created };
}
