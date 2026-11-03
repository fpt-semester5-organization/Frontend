import React, { useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatNumber } from '@/lib/format';
import type { NutritionDocument } from '../types/admin.types';

export interface NutritionPdfPreviewModalProps {
  show: boolean;
  doc: NutritionDocument | null;
  onHide: () => void;
}

const STATIC_PDF_FILES = new Set([
  '01-dam-thuc-vat.pdf',
  '02-vitamin-b12.pdf',
  '03-sat-thuc-vat.pdf',
  '04-canxi-vitamin-d.pdf',
  '05-omega-3.pdf',
  '06-kem-iot.pdf',
  '07-tre-em-an-chay.pdf',
  '08-thai-ky-cho-con-bu.pdf',
  '09-nguoi-cao-tuoi.pdf',
  '10-the-thao-an-chay.pdf',
  '101-nang-luong-van-dong-vien-chay.pdf',
  '102-carbohydrate-cho-van-dong-vien-chay.pdf',
  '103-chat-beo-cho-van-dong-vien-chay.pdf',
  '104-suc-khoe-xuong-van-dong-vien-chay.pdf',
  '105-thieu-sat-o-van-dong-vien-chay.pdf',
  '11-quan-ly-can-nang.pdf',
  '12-doc-nhan-thuc-pham-e-number.pdf',
  '13-thay-the-thit-trung-sua.pdf',
  '14-cac-truong-phai-an-chay.pdf',
  '15-di-ung-thuc-pham-thuc-vat.pdf',
  'how_not_to_die.pdf',
  'becoming_vegan.pdf',
  'becoming_vegan_comprehensive_edition.pdf',
  'the_china_study_revised_and_expanded_edition.pdf',
  'vegetarian_sports_nutrition.pdf',
]);

/**
 * Modal hiển thị trực tiếp Tệp PDF gốc nổi giữa màn hình.
 * - Hiển thị 100% PDF gốc trực tiếp qua Iframe (hỗ trợ Cloudinary CDN URL, Local Blob URL hoặc file tĩnh).
 * - Xử lý fallback tinh tế: Nếu tài liệu chưa có file nhị phân trên CDN, hiển thị thẻ thông tin Qdrant thay vì lỗi 404.
 */
export const NutritionPdfPreviewModal: React.FC<NutritionPdfPreviewModalProps> = ({
  show,
  doc,
  onHide,
}) => {
  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onHide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onHide]);

  const pdfUrl = useMemo(() => {
    if (!doc) return null;
    if (doc.fileUrl) {
      // Nếu link là Cloudinary CDN bị lỗi ACL/Deny 401 trên account mặc định, tự động chuyển về endpoint nội bộ
      if (doc.fileUrl.includes('res.cloudinary.com') && doc.id) {
        return `/api/v1/admin/knowledge/documents/${doc.id}/file`;
      }
      return doc.fileUrl;
    }
    const lowerName = doc.fileName.toLowerCase();
    if (STATIC_PDF_FILES.has(lowerName)) {
      return `/docs/nutrition/${doc.fileName}`;
    }
    if (doc.id) {
      return `/api/v1/admin/knowledge/documents/${doc.id}/file`;
    }
    return null;
  }, [doc]);

  if (!show || !doc) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onHide}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl h-[90vh] flex flex-col rounded-2xl bg-surface-container-lowest border border-surface-container shadow-2xl overflow-hidden"
      >
        {/* Header Toolbar: Thông tin tài liệu và Thao tác nhanh */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface-container-low border-b border-surface-container shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 max-w-xl">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
              <Icon name="picture_as_pdf" className="text-[20px]" />
            </div>
            <div className="min-w-0">
              <h3
                id="preview-modal-title"
                className="font-bold text-xs sm:text-sm text-on-surface truncate leading-tight"
                title={doc.title}
              >
                {doc.title}
              </h3>
              <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                {doc.author} · <span className="font-semibold text-primary">{formatNumber(doc.chunks)}</span> chunks ·{' '}
                {doc.isActive ? (
                  <span className="text-primary font-medium">Đang dùng</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Đã ẩn</span>
                )}
              </p>
            </div>
          </div>

          {/* Action buttons (Tệp PDF, Mở tab mới, Đóng) */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-container text-on-surface-variant border border-surface-container-high">
              <Icon name="description" className="text-[14px] text-rose-500" />
              <span className="truncate max-w-[200px]" title={doc.fileName}>
                {doc.fileName}
              </span>
            </div>

            {pdfUrl && (
              <>
                <a
                  href={pdfUrl}
                  download={doc.fileName}
                  className="h-8 px-2.5 rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                  title="Tải tệp PDF về máy tính"
                >
                  <Icon name="download" className="text-[15px]" />
                  <span className="hidden sm:inline">Tải về</span>
                </a>

                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 px-2.5 rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                  title="Mở tệp PDF trong tab mới"
                >
                  <Icon name="open_in_new" className="text-[15px]" />
                  <span className="hidden sm:inline">Mở toàn màn hình</span>
                </a>
              </>
            )}

            <button
              type="button"
              onClick={onHide}
              aria-label="Đóng màn hình xem PDF"
              className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors ml-1"
            >
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
        </div>

        {/* Thân Modal: Trực tiếp hiển thị PDF gốc toàn màn hình hoặc Card thông báo */}
        <div className="flex-1 w-full h-full p-2 sm:p-3 bg-neutral-900/5 dark:bg-black/40 overflow-hidden flex flex-col">
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=1`}
              className="w-full flex-1 rounded-xl border border-surface-container bg-surface-container-lowest shadow-sm"
              title={`Tệp PDF gốc: ${doc.title}`}
            />
          ) : (
            <div className="flex-1 w-full h-full p-6 flex flex-col items-center justify-center text-center bg-surface-container-lowest rounded-xl border border-surface-container">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 mb-4">
                <Icon name="cloud_off" className="text-[32px]" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-on-surface mb-1.5">
                Tệp PDF gốc chưa được đồng bộ lên Cloudinary CDN
              </h4>
              <p className="text-xs text-on-surface-variant max-w-lg leading-relaxed mb-4">
                Tài liệu <strong className="text-on-surface font-semibold">{doc.fileName}</strong> đã được trích xuất
                văn bản và nạp thành công{' '}
                <strong className="text-primary font-semibold">{formatNumber(doc.chunks)} vector chunks</strong> vào
                Qdrant để Chatbot RAG tư vấn.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-surface-container text-xs text-on-surface border border-surface-container-high">
                <Icon name="check_circle" className="text-emerald-500 text-[16px]" />
                <span>
                  Trạng thái Vector DB Qdrant: <strong>Sẵn sàng truy xuất</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NutritionPdfPreviewModal;
