import { describe, it, expect } from 'vitest';
import { toolRegistry, clientToolSchemas } from '../../features/tools/registry';

describe('Unified Tool Registry', () => {
  it('registers all canonical tools', () => {
    const toolNames = Object.keys(toolRegistry);
    expect(toolNames.length).toBeGreaterThanOrEqual(38);

    // Verify key core domains
    expect(toolNames).toContain('list_tasks');
    expect(toolNames).toContain('create_task');
    expect(toolNames).toContain('update_task');
    expect(toolNames).toContain('delete_task');

    expect(toolNames).toContain('list_habits');
    expect(toolNames).toContain('create_habit');
    expect(toolNames).toContain('log_habit');
    expect(toolNames).toContain('delete_habit');

    expect(toolNames).toContain('journal_today');
    expect(toolNames).toContain('get_journal');
    expect(toolNames).toContain('list_journal');

    expect(toolNames).toContain('create_page');
    expect(toolNames).toContain('list_pages');
    expect(toolNames).toContain('get_page');
    expect(toolNames).toContain('delete_page');

    expect(toolNames).toContain('file_upload');
    expect(toolNames).toContain('file_delete');

    expect(toolNames).toContain('analytics');
    expect(toolNames).toContain('plan_day');
    expect(toolNames).toContain('reset_account');
  });

  it('assigns correct execution routes', () => {
    // Local-first store
    expect(toolRegistry.list_tasks.route).toBe('local_store');
    expect(toolRegistry.create_task.route).toBe('local_store');
    expect(toolRegistry.create_habit.route).toBe('local_store');
    expect(toolRegistry.journal_today.route).toBe('local_store');

    // Server REST
    expect(toolRegistry.create_page.route).toBe('server_rest');
    expect(toolRegistry.analytics.route).toBe('server_rest');
    expect(toolRegistry.file_upload.route).toBe('server_rest');
    expect(toolRegistry.reset_account.route).toBe('server_rest');
  });

  it('marks destructive operations as tier3_destructive', () => {
    expect(toolRegistry.delete_task.safetyTier).toBe('tier3_destructive');
    expect(toolRegistry.delete_habit.safetyTier).toBe('tier3_destructive');
    expect(toolRegistry.delete_page.safetyTier).toBe('tier3_destructive');
    expect(toolRegistry.file_delete.safetyTier).toBe('tier3_destructive');
    expect(toolRegistry.reset_account.safetyTier).toBe('tier3_destructive');

    // Safe reads
    expect(toolRegistry.list_tasks.safetyTier).toBe('tier1_safe');
    expect(toolRegistry.get_journal.safetyTier).toBe('tier1_safe');
    expect(toolRegistry.analytics.safetyTier).toBe('tier1_safe');
  });

  it('exports clientToolSchemas with valid JSON schema specifications', () => {
    expect(clientToolSchemas.length).toBe(Object.keys(toolRegistry).length);
    for (const schema of clientToolSchemas) {
      expect(schema.name).toBeDefined();
      expect(schema.description).toBeDefined();
      expect(schema.parameters.type).toBe('object');
      expect(schema.parameters.properties).toBeDefined();
    }
  });
});
