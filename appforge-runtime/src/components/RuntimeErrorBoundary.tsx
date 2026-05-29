import React from 'react';

interface Props {
  /** Identifier used in the fallback message and console log. Typically the moduleId. */
  label?: string;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time errors in a single child subtree and shows a small
 * fallback card instead of propagating the throw up the tree. Without this,
 * any throw inside a module's Runtime component unmounts the whole React
 * tree — including AppShell, the tab bar, and any other modules on the same
 * tab — and the user sees a blank screen.
 *
 * Scoped per-module (one boundary wraps each element rendered by TabScreen),
 * so one broken module doesn't take its siblings down with it.
 *
 * NOTE: this is defensive infrastructure for unknown future bugs, NOT a
 * substitute for fixing root causes. For deterministic render errors (e.g.
 * the React #310 hook-order bug fixed in commit 6126d77), tapping
 * "Reintentar" re-renders the same component which throws again — the
 * boundary keeps the rest of the app alive, that is all.
 */
export class RuntimeErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(
      `[RuntimeErrorBoundary] module "${this.props.label ?? 'unknown'}" crashed:`,
      error,
      info,
    );
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div
          className="p-4 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-feedback-error-bg, #fef2f2)',
            color: 'var(--color-text-primary, #1f2937)',
            border: '1px solid var(--color-feedback-error, #ef4444)',
          }}
        >
          <p className="font-semibold mb-1" style={{ color: 'var(--color-feedback-error, #ef4444)' }}>
            Este módulo no se pudo cargar
          </p>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary, #6b7280)' }}>
            {this.props.label ? `Módulo "${this.props.label}". ` : ''}
            Detalle: {this.state.error.message}
          </p>
          <button
            onClick={this.reset}
            className="text-xs font-semibold px-3 py-1.5"
            style={{
              backgroundColor: 'var(--color-primary, #4F46E5)',
              color: 'var(--color-text-on-primary, #fff)',
              borderRadius: 'var(--radius-button, 8px)',
            }}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
