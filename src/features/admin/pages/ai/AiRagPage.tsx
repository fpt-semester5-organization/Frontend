import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/forms';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { notifySuccess } from '@/lib/notify';
import { formatServerDateTime } from '@/lib/serverDate';
import { AdminQueryError, CONTROL, ServerMessageDialog } from '../../components/AdminUi';
import { NutritionPdfPreviewModal } from '../../components/NutritionPdfPreviewModal';
import {
  useDeleteNutritionDocument,
  useKnowledgeStatus,
  useNutritionDocuments,
  useUpdateNutritionDocumentStatus,
  useUploadNutritionDocument,
} from '../../hooks/useAdminAi';
import { handleWriteError } from '../../lib/writeError';
import type { NutritionDocument } from '../../types/admin.types';

type TabType = 'all' | 'active' | 'hidden';

const PAGE_SIZE = 10;

/**
 * Trang Quản trị Kho tri thức Chatbot RAG (Qdrant · `/admin/ai/rag` - FN-CHAT-07).
 * Thiết kế tinh gọn chuẩn shadcn-admin:
 * - Lọc trạng thái với Horizontal Tabs (Tất cả, Đang dùng, Đã ẩn).
 * - Modal upload tài liệu PDF & Dialog tái lập chỉ mục (reindex) không làm mất ngữ cảnh.
 * - Phân trang 10 mục/trang, loại bỏ danh sách vô tận, tối ưu trải nghiệm end-user.
 */
export const AiRagPage: React.FC = () => {
  const [jobId, setJobId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const status = useKnowledgeStatus(isPolling);
  const [conflict, setConflict] = useState<string | null>(null);

  // Tab lọc trạng thái
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Danh sách tài liệu dinh dưỡng PDF nạp trong Vector DB từ Backend API
  const documentsQuery = useNutritionDocuments();
  const uploadDocMutation = useUploadNutritionDocument();
  const updateStatusMutation = useUpdateNutritionDocumentStatus();
  const deleteDocMutation = useDeleteNutritionDocument();

  const documents = useMemo(() => documentsQuery.data ?? [], [documentsQuery.data]);

  // Bộ lọc tìm kiếm & Phân trang
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal Upload PDF
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadAuthor, setUploadAuthor] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Dialog Xóa / Ẩn tài liệu & Modal Xem trước PDF Khổ A4
  const [docToDelete, setDocToDelete] = useState<NutritionDocument | null>(null);
  const [docToToggle, setDocToToggle] = useState<NutritionDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<NutritionDocument | null>(null);
  const uploadedBlobUrls = useRef<Map<string, string>>(new Map());

  const uploadFileId = useId();
  const uploadTitleId = useId();
  const uploadAuthorId = useId();

  useEffect(() => {
    if (!isPolling) return;
    const timer = setTimeout(() => setIsPolling(false), 30000);
    return () => clearTimeout(timer);
  }, [isPolling]);

  // Reset page về 1 khi thay đổi tab lọc hoặc từ khóa tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const handleToggleActive = (doc: NutritionDocument) => {
    updateStatusMutation.mutate(
      { id: doc.id, isActive: !doc.isActive },
      {
        onSuccess: (res) => {
          notifySuccess(
            res.data?.isActive
              ? `Đã kích hoạt lại "${doc.title}".`
              : `Đã ẩn "${doc.title}".`
          );
          setDocToToggle(null);
        },
        onError: (err) => {
          handleWriteError(err);
        },
      }
    );
  };

  const handleDeleteDoc = (doc: NutritionDocument) => {
    deleteDocMutation.mutate(doc.id, {
      onSuccess: () => {
        notifySuccess(`Đã xóa "${doc.title}" khỏi Vector DB.`);
        setDocToDelete(null);
      },
      onError: (err) => {
        handleWriteError(err);
      },
    });
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      setUploadError('Vui lòng nhập tiêu đề tài liệu PDF.');
      return;
    }
    if (!selectedFile) {
      setUploadError('Vui lòng chọn tệp PDF dinh dưỡng.');
      return;
    }

    setUploadError(null);
    uploadDocMutation.mutate(
      {
        file: selectedFile,
        title: uploadTitle.trim(),
        author: uploadAuthor.trim() || undefined,
      },
      {
        onSuccess: (res) => {
          notifySuccess(`Đã tải lên và vector hoá thành công "${res.title}".`);
          if (selectedFile) {
            const blobUrl = URL.createObjectURL(selectedFile);
            uploadedBlobUrls.current.set(res.id, blobUrl);
            uploadedBlobUrls.current.set(res.fileName, blobUrl);
          }
          setUploadTitle('');
          setUploadAuthor('');
          setSelectedFile(null);
          setIsUploadOpen(false);
          void documentsQuery.refetch();
          void status.refetch();
        },
        onError: (err) => {
          handleWriteError(err);
          setUploadError('Tải lên hoặc vector hoá tài liệu thất bại.');
        },
      }
    );
  };

  const activeCount = documents.filter((d) => d.isActive).length;
  const hiddenCount = documents.filter((d) => !d.isActive).length;
  const activeChunks = documents.filter((d) => d.isActive).reduce((acc, cur) => acc + cur.chunks, 0);
  const hiddenChunks = documents.filter((d) => !d.isActive).reduce((acc, cur) => acc + cur.chunks, 0);
  const totalChunksFromDocs = documents.reduce((acc, cur) => acc + cur.chunks, 0);
  const effectiveTotalPoints = status.data ? status.data.totalPoints : totalChunksFromDocs;
  const effectiveActivePoints = Math.max(0, effectiveTotalPoints - hiddenChunks);

  // Danh sách lọc theo Tab và Search
  const displayDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return documents.filter((doc) => {
      const matchesSearch =
        !query ||
        doc.title.toLowerCase().includes(query) ||
        doc.author.toLowerCase().includes(query) ||
        doc.fileName.toLowerCase().includes(query);

      const matchesTab =
        activeTab === 'all' ||
        (activeTab === 'active' && doc.isActive) ||
        (activeTab === 'hidden' && !doc.isActive);

      return matchesSearch && matchesTab;
    });
  }, [documents, searchQuery, activeTab]);

  // Phân trang Client-side 10 tài liệu/trang
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return displayDocuments.slice(start, start + PAGE_SIZE);
  }, [displayDocuments, currentPage]);

  const activePreviewDoc = useMemo(() => {
    if (!previewDoc) return null;
    const localUrl =
      uploadedBlobUrls.current.get(previewDoc.id) ||
      uploadedBlobUrls.current.get(previewDoc.fileName);
    const backendFileUrl = previewDoc.id
      ? `/api/v1/admin/knowledge/documents/${previewDoc.id}/file`
      : undefined;

    return {
      ...previewDoc,
      fileUrl: localUrl || previewDoc.fileUrl || backendFileUrl,
    };
  }, [previewDoc]);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header tinh gọn */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-on-surface">
          Kho tri thức Chatbot (Qdrant Vector DB)
        </h2>
      </div>

      {/* 2. 4 Thẻ KPI thống kê số liệu rõ ràng */}
      {status.isError && !status.data ? (
        <AdminQueryError error={status.error} onRetry={() => void status.refetch()} retrying={status.isRefetching} />
      ) : (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-surface-container bg-surface-container-lowest p-3.5 shadow-xs">
            <div className="text-xs font-medium text-on-surface-variant">Tài liệu dinh dưỡng</div>
            <div className="text-xl font-bold text-on-surface mt-1 tabular-nums flex items-baseline gap-1.5">
              <span>{documents.length}</span>
              <span className="text-xs font-normal text-on-surface-variant">
                ({activeCount} dùng · {hiddenCount} ẩn)
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-surface-container bg-surface-container-lowest p-3.5 shadow-xs">
            <div className="text-xs font-medium text-on-surface-variant">Tổng số Vector Chunks</div>
            <div className="text-xl font-bold text-primary mt-1 tabular-nums flex items-baseline gap-1.5">
              <span>{formatNumber(effectiveActivePoints)}</span>
              {hiddenChunks > 0 ? (
                <span className="text-xs font-normal text-on-surface-variant">
                  ({formatNumber(effectiveActivePoints)} dùng · {formatNumber(hiddenChunks)} ẩn)
                </span>
              ) : (
                <span className="text-xs font-normal text-on-surface-variant">
                  (toàn bộ sẵn sàng)
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-surface-container bg-surface-container-lowest p-3.5 shadow-xs">
            <div className="text-xs font-medium text-on-surface-variant">Đồng bộ gần nhất</div>
            <div className="text-xs font-semibold text-on-surface mt-1.5">
              {formatServerDateTime(status.data?.lastIndexedAt) || '03/11/2026 23:52'}
            </div>
          </div>

          <div className="rounded-xl border border-surface-container bg-surface-container-lowest p-3.5 shadow-xs">
            <div className="text-xs font-medium text-on-surface-variant">Trạng thái Qdrant</div>
            <div className="text-xs font-semibold text-primary mt-1.5 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Hoạt động bình thường
            </div>
          </div>
        </div>
      )}

      {/* 3. Thanh điều hướng Tab Trạng thái & Ô Tìm kiếm */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container pb-3">
          {/* TabsList ngang tinh gọn: Chỉ lọc trạng thái */}
          <div className="inline-flex h-9 items-center justify-center rounded-lg bg-surface-container-low p-1 text-on-surface-variant border border-surface-container self-start">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all',
                activeTab === 'all'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              Tất cả ({documents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all',
                activeTab === 'active'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              Đang dùng ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('hidden')}
              className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all',
                activeTab === 'hidden'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              Đã ẩn ({hiddenCount})
            </button>
          </div>

          {/* Ô tìm kiếm & Nút tải lên tài liệu PDF mới */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Tìm kiếm tài liệu, tác giả, file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(CONTROL, 'pl-8 pr-7 text-xs py-1.5 h-9 w-full')}
              />
              <Icon name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                  aria-label="Xóa tìm kiếm"
                >
                  <Icon name="close" className="text-[14px]" />
                </button>
              )}
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsUploadOpen(true)}
              className="h-9 text-xs font-medium bg-primary text-on-primary hover:bg-primary/90 shrink-0 gap-1.5"
            >
              <Icon name="upload_file" className="text-[16px]" />
              + Tải lên tài liệu PDF mới
            </Button>
          </div>
        </div>

        {/* 5. Tiêu đề danh sách và số lượng */}
        <div className="flex items-center justify-between text-xs text-on-surface-variant px-1">
          <span className="font-medium text-on-surface">Danh sách Tài liệu Dinh dưỡng PDF trong Vector DB</span>
          <span>{displayDocuments.length} mục</span>
        </div>

        {/* 6. Bảng danh sách tài liệu */}
        {documentsQuery.isError ? (
          <AdminQueryError
            error={documentsQuery.error}
            onRetry={() => void documentsQuery.refetch()}
            retrying={documentsQuery.isRefetching}
          />
        ) : documentsQuery.isLoading ? (
          <div className="py-12 flex items-center justify-center text-xs text-on-surface-variant gap-2 rounded-xl border border-surface-container bg-surface-container-lowest">
            <Icon name="refresh" className="animate-spin text-base" />
            Đang tải danh sách tài liệu từ Vector DB...
          </div>
        ) : displayDocuments.length === 0 ? (
          <EmptyState
            icon="search_off"
            title="Không tìm thấy tài liệu phù hợp"
            description="Thử thay đổi từ khóa hoặc chuyển sang tab Tất cả."
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="overflow-x-auto rounded-xl border border-surface-container bg-surface-container-lowest shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-surface-container bg-surface-container-low/60 font-semibold text-on-surface-variant">
                    <th className="py-3 px-4">Tài liệu dinh dưỡng / Tác giả</th>
                    <th className="py-3 px-4">Tệp đính kèm</th>
                    <th className="py-3 px-4 text-center">Chunks</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Cập nhật</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container font-body-sm text-body-sm text-on-surface">
                  {paginatedDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      className={cn(
                        'hover:bg-surface-container-low/50 transition-colors group',
                        !doc.isActive && 'opacity-60 bg-surface-container-low/20'
                      )}
                    >
                      {/* Cột 1: Tài liệu & Tác giả */}
                      <td className="py-3 px-4 max-w-sm">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400 transition-colors cursor-pointer"
                            title="Xem trước tài liệu (Khổ A4)"
                            aria-label={`Xem trước ${doc.title}`}
                          >
                            <Icon name="picture_as_pdf" className="text-[20px]" />
                          </button>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="text-left font-semibold text-on-surface text-xs leading-snug line-clamp-1 hover:text-primary transition-colors cursor-pointer"
                              title="Bấm để xem chi tiết tài liệu (Khổ A4)"
                            >
                              {doc.title}
                            </button>
                            <div className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5 truncate">
                              <Icon name="person" className="text-[13px] opacity-60 shrink-0" />
                              <span className="truncate">{doc.author || 'Chưa cập nhật'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Tệp đính kèm */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-on-surface-variant">
                          <Icon name="description" className="text-[14px] text-on-surface-variant/50 shrink-0" />
                          <span className="truncate max-w-[200px]" title={doc.fileName}>
                            {doc.fileName}
                          </span>
                        </div>
                      </td>

                      {/* Cột 3: Chunks */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[42px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold text-xs tabular-nums">
                          {formatNumber(doc.chunks)}
                        </span>
                      </td>

                      {/* Cột 4: Trạng thái */}
                      <td className="py-3 px-4">
                        {doc.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            Đang dùng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-container text-on-surface-variant border border-surface-container-high">
                            <span className="h-1.5 w-1.5 rounded-full bg-on-surface-variant/50" />
                            Đã ẩn
                          </span>
                        )}
                      </td>

                      {/* Cột 5: Ngày cập nhật */}
                      <td className="py-3 px-4 text-[11px] text-on-surface-variant whitespace-nowrap">
                        {formatServerDateTime(doc.updatedAt) || '–'}
                      </td>

                      {/* Cột 6: Nút thao tác */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            title="Xem chi tiết tài liệu (Khổ A4)"
                            aria-label={`Xem chi tiết ${doc.title}`}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors border border-transparent"
                          >
                            <Icon name="menu_book" className="text-[17px]" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDocToToggle(doc)}
                            title={doc.isActive ? 'Ẩn tài liệu khỏi Chatbot' : 'Kích hoạt lại tài liệu'}
                            aria-label={doc.isActive ? 'Ẩn tài liệu khỏi Chatbot' : 'Kích hoạt lại tài liệu'}
                            className={cn(
                              'h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors border border-transparent',
                              doc.isActive
                                ? 'text-on-surface-variant hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200/50 dark:hover:bg-amber-950/30'
                                : 'text-on-surface-variant hover:text-primary hover:bg-primary/10 hover:border-primary/20'
                            )}
                          >
                            <Icon name={doc.isActive ? 'visibility' : 'visibility_off'} className="text-[17px]" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDocToDelete(doc)}
                            title="Xóa khỏi Vector DB"
                            aria-label="Xóa khỏi Vector DB"
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 hover:border-error/20 border border-transparent transition-colors"
                          >
                            <Icon name="delete" className="text-[17px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 7. Phân trang chuẩn 10 mục/trang */}
            {displayDocuments.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs text-on-surface-variant">
                <div>
                  Hiển thị <span className="font-semibold text-on-surface">{(currentPage - 1) * PAGE_SIZE + 1}</span> -{' '}
                  <span className="font-semibold text-on-surface">
                    {Math.min(currentPage * PAGE_SIZE, displayDocuments.length)}
                  </span>{' '}
                  trên tổng số <span className="font-semibold text-on-surface">{displayDocuments.length}</span> tài liệu
                </div>
                <Pagination
                  page={currentPage}
                  size={PAGE_SIZE}
                  total={displayDocuments.length}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Tải lên Tài liệu PDF */}
      <Modal
        show={isUploadOpen}
        onHide={() => !uploadDocMutation.isPending && setIsUploadOpen(false)}
        title="Tải lên Tài liệu Dinh dưỡng PDF"
        size="lg"
      >
        <div className="p-5 flex flex-col gap-4">
          <p className="text-xs text-on-surface-variant">
            Tài liệu tải lên sẽ được trích xuất văn bản và tự động tạo vector embeddings vào Qdrant để Chatbot RAG truy xuất chính xác.
          </p>

          <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
            {uploadError && <FormAlert tone="error">{uploadError}</FormAlert>}

            <div className="flex flex-col gap-1.5">
              <label htmlFor={uploadFileId} className="text-xs font-semibold text-on-surface">
                Tệp PDF <span className="text-error">*</span>
              </label>
              <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-surface-container p-6 hover:border-primary/50 transition-colors bg-surface-container-low/30 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                    <Icon name="picture_as_pdf" className="text-[28px]" />
                  </div>
                  <div className="text-xs font-medium text-on-surface">
                    {selectedFile ? selectedFile.name : 'Kéo thả tệp PDF vào đây hoặc bấm để chọn'}
                  </div>
                  {selectedFile && (
                    <div className="text-[11px] text-on-surface-variant font-mono">
                      Dung lượng: {(selectedFile.size / 1024).toFixed(1)} KB
                    </div>
                  )}
                  <label className="cursor-pointer rounded-lg bg-surface-container px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors">
                    Chọn file PDF
                    <input
                      id={uploadFileId}
                      type="file"
                      accept=".pdf,.txt,.md"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          if (!uploadTitle) {
                            setUploadTitle(file.name.replace(/\.(pdf|txt|md)$/i, '').replace(/[-_]/g, ' '));
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={uploadTitleId} className="text-xs font-semibold text-on-surface">
                Tiêu đề tài liệu / Tên sách <span className="text-error">*</span>
              </label>
              <input
                id={uploadTitleId}
                type="text"
                placeholder="Ví dụ: Dinh dưỡng vi chất trong chế độ thuần chay"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className={cn(CONTROL, 'text-xs h-9')}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={uploadAuthorId} className="text-xs font-semibold text-on-surface">
                Tác giả / Cơ quan thẩm định
              </label>
              <input
                id={uploadAuthorId}
                type="text"
                placeholder="Ví dụ: Viện Dinh Dưỡng Quốc Gia, WHO"
                value={uploadAuthor}
                onChange={(e) => setUploadAuthor(e.target.value)}
                className={cn(CONTROL, 'text-xs h-9')}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsUploadOpen(false)}
                disabled={uploadDocMutation.isPending}
                className="h-8 text-xs"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={uploadDocMutation.isPending}
                disabled={uploadDocMutation.isPending}
                className="h-8 text-xs bg-primary text-on-primary hover:bg-primary/90"
              >
                <Icon name="cloud_upload" className="text-[16px]" />
                Tải lên & Vector hoá
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Dialog Xác nhận Ẩn / Kích hoạt tài liệu */}
      <ConfirmDialog
        show={Boolean(docToToggle)}
        title={docToToggle?.isActive ? 'Ẩn tài liệu khỏi Chatbot?' : 'Kích hoạt lại tài liệu?'}
        message={
          docToToggle?.isActive ? (
            <>
              Ẩn <strong>{docToToggle?.title}</strong>? Chatbot sẽ tạm ngưng truy xuất tài liệu này. Dữ liệu vector trong Qdrant vẫn được bảo lưu.
            </>
          ) : (
            <>
              Kích hoạt lại <strong>{docToToggle?.title}</strong> phục vụ Chatbot RAG.
            </>
          )
        }
        confirmLabel={docToToggle?.isActive ? 'Ẩn tài liệu' : 'Kích hoạt lại'}
        loading={updateStatusMutation.isPending}
        onConfirm={() => docToToggle && handleToggleActive(docToToggle)}
        onCancel={() => !updateStatusMutation.isPending && setDocToToggle(null)}
      />

      {/* Dialog Xác nhận Xóa tài liệu */}
      <ConfirmDialog
        show={Boolean(docToDelete)}
        title="Xác nhận xóa tài liệu khỏi Vector DB?"
        message={
          <>
            Bạn có chắc muốn xóa <strong>{docToDelete?.title}</strong> ({formatNumber(docToDelete?.chunks ?? 0)} chunks) khỏi Qdrant? Hành động này không thể hoàn tác.
          </>
        }
        confirmLabel="Xóa tài liệu"
        loading={deleteDocMutation.isPending}
        onConfirm={() => docToDelete && handleDeleteDoc(docToDelete)}
        onCancel={() => !deleteDocMutation.isPending && setDocToDelete(null)}
      />

      {/* Modal Xem trước PDF gốc nổi giữa màn hình */}
      <NutritionPdfPreviewModal
        show={Boolean(activePreviewDoc)}
        doc={activePreviewDoc}
        onHide={() => setPreviewDoc(null)}
      />

      <ServerMessageDialog message={conflict} onClose={() => setConflict(null)} />
    </div>
  );
};

export default AiRagPage;
