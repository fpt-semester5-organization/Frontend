/**
 * SCR-35 · admin/CommentModeration · `/admin/moderation/comments`
 * Đã hợp nhất vào Hub kiểm duyệt tổng SCR-34 (`/admin/moderation`), mở trực tiếp Tab "Bình luận".
 */
import { AdminModerationQueuePage } from './AdminModerationQueuePage';

export function CommentModerationPage() {
  return <AdminModerationQueuePage initialTab="COMMENT" />;
}
export default CommentModerationPage;
