import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NutritionPdfPreviewModal } from '../components/NutritionPdfPreviewModal';
import type { NutritionDocument } from '../types/admin.types';

const SAMPLE_DOC: NutritionDocument = {
  id: 'DOC_BOOK_1',
  title: 'Becoming Vegan (Comprehensive Edition)',
  author: 'Brenda Davis, RD & Vesanto Melina, MS, RD',
  fileName: 'Becoming_Vegan_Comprehensive_Edition.pdf',
  fileType: 'PDF',
  chunks: 1113,
  isActive: true,
  updatedAt: '2026-10-10T11:01:29Z',
};

describe('NutritionPdfPreviewModal - Tệp PDF gốc trực tiếp', () => {
  it('1. Không hiển thị khi show = false', () => {
    const { container } = render(
      <NutritionPdfPreviewModal show={false} doc={SAMPLE_DOC} onHide={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('2. Hiển thị modal nổi giữa màn hình với tệp PDF gốc trực tiếp, không chứa các tab dư thừa', () => {
    render(<NutritionPdfPreviewModal show={true} doc={SAMPLE_DOC} onHide={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Becoming Vegan (Comprehensive Edition)' })).toBeInTheDocument();

    // Không còn tab Khổ giấy A4 hay Vector Chunks
    expect(screen.queryByRole('button', { name: /Khổ giấy A4/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Vector Chunks/ })).not.toBeInTheDocument();

    // Hiển thị trực tiếp trình đọc PDF gốc
    const iframe = screen.getByTitle('Tệp PDF gốc: Becoming Vegan (Comprehensive Edition)');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', expect.stringContaining('/docs/nutrition/Becoming_Vegan_Comprehensive_Edition.pdf'));

    // Có nút mở toàn màn hình
    expect(screen.getByRole('link', { name: /Mở toàn màn hình/ })).toBeInTheDocument();
  });

  it('3. Bấm nút Đóng gọi callback onHide', async () => {
    const onHide = vi.fn();
    render(<NutritionPdfPreviewModal show={true} doc={SAMPLE_DOC} onHide={onHide} />);

    const closeBtn = screen.getByLabelText('Đóng màn hình xem PDF');
    await userEvent.click(closeBtn);
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('4. Chuyển đổi an toàn Cloudinary URL sang internal API file endpoint khi xem tài liệu tải lên', () => {
    const uploadedDoc: NutritionDocument = {
      id: 'DOC_UPLOAD_1',
      title: 'ACM Template',
      author: 'Author',
      fileName: 'ACM_Template.pdf',
      fileType: 'PDF',
      chunks: 3,
      isActive: true,
      updatedAt: '2026-11-03T18:14:29Z',
      fileUrl: 'https://res.cloudinary.com/swrsuenp/image/upload/v12345/veggielife/documents/ACM_Template.pdf',
    };

    render(<NutritionPdfPreviewModal show={true} doc={uploadedDoc} onHide={vi.fn()} />);

    const iframe = screen.getByTitle('Tệp PDF gốc: ACM Template');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('/api/v1/admin/knowledge/documents/DOC_UPLOAD_1/file'));
    expect(screen.getByRole('link', { name: /Tải về/ })).toBeInTheDocument();
  });
});
