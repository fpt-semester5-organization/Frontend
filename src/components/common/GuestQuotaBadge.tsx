import { useQuery } from '@tanstack/react-query';
import { http } from '../../api/http';
import { useAuthStore } from '../../stores/auth.store';

export const GuestQuotaBadge = () => {
  const user = useAuthStore(s => s.user);
  const { data } = useQuery({
    queryKey: ['guestQuota'],
    queryFn: () => http.get('/guest/quota'),
    enabled: !user || user.role === 'GUEST',
  });

  const remaining = data?.data?.ai?.remaining;
  if (remaining === undefined) return null;

  return (
    <div className="flex items-center space-x-2 bg-yellow-50 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold border border-yellow-200 shadow-sm">
      <span className="flex h-2 w-2 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
      </span>
      <span>AI: {remaining} lượt</span>
    </div>
  );
};
