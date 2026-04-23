import { describe, it, expect, beforeAll } from 'vitest';
import type { PbipProject } from '@pbip-tools/core';
import { registerTools } from '../src/tools/index.js';

/**
 * Meta-test: enumerate every tool registered by registerTools() and assert
 * the registration contract holds for all of them. Catches regressions that
 * slip through per-tool tests — missing schemas, duplicate names, empty
 * descriptions, handler wiring errors — at the moment a new tool is added.
 *
 * As the tool count grows (Phase B will add fabric-client live-mode tools),
 * this test is the cheapest safety net against registration typos.
 */

interface CapturedTool {
  name: string;
  description: string;
  schemaShape: unknown;
  handler: unknown;
}

function captureRegistrations(): {
  tools: CapturedTool[];
  fakeServer: {
    tool(
      name: string,
      description: string,
      schemaShape: unknown,
      handler: unknown,
    ): void;
  };
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    fakeServer: {
      tool(name, description, schemaShape, handler) {
        tools.push({ name, description, schemaShape, handler });
      },
    },
  };
}

// Stub dependencies — registerTools does not invoke them at registration time,
// only when a tool runs. Tests that drive individual tools cover the runtime
// path; here we only care about the registration shape.
const notCalled = () => {
  throw new Error('registerTools helper called during registration — should only run at tool-invoke time');
};
const fakeGetProject = notCalled as unknown as (path?: string) => Promise<PbipProject>;
const fakeInvalidateCache = notCalled as unknown as (path: string) => void;

describe('registerTools contract', () => {
  let captured: CapturedTool[];

  beforeAll(() => {
    const { tools, fakeServer } = captureRegistrations();
    // Cast: the test only exercises the .tool() method shape, not the full
    // McpServer interface.
    registerTools(
      fakeServer as unknown as Parameters<typeof registerTools>[0],
      fakeGetProject,
      fakeGetProject,
      fakeInvalidateCache,
    );
    captured = tools;
  });

  it('registers at least 50 tools (sanity check)', () => {
    expect(captured.length).toBeGreaterThanOrEqual(50);
  });

  it('every tool has a non-empty name', () => {
    for (const t of captured) {
      expect(t.name, `tool at index ${captured.indexOf(t)}`).toBeTruthy();
      expect(typeof t.name).toBe('string');
      expect(t.name.length).toBeGreaterThan(0);
    }
  });

  it('every tool name starts with the "pbip_" prefix', () => {
    const bad = captured.filter((t) => !t.name.startsWith('pbip_'));
    expect(bad.map((t) => t.name)).toEqual([]);
  });

  it('every tool name is unique', () => {
    const names = captured.map((t) => t.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes).toEqual([]);
  });

  it('every tool has a non-empty description', () => {
    for (const t of captured) {
      expect(t.description, `tool ${t.name}`).toBeTruthy();
      expect(typeof t.description).toBe('string');
      expect(t.description.length).toBeGreaterThan(10);
    }
  });

  it('every tool has a schemaShape object (from zod .shape)', () => {
    for (const t of captured) {
      expect(t.schemaShape, `tool ${t.name}`).toBeDefined();
      expect(typeof t.schemaShape).toBe('object');
      expect(t.schemaShape).not.toBeNull();
    }
  });

  it('every tool has a callable handler', () => {
    for (const t of captured) {
      expect(typeof t.handler, `tool ${t.name}`).toBe('function');
    }
  });

  it('tool names follow the pbip_<verb>_<noun> shape (snake_case)', () => {
    const bad = captured.filter((t) => !/^pbip_[a-z]+(_[a-z0-9]+)*$/.test(t.name));
    expect(bad.map((t) => t.name)).toEqual([]);
  });
});
