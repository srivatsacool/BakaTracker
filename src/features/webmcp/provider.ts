/**
 * WebMCP Provider - Browser Model Context Protocol Bridge
 *
 * Exposes BakaTracker's canonical tools to browser AI agents (e.g. Chrome Built-in AI,
 * Prompt API, or WebMCP extensions) via `window.navigator.modelContext`.
 */

import { toolRegistry } from '../tools/registry';
import { executeTool } from '../tools/dispatcher';
import type { ApiClient } from '../../api/apiClient';
import type { ConfirmationRequest } from '../tools/types';

interface WebMCPNavigator extends Navigator {
  modelContext?: {
    registerTool?: (tool: {
      name: string;
      description: string;
      parameters?: unknown;
      inputSchema?: unknown;
      handler: (args: Record<string, unknown>) => Promise<unknown>;
    }) => void;
    unregisterTool?: (name: string) => void;
    clearTools?: () => void;
  };
}

export class WebMCPProvider {
  private registered = false;

  public isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    const nav = window.navigator as WebMCPNavigator;
    return Boolean(nav.modelContext && typeof nav.modelContext.registerTool === 'function');
  }

  public registerAll(
    apiClient: ApiClient | null,
    requestConfirmation: (params: ConfirmationRequest) => Promise<boolean>
  ): void {
    if (!this.isAvailable()) {
      return;
    }
    if (this.registered) {
      return;
    }

    const nav = window.navigator as WebMCPNavigator;
    if (!nav.modelContext?.registerTool) return;

    try {
      for (const [name, tool] of Object.entries(toolRegistry)) {
        nav.modelContext.registerTool({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          inputSchema: tool.parameters, // Support both parameter nomenclatures
          handler: async (args: Record<string, unknown>) => {
            const result = await executeTool(name, args, {
              apiClient,
              context: {
                requestConfirmation,
              },
            });

            if (!result.success) {
              throw new Error(result.error || `Execution failed for tool ${name}`);
            }
            return result.result;
          },
        });
      }
      this.registered = true;
      console.info(`[WebMCP] Successfully registered ${Object.keys(toolRegistry).length} tools with navigator.modelContext`);
    } catch (err) {
      console.warn('[WebMCP] Failed to register tools:', err);
    }
  }

  public unregisterAll(): void {
    if (!this.isAvailable() || !this.registered) return;
    const nav = window.navigator as WebMCPNavigator;

    try {
      if (typeof nav.modelContext?.clearTools === 'function') {
        nav.modelContext.clearTools();
      } else if (typeof nav.modelContext?.unregisterTool === 'function') {
        for (const name of Object.keys(toolRegistry)) {
          nav.modelContext.unregisterTool(name);
        }
      }
      this.registered = false;
      console.info('[WebMCP] Successfully unregistered tools from navigator.modelContext');
    } catch (err) {
      console.warn('[WebMCP] Failed to unregister tools:', err);
    }
  }
}

export const webMCPProvider = new WebMCPProvider();
