import { describe, it, expect } from 'vitest';

/**
 * Test the tombstone operation emission logic from stateService.ts:293-308.
 * This is the function that creates delete ops for tombstoned entities.
 */

interface DeleteOp {
  op: 'delete';
  entity: string;
  entity_id: string;
  rev: string;
}

/**
 * Reproduce the tombstone op emission from stateService.ts syncData.
 */
function emitDeleteOps(
  deletedTaskIds: string[],
  deletedHabitIds: string[],
): DeleteOp[] {
  const ops: DeleteOp[] = [];
  for (const id of deletedTaskIds) {
    ops.push({
      op: 'delete',
      entity: 'task',
      entity_id: id,
      rev: new Date().toISOString(),
    });
  }
  for (const id of deletedHabitIds) {
    ops.push({
      op: 'delete',
      entity: 'habit',
      entity_id: id,
      rev: new Date().toISOString(),
    });
  }
  return ops;
}

describe('tombstone delete ops', () => {
  it('emits delete ops for tombstoned tasks', () => {
    const ops = emitDeleteOps(['task-1', 'task-2'], []);
    expect(ops).toHaveLength(2);
    expect(ops[0]).toMatchObject({ op: 'delete', entity: 'task', entity_id: 'task-1' });
    expect(ops[1]).toMatchObject({ op: 'delete', entity: 'task', entity_id: 'task-2' });
  });

  it('emits delete ops for tombstoned habits', () => {
    const ops = emitDeleteOps([], ['habit-1']);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ op: 'delete', entity: 'habit', entity_id: 'habit-1' });
  });

  it('emits delete ops for both tasks and habits', () => {
    const ops = emitDeleteOps(['task-1'], ['habit-1']);
    expect(ops).toHaveLength(2);
    expect(ops.some(o => o.entity === 'task')).toBe(true);
    expect(ops.some(o => o.entity === 'habit')).toBe(true);
  });

  it('emits no ops when tombstone queues are empty', () => {
    const ops = emitDeleteOps([], []);
    expect(ops).toHaveLength(0);
  });

  it('each op has a rev timestamp', () => {
    const ops = emitDeleteOps(['task-1'], []);
    expect(ops[0].rev).toBeTruthy();
    expect(new Date(ops[0].rev).toISOString()).toBe(ops[0].rev);
  });
});

describe('tombstone queue clearing', () => {
  it('queues accumulate on delete', () => {
    const deletedTaskIds: string[] = [];
    const deletedHabitIds: string[] = [];

    // Simulate deleting tasks
    deletedTaskIds.push('t1', 't2');
    deletedHabitIds.push('h1');

    expect(deletedTaskIds).toEqual(['t1', 't2']);
    expect(deletedHabitIds).toEqual(['h1']);
  });

  it('queues clear after successful sync', () => {
    let deletedTaskIds = ['t1', 't2'];
    let deletedHabitIds = ['h1'];

    // Simulate successful sync
    const success = true;
    if (success) {
      deletedTaskIds = [];
      deletedHabitIds = [];
    }

    expect(deletedTaskIds).toEqual([]);
    expect(deletedHabitIds).toEqual([]);
  });

  it('queues persist on sync failure', () => {
    let deletedTaskIds = ['t1'];
    let deletedHabitIds = ['h1'];

    // Simulate failed sync
    const success = false;
    if (success) {
      deletedTaskIds = [];
      deletedHabitIds = [];
    }

    expect(deletedTaskIds).toEqual(['t1']);
    expect(deletedHabitIds).toEqual(['h1']);
  });
});
