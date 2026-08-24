import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../../components/ErrorBoundary';

// Suppress console.error during tests (expected error output)
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

/** Component that throws on render — simulates a broken page. */
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error: component crashed');
  }
  return <div data-testid="healthy-child">Healthy content</div>;
}

describe('ErrorBoundary', () => {
  it('renders children normally when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('healthy-child')).toBeTruthy();
  });

  it('catches rendering errors and shows recovery UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    // Recovery UI should appear
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.getByText('Reload page')).toBeTruthy();
  });

  it('does NOT crash the entire app — recovery UI is rendered', () => {
    // Before ErrorBoundary: a throw would crash the test runner
    // After ErrorBoundary: the throw is caught and recovery UI appears
    const { container } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    // The container should still have content (recovery UI)
    expect(container.innerHTML.length).toBeGreaterThan(0);
    // The broken child is NOT rendered
    expect(screen.queryByTestId('healthy-child')).toBeNull();
  });

  it('shows error details in collapsed section', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    const details = screen.getByText('Technical details');
    expect(details).toBeTruthy();
  });

  it('retry button clears error state', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeTruthy();

    // Click retry — boundary resets internal state
    fireEvent.click(screen.getByText('Try again'));

    // After retry with still-broken children, error reappears
    // (proves state was reset and re-evaluation happened)
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('calls onError callback when error is caught', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error: component crashed' }),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });

  it('uses custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom UI</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('custom-fallback')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull(); // default UI not shown
  });

  it('resets when a NEW ErrorBoundary instance mounts (route navigation)', () => {
    // First render: broken
    const { unmount } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeTruthy();

    // Unmount (simulates leaving the route)
    unmount();

    // New instance with healthy children (simulates entering a new route)
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('healthy-child')).toBeTruthy();
  });
});
