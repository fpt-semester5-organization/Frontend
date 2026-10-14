import React from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { AppToaster } from '@/components/common/AppToaster';
import { PageLoader } from '@/components/common/PageLoader';
import { SignupPromptModal } from '@/components/common/SignupPromptModal';
import { useSessionRestore } from '@/features/auth/hooks/useSessionRestore';
import { TranscriptWatcher } from '@/features/videos/components/TranscriptWatcher';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Phần bao ngoài mọi route: khôi phục phiên, popup mời đăng ký, toast dùng chung
 * và theo dõi kết quả bóc tách video cho tác giả (cần nằm trong Router).
 */
export const AppShell: React.FC = () => {
  useSessionRestore();
  // Chờ khôi phục phiên xong mới render trang: nếu không, request đầu tiên đi như Khách
  // (thiếu token, memberActions = false) và giao diện hiện sai quyền của Thành viên.
  const restoring = useAuthStore((state) => state.sessionStatus === 'restoring');

  return (
    <>
      {restoring ? <PageLoader label="Đang tải phiên đăng nhập..." /> : <Outlet />}
      <SignupPromptModal />
      <AppToaster />
      {!restoring && <TranscriptWatcher />}
      <ScrollRestoration />
    </>
  );
};
