import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';

const TABS = [
  { to: PATHS.ME.PROFILE, label: 'Hồ sơ', icon: 'person' },
  { to: PATHS.ME.HEALTH, label: 'Sức khỏe', icon: 'monitor_heart' },
  { to: PATHS.ME.DIETARY_PREFERENCES, label: 'Trường phái & dị ứng', icon: 'nutrition' },
] as const;

/** Chuyển nhanh giữa SCR-07, SCR-08, SCR-09. */
export const ProfileTabs: React.FC = () => (
  <nav aria-label="Hồ sơ của tôi" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
    {TABS.map((tab) => (
      <NavLink
        key={tab.to}
        to={tab.to}
        end
        className={({ isActive }) =>
          cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-label-md text-label-md no-underline transition-colors',
            isActive ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface shadow-card hover:bg-surface-container'
          )
        }
      >
        <Icon name={tab.icon} className="text-[18px]" />
        {tab.label}
      </NavLink>
    ))}
  </nav>
);
