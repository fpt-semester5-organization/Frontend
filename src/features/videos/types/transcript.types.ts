export interface TranscriptSegment {
  id: number | string;
  start: number; // Thời gian bắt đầu (giây)
  end: number;   // Thời gian kết thúc (giây)
  text: string;  // Nội dung lời thoại bóc tách
}

export interface VideoTranscriptData {
  videoId?: number;
  recipeId?: number;
  status?: 'PENDING' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'FAILED';
  rawTranscript?: string;
  segments: TranscriptSegment[];
}
