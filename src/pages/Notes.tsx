import React from 'react';
import { NotebookPen } from 'lucide-react';

export const Notes: React.FC = () => (
  <div className="mx-auto max-w-4xl">
    <div className="mb-6 flex items-center gap-3">
      <NotebookPen className="h-7 w-7 text-accent-pink" />
      <h1 className="m-0 text-2xl font-black">Notebooks</h1>
    </div>

    <div className="neo-card p-6">
      <p className="m-0 font-mono text-sm font-bold text-gray-600 dark:text-gray-400">
        Your notebooks will live here. Pick a notebook to open its canvas —
        the real list is coming in a later checkpoint.
      </p>
    </div>
  </div>
);
