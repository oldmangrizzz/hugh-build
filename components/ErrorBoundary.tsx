/**
 * H.U.G.H. Workshop — Error Boundary
 *
 * Catches runtime errors in any child component and displays
 * a diagnostic fallback instead of a black screen of death.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[H.U.G.H. ErrorBoundary] ${this.props.fallbackLabel || 'Component'} crashed:`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          background: '#0a0a0a',
          color: '#4ecdc4',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          padding: '2rem',
          zIndex: 99999,
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            ⚠ H.U.G.H. — Structural Failure
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '1rem' }}>
            {this.props.fallbackLabel || 'Workshop'} encountered a runtime error
          </div>
          <pre style={{
            background: 'rgba(78, 205, 196, 0.05)',
            border: '1px solid rgba(78, 205, 196, 0.2)',
            borderRadius: '8px',
            padding: '1rem',
            maxWidth: '80vw',
            maxHeight: '40vh',
            overflow: 'auto',
            fontSize: '0.75rem',
            color: '#ff6b6b',
          }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              background: 'transparent',
              border: '1px solid rgba(78, 205, 196, 0.4)',
              color: '#4ecdc4',
              padding: '8px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            REBOOT WORKSHOP
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight boundary for non-critical components.
 * Renders nothing on crash instead of taking down the tree.
 */
export class SilentBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(`[H.U.G.H.] ${this.props.fallbackLabel || 'Component'} failed silently:`, error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
