import { http } from 'msw';
import { posts, transcripts, type MockTranscript } from '../db';
import { api, currentUser, fail, isPositiveInt, latency, ok, unauthorized, validationError } from '../utils';
import { canView } from './community.handlers';

// Mô phỏng FN-POST-09 / FN-POST-10 (docs/09. Task Cards) cùng các điểm đã thống nhất ngày 13/10/2026:
// - tác giả xem được video của mình ở mọi trạng thái bài viết trừ DELETED (câu 5, dùng chung canView);
// - tác giả nhận 200 kèm transcriptStatus (PENDING / FAILED / COMPLETED), người khác nhận 404 khi chưa xong;
// - người xem khác chỉ thấy extractedRecipe khi công thức đã được duyệt (câu 6);
// - Khách mở lại cùng video không bị trừ thêm lượt (câu 7).

const GUEST_AI_LIMIT = 3;
/** Hạn mức AI của Khách trong phiên mock (Redis guest_quota:{guestId}:ai ở bản thật). */
const guestAi = { used: 0, videoIds: new Set<number>() };

/** Bóc tách lại mất 20 giây trong mock. */
const RETRY_DURATION_MS = 20 * 1000;

const findVideo = (videoId: number) => {
  for (const post of posts) {
    const video = post.videos.find((item) => item.videoId === videoId);
    if (video) return { post, video };
  }
  return null;
};

/** PENDING tới hạn thì coi như worker đã chạy xong. */
const resolve = (transcript: MockTranscript) => {
  if (transcript.status === 'PENDING' && transcript.readyAt !== undefined && transcript.readyAt <= Date.now()) {
    transcript.status = 'COMPLETED';
    transcript.readyAt = undefined;
  }
  return transcript;
};

const notFound = () => fail(404, 'ERR_CONTENT_NOT_FOUND', 'Nội dung không tồn tại hoặc chưa được hiển thị.');
const notReady = () => fail(404, 'ERR_TRANSCRIPT_NOT_READY', 'Video này chưa có bản phiên âm.');

export const videosHandlers = [
  // GET /videos/{id}/transcript — FN-POST-09
  http.get(api('/videos/:id/transcript'), async ({ request, params }) => {
    await latency();
    const videoId = Number(params.id);
    if (!isPositiveInt(videoId)) return validationError([{ field: 'id', message: 'Mã video không hợp lệ.' }]);

    const me = currentUser(request);
    const found = findVideo(videoId);
    if (!found || found.video.status === 'BANNED' || !canView(found.post, me)) return notFound();

    const isAuthor = me?.userId === found.post.authorId;
    const stored = transcripts.find((item) => item.videoId === videoId);
    const transcript = stored ? resolve(stored) : null;

    if (!transcript || transcript.status !== 'COMPLETED') {
      // Chưa xong thì không trừ lượt. Tác giả được biết trạng thái cụ thể.
      if (isAuthor && transcript) {
        return ok({ videoId, transcriptStatus: transcript.status, rawTranscript: null, extractedRecipe: null });
      }
      return notReady();
    }

    let quota: { used: number; limit: number; remaining: number } | undefined;
    if (!me) {
      if (!guestAi.videoIds.has(videoId)) {
        if (guestAi.used >= GUEST_AI_LIMIT) {
          return fail(403, 'ERR_QUOTA_AI_EXCEEDED', 'Bạn đã dùng hết 03 lượt AI dùng thử. Đăng ký để dùng không giới hạn.');
        }
        guestAi.used += 1;
        guestAi.videoIds.add(videoId);
      }
      quota = { used: guestAi.used, limit: GUEST_AI_LIMIT, remaining: GUEST_AI_LIMIT - guestAi.used };
    }

    return ok({
      videoId,
      transcriptStatus: 'COMPLETED',
      rawTranscript: transcript.rawTranscript,
      extractedRecipe: isAuthor || transcript.recipeApproved ? transcript.extractedRecipe : null,
      ...(quota ? { quota } : {}),
    });
  }),

  // POST /videos/{id}/extract-recipe — FN-POST-10 (tác giả chạy lại khi lần đầu thất bại)
  http.post(api('/videos/:id/extract-recipe'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const videoId = Number(params.id);
    const found = findVideo(videoId);
    if (!found || found.post.status === 'DELETED') return notFound();
    if (found.post.authorId !== me.userId) return fail(403, 'ERR_CONTENT_NOT_OWNER', 'Bạn không phải tác giả của video này.');

    const { durationSeconds } = found.video;
    if (durationSeconds !== undefined && (durationSeconds < 10 || durationSeconds > 300)) {
      return fail(422, 'ERR_STT_DURATION_INVALID', 'Video phải dài từ 10 giây đến 5 phút.');
    }

    const transcript = transcripts.find((item) => item.videoId === videoId);
    if (transcript && resolve(transcript).status === 'COMPLETED') {
      return fail(409, 'ERR_STT_ALREADY_DONE', 'Video đã có bản phiên âm, không cần bóc tách lại.');
    }
    if (transcript?.circuitOpenTimes) {
      transcript.circuitOpenTimes -= 1;
      return fail(503, 'ERR_AI_CIRCUIT_OPEN', 'Dịch vụ AI tạm gián đoạn, vui lòng thử lại sau ít phút.');
    }
    if (transcript && transcript.status === 'FAILED') {
      transcript.status = 'PENDING';
      transcript.readyAt = Date.now() + RETRY_DURATION_MS;
    }
    return ok({ videoId, transcriptStatus: 'PENDING' }, 'Đang bóc tách công thức từ video.', 202);
  }),
];
