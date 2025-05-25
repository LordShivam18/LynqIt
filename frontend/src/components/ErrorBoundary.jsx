import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { ENV } from '../config/environment';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // In production, you might want to log this to an error reporting service
    if (ENV.isProduction && ENV.features.enableErrorReporting) {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-base-100 flex items-center justify-center">
          <div className="max-w-md w-full mx-4">
            <div className="bg-base-200 rounded-xl p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-error mx-auto mb-4" />
              
              <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
              
              <p className="text-base-content/70 mb-6">
                We encountered an unexpected error. This has been logged and we'll look into it.
              </p>

              {ENV.isDevelopment && this.state.error && (
                <div className="bg-error/10 border border-error/20 rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-medium text-error mb-2">Error Details (Development)</h3>
                  <pre className="text-xs text-base-content/70 overflow-auto max-h-32">
                    {this.state.error.toString()}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}

              <div className="space-y-3">
                {this.state.retryCount < 3 && (
                  <button
                    onClick={this.handleRetry}
                    className="btn btn-primary w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </button>
                )}
                
                <button
                  onClick={this.handleGoHome}
                  className="btn btn-outline w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Home
                </button>
              </div>

              {this.state.retryCount >= 3 && (
                <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-sm text-warning">
                    Multiple retry attempts failed. Please refresh the page or contact support.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
