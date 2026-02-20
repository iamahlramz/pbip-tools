import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';

export function kpiWizardPrompt(args: {
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
          text: `I want to create a complete KPI measure suite in my Power BI semantic model.

## What I need

A full KPI family for a base measure, which includes:
1. **Target** — a DAX expression that defines the target/goal
2. **Variance** — actual minus target
3. **Variance %** — variance as a percentage of target
4. **Status Color** — conditional formatting color based on performance tiers:
   - Exceeding (≥100%): Maroon #80004B
   - On Target (≥95%): Green #0D9F6E
   - Behind (≥80%): Amber #C97A1E
   - At Risk (<80%): Red #C92A2A
   - No Target: Grey #9E9E9E
5. **Gauge Max** — for gauge visuals, 110% of the larger of actual or target

## My context

- **Base measure:** \`${baseMeasure}\`
- **Table:** \`${tableName}\`

## Instructions

1. First, use \`pbip_get_measure\` to inspect my base measure's DAX expression
2. Ask me what the **target expression** should be (e.g., a fixed value, another measure, a calculated goal)
3. Ask me for a **KPI name prefix** (e.g., "Revenue" creates "Revenue Target", "Revenue Variance", etc.)
4. Ask about **custom status thresholds** if the defaults (80%/95%) don't fit
5. Then use \`pbip_gen_kpi_suite\` to create all measures at once
6. Confirm the measures were created successfully`,
        },
      },
    ],
  };
}
