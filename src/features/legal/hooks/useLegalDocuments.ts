import { useQuery } from '@tanstack/react-query';
import { getLegalDocuments } from '../api/legal.api';

export const legalKeys = {
  all: ['legal-documents'] as const,
};

export function useLegalDocuments(enabled = true) {
  return useQuery({
    queryKey: legalKeys.all,
    queryFn: getLegalDocuments,
    staleTime: 0, // Luôn coi dữ liệu là mới để kích hoạt refetch rõ ràng trên Network tab
    refetchOnMount: 'always',
    enabled,
  });
}
