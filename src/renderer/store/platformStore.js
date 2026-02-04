import { create } from 'zustand';

const usePlatformStore = create((set) => ({
  selectedPlatform: null,
  setSelectedPlatform: (platform) => {
    set({ selectedPlatform: platform });
  },
  clearSelectedPlatform: () => {
    set({ selectedPlatform: null });
  },
}));

export default usePlatformStore;

