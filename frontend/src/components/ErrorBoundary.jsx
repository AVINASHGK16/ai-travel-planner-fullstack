import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught a rendering error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    if (typeof this.props.onReset === 'function') {
      try {
        this.props.onReset();
      } catch (e) {
        console.warn('ErrorBoundary onReset error:', e);
      }
    }
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const title = this.props.fallbackTitle || 'Something went wrong';
      const isRoot = Boolean(this.props.isRoot);

      const content = (
        <div className="w-full max-w-xl mx-auto p-6 md:p-8 rounded-2xl bg-white border border-red-200 shadow-lg text-slate-700 animate-fade-in my-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-200 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-grow">
              <h3 className="font-semibold text-lg text-slate-900 mb-1.5">{title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                An unexpected rendering issue occurred in this section of the application.
                You can try recovering the view or reloading the page to resume your session.
              </p>

              {/* Recovery Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reload Page</span>
                </button>
              </div>

              {/* Technical Details Accordion */}
              {this.state.error && (
                <div className="mt-5 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={this.toggleDetails}
                    className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <span>{this.state.showDetails ? 'Hide error details' : 'Show error details'}</span>
                    {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {this.state.showDetails && (
                    <pre className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-red-700 font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                      {this.state.error.toString()}
                      {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );

      if (isRoot) {
        return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            {content}
          </div>
        );
      }

      return content;
    }

    return this.props.children;
  }
}
