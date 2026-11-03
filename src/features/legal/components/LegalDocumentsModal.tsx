import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/format';
import { useLegalDocuments } from '../hooks/useLegalDocuments';
import type { LegalDocType, LegalDocumentsData } from '../types/legal.types';
import {
  FileText,
  ShieldCheck,
  Scale,
  Sparkles,
  ExternalLink,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export interface LegalDocumentsModalProps {
  show: boolean;
  onHide: () => void;
  initialDoc?: LegalDocType;
  onAgree?: () => void;
}

interface DocMeta {
  id: LegalDocType;
  title: string;
  shortTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  getUrl: (docs?: LegalDocumentsData) => string | undefined;
  fallbackUrl: string;
}

const DOC_CONFIGS: DocMeta[] = [
  {
    id: 'TERMS',
    title: 'Điều Khoản Dịch Vụ (Luật 19/2023/QH15)',
    shortTitle: 'Điều khoản dịch vụ',
    icon: Scale,
    getUrl: (d) => d?.termsOfServiceUrl,
    fallbackUrl:
      'https://res.cloudinary.com/swrsuenp/image/upload/v1793718645/veggielife/legal/19_2023_QH15_500102.jpg',
  },
  {
    id: 'PRIVACY',
    title: 'Chính Sách Bảo Mật Dữ Liệu (Nghị định 13/2023/NĐ-CP)',
    shortTitle: 'Chính sách bảo mật',
    icon: ShieldCheck,
    getUrl: (d) => d?.privacyPolicyUrl,
    fallbackUrl:
      'https://res.cloudinary.com/swrsuenp/image/upload/v1793718345/veggielife/legal/13_2023_ND-CP_465185.jpg',
  },
  {
    id: 'USER_AGREEMENT',
    title: 'Thỏa Thuận & Cam Kết Người Dùng (Luật 116/2025/QH15)',
    shortTitle: 'Cam kết người dùng',
    icon: FileText,
    getUrl: (d) => d?.userAgreementUrl,
    fallbackUrl:
      'https://res.cloudinary.com/swrsuenp/image/upload/v1793718600/veggielife/legal/116_2025_QH15_666020.jpg',
  },
  {
    id: 'VEGAN_DISCLAIMER',
    title: 'Quy Định Trí Tuệ Nhân Tạo & Miễn Trừ (Nghị định 142/2026/NĐ-CP)',
    shortTitle: 'Quy định AI & Miễn trừ',
    icon: Sparkles,
    getUrl: (d) => d?.veganDisclaimerUrl,
    fallbackUrl:
      'https://res.cloudinary.com/swrsuenp/image/upload/v1793718667/veggielife/legal/142_2026_ND-CP_696080.jpg',
  },
];

export function LegalDocumentsModal({
  show,
  onHide,
  initialDoc = 'TERMS',
  onAgree,
}: LegalDocumentsModalProps) {
  const [activeDoc, setActiveDoc] = useState<LegalDocType>(initialDoc);
  const [zoom, setZoom] = useState<number>(100);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  const { data: legalDocs, isFetching, refetch } = useLegalDocuments(show);

  useEffect(() => {
    if (show) {
      setActiveDoc(initialDoc);
      setZoom(100);
      setImageLoaded(false);
      setImageError(false);
    }
  }, [show, initialDoc]);

  // Reset zoom and image state when switching tabs
  const handleSelectDoc = (docType: LegalDocType) => {
    setActiveDoc(docType);
    setZoom(100);
    setImageLoaded(false);
    setImageError(false);
  };

  const currentDocMeta =
    DOC_CONFIGS.find((cfg) => cfg.id === activeDoc) ?? DOC_CONFIGS[0];
  const activeImageUrl =
    currentDocMeta.getUrl(legalDocs) || currentDocMeta.fallbackUrl;

  const ActiveIcon = currentDocMeta.icon;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoom(100);

  const handlePrint = () => {
    if (!activeImageUrl) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${currentDocMeta.title} - VeggieLife</title>
          <style>
            body { margin: 0; padding: 20px; display: flex; justify-content: center; background: #fff; font-family: sans-serif; }
            img { max-width: 100%; height: auto; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <img src="${activeImageUrl}" onload="window.print();window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      title={
        <div className="flex flex-col gap-2.5 w-full pr-8">
          <div className="flex items-center gap-2">
            <ActiveIcon className="h-5 w-5 text-primary shrink-0" />
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
              {currentDocMeta.title}
            </span>
          </div>

          {/* Document selection tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {DOC_CONFIGS.map((doc) => {
              const isSelected = activeDoc === doc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => handleSelectDoc(doc.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs md:text-sm font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-on-primary font-semibold shadow-xs'
                      : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
                  }`}
                >
                  {doc.shortTitle}
                </button>
              );
            })}
          </div>
        </div>
      }
    >
      <div className="flex flex-col max-h-[85vh]">
        {/* Top Control Bar: Verification Status + Zoom + Tools */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-container-high bg-surface-container-low px-4 py-2.5 text-xs md:text-sm">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Văn bản pháp lý số hóa chính thức</span>
            </span>
            {legalDocs?.updatedAt && (
              <span className="hidden sm:inline text-xs text-on-surface-variant">
                • Cập nhật: {formatDateTime(legalDocs.updatedAt)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Zoom Controls */}
            <div className="flex items-center rounded-lg border border-surface-container-high bg-surface-container-lowest px-1.5 py-0.5">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="p-1 text-on-surface-variant hover:text-primary disabled:opacity-40 cursor-pointer"
                title="Thu nhỏ (-25%)"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-0.5 text-xs font-medium text-on-surface hover:text-primary cursor-pointer"
                title="Đặt lại 100%"
              >
                {zoom}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="p-1 text-on-surface-variant hover:text-primary disabled:opacity-40 cursor-pointer"
                title="Phóng to (+25%)"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              {zoom !== 100 && (
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="p-1 text-on-surface-variant hover:text-primary cursor-pointer border-l border-surface-container-high ml-1"
                  title="Đặt lại kích thước gốc"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Actions: Open in new tab, Download, Print */}
            {activeImageUrl && (
              <>
                <a
                  href={activeImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-surface-container-high bg-surface-container-lowest px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                  title="Mở ảnh gốc Cloudinary trong tab mới"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ảnh gốc</span>
                </a>

                <a
                  href={activeImageUrl}
                  download={`${activeDoc}_VeggieLife.png`}
                  className="inline-flex items-center gap-1 rounded-lg border border-surface-container-high bg-surface-container-lowest px-2.5 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
                  title="Tải ảnh về máy"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tải về</span>
                </a>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1 rounded-lg border border-surface-container-high bg-surface-container-lowest px-2.5 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                  title="In văn bản này"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">In</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Scrollable Document Image Container (Images only, NO text clauses, Styled like Image 3) */}
        <div className="relative flex-1 overflow-auto bg-[#f8f7f5] p-3 md:p-6 dark:bg-neutral-950 min-h-[55vh] max-h-[72vh]">
          {/* Loading state */}
          {(isFetching || (!imageLoaded && !imageError)) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-container-lowest/80 backdrop-blur-xs z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Đang tải văn bản pháp lý chính thức từ máy chủ VeggieLife...
              </p>
            </div>
          )}

          {/* Error state */}
          {imageError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-12 w-12 text-error mb-3" />
              <h4 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                Không thể tải hình ảnh văn bản pháp lý
              </h4>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant max-w-md">
                Đã xảy ra lỗi khi kết nối với máy chủ lưu trữ Cloudinary. Bạn có thể thử tải lại hoặc mở trực tiếp liên kết gốc.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImageError(false);
                    setImageLoaded(false);
                    refetch();
                  }}
                >
                  Tải lại
                </Button>
                {activeImageUrl && (
                  <a
                    href={activeImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Mở liên kết trực tiếp</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            /* Document Image Canvas (Pure official digitized image, exactly matching Image 3) */
            <div className="flex justify-center items-start w-full transition-transform duration-200">
              <div
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="w-full max-w-3xl rounded-2xl border border-neutral-200/90 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-800 overflow-hidden"
              >
                <img
                  src={activeImageUrl}
                  alt={currentDocMeta.title}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    setImageError(true);
                    setImageLoaded(true);
                  }}
                  className="w-full h-auto object-contain object-top block"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-container-high bg-surface-container-lowest px-4 py-3">
          <p className="text-xs text-on-surface-variant">
            Bản quyền văn bản chính thức được lưu trữ bảo mật trên CDN Cloudinary của VeggieLife.
          </p>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onHide}>
              Đóng
            </Button>
            {onAgree && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onAgree();
                  onHide();
                }}
              >
                Tôi đồng ý với điều khoản này
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
