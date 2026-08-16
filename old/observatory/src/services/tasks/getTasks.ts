import type { Task, TaskStatus } from '../../types';

export function getTasks(tasks: Task[], filter?: { status?: TaskStatus; today?: boolean }): Task[] {
  return tasks.filter(t => {
    if (filter?.status && t.status !== filter.status) return false;
    if (filter?.today !== undefined && t.today !== filter.today) return false;
    return true;
  });
}
