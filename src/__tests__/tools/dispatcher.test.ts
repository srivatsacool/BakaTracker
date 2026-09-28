import { describe, it, expect, vi } from 'vitest';
import { executeTool } from '../../features/tools/dispatcher';

describe('Tool Dispatcher & Safety Interception', () => {
  it('rejects unapproved destructive Tier 3 tools', async () => {
    const requestConfirmation = vi.fn().mockResolvedValue(false);

    const result = await executeTool(
      'delete_task',
      { id: 'task_123' },
      {
        context: { requestConfirmation },
      }
    );

    expect(requestConfirmation).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.error).toContain('declined by the user');
  });

  it('proceeds with Tier 3 tools when user confirms', async () => {
    const requestConfirmation = vi.fn().mockResolvedValue(true);

    const result = await executeTool(
      'delete_task',
      { id: 'non_existent_task' },
      {
        context: { requestConfirmation },
      }
    );

    expect(requestConfirmation).toHaveBeenCalledTimes(1);
    // Task delete should succeed without throwing error
    expect(result.success).toBe(true);
  });

  it('executes Tier 1 safe tools directly without requesting confirmation', async () => {
    const requestConfirmation = vi.fn();

    const result = await executeTool(
      'list_tasks',
      {},
      {
        context: { requestConfirmation },
      }
    );

    expect(requestConfirmation).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.result)).toBe(true);
  });

  it('routes server tools via apiClient', async () => {
    const mockApiClient = {
      post: vi.fn().mockResolvedValue({ ok: true, result: { pages: [] } }),
    };
    const requestConfirmation = vi.fn();

    const result = await executeTool(
      'list_pages',
      {},
      {
        apiClient: mockApiClient as any,
        context: { requestConfirmation },
      }
    );

    expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/tools/list_pages', {});
    expect(result.success).toBe(true);
  });

  it('adapts legacy page format inputs before sending to server', async () => {
    const mockApiClient = {
      post: vi.fn().mockResolvedValue({ ok: true, result: { id: 'p1' } }),
    };

    const result = await executeTool(
      'create_page',
      { title: 'Test Page', kind: 'markdown' },
      {
        apiClient: mockApiClient as any,
        context: { requestConfirmation: vi.fn() },
      }
    );

    expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/tools/create_page', {
      title: 'Test Page',
      kind: 'text',
    });
    expect(result.success).toBe(true);
  });

  it('adapts file upload aliases before sending to server', async () => {
    const mockApiClient = {
      post: vi.fn().mockResolvedValue({ ok: true, result: { id: 'f1' } }),
    };

    const result = await executeTool(
      'file_upload',
      { filename: 'doc.pdf', content_type: 'application/pdf', data: 'JVBERi0xLjc=' },
      {
        apiClient: mockApiClient as any,
        context: { requestConfirmation: vi.fn() },
      }
    );

    expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/tools/file_upload', {
      filename: 'doc.pdf',
      mime_type: 'application/pdf',
      content_type: 'application/pdf',
      data_base64: 'JVBERi0xLjc=',
      data: 'JVBERi0xLjc=',
    });
    expect(result.success).toBe(true);
  });

  it('resets local store and clears storage on successful reset_account', async () => {
    const mockApiClient = {
      post: vi.fn().mockResolvedValue({ ok: true, result: { reset: true } }),
    };
    const requestConfirmation = vi.fn().mockResolvedValue(true);

    localStorage.setItem('bt_tasks', JSON.stringify([{ id: 't1' }]));

    const result = await executeTool(
      'reset_account',
      {},
      {
        apiClient: mockApiClient as any,
        context: { requestConfirmation },
      }
    );

    expect(requestConfirmation).toHaveBeenCalledTimes(1);
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/tools/reset_account', {
      confirm: 'DELETE',
    });
    expect(result.success).toBe(true);
    expect(localStorage.getItem('bt_tasks')).toBeNull();
  });
});
