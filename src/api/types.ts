/**
 * Base API Response format returned by VeggieLife .NET Web API
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
  errorCode?: string;
  timestamp?: string;
}

/**
 * Standard pagination result structure
 */
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/**
 * Common API Error structure
 */
export interface ApiError {
  errorCode: string;
  message: string;
  details?: Record<string, string[]>;
}
