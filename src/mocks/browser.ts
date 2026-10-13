import { setupWorker } from 'msw/browser';
import { authHandlers } from './handlers/auth.handlers';
import { communityHandlers } from './handlers/community.handlers';
import { chatHandlers } from './handlers/chat.handlers';

/** MSW chỉ chạy khi npm run dev và VITE_ENABLE_MOCKS=true (xem src/main.tsx). */
export const worker = setupWorker(...authHandlers, ...communityHandlers, ...chatHandlers);

