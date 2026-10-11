import { http } from '../../../api/http';
import type { BarcodeScanResponse, UserScanHistory } from '../types/scanner.types';

export interface ApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export const scanBarcodeApi = (barcode: string): Promise<ApiResponse<BarcodeScanResponse>> => {
  return http.get(`/products/barcode/${encodeURIComponent(barcode)}`);
};

export const getMyScansApi = (page = 1, size = 20): Promise<ApiResponse<PagedResult<UserScanHistory>>> => {
  return http.get('/users/me/scans', {
    params: { page, size }
  });
};
