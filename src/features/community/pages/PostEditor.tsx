import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { toApiError } from '@/lib/apiError';
import { applyServerFieldErrors } from '@/lib/formErrors';
import { getErrorMessage, notifyApiError, notifyInfo, notifySuccess } from '@/lib/notify';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { PostForm, type PostFormHelpers, type PostFormSubmission, type PostSubmitIntent } from '../components/PostForm';
import { useCreatePost, useUpdatePost, useUploadPostMedia } from '../hooks/usePostMutations';
import { usePost } from '../hooks/usePosts';
import type { PostFormValues } from '../types/community.schemas';
import type { ModerationStatus, UpdatePostBody } from '../types/community.types';

const EMPTY_FORM: PostFormValues = { title: '', content: '', visibility: 'PUBLIC' };

/** Lỗi tải tệp hiện ngay tại ô chọn tệp: 413 quá dung lượng, 422 sai thời lượng video (SCR-27). */
const isFileError = (error: unknown) => {
  const { status } = toApiError(error);
  return status === 413 || status === 422 || status === 400;
};

/**
 * SCR-27 community/PostEditor — POST/PUT /posts (FN-POST-07) và POST /videos (FN-POST-08).
 * Tệp đính kèm tải lên sau khi có postId vì POST /videos yêu cầu postId.
 */
const PostEditor: React.FC = () => {
  const { id } = useParams();
  const isEdit = id !== undefined;
  const postId = isEdit ? Number(id) : 0;
  const navigate = useNavigate();
  const currentUserId = useAuthStore((state) => state.user?.userId ?? null);
  const post = usePost(postId);
  const createPost = useCreatePost();
  const updatePost = useUpdatePost(postId);
  const uploadMedia = useUploadPostMedia();
  const [submitting, setSubmitting] = useState<PostSubmitIntent | null>(null);

  const finish = (targetId: number, status: ModerationStatus | null, message: string) => {
    if (status === 'DRAFT') {
      notifySuccess(message || 'Đã lưu nháp.');
      navigate(PATHS.ME.CONTENT());
    } else if (status === 'QUARANTINED_HIDDEN' || status === 'PENDING_REVIEW' || status === 'REJECTED') {
      // Kiểm duyệt AI ≥ 85% hoặc bài sửa đang chờ duyệt lại (BR-ADM-CNT-002, BR-USR-REC-01).
      notifyInfo('Bài viết đang chờ kiểm duyệt nên chưa hiển thị công khai.');
      navigate(PATHS.ME.CONTENT());
    } else {
      notifySuccess(message || 'Đã lưu bài viết.');
      navigate(PATHS.COMMUNITY.POST_DETAIL(targetId));
    }
  };

  const handleSubmit = async (
    { values, dirty, file, intent }: PostFormSubmission,
    { setError, setFileError }: PostFormHelpers
  ) => {
    setSubmitting(intent);
    try {
      let targetId = postId;
      let status: ModerationStatus | null = null;
      let message = '';

      if (!isEdit) {
        const res = await createPost.mutateAsync({
          title: values.title,
          content: values.content,
          visibility: values.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
          submit: intent === 'publish',
        });
        ({ postId: targetId, moderationStatus: status } = res.data);
        message = res.message;
      } else {
        // GET /posts/{id} không trả visibility: chỉ gửi field người dùng thực sự sửa.
        const body: UpdatePostBody = {};
        if (dirty.title) body.title = values.title;
        if (dirty.content) body.content = values.content;
        if (dirty.visibility && values.visibility !== 'KEEP') body.visibility = values.visibility;

        if (Object.keys(body).length === 0 && !file) {
          notifyInfo('Bạn chưa thay đổi nội dung nào.');
          return;
        }
        if (Object.keys(body).length > 0) {
          const res = await updatePost.mutateAsync(body);
          status = res.data.moderationStatus;
          message = res.message;
        }
      }

      if (file) {
        try {
          await uploadMedia.mutateAsync({ file, postId: targetId });
        } catch (uploadError) {
          if (isEdit) {
            if (isFileError(uploadError)) setFileError(getErrorMessage(uploadError));
            else notifyApiError(uploadError);
            return;
          }
          // Bài đã được tạo: báo lỗi tệp và chuyển sang trang sửa để thử tải lại.
          notifyInfo(`Bài viết đã được lưu nhưng chưa tải được tệp: ${getErrorMessage(uploadError)}`);
          navigate(PATHS.COMMUNITY.EDIT_POST(targetId), { replace: true });
          return;
        }
      }

      finish(targetId, status, message);
    } catch (error) {
      if (!applyServerFieldErrors(error, setError, ['title', 'content', 'visibility'])) notifyApiError(error);
    } finally {
      setSubmitting(null);
    }
  };

  const header = (
    <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-space-xs py-space-md font-label-md text-label-md text-on-surface-variant">
      <Link to={PATHS.HOME} className="flex items-center gap-1 text-on-surface-variant no-underline hover:text-primary">
        <Icon name="home" className="text-[16px]" />
        Trang chủ
      </Link>
      <span className="text-outline-variant">/</span>
      <Link to={PATHS.COMMUNITY.ROOT} className="text-on-surface-variant no-underline hover:text-primary">
        Cộng đồng
      </Link>
      <span className="text-outline-variant">/</span>
      <h1 className="font-label-md text-label-md text-primary" aria-current="page">
        {isEdit ? 'Sửa bài viết' : 'Viết bài mới'}
      </h1>
    </nav>
  );

  const renderBody = () => {
    if (!isEdit) {
      return (
        <PostForm
          mode="create"
          defaultValues={EMPTY_FORM}
          submittingIntent={submitting}
          onSubmit={handleSubmit}
          cancelTo={PATHS.COMMUNITY.ROOT}
        />
      );
    }
    if (!Number.isInteger(postId) || postId <= 0 || (post.isError && toApiError(post.error).status === 404)) {
      return <EmptyState icon="search_off" title="Không tìm thấy bài viết" description="Bài viết không tồn tại hoặc đã bị xóa." />;
    }
    if (post.isPending) {
      return (
        <div className="grid gap-space-lg lg:grid-cols-12" role="status" aria-busy="true" aria-label="Đang tải bài viết">
          <Skeleton className="h-[420px] lg:col-span-8" />
          <Skeleton className="h-64 lg:col-span-4" />
        </div>
      );
    }
    if (post.isError) {
      return <ErrorState error={post.error} onRetry={() => post.refetch()} retrying={post.isRefetching} />;
    }
    if (post.data.author.userId !== currentUserId) {
      return <EmptyState icon="lock" title="Bạn không thể sửa bài viết này" description="Chỉ tác giả mới được sửa bài viết." />;
    }
    return (
      <PostForm
        mode="edit"
        defaultValues={{ title: post.data.title, content: post.data.content, visibility: 'KEEP' }}
        submittingIntent={submitting}
        onSubmit={handleSubmit}
        cancelTo={PATHS.COMMUNITY.POST_DETAIL(postId)}
      />
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] px-margin-mobile pb-space-xl sm:px-margin">
      {header}
      {renderBody()}
    </div>
  );
};

export default PostEditor;
