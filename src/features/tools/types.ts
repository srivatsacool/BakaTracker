/**
 * Shared Tool Execution Layer - Types & Contracts
 *
 * Defines the execution contract, safety tiers, and dispatch routes
 * shared by BakaSur, WebMCP, and browser AI interactions.
 */

export type ToolSafetyTier = 'tier1_safe' | 'tier2_mutation' | 'tier3_destructive';

export type ToolRoute = 'local_store' | 'server_rest';

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: Record<string, unknown>;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface ToolJSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface ConfirmationRequest {
  toolName: string;
  title: string;
  message: string;
  parameters: Record<string, unknown>;
  dangerLevel: 'medium' | 'high' | 'critical';
}

export interface ToolExecutionContext {
  requestConfirmation: (params: ConfirmationRequest) => Promise<boolean>;
  signal?: AbortSignal;
}

export interface ToolDefinition<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  description: string;
  parameters: ToolJSONSchema;
  safetyTier: ToolSafetyTier;
  route: ToolRoute;
  execute: (input: TInput, context: ToolExecutionContext) => Promise<TOutput>;
}

export interface ToolExecutionResult<T = unknown> {
  success: boolean;
  result?: T;
  error?: string;
  toolName: string;
}
