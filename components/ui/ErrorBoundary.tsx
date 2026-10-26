"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  description?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Widget exception caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full p-4 rounded-2xl border border-rose-200/80 bg-rose-50/40 text-slate-800 flex flex-col items-center justify-center text-center my-2 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 mb-2">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 tracking-tight">
            {this.props.title || "Component Display Error"}
          </h4>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5 max-w-sm">
            {this.props.description || "An error occurred while rendering this optical component."}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              size="xs"
              onClick={this.handleReset}
              className="h-7 px-3 text-[11px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <RotateCw className="w-3 h-3 text-slate-500" />
              <span>Retry Component</span>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
