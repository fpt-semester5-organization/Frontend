/**
 * Hợp đồng DTO phân hệ Chatbot RAG (FN-CHAT-01...06 theo docs/08. OpenAPI Specification.yaml).
 */

export type ContextType = 'NUTRITION_CONSULTATION' | 'MEAL_PLAN_ASSISTANT' | 'EMPTY_FRIDGE';
export type SenderType = 'USER' | 'ASSISTANT';

export interface ChatSession {
  sessionId: number;
  title: string;
  contextType: ContextType | string;
  startedAt: string;
}

export interface ChatSessionItem {
  sessionId: number;
  title: string;
  lastMessagePreview?: string | null;
  updatedAt: string;
}

/** Nguồn RAG: type là RECIPE | POST | VIDEO | NUTRITION_DOC | DICTIONARY... */
export interface ChatSource {
  type: string;
  id: number;
  title: string;
}

export interface RecommendedRecipe {
  recipeId: number;
  title: string;
  cookTimeMinutes?: number | null;
}

export interface ChatMessage {
  messageId: number;
  senderType: SenderType;
  content: string;
  disclaimer?: string | null;
  sources?: ChatSource[];
  ragUsed?: boolean;
  recommendedRecipes?: RecommendedRecipe[];
  createdAt: string;
}

export interface ChatQuota {
  used: number;
  limit: number;
  remaining: number;
  scope?: string;
}

export interface SendResult {
  message: ChatMessage;
  quota?: ChatQuota | null;
}

export interface MessagesPage {
  items: ChatMessage[];
  hasMore: boolean;
  /** Mốc before cho trang cũ hơn (messageId nhỏ nhất của trang hiện tại). */
  oldestId: number | null;
}
