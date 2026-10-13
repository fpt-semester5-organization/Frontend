import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <span className="material-symbols-outlined text-[48px] text-secondary">error</span>
        <h1 className="font-headline-md text-headline-md text-primary">Đã có lỗi xảy ra</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Vui lòng tải lại trang. Nếu lỗi lặp lại, hãy báo cho đội hỗ trợ.</p>
        <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary">
          Tải lại trang
        </button>
      </div>
    );
  }
}
