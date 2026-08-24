import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/useStore';
// Task type available: import type { Task } from '../../types';

beforeEach(() => {
  useStore.getState().resetStore();
});

function addTestTask(overrides: Partial<{ title: string; area: string; today: boolean; status: string }> = {}) {
  const { addTask } = useStore.getState();
  addTask(
    overrides.title || 'Test Task',
    '',
    (overrides.area || 'personal') as any,
    10,
    overrides.today ?? false,
  );
  return useStore.getState().tasks[useStore.getState().tasks.length - 1];
}

describe('addTask', () => {
  it('creates a task with default status', () => {
    const task = addTestTask();
    expect(task.status).toBe('todo');
    expect(task.title).toBe('Test Task');
  });

  it('task appears in the store', () => {
    addTestTask({ title: 'Task 1' });
    addTestTask({ title: 'Task 2' });
    expect(useStore.getState().tasks).toHaveLength(2);
  });
});

describe('moveTask', () => {
  it('moves task from todo to doing', async () => {
    const task = addTestTask();
    const { moveTask } = useStore.getState();
    await moveTask(task.id, 'doing');
    const updated = useStore.getState().tasks.find(t => t.id === task.id);
    expect(updated!.status).toBe('doing');
  });

  it('moves task from doing to done', async () => {
    const task = addTestTask();
    const { moveTask } = useStore.getState();
    await moveTask(task.id, 'doing');
    await moveTask(task.id, 'done');
    const updated = useStore.getState().tasks.find(t => t.id === task.id);
    expect(updated!.status).toBe('done');
  });

  it('moves task from backlog to todo', async () => {
    const task = addTestTask();
    // First move to backlog
    const { moveTask } = useStore.getState();
    await moveTask(task.id, 'backlog');
    await moveTask(task.id, 'todo');
    const updated = useStore.getState().tasks.find(t => t.id === task.id);
    expect(updated!.status).toBe('todo');
  });
});

describe('toggleTodayTask', () => {
  it('sets today flag', async () => {
    const task = addTestTask();
    expect(task.today).toBe(false);
    const { toggleTodayTask } = useStore.getState();
    await toggleTodayTask(task.id);
    const updated = useStore.getState().tasks.find(t => t.id === task.id);
    expect(updated!.today).toBe(true);
  });

  it('clears today flag', async () => {
    const task = addTestTask({ today: true });
    const { toggleTodayTask } = useStore.getState();
    await toggleTodayTask(task.id);
    const updated = useStore.getState().tasks.find(t => t.id === task.id);
    expect(updated!.today).toBe(false);
  });
});

describe('deleteTask', () => {
  it('removes task from store', async () => {
    const task = addTestTask();
    const { deleteTask } = useStore.getState();
    await deleteTask(task.id);
    expect(useStore.getState().tasks.find(t => t.id === task.id)).toBeUndefined();
  });

  it('adds task to deletedTaskIds tombstone queue', async () => {
    const task = addTestTask();
    const { deleteTask } = useStore.getState();
    await deleteTask(task.id);
    expect(useStore.getState().deletedTaskIds).toContain(task.id);
  });
});

describe('assignQuadrant', () => {
  it('assigns a quadrant to an unassigned task', async () => {
    const task = addTestTask();
    expect(task.quadrant).toBeNull();
    const { assignQuadrant } = useStore.getState();
    await assignQuadrant(task.id, 'do');
    const updated = useStore.getState().tasks.find(t => t.id === task.id);
    expect(updated!.quadrant).toBe('do');
  });

  it('reassigns a task to a different quadrant', async () => {
    const task = addTestTask();
    const { assignQuadrant } = useStore.getState();
    await assignQuadrant(task.id, 'do');
    await assignQuadrant(task.id, 'schedule');
    const updated = useStore.getState().tasks.find(t => t.id === task.id);
    expect(updated!.quadrant).toBe('schedule');
  });

  it('assigns multiple tasks to different quadrants', async () => {
    const t1 = addTestTask({ title: 'Task 1' });
    const t2 = addTestTask({ title: 'Task 2' });
    const { assignQuadrant } = useStore.getState();
    await assignQuadrant(t1.id, 'do');
    await assignQuadrant(t2.id, 'delegate');
    const u1 = useStore.getState().tasks.find(t => t.id === t1.id);
    const u2 = useStore.getState().tasks.find(t => t.id === t2.id);
    expect(u1!.quadrant).toBe('do');
    expect(u2!.quadrant).toBe('delegate');
  });
});
