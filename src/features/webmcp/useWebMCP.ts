/**
 * React Hook for WebMCP Lifecycle Management
 *
 * Automatically registers canonical tools with the browser's modelContext
 * upon authentication and unregisters upon logout.
 */

import { useEffect } from 'react';
import { useAuth } from '../auth';
import { useApiClient } from '../../api/authFetch';
import { useConfirmation } from '../tools/useConfirmation';
import { webMCPProvider } from './provider';

export function useWebMCP() {
  const { isAuthenticated, isLoading } = useAuth();
  const apiClient = useApiClient();
  const requestConfirmation = useConfirmation((state) => state.requestConfirmation);

  useEffect(() => {
    if (!webMCPProvider.isAvailable()) {
      return;
    }

    if (!isLoading && isAuthenticated) {
      webMCPProvider.registerAll(apiClient, requestConfirmation);
    } else if (!isAuthenticated) {
      webMCPProvider.unregisterAll();
    }

    return () => {
      webMCPProvider.unregisterAll();
    };
  }, [isAuthenticated, isLoading, apiClient, requestConfirmation]);
}
