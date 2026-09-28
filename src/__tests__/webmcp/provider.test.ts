import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebMCPProvider } from '../../features/webmcp/provider';

describe('WebMCP Provider', () => {
  let provider: WebMCPProvider;
  let registeredTools: any[] = [];
  const originalNavigator = global.navigator;

  beforeEach(() => {
    provider = new WebMCPProvider();
    registeredTools = [];

    // Mock navigator.modelContext
    Object.defineProperty(global, 'navigator', {
      value: {
        modelContext: {
          registerTool: vi.fn((tool) => registeredTools.push(tool)),
          clearTools: vi.fn(() => {
            registeredTools = [];
          }),
        },
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('detects modelContext availability correctly', () => {
    expect(provider.isAvailable()).toBe(true);
  });

  it('registers all canonical tools with navigator.modelContext', () => {
    const requestConfirmation = vi.fn().mockResolvedValue(true);
    provider.registerAll(null, requestConfirmation);

    expect(registeredTools.length).toBeGreaterThanOrEqual(38);
    const names = registeredTools.map((t) => t.name);
    expect(names).toContain('list_tasks');
    expect(names).toContain('create_task');
    expect(names).toContain('delete_task');
  });

  it('clears registered tools upon unregisterAll', () => {
    const requestConfirmation = vi.fn().mockResolvedValue(true);
    provider.registerAll(null, requestConfirmation);
    expect(registeredTools.length).toBeGreaterThan(0);

    provider.unregisterAll();
    expect(registeredTools.length).toBe(0);
  });
});
