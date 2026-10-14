export const videoKeys = {
  all: ['videos'] as const,
  transcript: (videoId: number) => [...videoKeys.all, 'transcript', videoId] as const,
};
