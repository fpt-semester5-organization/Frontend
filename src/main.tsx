import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';
import { AppErrorFallback } from '@/app/RouteErrorPage';
// Thứ tự nạp CSS theo Architecture and Deployment 2.3 (D102): Bootstrap trước, Tailwind sau.
import 'bootstrap/dist/css/bootstrap.min.css';
import '@/styles/index.css';

/** Lớp chặn lỗi ngoài router (providers…): chỉ hiện câu thân thiện, không hiện thông báo lỗi thô (UI-4). */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.error) return <AppErrorFallback error={this.state.error} />;
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element in index.html');
}

/** Dữ liệu giả (MSW) chỉ chạy ở môi trường dev khi đặt VITE_ENABLE_MOCKS=true trong .env.local. */
async function enableMocking() {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCKS !== 'true') return;
  const { worker } = await import('@/mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocking().then(() => {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <AppProviders>
          <AppRouter />
        </AppProviders>
      </ErrorBoundary>
    </React.StrictMode>
  );
});
