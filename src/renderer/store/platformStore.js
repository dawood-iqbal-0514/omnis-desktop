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

  fetchUserPlatforms: async (platform = null) => {
    // Only set global loading when fetching ALL platforms (for Dashboard)
    // Don't set loading when fetching a single platform (for modals)
    if (!platform) {
      set({ loading: true, error: null });
    } else {
      set({ error: null });
    }
    try {
      const response = await platformAPI.getUserPlatforms(platform);
      if (response.success) {
        if (platform) {
          // Single platform - update or add to connections array
          // Create new array reference for Zustand reactivity
          const connections = get().connections;
          const index = connections.findIndex((c) => c.platform === platform.toLowerCase());
          let newConnections;
          if (index >= 0) {
            newConnections = [...connections];
            newConnections[index] = response.data;
          } else {
            newConnections = [...connections, response.data];
          }
          set({ connections: newConnections });
          return { success: true, data: response.data };
        } else {
          // All platforms - replace connections array
          set({ connections: response.data, loading: false });
          return { success: true, data: response.data };
        }
      }
      throw new Error(response.error || 'Failed to fetch user platforms');
    } catch (error) {
      if (!platform) {
        set({ error: error.message, loading: false });
      } else {
        set({ error: error.message });
      }
      return { success: false, error: error.message };
    }
  },

  saveConnection: async (platform, credentials) => {
    // Don't set global loading - modal has its own isSaving state for input spinner
    set({ error: null });
    try {
      const response = await platformAPI.saveConnection(platform, credentials);
      if (response.success) {
        // Update connections array - create new array reference for Zustand reactivity
        const connections = get().connections;
        const index = connections.findIndex((c) => c.platform === platform);
        let newConnections;
        if (index >= 0) {
          newConnections = [...connections];
          newConnections[index] = { ...connections[index], ...response.data };
        } else {
          newConnections = [...connections, response.data];
        }
        set({ connections: newConnections });
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
        // Update connections array - create new array reference for Zustand reactivity
        const connections = get().connections;
        const index = connections.findIndex((c) => c.platform === platform);
        let newConnections;
        if (index >= 0) {
          newConnections = [...connections];
          newConnections[index] = { ...connections[index], ...response.data };
        } else {
          newConnections = [...connections, response.data];
        }
        set({ connections: newConnections });
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
        // Update connections array - create new array reference for Zustand reactivity
        const connections = get().connections;
        const index = connections.findIndex((c) => c.platform === platform);
        let newConnections;
        if (index >= 0) {
          newConnections = [...connections];
          newConnections[index] = { ...connections[index], ...response.data };
        } else {
          newConnections = [...connections, response.data];
        }
        set({ connections: newConnections });
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

  getConnectionCredentials: async (platform) => {
    set({ error: null });
    try {
      const response = await platformAPI.getConnectionCredentials(platform);
      if (response.success) {
        // Backend returns: { success: true, data: { credentials: {...} } }
        // Return credentials directly for easier access
        const credentials = response.data?.credentials || response.data;
        return { success: true, data: credentials };
      }
      throw new Error(response.error || 'Failed to fetch connection credentials');
    } catch (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    }
  },
}));

export default usePlatformStore;

