import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      try {
        const parsedError = JSON.parse(this.state.error?.message || "");
        if (parsedError.error && parsedError.error.includes("Missing or insufficient permissions")) {
          errorMessage = "You don't have permission to perform this action. Please check your account settings or contact support.";
        }
      } catch (e) {
        // Not a JSON error
        if (this.state.error?.message.includes("Missing or insufficient permissions")) {
            errorMessage = "You don't have permission to perform this action.";
        }
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-6 bg-destructive/5 rounded-[2rem] border-2 border-dashed border-destructive/20">
          <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
            <AlertCircle className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-destructive">Something went wrong</h2>
            <p className="text-muted-foreground font-medium max-w-md mx-auto">
              {errorMessage}
            </p>
          </div>
          <Button 
            onClick={this.handleReset}
            className="rounded-xl font-black gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
