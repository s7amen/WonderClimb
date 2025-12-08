import React from 'react';
import Button from './Button';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#f3f3f5] p-4">
                    <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.1)] p-8 max-w-md w-full text-center shadow-sm">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>

                        <h2 className="text-xl font-bold text-neutral-950 mb-2">
                            Възникна грешка
                        </h2>

                        <p className="text-gray-600 mb-6">
                            Съжаляваме, нещо се обърка. Моля, опитайте да презаредите страницата.
                        </p>

                        {/* Optional details for dev/debugging - hidden in production ideally, or visible for now */}
                        {this.state.error && (
                            <details className="text-left text-xs text-gray-400 mb-6 p-2 bg-gray-50 rounded overflow-auto max-h-40">
                                <summary className="cursor-pointer mb-1 hover:text-gray-600">Детайли за грешката</summary>
                                <pre className="whitespace-pre-wrap">
                                    {this.state.error.toString()}
                                    <br />
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}

                        <Button variant="primary" onClick={this.handleReload} className="w-full justify-center">
                            Презареди страницата
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
