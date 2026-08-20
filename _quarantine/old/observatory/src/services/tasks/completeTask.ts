import type { Task } from '../../types';
import { moveTask } from './moveTask';

export function completeTask(task: Task): Task {
  return moveTask(task, 'done');
}
