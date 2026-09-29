import React from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

/**
 * Global React Error Boundary.
 * Catches JavaScript errors anywhere in the child component tree,
 * logs the error details, and displays a fallback UI instead of crashing
 * the entire React tree to a blank white screen.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[Global ErrorBoundary Caught]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const isDev = process.env.NODE_ENV !== 'production';

      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 py-8 font-[var(--font-family,_Montserrat,_sans-serif)]">
          <div className="w-full max-w-[560px] rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] px-8 py-10 text-center shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.04)]">
            <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]">
              <ShieldAlert size={34} />
            </div>

            <h1 className="m-0 mb-2 text-[1.4rem] font-extrabold text-[#0F172A]">
              Something unexpected occurred
            </h1>

            <p className="m-0 mb-7 text-[0.9rem] leading-[1.55] text-[#64748B]">
              An unexpected application error prevented this page from rendering correctly. Your session remains secure.
            </p>

            {isDev && this.state.error && (
              <div className="mb-7 max-h-[140px] overflow-y-auto rounded-lg bg-[#0F172A] p-4 text-left text-xs font-[monospace] text-[#F8FAFC] break-words">
                <div className="mb-[0.35rem] font-bold text-[#F87171]">
                  {this.state.error.toString()}
                </div>
                {this.state.errorInfo?.componentStack}
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-[0.85rem]">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-lg border-0 bg-[#0F172A] px-[1.4rem] py-[0.7rem] text-sm font-semibold text-[#FFFFFF] shadow-[0_2px_4px_rgba(0,0,0,0.1)] cursor-pointer"
              >
                <RefreshCw size={15} />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 rounded-lg border border-[#CBD5E1] bg-[#FFFFFF] px-[1.4rem] py-[0.7rem] text-sm font-semibold text-[#0F172A] cursor-pointer"
              >
                <Home size={15} />
                <span>Go to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
