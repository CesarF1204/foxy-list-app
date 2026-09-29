import { Component } from "react";
import { ErrorState } from "./Feedback";

/**
 * DOCU: Catches render-time errors so a single broken component cannot blank
 * out the whole app. <br>
 * Without this, a bad task payload would throw inside the board and leave the
 * user staring at an empty page.
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error("Unhandled UI error:", error, info?.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div className="flex flex-1 items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <ErrorState
                        title="This page ran into a problem"
                        message="Reload the page to continue. If it keeps happening, try signing out and back in."
                        onRetry={() => window.location.reload()}
                    />
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;