import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';
// Thứ tự nạp CSS theo Architecture and Deployment 2.3 (D102): Bootstrap trước, Tailwind sau.
import 'bootstrap/dist/css/bootstrap.min.css';
import '@/styles/index.css';

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
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </React.StrictMode>
  );
});
