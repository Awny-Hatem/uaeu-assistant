"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { failed: boolean };

/** Keep a failed lazy-loaded chat bundle from leaving students on a blank page. */
export class ChatLoadBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("UAEU chat surface failed to load", error.message);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <section role="alert" className="flex h-full w-full items-center justify-center bg-zinc-50 px-6 text-center text-zinc-800">
        <div className="max-w-md">
          <h1 className="text-lg font-bold">The UAEU assistant could not load</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Refresh the page to try again. If the problem continues, contact UAEU support.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-[#E0182D] px-5 py-3 text-sm font-bold text-white hover:bg-red-700 focus-visible:outline-offset-4"
          >
            Refresh assistant
          </button>
        </div>
      </section>
    );
  }
}
