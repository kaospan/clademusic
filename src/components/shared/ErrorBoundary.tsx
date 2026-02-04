import React, { Component, ReactNode } from 'react';

type FallbackRenderProps = {
  error: Error;
  resetErrorBoundary: () => void;
};

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  fallbackRender?: (props: FallbackRenderProps) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: unknown[];
};

type State = {
  error: Error | null;
};

const didResetKeysChange = (a?: unknown[], b?: unknown[]) => {
  if (!a || !b) return false;
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return true;
  }
  return false;
};

/**
 * Generic React error boundary.
 * - Catches render/lifecycle errors and shows a fallback UI instead of crashing the whole app.
 * - Supports resetting when `resetKeys` changes (e.g., route changes).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    if (import.meta.env.MODE !== 'production') {
      console.warn('[ErrorBoundary] Caught error:', error);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (!this.state.error) return;
    if (!this.props.resetKeys) return;
    if (didResetKeysChange(prevProps.resetKeys, this.props.resetKeys)) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallbackRender) {
      return this.props.fallbackRender({ error, resetErrorBoundary: this.resetErrorBoundary });
    }

    return (
      this.props.fallback ?? (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="w-full max-w-md rounded-xl border border-border/60 bg-card/60 p-6 space-y-3">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The app hit an unexpected error. You can try again, or reload the page.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={this.resetErrorBoundary}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border/70 bg-background px-3 text-sm font-medium"
              >
                Reload
              </button>
            </div>
            {import.meta.env.MODE !== 'production' && (
              <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
                {error.message}
              </pre>
            )}
          </div>
        </div>
      )
    );
  }
}

