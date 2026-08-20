import type { Task } from '../../types';
import { getTasks } from './getTasks';

export function getTodayTasks(tasks: Task[]): Task[] {
  return getTasks(tasks, { today: true });
}
