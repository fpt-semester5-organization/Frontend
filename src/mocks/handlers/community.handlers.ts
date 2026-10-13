import { http } from 'msw';
import {
  comments,
  lastCommentAt,
  nextId,
  posts,
  reports,
  users,
  votes,
  type MockComment,
  type MockPost,
  type MockUser,
} from '../db';
import { api, currentUser, fail, isFlaggedByAi, isPositiveInt, latency, ok, unauthorized, validationError } from '../utils';

// Mô phỏng luồng xử lý của FN-POST-05/06/07/08 và FN-COMM-01..05 (docs/09. Task Cards).

const notFound = () => fail(404, 'ERR_CONTENT_NOT_FOUND', 'Nội dung không tồn tại hoặc chưa được hiển thị.');
const notOwner = () => fail(403, 'ERR_CONTENT_NOT_OWNER', 'Bạn không phải tác giả của nội dung này.');

const authorName = (userId: number) => users.find((user) => user.userId === userId)?.fullName ?? 'Thành viên';
const voteCount = (post: MockPost) =>
  post.baseVotes + [...votes].filter((key) => key.endsWith(`:${post.postId}`)).length;
const isVisibleComment = (comment: MockComment) => comment.status === 'ACTIVE' && !comment.isSoftDeleted;
const commentCount = (postId: number) =>
  comments.filter((comment) => comment.postId === postId && isVisibleComment(comment)).length;

/** Bài xem được: APPROVED_ACTIVE + PUBLIC, hoặc bài (chưa xóa) của chính người xem (FN-POST-06). */
const canView = (post: MockPost, me: MockUser | null) =>
  post.status !== 'DELETED' &&
  ((post.status === 'APPROVED_ACTIVE' && post.visibility === 'PUBLIC') || me?.userId === post.authorId);

const toListItem = (post: MockPost) => ({
  postId: post.postId,
  title: post.title,
  authorName: authorName(post.authorId),
  imageUrl: post.imageUrl,
  voteCount: voteCount(post),
  commentCount: commentCount(post.postId),
  createdAt: post.createdAt,
});

type CommentDto = {
  commentId: number;
  author: { userId: number; fullName: string };
  content: string;
  parentCommentId: number | null;
  status: string;
  createdAt: string;
  replies: CommentDto[];
};

const toCommentDto = (comment: MockComment, withReplies = true): CommentDto => ({
  commentId: comment.commentId,
  author: { userId: comment.authorId, fullName: authorName(comment.authorId) },
  content: comment.content,
  parentCommentId: comment.parentCommentId,
  status: comment.status,
  createdAt: comment.createdAt,
  replies: withReplies
    ? comments
        .filter((child) => child.parentCommentId === comment.commentId && isVisibleComment(child))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((child) => toCommentDto(child))
    : [],
});

const findPost = (id: string | readonly string[] | undefined) => posts.find((post) => post.postId === Number(id));

const validatePostFields = (body: { title?: unknown; content?: unknown; visibility?: unknown }, partial: boolean) => {
  const details: { field: string; message: string }[] = [];
  if (!partial || body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (title.length < 10 || title.length > 150) details.push({ field: 'title', message: 'Tiêu đề cần 10–150 ký tự.' });
  }
  if (!partial || body.content !== undefined) {
    if (typeof body.content !== 'string' || body.content.trim() === '') {
      details.push({ field: 'content', message: 'Nội dung không được để trống.' });
    }
  }
  return details;
};

export const communityHandlers = [
  // GET /posts — FN-POST-05
  http.get(api('/posts'), async ({ request }) => {
    await latency();
    const me = currentUser(request);
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword')?.trim() ?? '';
    const authorId = url.searchParams.get('authorId');
    const sort = url.searchParams.get('sort') ?? 'NEWEST';
    const page = Number(url.searchParams.get('page') ?? 1);
    const size = Number(url.searchParams.get('size') ?? 10);

    const details: { field: string; message: string }[] = [];
    if (keyword.length > 100) details.push({ field: 'keyword', message: 'Từ khóa tối đa 100 ký tự.' });
    if (!isPositiveInt(page)) details.push({ field: 'page', message: 'page phải ≥ 1.' });
    if (!isPositiveInt(size) || size > 20) details.push({ field: 'size', message: 'size trong khoảng 1–20.' });
    if (authorId !== null && !isPositiveInt(Number(authorId))) details.push({ field: 'authorId', message: 'authorId phải > 0.' });
    if (details.length) return validationError(details);

    const ownList = me !== null && Number(authorId) === me.userId;
    let list = posts.filter((post) =>
      ownList
        ? post.authorId === me.userId && post.status !== 'DELETED'
        : post.status === 'APPROVED_ACTIVE' && (post.visibility === 'PUBLIC' || post.authorId === me?.userId)
    );
    if (authorId !== null) list = list.filter((post) => post.authorId === Number(authorId));
    if (keyword) {
      const lower = keyword.toLowerCase();
      list = list.filter((post) => `${post.title} ${post.content}`.toLowerCase().includes(lower));
    }
    list.sort((a, b) =>
      sort === 'POPULAR' ? voteCount(b) - voteCount(a) : b.createdAt.localeCompare(a.createdAt)
    );

    const items = list.slice((page - 1) * size, page * size).map(toListItem);
    return ok(items, 'OK', 200, { page, size, total: list.length });
  }),

  // GET /posts/{id} — FN-POST-06
  http.get(api('/posts/:id'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    const post = findPost(params.id);
    if (!post || !canView(post, me)) return notFound();
    const interactive = me !== null && post.status === 'APPROVED_ACTIVE';
    return ok({
      postId: post.postId,
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl,
      author: { userId: post.authorId, fullName: authorName(post.authorId) },
      videos: post.videos,
      recipes: post.recipes,
      voteCount: voteCount(post),
      commentCount: commentCount(post.postId),
      memberActions: { canVote: interactive, canComment: interactive },
    });
  }),

  // POST /posts — FN-POST-07
  http.post(api('/posts'), async ({ request }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const body = (await request.json()) as {
      title?: string;
      content?: string;
      visibility?: string;
      submit?: boolean;
    };
    if (body.visibility === 'FOLLOWERS') {
      return fail(400, 'ERR_POST_VISIBILITY_UNSUPPORTED', 'Chế độ hiển thị FOLLOWERS chưa được hỗ trợ.');
    }
    const details = validatePostFields(body, false);
    if (details.length) return validationError(details);

    if (body.submit) {
      // BR-USR-04: tài khoản < 3 ngày tối đa 2 bài/ngày, còn lại 10 bài/ngày (không tính DRAFT).
      const today = new Date().toDateString();
      const postedToday = posts.filter(
        (post) => post.authorId === me.userId && post.status !== 'DRAFT' && new Date(post.createdAt).toDateString() === today
      ).length;
      const accountAgeDays = (Date.now() - new Date(me.createdAt).getTime()) / 86_400_000;
      if (postedToday >= (accountAgeDays < 3 ? 2 : 10)) {
        return fail(429, 'ERR_POST_DAILY_LIMIT_EXCEEDED', 'Bạn đã đạt giới hạn số bài đăng trong ngày.');
      }
    }

    const status = !body.submit
      ? 'DRAFT'
      : isFlaggedByAi(`${body.title} ${body.content}`)
        ? 'QUARANTINED_HIDDEN'
        : 'APPROVED_ACTIVE';
    const post: MockPost = {
      postId: nextId('post'),
      authorId: me.userId,
      title: body.title!.trim(),
      content: body.content!.trim(),
      imageUrl: null,
      visibility: body.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
      status,
      baseVotes: 0,
      createdAt: new Date().toISOString(),
      videos: [],
      recipes: [],
    };
    posts.unshift(post);
    return ok(
      { postId: post.postId, moderationStatus: status },
      status === 'DRAFT' ? 'Đã lưu nháp.' : 'Đã đăng bài.',
      201
    );
  }),

  // PUT /posts/{id} — FN-POST-07
  http.put(api('/posts/:id'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const post = findPost(params.id);
    if (!post || post.status === 'DELETED') return notFound();
    if (post.authorId !== me.userId) return notOwner();

    const body = (await request.json()) as { title?: string; content?: string; visibility?: string };
    if (body.visibility === 'FOLLOWERS') {
      return fail(400, 'ERR_POST_VISIBILITY_UNSUPPORTED', 'Chế độ hiển thị FOLLOWERS chưa được hỗ trợ.');
    }
    const details = validatePostFields(body, true);
    if (details.length) return validationError(details);

    if (body.title !== undefined) post.title = body.title.trim();
    if (body.content !== undefined) post.content = body.content.trim();
    if (body.visibility === 'PUBLIC' || body.visibility === 'PRIVATE') post.visibility = body.visibility;
    // Sửa nội dung bài đã gửi đăng thì AI quét lại (tương tự BR-USR-REC-01).
    if (post.status !== 'DRAFT' && (body.title !== undefined || body.content !== undefined)) {
      post.status = isFlaggedByAi(`${post.title} ${post.content}`) ? 'QUARANTINED_HIDDEN' : 'APPROVED_ACTIVE';
    }
    return ok({ postId: post.postId, moderationStatus: post.status }, 'Đã cập nhật.');
  }),

  // DELETE /posts/{id} — FN-POST-07
  http.delete(api('/posts/:id'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const post = findPost(params.id);
    if (!post || post.status === 'DELETED') return notFound();
    if (post.authorId !== me.userId) return notOwner();
    post.status = 'DELETED';
    return ok(null, 'Đã xóa bài viết.');
  }),

  // POST /videos — FN-POST-08 (ảnh/video gắn vào bài viết)
  http.post(api('/videos'), async ({ request }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const form = await request.formData();
    const file = form.get('file');
    const post = findPost(String(form.get('postId') ?? ''));
    if (!(file instanceof File)) return validationError([{ field: 'file', message: 'Vui lòng chọn tệp.' }]);
    if (!post || post.status === 'DELETED') return notFound();
    if (post.authorId !== me.userId) return notOwner();

    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    const isVideo = ['video/mp4', 'video/quicktime'].includes(file.type) || /\.(mp4|mov)$/i.test(file.name);
    if (!isImage && !isVideo) {
      return validationError([{ field: 'file', message: 'Chỉ nhận ảnh JPG, PNG, WEBP hoặc video MP4, MOV.' }]);
    }
    if ((isImage && file.size > 5 * 1024 * 1024) || (isVideo && file.size > 100 * 1024 * 1024)) {
      return fail(413, 'ERR_MEDIA_FILE_TOO_LARGE', isImage ? 'Ảnh vượt quá 5 MB.' : 'Video vượt quá 100 MB.');
    }

    const videoId = nextId('video');
    const url = URL.createObjectURL(file);
    if (isImage) {
      post.imageUrl = url;
      return ok({ videoId, status: 'READY' }, 'Đã tải ảnh lên.', 202);
    }
    const video = { videoId, videoUrl: url, status: 'PROCESSING' as const, title: file.name };
    post.videos.push(video);
    // Mô phỏng xử lý ngầm: PROCESSING → READY sau vài giây.
    setTimeout(() => {
      const stored = post.videos.find((item) => item.videoId === videoId);
      if (stored) stored.status = 'READY';
    }, 8000);
    return ok({ videoId, status: 'PROCESSING' }, 'Đã nhận video, đang xử lý.', 202);
  }),

  // GET /posts/{id}/comments — FN-COMM-01
  http.get(api('/posts/:id/comments'), async ({ request, params }) => {
    await latency();
    const post = findPost(params.id);
    if (!post || !canView(post, currentUser(request))) return notFound();
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const size = Number(url.searchParams.get('size') ?? 20);
    if (!isPositiveInt(page) || !isPositiveInt(size) || size > 50) {
      return validationError([{ field: 'size', message: 'page ≥ 1, size trong khoảng 1–50.' }]);
    }
    const roots = comments
      .filter((comment) => comment.postId === post.postId && comment.parentCommentId === null && isVisibleComment(comment))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const items = roots.slice((page - 1) * size, page * size).map((comment) => toCommentDto(comment));
    return ok(items, 'OK', 200, { page, size, total: roots.length });
  }),

  // POST /posts/{id}/comments — FN-COMM-02
  http.post(api('/posts/:id/comments'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const post = findPost(params.id);
    if (!post || post.status !== 'APPROVED_ACTIVE' || !canView(post, me)) return notFound();

    const body = (await request.json()) as { content?: string; parentCommentId?: number | null };
    const content = body.content?.trim() ?? '';
    if (content.length < 2 || content.length > 500) {
      return validationError([{ field: 'content', message: 'Bình luận cần 2–500 ký tự.' }]);
    }
    if (body.parentCommentId != null) {
      const parent = comments.find((comment) => comment.commentId === body.parentCommentId);
      if (!parent || parent.postId !== post.postId || !isVisibleComment(parent)) {
        return validationError([{ field: 'parentCommentId', message: 'Bình luận cha không thuộc bài viết này.' }]);
      }
    }
    const last = lastCommentAt.get(me.userId);
    if (last && Date.now() - last < 15_000) {
      return fail(429, 'ERR_COMMENT_TOO_FAST', 'Vui lòng chờ 15 giây giữa 2 bình luận.');
    }
    const duplicates = comments.filter(
      (comment) => comment.postId === post.postId && comment.authorId === me.userId && comment.content === content
    ).length;
    if (duplicates >= 5) {
      return fail(429, 'ERR_COMMENT_DUPLICATE_LIMIT', 'Bạn đã gửi quá 5 bình luận trùng nội dung trong bài này.');
    }

    const comment: MockComment = {
      commentId: nextId('comment'),
      postId: post.postId,
      authorId: me.userId,
      parentCommentId: body.parentCommentId ?? null,
      content,
      status: isFlaggedByAi(content) ? 'QUARANTINED_HIDDEN' : 'ACTIVE',
      isSoftDeleted: false,
      createdAt: new Date().toISOString(),
    };
    comments.push(comment);
    lastCommentAt.set(me.userId, Date.now());
    return ok(toCommentDto(comment, false), 'Đã bình luận.', 201);
  }),

  // PUT /comments/{id} — FN-COMM-03
  http.put(api('/comments/:id'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const comment = comments.find((item) => item.commentId === Number(params.id));
    if (!comment || !isVisibleComment(comment)) return notFound();
    if (comment.authorId !== me.userId) return notOwner();
    const body = (await request.json()) as { content?: string };
    const content = body.content?.trim() ?? '';
    if (content.length < 2 || content.length > 500) {
      return validationError([{ field: 'content', message: 'Bình luận cần 2–500 ký tự.' }]);
    }
    comment.content = content;
    if (isFlaggedByAi(content)) comment.status = 'QUARANTINED_HIDDEN';
    return ok(toCommentDto(comment), 'Đã cập nhật.');
  }),

  // DELETE /comments/{id} — FN-COMM-03 (Cascade Soft-Delete, BR-ADM-CMT-001)
  http.delete(api('/comments/:id'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const comment = comments.find((item) => item.commentId === Number(params.id));
    if (!comment || comment.isSoftDeleted) return notFound();
    if (comment.authorId !== me.userId) return notOwner();

    let hiddenReplies = 0;
    const hideChildren = (parentId: number) => {
      for (const child of comments.filter((item) => item.parentCommentId === parentId && !item.isSoftDeleted)) {
        child.isSoftDeleted = true;
        hiddenReplies++;
        hideChildren(child.commentId);
      }
    };
    comment.isSoftDeleted = true;
    hideChildren(comment.commentId);
    return ok({ hiddenReplies }, 'Đã xóa bình luận.');
  }),

  // POST /posts/{id}/votes — FN-COMM-04 (BR-INT-LIKE-01: bấm lần hai là bỏ tim)
  http.post(api('/posts/:id/votes'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const post = findPost(params.id);
    if (!post || post.status !== 'APPROVED_ACTIVE' || !canView(post, me)) return notFound();
    const key = `${me.userId}:${post.postId}`;
    const voted = !votes.has(key);
    if (voted) votes.add(key);
    else votes.delete(key);
    return ok({ voted, voteCount: voteCount(post) });
  }),

  // POST /reports — FN-COMM-05 (BR-INT-REPORT-01: ẩn ngay nội dung bị báo cáo)
  http.post(api('/reports'), async ({ request }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const body = (await request.json()) as {
      targetType?: string;
      targetId?: number;
      violationType?: string;
      evidenceSummary?: string;
    };
    const details: { field: string; message: string }[] = [];
    if (!['POST', 'RECIPE', 'VIDEO', 'COMMENT'].includes(body.targetType ?? '')) {
      details.push({ field: 'targetType', message: 'Loại nội dung không hợp lệ.' });
    }
    if (!isPositiveInt(body.targetId)) details.push({ field: 'targetId', message: 'targetId phải > 0.' });
    if (!['VIO_MEAT', 'VIO_LABEL', 'VIO_HATE', 'VIO_SPAM'].includes(body.violationType ?? '')) {
      details.push({ field: 'violationType', message: 'Vui lòng chọn loại vi phạm.' });
    }
    const evidence = body.evidenceSummary?.trim() ?? '';
    if (evidence.length < 10 || evidence.length > 500) {
      details.push({ field: 'evidenceSummary', message: 'Mô tả cần 10–500 ký tự.' });
    }
    if (details.length) return validationError(details);

    const today = new Date().toDateString();
    if (reports.filter((r) => r.reporterId === me.userId && new Date(r.createdAt).toDateString() === today).length >= 10) {
      return fail(429, 'ERR_REPORT_DAILY_LIMIT', 'Bạn đã gửi tối đa 10 báo cáo trong hôm nay.');
    }
    if (reports.some((r) => r.reporterId === me.userId && r.targetType === body.targetType && r.targetId === body.targetId)) {
      return fail(409, 'ERR_REPORT_DUPLICATE', 'Bạn đã báo cáo nội dung này.');
    }

    if (body.targetType === 'COMMENT') {
      const comment = comments.find((item) => item.commentId === body.targetId);
      if (!comment || !isVisibleComment(comment)) return notFound();
      comment.status = 'QUARANTINED_HIDDEN';
    } else if (body.targetType === 'POST') {
      const post = findPost(String(body.targetId));
      if (!post || !canView(post, me)) return notFound();
      post.status = 'QUARANTINED_HIDDEN';
    } else {
      return notFound();
    }

    const report = {
      reportId: nextId('report'),
      reporterId: me.userId,
      targetType: body.targetType as 'POST' | 'COMMENT',
      targetId: body.targetId!,
      createdAt: new Date().toISOString(),
    };
    reports.push(report);
    return ok(
      { reportId: report.reportId, status: 'PENDING' },
      'Đã ghi nhận báo cáo. Nội dung đã được ẩn chờ Admin xử lý.',
      201
    );
  }),
];
