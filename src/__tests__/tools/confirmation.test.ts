import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useConfirmation } from '../../features/tools/useConfirmation';

describe('Human-in-the-Loop (HITL) Confirmation Queue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useConfirmation.setState({ pendingRequest: null, queue: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('queues requests and does not overwrite in-flight confirmations', async () => {
    const p1 = useConfirmation.getState().requestConfirmation({
      toolName: 'delete_task',
      title: 'Delete Task 1',
      message: 'Delete first',
      dangerLevel: 'high',
    });

    const p2 = useConfirmation.getState().requestConfirmation({
      toolName: 'delete_task',
      title: 'Delete Task 2',
      message: 'Delete second',
      dangerLevel: 'high',
    });

    // p1 should be active
    expect(useConfirmation.getState().pendingRequest?.title).toBe('Delete Task 1');

    // Approve p1
    useConfirmation.getState().approve();
    const res1 = await p1;
    expect(res1).toBe(true);

    // Now p2 must automatically become active
    expect(useConfirmation.getState().pendingRequest?.title).toBe('Delete Task 2');

    // Deny p2
    useConfirmation.getState().deny();
    const res2 = await p2;
    expect(res2).toBe(false);

    // Queue must now be empty
    expect(useConfirmation.getState().pendingRequest).toBeNull();
    expect(useConfirmation.getState().queue).toHaveLength(0);
  });

  it('auto-denies after 60-second timeout to prevent hanging the agent', async () => {
    const promise = useConfirmation.getState().requestConfirmation({
      toolName: 'reset_account',
      title: 'Reset Account',
      message: 'Critical action',
      dangerLevel: 'critical',
    });

    expect(useConfirmation.getState().pendingRequest).not.toBeNull();

    // Advance clock past 60s
    vi.advanceTimersByTime(60000);

    const res = await promise;
    expect(res).toBe(false);
    expect(useConfirmation.getState().pendingRequest).toBeNull();
  });
});
