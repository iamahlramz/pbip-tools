import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';

export function timeIntelligenceWizardPrompt(args: {
  baseMeasure?: string;
  tableName?: string;
}): GetPromptResult {
  const baseMeasure = args.baseMeasure ?? '{your base measure name}';
  const tableName = args.tableName ?? '{your measures table}';

  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `I want to create time intelligence measure variants in my Power BI semantic model.

## Available variants

| Variant | Suffix | DAX Pattern |
|---------|--------|-------------|
| MTD | Monthly to Date | \`TOTALMTD([Measure], DateColumn)\` |
| QTD | Quarterly to Date | \`TOTALQTD([Measure], DateColumn)\` |
| YTD | Year to Date | \`TOTALYTD([Measure], DateColumn)\` |
| PY | Prior Year | \`CALCULATE([Measure], SAMEPERIODLASTYEAR(DateColumn))\` |
| PY_MTD | Prior Year MTD | \`TOTALMTD([Measure], SAMEPERIODLASTYEAR(DateColumn))\` |
| PY_QTD | Prior Year QTD | \`TOTALQTD([Measure], SAMEPERIODLASTYEAR(DateColumn))\` |
| PY_YTD | Prior Year YTD | \`TOTALYTD([Measure], SAMEPERIODLASTYEAR(DateColumn))\` |
| YoY | Year over Year change | \`[Measure] - [Measure PY]\` |
| YoY% | Year over Year % change | \`DIVIDE([Measure] - [Measure PY], [Measure PY])\` |

## My context

- **Base measure:** \`${baseMeasure}\`
- **Table:** \`${tableName}\`

## Instructions

1. First, use \`pbip_get_measure\` to inspect my base measure
2. Ask me which **date column** to use (e.g., \`'Calendar'[Date]\`)
3. Ask me which **variants** I want (suggest common sets like "MTD, YTD, PY, YoY%" for operational KPIs)
4. Ask about a **display folder** for the generated measures
5. Then use \`pbip_gen_time_intelligence\` to create all variants at once
6. Confirm the measures were created successfully`,
        },
      },
    ],
  };
}
