import { create } from 'zustand';

interface GuestState {
  isPromptOpen: boolean;
  openPrompt: () => void;
  closePrompt: () => void;
}

export const useGuestStore = create<GuestState>((set) => ({
  isPromptOpen: false,
  openPrompt: () => set({ isPromptOpen: true }),
  closePrompt: () => set({ isPromptOpen: false }),
}));
