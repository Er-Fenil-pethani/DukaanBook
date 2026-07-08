import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export default class RouteErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Route error:', error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-lg border bg-card p-8 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold">Something broke on this page</h2>
            <p className="text-sm text-muted-foreground break-words">
              {this.state.error.message}
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={this.reset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>
              <Button onClick={() => window.location.assign('/')}>Go home</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
