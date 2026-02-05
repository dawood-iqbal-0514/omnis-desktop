import { create } from 'zustand';
import { platformAPI } from '../services/api';

const usePlatformStore = create((set, get) => ({
  selectedPlatform: null,
  connections: [],
  loading: false,
  error: null,

  setSelectedPlatform: (platform) => {
    set({ selectedPlatform: platform });
  },

  fetchUserPlatforms: async () => {
    set({ loading: true, error: null });
    try {
      const response = await platformAPI.getUserPlatforms();
      if (response.success) {
        // Update connections array with all platforms and their statuses
        set({ connections: response.data, loading: false });
        return { success: true, data: response.data };
      }
      throw new Error(response.error || 'Failed to fetch user platforms');
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  saveConnection: async (platform, credentials) => {
    // Don't set global loading - modal has its own isSaving state for input spinner
    set({ error: null });
    try {
      const response = await platformAPI.saveConnection(platform, credentials);
      if (response.success) {
        // Update connections array
        const connections = get().connections;
        const index = connections.findIndex((c) => c.platform === platform);
        if (index >= 0) {
          connections[index] = { ...connections[index], ...response.data };
        } else {
          connections.push(response.data);
        }
        set({ connections });
        return { success: true, data: response.data };
      }
      throw new Error(response.error || 'Failed to save connection');
    } catch (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }
  },

  updateConnectionStatus: async (platform, isConnected, isFirstTimeLogin) => {
    // Don't set global loading - modal has its own loading state
    set({ error: null });
    try {
      const response = await platformAPI.updateConnectionStatus(
        platform,
        isConnected,
        isFirstTimeLogin
      );
      if (response.success) {
        // Update connections array
        const connections = get().connections;
        const index = connections.findIndex((c) => c.platform === platform);
        if (index >= 0) {
          connections[index] = { ...connections[index], ...response.data };
        } else {
          connections.push(response.data);
        }
        set({ connections });
        return { success: true, data: response.data };
      }
      throw new Error(response.error || 'Failed to update connection status');
    } catch (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }
  },

  disconnectPlatform: async (platform) => {
    // Don't set global loading - modal has its own loading state
    set({ error: null });
    try {
      const response = await platformAPI.disconnectPlatform(platform);
      if (response.success) {
        // Update connections array
        const connections = get().connections;
        const index = connections.findIndex((c) => c.platform === platform);
        if (index >= 0) {
          connections[index] = { ...connections[index], ...response.data };
        } else {
          connections.push(response.data);
        }
        set({ connections });
        return { success: true, data: response.data };
      }
      throw new Error(response.error || 'Failed to disconnect platform');
    } catch (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }
  },

  isPlatformConnected: (platform) => {
    const connection = get().connections.find((c) => c.platform === platform?.toLowerCase());
    return connection?.isConnected || false;
  },

  getPlatformConnection: (platform) => {
    return get().connections.find((c) => c.platform === platform?.toLowerCase());
  },
}));

export default usePlatformStore;

