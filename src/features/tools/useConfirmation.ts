/**
 * Human-in-the-Loop (HITL) Confirmation Store
 *
 * Bridges asynchronous tool execution with the interactive React modal.
 */

import { create } from 'zustand';
import type { ConfirmationRequest } from './types';

interface QueueItem {
  id: string;
  params: ConfirmationRequest;
  resolve: (approved: boolean) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface ConfirmationState {
  pendingRequest: ConfirmationRequest | null;
  queue: QueueItem[];
  requestConfirmation: (params: ConfirmationRequest) => Promise<boolean>;
  approve: () => void;
  deny: () => void;
}

const TIMEOUT_MS = 60000;

export const useConfirmation = create<ConfirmationState>((set, get) => {
  function processNext(nextQueue: QueueItem[]) {
    if (nextQueue.length === 0) {
      set({ pendingRequest: null, queue: [] });
      return;
    }
    const next = nextQueue[0];
    set({
      pendingRequest: next.params,
      queue: nextQueue,
    });
  }

  return {
    pendingRequest: null,
    queue: [],

    requestConfirmation: (params: ConfirmationRequest): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        const id = Math.random().toString(36).substring(2, 9);

        // Auto-deny on timeout to prevent hanging the AI agent
        const timer = setTimeout(() => {
          const { queue } = get();
          const itemIdx = queue.findIndex((q) => q.id === id);
          if (itemIdx !== -1) {
            const [item] = queue.splice(itemIdx, 1);
            item.resolve(false);
            processNext(queue);
          }
        }, TIMEOUT_MS);

        const newItem: QueueItem = {
          id,
          params,
          resolve,
          timer,
        };

        const currentQueue = get().queue;
        const newQueue = [...currentQueue, newItem];

        if (currentQueue.length === 0) {
          set({
            pendingRequest: params,
            queue: newQueue,
          });
        } else {
          set({ queue: newQueue });
        }
      });
    },

    approve: () => {
      const { queue } = get();
      if (queue.length === 0) return;
      const [current, ...remaining] = queue;
      clearTimeout(current.timer);
      current.resolve(true);
      processNext(remaining);
    },

    deny: () => {
      const { queue } = get();
      if (queue.length === 0) return;
      const [current, ...remaining] = queue;
      clearTimeout(current.timer);
      current.resolve(false);
      processNext(remaining);
    },
  };
});
