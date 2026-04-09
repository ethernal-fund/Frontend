import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children:   ReactNode;
  fallback?:  ReactNode;
  onError?:   (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error:    Error | null;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Error capturado:', error.message);
      console.error('[ErrorBoundary] Component stack:', info.componentStack);
    }

    this.props.onError?.(error, info);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Algo salió mal
        </h1>

        <p className="text-gray-500 mb-6 max-w-md text-sm">
          {import.meta.env.DEV && this.state.error?.message
            ? this.state.error.message
            : 'Ocurrió un error inesperado. Por favor intentá de nuevo.'}
        </p>

        <div className="flex gap-3">
          <button
            onClick={this.handleRetry}
            className="px-6 py-3 bg-forest-green text-white rounded-lg font-semibold hover:opacity-90 transition"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }
}