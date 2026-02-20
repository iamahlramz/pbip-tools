import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';

export function rlsWizardPrompt(args: { tableName?: string }): GetPromptResult {
  const tableName = args.tableName ?? '{your fact or dimension table}';

  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `I want to create Row-Level Security (RLS) roles in my Power BI semantic model.

## What is RLS?

Row-Level Security restricts data access at the row level using DAX filter expressions. Each role defines filter expressions on one or more tables, and users assigned to a role only see rows that pass those filters.

## Common Patterns

### 1. User-based filtering
\`\`\`dax
// Filter to current user's data
[Email] = USERPRINCIPALNAME()
\`\`\`

### 2. Region/department filtering
\`\`\`dax
// Static role: only see "East" region data
[Region] = "East"
\`\`\`

### 3. Dynamic security via lookup table
\`\`\`dax
// Filter rows where user email matches security table
[UserEmail] = LOOKUPVALUE(
    'SecurityTable'[Email],
    'SecurityTable'[Region],
    [Region]
)
\`\`\`

### 4. Manager sees direct reports
\`\`\`dax
// PATH-based hierarchy security
PATHCONTAINS(
    [ManagerPath],
    LOOKUPVALUE('Employees'[EmployeeID], 'Employees'[Email], USERPRINCIPALNAME())
)
\`\`\`

## My context

- **Table to filter:** \`${tableName}\`

## Instructions

1. Ask me what **security model** I need (user-based, region, dynamic, hierarchical)
2. Ask me which **tables** need filter expressions
3. Help me write the **DAX filter expressions** for each table
4. Ask about **model permission** level (read, readRefresh, or none)
5. Then use \`pbip_create_role\` to create the role
6. Explain how to test the role using "View as Role" in Power BI Desktop
7. Remind me about publishing RLS to the Power BI Service and assigning members`,
        },
      },
    ],
  };
}
