import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/** Chuyển hướng địa chỉ cũ sang địa chỉ mới, giữ nguyên query string (bộ lọc) và gắn hash của phần cần cuộn tới. */
export const RedirectWithSearch: React.FC<{ to: string; hash?: string }> = ({ to, hash }) => {
  const { search } = useLocation();
  return <Navigate to={{ pathname: to, search, hash: hash ? `#${hash}` : '' }} replace />;
};
