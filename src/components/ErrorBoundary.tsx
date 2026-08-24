import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Optional fallback UI — defaults to the built-in recovery panel. */
  fallback?: ReactNode;
  /** Called when an error is caught. Use for logging/reporting. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Route-level error boundary. Catches rendering failures in child components
 * and shows a recovery UI instead of crashing the entire app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeRiskyComponent />
 *   </ErrorBoundary>
 *
 * The boundary resets when children change (new route navigation), so
 * navigating away from the broken page and back will retry the render.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log to console for development
    console.error('[ErrorBoundary] caught:', error, errorInfo);

    // Call the optional onError callback (for external logging/reporting)
    this.props.onError?.(error, errorInfo);
  }

  /** Reset the boundary — called on retry or when children change. */
  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  /** Full page reload — nuclear option when retry doesn't help. */
  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback was provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default recovery UI — styled to match the Darkglass observatory aesthetic
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(6, 7, 20, 0.9)' }}
        >
          <div
            className="cabinet cabinet--ooo max-w-md w-full p-6 flex flex-col items-center gap-4 text-center"
            role="alert"
            aria-live="assertive"
          >
            <div className="p-3 rounded-full" style={{ background: 'rgba(248, 113, 113, 0.15)' }}>
              <AlertTriangle className="w-8 h-8" style={{ color: 'var(--obs-coral)' }} aria-hidden="true" />
            </div>

            <div>
              <h2
                className="text-lg font-bold mb-1"
                style={{ color: 'var(--obs-paper)', fontFamily: 'var(--font-display)' }}
              >
                Something went wrong
              </h2>
              <p
                className="text-sm m-0"
                style={{ color: 'var(--obs-paper-muted)', fontFamily: 'var(--font-body)' }}
              >
                A component hit an unexpected error. Your data is safe — this
                is a rendering issue, not a data issue.
              </p>
            </div>

            {/* Error details — collapsed by default */}
            {this.state.error && (
              <details className="w-full text-left">
                <summary
                  className="cursor-pointer text-xs font-mono select-none"
                  style={{ color: 'var(--obs-paper-disabled)' }}
                >
                  Technical details
                </summary>
                <pre
                  className="mt-2 p-3 rounded-lg text-[11px] font-mono overflow-auto max-h-40"
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(248, 113, 113, 0.2)',
                    color: 'var(--obs-paper-muted)',
                  }}
                >
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      {'\n\n'}
                      {'Component stack:'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}

            <div className="flex gap-3 mt-2">
              <button
                onClick={this.handleRetry}
                className="insert-coin !py-2 !px-4 !text-sm flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>Try again</span>
              </button>
              <button
                onClick={this.handleReload}
                className="btn-ghost !py-2 !px-4 !text-sm flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Reload page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
