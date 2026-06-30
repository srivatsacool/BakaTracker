import type { Task, TaskArea } from '../../types';
import { generateUUID } from '../../lib/utils';

export function createTask(
  title: string,
  notes: string,
  area: TaskArea,
  xp: number,
  today: boolean,
  dueDate: string = ''
): Task {
  const now = new Date().toISOString();
  return {
    id: generateUUID('task_'),
    title,
    notes,
    area,
    status: 'todo',
    today,
    due_date: dueDate,
    xp,
    created_at: now,
    updated_at: now,
    completed_at: ''
  };
}
