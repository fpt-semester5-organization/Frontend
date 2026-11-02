import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { PATHS } from '@/routes/paths';

export const CATALOG_TABS = [
  { to: PATHS.ADMIN.CATEGORIES, label: 'Danh mục món' },
  { to: PATHS.ADMIN.DIETARY_SCHOOLS, label: 'Trường phái ăn chay' },
  { to: PATHS.ADMIN.E_NUMBERS, label: 'Từ điển E-number' },
  { to: PATHS.ADMIN.INGREDIENTS, label: 'Nguyên liệu & dị ứng' },
];

/**
 * SCR-36, SCR-42, SCR-43: Chuyển qua lại giữa các phân hệ danh mục dữ liệu:
 * Danh mục món ăn, Trường phái ăn chay, Từ điển E-number và Nguyên liệu & dị ứng.
 */
export const MasterDataTabs: React.FC = () => (
  <nav aria-label="Danh mục dữ liệu hệ thống" className="flex gap-1 overflow-x-auto border-b border-surface-container">
    {CATALOG_TABS.map((tab) => (
      <NavLink
        key={tab.to}
        to={tab.to}
        end
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

export const CatalogTabs = MasterDataTabs;
