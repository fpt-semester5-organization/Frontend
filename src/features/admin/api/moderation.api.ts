import { http } from '@/api/http';
import { apiCall, cleanParams, unwrapPaged } from '../lib/api';
import type {
  AdminUser,
  AdminUserQuery,
  CommentDeleteResult,
  ModerationDecisionBody,
  ModerationDecisionResult,
  ModerationItem,
  ModerationQuery,
  UserContents,
  UserStatusBody,
  UserStatusResult,
} from '../types/admin.types';

/** FN-ADM-04 */
export const listModerationQueue = (q: ModerationQuery) =>
  unwrapPaged<ModerationItem>(http.get('/admin/moderation/queue', { params: cleanParams(q) }));

/** FN-ADM-05 */
export const decideReport = (id: number, body: ModerationDecisionBody) =>
  apiCall<ModerationDecisionResult>(http.put(`/admin/moderation/reports/${id}/decision`, { ...body, applySanction: body.applySanction ?? false }));

/** FN-ADM-06 — `reason` là query param theo openapi.yaml. */
export const deleteComment = (id: number, reason: string) =>
  apiCall<CommentDeleteResult>(http.delete(`/admin/comments/${id}`, { params: { reason } }));

/** FN-ADM-01 */
export const listUsers = (q: AdminUserQuery) => unwrapPaged<AdminUser>(http.get('/admin/users', { params: cleanParams(q) }));

/** FN-ADM-02 */
export const updateUserStatus = (id: number, body: UserStatusBody) =>
  apiCall<UserStatusResult>(http.put(`/admin/users/${id}/status`, cleanParams(body)));

/** FN-ADM-03 — data là object {violationSummary, items} và `meta` nằm ngoài. */
export async function getUserContents(id: number, q: { type?: string; page: number; size: number }) {
  const r = await apiCall<UserContents>(http.get(`/admin/users/${id}/contents`, { params: cleanParams(q) }));
  return {
    violationSummary: r.data?.violationSummary,
    items: r.data?.items ?? [],
    meta: r.meta ?? { page: q.page, size: q.size, total: r.data?.items?.length ?? 0 },
  };
}
