import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { EditorCanvas } from '../components/pages/EditorCanvas';

export const PageWorkspace: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>();

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Sticky workspace header with back navigation */}
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b-2 border-border-primary bg-surface px-4 py-3">
        <Link
          to="/notes"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-border-primary bg-surface px-2.5 py-1.5 font-mono text-xs font-bold shadow-gumroad-sm transition hover:translate-x-[1px] hover:translate-y-[1px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
        <h1 className="m-0 min-w-0 truncate font-black text-lg">
          {pageId ?? 'Untitled Page'}
        </h1>
      </header>

      {/* Editor fills the remaining viewport height */}
      <div className="min-h-0 flex-1">
        <EditorCanvas />
      </div>
    </div>
  );
};
