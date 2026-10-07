"use client";
import { Component, type ReactNode } from "react";
import { Button } from "./ui/button";
export class CalendarBoundary extends Component<
  { children: ReactNode; retry: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div role="alert">
        <p>
          The calendar could not load. Your work and deadlines remain available
          in the list below.
        </p>
        <Button variant="outline" onClick={this.props.retry}>
          Retry calendar
        </Button>
      </div>
    ) : (
      this.props.children
    );
  }
}
