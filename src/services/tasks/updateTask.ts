import type { Task } from '../../types';

export function updateTask(task: Task, updates: Partial<Omit<Task, 'id' | 'created_at'>>): Task {
  return {
    ...task,
    ...updates,
    updated_at: new Date().toISOString()
  };
}
