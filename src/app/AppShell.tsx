import React, { useEffect } from 'react';
import { Outlet, ScrollRestoration, useNavigate } from 'react-router-dom';
import { registerRouterNavigator } from '@/api/session';
import { AppToaster } from '@/components/common/AppToaster';
import { BannedAccountModal } from '@/components/common/BannedAccountModal';
import { PageLoader } from '@/components/common/PageLoader';
import { SignupPromptModal } from '@/components/common/SignupPromptModal';
import { useSessionBanMonitor } from '@/features/auth/hooks/useSessionBanMonitor';
import { useSessionRestore } from '@/features/auth/hooks/useSessionRestore';
import { TranscriptWatcher } from '@/features/videos/components/TranscriptWatcher';
import { useCrossTabSession } from '@/hooks/useCrossTabSession';
import { useRealtimeAccountStatus } from '@/hooks/useRealtimeAccountStatus';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Phần bao ngoài mọi route: khôi phục phiên, giám sát cấm/đình chỉ, popup mời đăng ký,
 * toast dùng chung, modal thông báo tài khoản bị cấm, lắng nghe SignalR realtime và theo dõi kết quả bóc tách video.
 */
export const AppShell: React.FC = () => {
  useSessionRestore();
  useSessionBanMonitor();
  useRealtimeAccountStatus();
  useCrossTabSession();

  const navigate = useNavigate();

  useEffect(() => {
    registerRouterNavigator((to, opts) => {
      navigate(to, opts);
    });
    return () => registerRouterNavigator(null);
  }, [navigate]);

  // Chờ khôi phục phiên xong mới render trang: nếu không, request đầu tiên đi như Khách
  // (thiếu token, memberActions = false) và giao diện hiện sai quyền của Thành viên.
  const restoring = useAuthStore((state) => state.sessionStatus === 'restoring');

  return (
    <>
      {restoring ? <PageLoader label="Đang tải phiên đăng nhập..." /> : <Outlet />}
      <SignupPromptModal />
      <BannedAccountModal />
      <AppToaster />
      {!restoring && <TranscriptWatcher />}
      <ScrollRestoration />
    </>
  );
};
