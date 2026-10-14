import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { PostVideoAttachment } from '@/features/community/types/community.types';

const Placeholder: React.FC<{ icon: string; title: string; description: string; spinning?: boolean }> = ({
  icon,
  title,
  description,
  spinning,
}) => (
  <div
    role="status"
    className="flex aspect-video w-full flex-col items-center justify-center gap-space-sm bg-inverse-surface px-space-lg text-center text-inverse-on-surface"
  >
    <Icon name={icon} className={spinning ? 'animate-spin text-[40px] opacity-80' : 'text-[40px] opacity-80'} />
    <p className="font-label-lg text-label-lg">{title}</p>
    <p className="max-w-[420px] font-body-sm text-body-sm opacity-80">{description}</p>
  </div>
);

/** Khung phát video theo Videos.Status; video chưa sẵn sàng thì hiện lý do thay vì trình phát trống. */
export const VideoStage: React.FC<{ video: PostVideoAttachment | null }> = ({ video }) => {
  const [playbackFailed, setPlaybackFailed] = useState(false);

  const renderInner = () => {
    if (!video) {
      return (
        <Placeholder
          icon="videocam_off"
          title="Chưa có thông tin video"
          description="Hãy mở video từ bài viết chứa video để xem."
        />
      );
    }
    if (video.status === 'PROCESSING') {
      return (
        <Placeholder
          icon="progress_activity"
          spinning
          title="Video đang được xử lý"
          description="Video vừa tải lên đang được chuẩn bị để phát. Vui lòng quay lại sau ít phút."
        />
      );
    }
    if (video.status === 'FAILED' || !video.videoUrl) {
      return (
        <Placeholder icon="error" title="Không phát được video" description="Video gặp lỗi khi xử lý trên máy chủ." />
      );
    }
    if (playbackFailed) {
      return (
        <Placeholder
          icon="videocam_off"
          title="Không phát được video"
          description="Video không tải được hoặc trình duyệt không hỗ trợ định dạng này. Kiểm tra kết nối mạng rồi tải lại trang."
        />
      );
    }
    return (
      <video
        key={video.videoUrl}
        src={video.videoUrl}
        poster={video.thumbnailUrl}
        controls
        playsInline
        preload="metadata"
        onError={() => setPlaybackFailed(true)}
        className="aspect-video w-full bg-black"
      >
        Trình duyệt của bạn không phát được video này.
      </video>
    );
  };

  return <div className="overflow-hidden rounded-xl bg-inverse-surface shadow-card">{renderInner()}</div>;
};
