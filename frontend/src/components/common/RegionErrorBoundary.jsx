import React from 'react';
import { RefreshCw, AlertTriangle, AlertCircle } from 'lucide-react';

export class RegionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[RegionErrorBoundary:${this.props.region}] Caught error:`, error, errorInfo);
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onRetry === 'function') {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          resetError: this.handleRetry,
        });
      }

      const regionName = this.props.regionName || this.props.region || 'Region';
      const errorMsg = this.state.error?.message || 'A render error occurred';

      return (
        <div className="p-6 h-full w-full flex flex-col items-center justify-center text-center bg-[#0c0d10] text-rose-300 space-y-3 min-h-[160px] border border-rose-500/20 rounded-xl">
          <div className="w-10 h-10 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-[240px]">
            <p className="text-xs font-semibold text-rose-200 uppercase tracking-wider">
              {regionName} Error
            </p>
            <p className="text-[11px] text-rose-400/90 truncate" title={errorMsg}>
              {errorMsg}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry {regionName}</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RegionErrorBoundary;
