import { create } from 'zustand';
import type { DetectionQuota, DetectionResult, DetectedItem } from '../types/fridge.types';

interface FridgeScanState {
  previewUrl: string | null;
  selectedFileName: string | null;
  detectionResult: DetectionResult | null;
  detectedItems: DetectedItem[];
  isSavedToFridge: boolean;
  deletedInventoryIds: number[];
  showBoundingBoxes: boolean;
  memberQuota: DetectionQuota | null;
  hoveredIndex: number | null;
  hasUserReset: boolean;

  setScanData: (data: {
    previewUrl: string;
    selectedFileName?: string | null;
    detectionResult: DetectionResult;
    detectedItems: DetectedItem[];
    isSavedToFridge?: boolean;
    memberQuota?: DetectionQuota | null;
  }) => void;

  setDetectedItems: (items: DetectedItem[]) => void;
  updateDetectedItem: (index: number, updatedItem: DetectedItem) => void;
  removeDetectedItem: (index: number) => void;
  setIsSavedToFridge: (saved: boolean) => void;
  setShowBoundingBoxes: (show: boolean | ((prev: boolean) => boolean)) => void;
  setHoveredIndex: (idx: number | null) => void;
  clearDeletedInventoryIds: () => void;
  resetScan: () => void;
}

export const useFridgeScanStore = create<FridgeScanState>((set) => ({
  previewUrl: null,
  selectedFileName: null,
  detectionResult: null,
  detectedItems: [],
  isSavedToFridge: false,
  deletedInventoryIds: [],
  showBoundingBoxes: true,
  memberQuota: null,
  hoveredIndex: null,
  hasUserReset: false,

  setScanData: ({
    previewUrl,
    selectedFileName = null,
    detectionResult,
    detectedItems,
    isSavedToFridge = false,
    memberQuota = null,
  }) =>
    set({
      previewUrl,
      selectedFileName,
      detectionResult,
      detectedItems,
      isSavedToFridge,
      deletedInventoryIds: [],
      memberQuota,
      hoveredIndex: null,
      hasUserReset: false,
    }),

  setDetectedItems: (items) => set({ detectedItems: items }),

  updateDetectedItem: (index, updatedItem) =>
    set((state) => {
      const next = [...state.detectedItems];
      if (index >= 0 && index < next.length) {
        next[index] = updatedItem;
      }
      return { detectedItems: next };
    }),

  removeDetectedItem: (index) =>
    set((state) => {
      const item = state.detectedItems[index];
      const next = state.detectedItems.filter((_, i) => i !== index);
      const nextDeletedIds =
        item?.inventoryId != null
          ? [...state.deletedInventoryIds, item.inventoryId]
          : state.deletedInventoryIds;
      return {
        detectedItems: next,
        deletedInventoryIds: nextDeletedIds,
        hoveredIndex: null,
      };
    }),

  setIsSavedToFridge: (saved) => set({ isSavedToFridge: saved }),

  setShowBoundingBoxes: (show) =>
    set((state) => ({
      showBoundingBoxes:
        typeof show === 'function' ? show(state.showBoundingBoxes) : show,
    })),

  setHoveredIndex: (idx) => set({ hoveredIndex: idx }),

  clearDeletedInventoryIds: () => set({ deletedInventoryIds: [] }),

  resetScan: () =>
    set({
      previewUrl: null,
      selectedFileName: null,
      detectionResult: null,
      detectedItems: [],
      isSavedToFridge: false,
      deletedInventoryIds: [],
      hoveredIndex: null,
      hasUserReset: true,
    }),
}));

