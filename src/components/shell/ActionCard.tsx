import React, { useState } from 'react';
import type { ParsedAction } from '../../features/tools/actionParser';
import { executeTool } from '../../features/tools/dispatcher';
import { useConfirmation } from '../../features/tools/useConfirmation';
import type { ApiClient } from '../../api/apiClient';
import { Play, Check, AlertCircle, Loader2, Code, RotateCw } from 'lucide-react';

interface ActionCardProps {
  action: ParsedAction;
  apiClient: ApiClient | null;
}

export const ActionCard: React.FC<ActionCardProps> = ({ action, apiClient }) => {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const requestConfirmation = useConfirmation((state) => state.requestConfirmation);

  const formatActionSummary = () => {
    switch (action.toolName) {
      case 'create_task':
        return `Create Quest: "${action.input.title || 'Untitled'}"`;
      case 'update_task':
        return `Update Quest (${action.input.id || 'task'}${action.input.status ? ` -> ${action.input.status}` : ''})`;
      case 'delete_task':
        return `Delete Quest (${action.input.id || 'task'})`;
      case 'create_habit':
        return `Add Habit: "${action.input.title || action.input.name || 'New Habit'}"`;
      case 'log_habit':
        return `Check-in Habit (${action.input.id || action.input.habit_id || 'habit'})`;
      case 'delete_habit':
        return `Delete Habit (${action.input.id || 'habit'})`;
      case 'journal_today':
        return `Save Journal Entry`;
      case 'create_page':
        return `Create Page: "${action.input.title || 'Untitled'}"`;
      case 'file_upload':
        return `Upload File: "${action.input.filename || 'Attachment'}"`;
      case 'remember':
        return `Memorize Fact: "${action.input.key || 'Fact'}"`;
      case 'reset_account':
        return `CRITICAL: Reset Entire Account`;
      default:
        return `Run Tool: ${action.toolName}`;
    }
  };

  const handleExecute = async () => {
    setStatus('running');
    setErrorMessage(null);

    const res = await executeTool(action.toolName, action.input, {
      apiClient,
      context: {
        requestConfirmation,
      },
    });

    if (res.success) {
      setStatus('success');
    } else {
      setStatus('error');
      setErrorMessage(res.error || 'Execution failed');
    }
  };

  const hasParameters = action.input && Object.keys(action.input).length > 0;

  return (
    <div className="mt-2 p-2.5 rounded-lg border border-solid border-purple-500/30 bg-purple-950/20 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono text-purple-300 font-medium">
          {formatActionSummary()}
        </span>
        {status === 'idle' && (
          <button
            type="button"
            onClick={handleExecute}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white transition-colors shrink-0 shadow-sm"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Execute</span>
          </button>
        )}
        {status === 'running' && (
          <div className="flex items-center gap-1 text-[10px] font-mono text-purple-400 shrink-0">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Running…</span>
          </div>
        )}
        {status === 'success' && (
          <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 shrink-0 font-bold">
            <Check className="w-3 h-3" />
            <span>Executed</span>
          </div>
        )}
      </div>

      {hasParameters && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-200 transition-colors self-start"
          >
            <Code className="w-3 h-3" />
            <span>{showDetails ? 'Hide' : 'Inspect'} parameters</span>
          </button>
          {showDetails && (
            <pre className="p-2 rounded bg-black/40 text-[10px] font-mono text-purple-200 overflow-x-auto max-h-28 border border-white/5">
              {JSON.stringify(action.input, null, 2)}
            </pre>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-red-500/20">
          <div className="flex items-center gap-1 text-[10px] text-red-400">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{errorMessage || 'Execution failed'}</span>
          </div>
          <button
            type="button"
            onClick={handleExecute}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-600/80 hover:bg-red-500 text-white transition-colors shrink-0"
          >
            <RotateCw className="w-2.5 h-2.5" />
            <span>Retry</span>
          </button>
        </div>
      )}
    </div>
  );
};
