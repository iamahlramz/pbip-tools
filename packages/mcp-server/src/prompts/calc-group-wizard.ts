import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';

export function calcGroupWizardPrompt(args: { useCase?: string }): GetPromptResult {
  const useCase = args.useCase ?? 'general';

  const useCaseExamples: Record<string, string> = {
    'time-intelligence': `**Time Intelligence Calculation Group** — apply period-over-period logic to any measure:
- Current: \`SELECTEDMEASURE()\`
- MTD: \`TOTALMTD(SELECTEDMEASURE(), 'Calendar'[Date])\`
- YTD: \`TOTALYTD(SELECTEDMEASURE(), 'Calendar'[Date])\`
- PY: \`CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR('Calendar'[Date]))\`
- YoY %: \`VAR _C = SELECTEDMEASURE() VAR _P = CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR('Calendar'[Date])) RETURN DIVIDE(_C - _P, _P)\``,

    currency: `**Currency Conversion** — apply exchange rates to any monetary measure:
- Local Currency: \`SELECTEDMEASURE()\`
- USD: \`SELECTEDMEASURE() * SELECTEDVALUE('Exchange Rates'[USD Rate])\`
- EUR: \`SELECTEDMEASURE() * SELECTEDVALUE('Exchange Rates'[EUR Rate])\``,

    display: `**Display Toggle** — switch between actual, target, and variance views:
- Actual: \`SELECTEDMEASURE()\`
- vs Target: \`SELECTEDMEASURE() - CALCULATE(SELECTEDMEASURE(), 'Targets')\`
- % of Target: \`DIVIDE(SELECTEDMEASURE(), CALCULATE(SELECTEDMEASURE(), 'Targets'))\``,

    general: `Common use cases:
1. **Time Intelligence** — apply MTD/YTD/PY to any measure dynamically
2. **Currency Conversion** — multiply by exchange rates
3. **Display Toggles** — switch between actual/target/variance views
4. **Formatting** — apply different format strings based on selection`,
  };

  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `I want to create a calculation group in my Power BI semantic model.

## What is a Calculation Group?

Calculation groups apply DAX transformations to any measure dynamically using \`SELECTEDMEASURE()\`. Instead of creating N variants of every measure, you create one calculation group that transforms any measure at query time.

## Example Use Cases

${useCaseExamples[useCase] ?? useCaseExamples.general}

## How SELECTEDMEASURE() works

Every calculation item expression wraps the measure that the visual is displaying:
\`\`\`dax
// If a card shows [Total Sales], and the user selects "YTD":
TOTALYTD(SELECTEDMEASURE(), 'Calendar'[Date])
// becomes: TOTALYTD([Total Sales], 'Calendar'[Date])
\`\`\`

## Instructions

1. Ask me what **use case** this calculation group serves
2. Ask me for a **table name** for the calculation group
3. Help me define **calculation items** — each needs a name and a SELECTEDMEASURE() expression
4. Ask about **precedence** if I have multiple calculation groups (higher = applied later)
5. Ask about **format string expressions** if items change the data type (e.g., percentage items)
6. Then use \`pbip_create_calc_group\` to create it
7. Confirm it was created and explain how to use it in visuals`,
        },
      },
    ],
  };
}
