import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';

const TABS = [
  { to: PATHS.ADMIN.DIETARY_SCHOOLS, label: 'Trường phái ăn chay' },
  { to: PATHS.ADMIN.E_NUMBERS, label: 'Từ điển E-number' },
];

/** SCR-42 gồm 2 route: chuyển qua lại giữa trường phái và E-number. */
export const MasterDataTabs: React.FC = () => (
  <nav aria-label="Dữ liệu gốc" className="flex gap-1 overflow-x-auto border-b border-surface-container">
    {TABS.map((tab) => (
      <NavLink
        key={tab.to}
        to={tab.to}
        className={({ isActive }) =>
          cn(
            '-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 font-label-md text-label-md no-underline transition-colors',
            isActive ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
          )
        }
      >
        {tab.label}
      </NavLink>
    ))}
  </nav>
);
