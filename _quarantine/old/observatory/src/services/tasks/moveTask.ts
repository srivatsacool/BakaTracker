import type { Task, TaskStatus } from '../../types';

export function moveTask(task: Task, newStatus: TaskStatus): Task {
  const now = new Date().toISOString();
  return {
    ...task,
    status: newStatus,
    completed_at: newStatus === 'done' ? now : '',
    updated_at: now
  };
}
