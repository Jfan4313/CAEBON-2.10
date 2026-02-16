import React, { Component, ReactNode, ErrorInfo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-red-600">error</span>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-2">发生错误</h2>
            <p className="text-slate-600 mb-4">应用程序遇到了意外错误，请刷新页面重试</p>
          </div>
        </div>

        <div className="bg-red-50 rounded-xl p-4 mb-4">
          <p className="text-xs text-red-600 font-medium mb-1">错误详情：</p>
          <pre className="text-xs text-red-700 bg-white p-3 rounded-lg overflow-auto max-h-48">
            {error.message}
            {error.stack && '\n\n' + error.stack}
          </pre>
        </div>

        <div className="flex justify-end">
          <button
            onClick={resetErrorBoundary}
            className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
          >
            重新加载页面
          </button>
        </div>
      </div>
    </div>
  );
};

class AppErrorBoundary extends Component<{ children: ReactNode }, {}> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error | null } {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorBoundary
          FallbackComponent={({ error, resetErrorBoundary }) => (
            <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />
          )}
          onReset={() => {
            this.setState({ hasError: false, error: null });
            window.location.reload();
          }}
        >
          {this.props.children}
        </ErrorBoundary>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
