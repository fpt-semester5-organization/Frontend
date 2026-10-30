import React, { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/Skeleton';
import { PATHS } from '@/routes/paths';

const PAGE = 'mx-auto flex w-full max-w-[1200px] flex-col gap-space-lg px-margin-mobile py-space-lg sm:px-margin';

/**
 * SCR-21: Chuyển hướng trực tiếp về bài viết Cộng đồng (nơi đã tích hợp trình phát và kịch bản video đồng bộ).
 */
const VideoPlayer: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const postIdParam = Number(searchParams.get('postId'));
  const postId = Number.isInteger(postIdParam) && postIdParam > 0 ? postIdParam : null;
  const navigate = useNavigate();

  // Tự động chuyển hướng về trang bài viết cộng đồng (tích hợp phát video tại chỗ)
  useEffect(() => {
    if (postId) {
      navigate(PATHS.COMMUNITY.POST_DETAIL(postId), { replace: true });
    } else {
      navigate(PATHS.COMMUNITY.ROOT, { replace: true });
    }
  }, [postId, navigate]);

  return (
    <div className={PAGE} role="status" aria-busy="true" aria-label="Đang chuyển hướng về bài viết cộng đồng">
      <Skeleton className="h-10 w-2/3" />
      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        <Skeleton className="aspect-video lg:col-span-7" />
        <Skeleton className="h-[360px] lg:col-span-5" />
      </div>
    </div>
  );
};

export default VideoPlayer;
