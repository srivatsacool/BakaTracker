/**
 * Dual-Route Tool Execution Dispatcher
 *
 * Directs tool calls to either the client-side Zustand store (for local-first entities)
 * or the Cloudflare Worker REST API (for server-owned resources), applying safety
 * interception for Tier 3 destructive operations.
 */

import { toolRegistry } from './registry';
import type { ToolExecutionContext, ToolExecutionResult } from './types';
import type { ApiClient } from '../../api/apiClient';
import { setSyncBlocked, useStore } from '../../store/useStore';

export interface DispatcherOptions {
  apiClient?: ApiClient | null;
  context: ToolExecutionContext;
}

function adaptServerInput(toolName: string, input: Record<string, unknown>): Record<string, unknown> {
  const payload = { ...input };

  if (toolName === 'create_page') {
    let kind = payload.kind as string | undefined;
    if (kind === 'markdown') kind = 'text';
    else if (kind === 'visual') kind = 'excalidraw';
    if (!kind) kind = 'excalidraw';
    payload.kind = kind;
  } else if (toolName === 'file_upload') {
    if (!payload.mime_type && payload.content_type) {
      payload.mime_type = payload.content_type;
    }
    if (!payload.data_base64 && payload.data) {
      payload.data_base64 = payload.data;
    }
  } else if (toolName === 'file_get' || toolName === 'file_delete') {
    if (!payload.id && payload.key) {
      payload.id = payload.key;
    }
  } else if (toolName === 'remember') {
    if (!payload.value && payload.fact) {
      payload.value = payload.fact;
    }
  } else if (toolName === 'recall') {
    if (!payload.key && payload.query) {
      payload.key = payload.query;
    }
  } else if (toolName === 'reset_account') {
    if (!payload.confirm) {
      payload.confirm = 'DELETE';
    }
  }

  return payload;
}

export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  options: DispatcherOptions
): Promise<ToolExecutionResult> {
  const tool = toolRegistry[toolName];
  if (!tool) {
    return {
      success: false,
      error: `Tool "${toolName}" is not registered in BakaTracker.`,
      toolName,
    };
  }

  // --- Tier 3 Destructive Interception ---
  if (tool.safetyTier === 'tier3_destructive') {
    const isCritical = toolName === 'reset_account';
    const approved = await options.context.requestConfirmation({
      toolName,
      title: isCritical ? 'CRITICAL: Account Reset Request' : `Confirm Action: ${tool.name}`,
      message: isCritical
        ? 'An AI assistant is requesting to permanently wipe all account data. This action cannot be undone.'
        : `An AI assistant is requesting to delete resources using "${tool.name}":\n${tool.description}`,
      parameters: input,
      dangerLevel: isCritical ? 'critical' : 'high',
    });

    if (!approved) {
      return {
        success: false,
        error: `Action "${toolName}" was declined by the user.`,
        toolName,
      };
    }
  }

  try {
    if (tool.route === 'local_store') {
      // Execute directly against the local-first Zustand store
      const result = await tool.execute(input, options.context);
      return {
        success: true,
        result,
        toolName,
      };
    } else {
      // Execute via authenticated Cloudflare Worker REST endpoint
      if (!options.apiClient) {
        return {
          success: false,
          error: `Tool "${toolName}" requires an active authenticated server connection.`,
          toolName,
        };
      }

      if (toolName === 'reset_account') {
        setSyncBlocked(true);
      }

      try {
        const payload = adaptServerInput(toolName, input);
        const response = await options.apiClient.post<{
          ok: boolean;
          result?: unknown;
          error?: string;
          message?: string;
        }>(`/api/v1/tools/${toolName}`, payload);

        if (response && response.ok) {
          if (toolName === 'reset_account') {
            useStore.getState().resetStore();
            localStorage.removeItem('bt_tasks');
            localStorage.removeItem('bt_habits');
            localStorage.removeItem('bt_logs');
            localStorage.removeItem('bt_journal');
            localStorage.removeItem('bt_events');
            localStorage.removeItem('bt_sync_pending');
            localStorage.removeItem('bt_deleted_task_ids');
            localStorage.removeItem('bt_deleted_habit_ids');
            localStorage.removeItem('bt_settings');
            localStorage.removeItem('bt_quotes');
            setSyncBlocked(false);
          }

          return {
            success: true,
            result: response.result,
            toolName,
          };
        } else {
          if (toolName === 'reset_account') {
            setSyncBlocked(false);
          }
          return {
            success: false,
            error: response?.message || response?.error || `Server failed executing ${toolName}.`,
            toolName,
          };
        }
      } catch (err: unknown) {
        if (toolName === 'reset_account') {
          setSyncBlocked(false);
        }
        throw err;
      }
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: errorMsg,
      toolName,
    };
  }
}
