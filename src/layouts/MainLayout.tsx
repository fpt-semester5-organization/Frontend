import { Outlet, useMatches } from 'react-router-dom';
import { MainFooter } from '@/components/common/MainFooter';
import { MainHeader } from '@/components/common/MainHeader';
import { ScreenStateGate } from '@/components/common/ScreenStates';
import { ServiceBanner } from '@/components/common/ServiceBanner';

/** Layout cho Khách / Thành viên / VIP: header cố định 72px + nội dung + footer. */
export function MainLayout() {
  const matches = useMatches();
  const hideFooter = matches.some((m) => (m.handle as { hideFooter?: boolean } | undefined)?.hideFooter);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MainHeader />
      <ServiceBanner />
      <div className="flex-1">
        <ScreenStateGate>
          <Outlet />
        </ScreenStateGate>
      </div>
      {!hideFooter && <MainFooter />}
    </div>
  );
}
