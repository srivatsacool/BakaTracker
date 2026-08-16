import type { Task } from '../../types';

export function deleteTask(id: string, tasks: Task[]): Task[] {
  return tasks.filter(t => t.id !== id);
}
