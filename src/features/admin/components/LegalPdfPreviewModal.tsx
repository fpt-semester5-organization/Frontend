import React, { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

export interface LegalDocumentPreview {
  title: string;
  url: string;
  fileName: string;
}

export interface LegalPdfPreviewModalProps {
  show: boolean;
  doc: LegalDocumentPreview | null;
  onHide: () => void;
}

/**
 * Modal xem trực tiếp tệp PDF hoặc ảnh Chính sách / Quy chuẩn pháp lý nổi trên giao diện UI.
 * - Hỗ trợ hiển thị vừa vặn độ rộng chuẩn A4 (850px) để đọc chữ sắc nét, tự nhiên cuộn từ từ xuống dưới.
 * - Cung cấp bộ nút Thu phóng (+ / - / Vừa màn hình) và phím tắt tiện dụng.
 */
export const LegalPdfPreviewModal: React.FC<LegalPdfPreviewModalProps> = ({
  show,
  doc,
  onHide,
}) => {
  const [zoom, setZoom] = useState<number>(100);

  // Tự động khôi phục mức phóng to chuẩn 100% mỗi khi mở tài liệu mới
  useEffect(() => {
    if (show) {
      setZoom(100);
    }
  }, [doc?.url, show]);

  const isPdf =
    doc?.url?.toLowerCase().endsWith('.pdf') || doc?.url?.toLowerCase().includes('.pdf');
  const isImage = doc?.url ? /\.(png|jpe?g|webp|gif)($|\?)/i.test(doc.url) : false;

  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onHide();
      } else if ((e.key === '+' || e.key === '=') && isImage) {
        setZoom((z) => Math.min(250, z + 20));
      } else if (e.key === '-' && isImage) {
        setZoom((z) => Math.max(50, z - 20));
      } else if (e.key === '0' && isImage) {
        setZoom(100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onHide, isImage]);

  if (!show || !doc) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-preview-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onHide}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl h-[92vh] flex flex-col rounded-2xl bg-surface-container-lowest border border-surface-container shadow-2xl overflow-hidden"
      >
        {/* Header Toolbar: Thông tin tài liệu và Thao tác nhanh */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface-container-low border-b border-surface-container shrink-0 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0 max-w-md lg:max-w-xl">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                isPdf
                  ? 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                  : 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
              }`}
            >
              <Icon name={isPdf ? 'picture_as_pdf' : 'image'} className="text-[20px]" />
            </div>
            <div className="min-w-0">
              <h3
                id="legal-preview-modal-title"
                className="font-bold text-xs sm:text-sm text-on-surface truncate leading-tight"
                title={doc.title}
              >
                {doc.title}
              </h3>
              <p className="text-[11px] text-on-surface-variant truncate mt-0.5 font-mono">
                {doc.fileName} ·{' '}
                <span className="font-semibold text-primary">
                  {isPdf ? 'Tài liệu PDF' : 'Ảnh pháp lý'}
                </span>
              </p>
            </div>
          </div>

          {/* Action buttons (Thu phóng, Tải về, Mở toàn màn hình, Đóng) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Bộ điều khiển thu phóng đối với tài liệu dạng ảnh */}
            {isImage && (
              <div className="flex items-center gap-0.5 bg-surface-container rounded-lg p-0.5 border border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(50, z - 20))}
                  disabled={zoom <= 50}
                  className="h-7 w-7 rounded-md inline-flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-40"
                  title="Thu nhỏ (-)"
                >
                  <Icon name="remove" className="text-[15px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(100)}
                  className="h-7 px-2 rounded-md inline-flex items-center justify-center text-xs font-mono font-medium text-on-surface hover:bg-surface-container-high transition-colors"
                  title="Đặt lại mức chuẩn 100% (Vừa chiều rộng A4)"
                >
                  {zoom}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(250, z + 20))}
                  disabled={zoom >= 250}
                  className="h-7 w-7 rounded-md inline-flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-40"
                  title="Phóng to (+)"
                >
                  <Icon name="add" className="text-[15px]" />
                </button>
              </div>
            )}

            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-container text-on-surface-variant border border-surface-container-high">
              <Icon name="description" className="text-[14px] text-primary" />
              <span className="truncate max-w-[160px] lg:max-w-[220px]" title={doc.fileName}>
                {doc.fileName}
              </span>
            </div>

            {doc.url && (
              <>
                <a
                  href={doc.url}
                  download={doc.fileName}
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 px-2.5 rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                  title="Tải tệp về máy tính"
                >
                  <Icon name="download" className="text-[15px]" />
                  <span className="hidden sm:inline">Tải về</span>
                </a>

                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 px-2.5 rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                  title="Mở toàn màn hình trong tab mới"
                >
                  <Icon name="open_in_new" className="text-[15px]" />
                  <span className="hidden sm:inline">Mở toàn màn hình</span>
                </a>
              </>
            )}

            <button
              type="button"
              onClick={onHide}
              aria-label="Đóng màn hình xem tài liệu"
              className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors ml-1"
            >
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
        </div>

        {/* Thân Modal: Trực tiếp hiển thị PDF hoặc Ảnh gốc với cơ chế cuộn mượt mà từ trên xuống */}
        <div className="flex-1 w-full h-full p-2 sm:p-4 bg-neutral-900/5 dark:bg-black/50 overflow-hidden flex flex-col min-h-0">
          {isPdf ? (
            <iframe
              src={`${doc.url}#toolbar=1&view=FitH`}
              className="w-full flex-1 rounded-xl border border-surface-container bg-surface-container-lowest shadow-sm"
              title={`Tài liệu: ${doc.title}`}
            />
          ) : isImage ? (
            <div className="w-full flex-1 rounded-xl border border-surface-container bg-neutral-800/10 dark:bg-black/60 p-3 sm:p-6 overflow-y-auto overflow-x-auto flex flex-col items-center">
              {/* Khung tài liệu: Chiều rộng mặc định 850px chuẩn kích thước A4 đọc chữ sắc nét, cuộn từ từ xuống */}
              <div
                style={{
                  width: `${Math.round(850 * (zoom / 100))}px`,
                  maxWidth: zoom <= 100 ? '100%' : 'none',
                }}
                className="transition-all duration-150 shadow-2xl rounded-sm overflow-hidden bg-white shrink-0 my-2 ring-1 ring-black/5"
              >
                <img
                  src={doc.url}
                  alt={doc.title}
                  className="w-full h-auto block select-none"
                  loading="eager"
                />
              </div>
            </div>
          ) : (
            <iframe
              src={doc.url}
              className="w-full flex-1 rounded-xl border border-surface-container bg-surface-container-lowest shadow-sm"
              title={`Tài liệu: ${doc.title}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};
