import React from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { AppToaster } from '@/components/common/AppToaster';
import { SignupPromptModal } from '@/components/common/SignupPromptModal';
import { useSessionRestore } from '@/features/auth/hooks/useSessionRestore';

/** Phần bao ngoài mọi route: khôi phục phiên, popup mời đăng ký và toast dùng chung (cần nằm trong Router). */
export const AppShell: React.FC = () => {
  useSessionRestore();

  return (
    <>
      <Outlet />
      <SignupPromptModal />
      <AppToaster />
      <ScrollRestoration />
    </>
  );
};
