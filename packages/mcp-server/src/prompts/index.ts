import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { kpiWizardPrompt } from './kpi-wizard.js';
import { timeIntelligenceWizardPrompt } from './time-intelligence-wizard.js';
import { calcGroupWizardPrompt } from './calc-group-wizard.js';
import { rlsWizardPrompt } from './rls-wizard.js';

export function registerPrompts(server: McpServer) {
  server.prompt(
    'pbi_kpi_wizard',
    'Interactive KPI creation wizard — generates Target, Variance, Status Color, and Gauge Max measures',
    {
      baseMeasure: z.string().optional().describe('Name of the base measure (e.g. "Total Sales")'),
      tableName: z.string().optional().describe('Table to add measures to'),
    },
    (args) => kpiWizardPrompt(args),
  );

  server.prompt(
    'pbi_time_intelligence_wizard',
    'Time intelligence setup wizard — generates MTD, QTD, YTD, PY, YoY variants',
    {
      baseMeasure: z.string().optional().describe('Name of the base measure'),
      tableName: z.string().optional().describe('Table to add measures to'),
    },
    (args) => timeIntelligenceWizardPrompt(args),
  );

  server.prompt(
    'pbi_calc_group_wizard',
    'Calculation group creation wizard — explains SELECTEDMEASURE() and common patterns',
    {
      useCase: z
        .string()
        .optional()
        .describe('Use case: "time-intelligence", "currency", "display", or "general"'),
    },
    (args) => calcGroupWizardPrompt(args),
  );

  server.prompt(
    'pbi_rls_wizard',
    'Row-Level Security role creation wizard — DAX filter patterns and best practices',
    {
      tableName: z.string().optional().describe('Primary table to apply RLS filter to'),
    },
    (args) => rlsWizardPrompt(args),
  );
}
