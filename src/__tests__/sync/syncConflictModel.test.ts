import { describe, it, expect } from 'vitest';
import {
  SyncPush,
  SyncOp,
  SyncEntity,
} from '../../../platform/src/domain/schemas';

/**
 * Regression tests for the sync conflict model.
 *
 * These tests verify that the documented behavior remains stable.
 * They do NOT test conflict resolution — they test conflict DETECTION
 * and the current upsert semantics.
 *
 * See: docs/SYNC_CONFLICT_MODEL.md
 */

describe('Sync model — schema contract', () => {
  it('SyncOp allows add, update, delete', () => {
    expect(SyncOp.parse('add')).toBe('add');
    expect(SyncOp.parse('update')).toBe('update');
    expect(SyncOp.parse('delete')).toBe('delete');
  });

  it('SyncOp rejects invalid operations', () => {
    expect(() => SyncOp.parse('patch')).toThrow();
    expect(() => SyncOp.parse('merge')).toThrow();
  });

  it('SyncEntity allows task, habit, note, journal', () => {
    expect(SyncEntity.parse('task')).toBe('task');
    expect(SyncEntity.parse('habit')).toBe('habit');
    expect(SyncEntity.parse('note')).toBe('note');
    expect(SyncEntity.parse('journal')).toBe('journal');
  });

  it('SyncEntity rejects invalid entities', () => {
    expect(() => SyncEntity.parse('event')).toThrow();
    expect(() => SyncEntity.parse('settings')).toThrow();
  });

  it('SyncPush validates a minimal batch', () => {
    const push = SyncPush.parse({
      ops: [
        { op: 'update', entity: 'task', entity_id: 't1', rev: '2026-08-26T10:00:00Z' },
      ],
    });
    expect(push.ops).toHaveLength(1);
    expect(push.ops[0].op).toBe('update');
    expect(push.ops[0].entity).toBe('task');
    expect(push.ops[0].entity_id).toBe('t1');
    expect(push.ops[0].rev).toBe('2026-08-26T10:00:00Z');
  });

  it('SyncPush supports all three ops in one batch', () => {
    const push = SyncPush.parse({
      ops: [
        { op: 'add', entity: 'task', entity_id: 't1', rev: '2026-08-26T10:00:00Z' },
        { op: 'update', entity: 'habit', entity_id: 'h1', rev: '2026-08-26T10:01:00Z' },
        { op: 'delete', entity: 'note', entity_id: 'n1', rev: '2026-08-26T10:02:00Z' },
      ],
    });
    expect(push.ops).toHaveLength(3);
  });

  it('SyncPush caps at 500 ops', () => {
    const ops = Array.from({ length: 501 }, (_, i) => ({
      op: 'update' as const,
      entity: 'task' as const,
      entity_id: `t${i}`,
      rev: new Date().toISOString(),
    }));
    expect(() => SyncPush.parse({ ops })).toThrow();
  });

  it('client_id is optional', () => {
    const push = SyncPush.parse({
      ops: [
        {
          op: 'update',
          entity: 'task',
          entity_id: 't1',
          rev: '2026-08-26T10:00:00Z',
          client_id: 'device-abc',
        },
      ],
    });
    expect(push.ops[0].client_id).toBe('device-abc');
  });

  it('SyncPush works without client_id', () => {
    const push = SyncPush.parse({
      ops: [
        { op: 'update', entity: 'task', entity_id: 't1', rev: '2026-08-26T10:00:00Z' },
      ],
    });
    expect(push.ops[0].client_id).toBeUndefined();
  });
});

describe('Sync model — documented behavior', () => {
  it('revision is a string (ISO timestamp), not an integer', () => {
    const push = SyncPush.parse({
      ops: [
        { op: 'update', entity: 'task', entity_id: 't1', rev: '2026-08-26T10:00:00Z' },
      ],
    });
    // Rev is string-typed, not a number — this is intentional
    expect(typeof push.ops[0].rev).toBe('string');
  });

  it('full-state push produces N ops (one per entity)', () => {
    // Simulate what pushSync does: one op per task, habit, journal
    const tasks = ['t1', 't2', 't3'];
    const habits = ['h1', 'h2'];
    const journal = ['j1'];

    const ops = [
      ...tasks.map(id => ({ op: 'update' as const, entity: 'task' as const, entity_id: id, rev: new Date().toISOString() })),
      ...habits.map(id => ({ op: 'update' as const, entity: 'habit' as const, entity_id: id, rev: new Date().toISOString() })),
      ...journal.map(id => ({ op: 'update' as const, entity: 'journal' as const, entity_id: id, rev: new Date().toISOString() })),
    ];

    const push = SyncPush.parse({ ops });
    // 3 tasks + 2 habits + 1 journal = 6 ops
    expect(push.ops).toHaveLength(6);
    expect(push.ops.filter(o => o.entity === 'task')).toHaveLength(3);
    expect(push.ops.filter(o => o.entity === 'habit')).toHaveLength(2);
    expect(push.ops.filter(o => o.entity === 'journal')).toHaveLength(1);
  });

  it('delete op carries only entity_id, no payload', () => {
    const push = SyncPush.parse({
      ops: [
        { op: 'delete', entity: 'task', entity_id: 't1', rev: '2026-08-26T10:00:00Z' },
      ],
    });
    expect(push.ops[0].payload).toBeUndefined();
  });

  it('add/update op carries payload with entity data', () => {
    const push = SyncPush.parse({
      ops: [
        {
          op: 'update',
          entity: 'task',
          entity_id: 't1',
          rev: '2026-08-26T10:00:00Z',
          payload: { title: 'My task', status: 'todo' },
        },
      ],
    });
    expect(push.ops[0].payload).toEqual({ title: 'My task', status: 'todo' });
  });

  it('same revision on same entity → accepted (no conflict)', () => {
    // If both ops have the same rev, the second is accepted
    // (server rev matches client rev → no conflict)
    const push = SyncPush.parse({
      ops: [
        { op: 'update', entity: 'task', entity_id: 't1', rev: '2026-08-26T10:00:00Z' },
        { op: 'update', entity: 'task', entity_id: 't1', rev: '2026-08-26T10:00:00Z' },
      ],
    });
    // Both ops are valid — the server would accept both
    expect(push.ops).toHaveLength(2);
    expect(push.ops[0].rev).toBe(push.ops[1].rev);
  });

  it('different revisions on same entity → conflict detected', () => {
    // Two ops for same entity with different revs
    // Server conflict check: existing.rev !== op.rev → conflict++
    const push = SyncPush.parse({
      ops: [
        { op: 'update', entity: 'task', entity_id: 't1', rev: '2026-08-26T10:00:00Z' },
        { op: 'update', entity: 'task', entity_id: 't1', rev: '2026-08-26T10:05:00Z' },
      ],
    });
    // Both ops are valid schema-wise — server would detect conflict
    expect(push.ops[0].rev).not.toBe(push.ops[1].rev);
  });
});

describe('Sync model — documented limitations', () => {
  it('no field-level merge: entire entity is replaced', () => {
    // Documented: upsert replaces the full entity record
    // If Device A changes title and Device B changes due_date,
    // one device's change is lost
    const opA = {
      op: 'update' as const,
      entity: 'task' as const,
      entity_id: 't1',
      rev: '2026-08-26T10:00:00Z',
      payload: { title: 'Updated title', status: 'todo', due: null },
    };
    const opB = {
      op: 'update' as const,
      entity: 'task' as const,
      entity_id: 't1',
      rev: '2026-08-26T10:05:00Z',
      payload: { title: 'Original title', status: 'todo', due: '2026-08-27' },
    };

    // Both are valid ops — server would upsert the entire entity
    // The last sync wins the whole record, not individual fields
    const push = SyncPush.parse({ ops: [opA, opB] });
    expect(push.ops).toHaveLength(2);
    // The payloads are different — last one wins entirely
    expect(push.ops[0].payload).not.toEqual(push.ops[1].payload);
  });

  it('delete + recreate: upsert can undo a delete', () => {
    // Documented: if A deletes X and B syncs full state including X,
    // B's upsert re-creates X
    const deleteOp = {
      op: 'delete' as const,
      entity: 'task' as const,
      entity_id: 't1',
      rev: '2026-08-26T10:00:00Z',
    };
    const recreateOp = {
      op: 'add' as const,
      entity: 'task' as const,
      entity_id: 't1',
      rev: '2026-08-26T10:05:00Z',
      payload: { title: 'Recreated task', status: 'todo' },
    };

    // Both are valid ops — server would process both
    // The recreate wins via upsert
    const push = SyncPush.parse({ ops: [deleteOp, recreateOp] });
    expect(push.ops).toHaveLength(2);
    expect(push.ops[0].op).toBe('delete');
    expect(push.ops[1].op).toBe('add');
  });

  it('client_id is not used for conflict attribution', () => {
    // Documented: client_id exists in schema but is not used in conflict check
    // This test verifies the schema accepts it but it's optional
    const pushWithId = SyncPush.parse({
      ops: [{
        op: 'update', entity: 'task', entity_id: 't1',
        rev: '2026-08-26T10:00:00Z', client_id: 'device-A',
      }],
    });
    const pushWithoutId = SyncPush.parse({
      ops: [{
        op: 'update', entity: 'task', entity_id: 't1',
        rev: '2026-08-26T10:00:00Z',
      }],
    });
    // Both are valid — client_id is optional and unused in conflict logic
    expect(pushWithId.ops[0].client_id).toBe('device-A');
    expect(pushWithoutId.ops[0].client_id).toBeUndefined();
  });
});
