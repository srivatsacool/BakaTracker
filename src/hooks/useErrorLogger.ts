import { useCallback } from 'react';
import type { ErrorInfo } from 'react';

interface ErrorReport {
  error: Error;
  errorInfo: ErrorInfo | null;
  timestamp: string;
  url: string;
  userAgent: string;
}

/**
 * Lightweight error logging hook. Captures error context and can be
 * extended to send to an external service (Sentry, LogRocket, etc.).
 *
 * Currently logs to console.error. The hook is designed so adding
 * a remote reporter later requires zero changes to call sites.
 */
export function useErrorLogger() {
  const logError = useCallback((error: Error, errorInfo: ErrorInfo | null) => {
    const report: ErrorReport = {
      error,
      errorInfo,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Console output for development
    console.error('[BakaTracker Error]', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      url: report.url,
      time: report.timestamp,
    });

    // Future: send to external error reporting service
    // example: Sentry.captureException(error, { extra: { componentStack: errorInfo?.componentStack } });

    return report;
  }, []);

  return { logError };
}
