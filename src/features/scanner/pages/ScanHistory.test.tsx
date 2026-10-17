import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockApi } from '@/test/mockApi';
import { renderPage } from '@/test/utils';
import ScanHistory from './ScanHistory';

const SCANS = [
  { scanId: 2, barcode: '8934563138165', productName: 'Hảo Hảo tôm chua cay', veganVerdict: 'RED', isAllergenTriggered: true, scannedAt: '2026-10-17T17:03:33Z' },
  { scanId: 1, barcode: '5449000000996', productName: 'Coca-Cola Original', veganVerdict: 'GREEN', isAllergenTriggered: false, scannedAt: '2026-10-17T17:00:00Z' },
];

describe('ScanHistory (SCR-16)', () => {
  it('đọc được dạng Backend hiện trả: data = { items, pageNumber, pageSize, totalItems }', async () => {
    const calls = mockApi((req) =>
      req.url === '/users/me/scans'
        ? { data: { items: SCANS, pageNumber: 1, pageSize: 10, totalItems: 2, totalPages: 1, hasPreviousPage: false, hasNextPage: false } }
        : undefined
    );
    renderPage(<ScanHistory />, { route: '/scanner/history' });
    expect(await screen.findByText('Hảo Hảo tôm chua cay')).toBeInTheDocument();
    expect(screen.getByText('Coca-Cola Original')).toBeInTheDocument();
    expect(calls[0]).toMatchObject({ method: 'GET', url: '/users/me/scans', params: { page: 1 } });
  });

  it('vẫn đọc được dạng OpenAPI: data[] kèm meta', async () => {
    mockApi((req) => (req.url === '/users/me/scans' ? { data: SCANS, meta: { page: 1, size: 10, total: 2 } } : undefined));
    renderPage(<ScanHistory />, { route: '/scanner/history' });
    expect(await screen.findByText('Hảo Hảo tôm chua cay')).toBeInTheDocument();
  });

  it('chưa có lượt quét thì mời quét sản phẩm đầu tiên', async () => {
    mockApi((req) => (req.url === '/users/me/scans' ? { data: { items: [], pageNumber: 1, pageSize: 10, totalItems: 0 } } : undefined));
    renderPage(<ScanHistory />, { route: '/scanner/history' });
    expect(await screen.findByText('Bạn chưa quét sản phẩm nào')).toBeInTheDocument();
  });
});
