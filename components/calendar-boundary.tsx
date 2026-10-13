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
          The calendar could not load. Retry, or open Projects to review your
          milestones and deadlines.
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
