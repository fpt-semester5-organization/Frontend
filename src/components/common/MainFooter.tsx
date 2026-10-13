import React from 'react';
import { LogoMark } from './Logo';

/** Chân trang tối giản (Điều khoản / Chính sách / Hỗ trợ chưa có màn trong 45 màn của spec 13). */
export const MainFooter: React.FC = () => (
  <footer className="w-full bg-surface-container-low py-space-lg">
    <div className="mx-auto flex max-w-[1200px] items-center justify-center gap-2 px-gutter font-body-sm text-body-sm text-on-surface-variant">
      <LogoMark size={20} />
      <p>© 2026 VeggieLife</p>
    </div>
  </footer>
);
