import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render-time errors so a crash degrades to a recovery screen instead
 *  of a blank page. (A runtime loop/throw previously blanked the whole app.) */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surfaced to the console for diagnostics; a real deployment could also
    // forward this to local logging.
    console.error("StoryScribe crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-semibold text-ink-50">
            Something went wrong
          </h1>
          <p className="text-sm text-ink-400">
            StoryScribe hit an unexpected error. Your work is saved locally —
            reloading usually fixes it.
          </p>
          <pre className="max-h-40 w-full overflow-auto rounded-lg bg-ink-900 p-3 text-left text-xs text-red-400">
            {this.state.error.message}
          </pre>
          <button
            className="btn-primary"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
