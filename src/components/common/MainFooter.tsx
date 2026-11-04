import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from './Logo';
import { PATHS } from '@/routes/paths';
import { LegalDocumentsModal } from '@/features/legal/components/LegalDocumentsModal';
import type { LegalDocType } from '@/features/legal/types/legal.types';

export const MainFooter: React.FC = () => {
  const [previewDoc, setPreviewDoc] = useState<LegalDocType | null>(null);

  return (
    <>
      <footer className="w-full border-t border-surface-container-high bg-surface-container-low py-space-lg">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 px-gutter font-body-sm text-body-sm text-on-surface-variant sm:flex-row">
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <p>© 2026 VeggieLife • Nền tảng ẩm thực và dinh dưỡng chay</p>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              to={PATHS.TERMS}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPreviewDoc('TERMS');
              }}
              className="cursor-pointer transition-colors hover:text-primary hover:underline"
              title="Điều khoản sử dụng"
            >
              Điều khoản sử dụng
            </Link>
            <span className="text-surface-container-highest">•</span>
            <Link
              to={PATHS.PRIVACY}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPreviewDoc('PRIVACY');
              }}
              className="cursor-pointer transition-colors hover:text-primary hover:underline"
              title="Chính sách bảo mật"
            >
              Chính sách bảo mật
            </Link>
          </nav>
        </div>
      </footer>

      {previewDoc && (
        <LegalDocumentsModal
          show={true}
          onHide={() => setPreviewDoc(null)}
          initialDoc={previewDoc}
        />
      )}
    </>
  );
};
