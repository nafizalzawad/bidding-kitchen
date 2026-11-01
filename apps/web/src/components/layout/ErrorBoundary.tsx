import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button.js';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Kitchen ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div
          data-testid="kitchen-error-boundary"
          className="min-h-screen bg-[#FFFDF7] flex items-center justify-center p-4 text-[#1E1B18]"
        >
          <div className="w-full max-w-md p-6 bg-[#FFFFFF] rounded-3xl border-3 border-[#1E1B18] shadow-[0_8px_0_#1E1B18] text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-[#FEE2E2] border-2 border-[#1E1B18] flex items-center justify-center text-[#DC2626] mb-4 shadow-[0_4px_0_#1E1B18]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-black font-display mb-2">Order Spilled in the Kitchen!</h2>
            <p className="text-xs sm:text-sm text-[#57514A] font-medium mb-6">
              Something unexpected happened while assembling this screen. Don't worry — our kitchen crew is on it.
            </p>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={this.handleReload}
              icon={<RefreshCw className="w-5 h-5" />}
            >
              Reload Kitchen
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
