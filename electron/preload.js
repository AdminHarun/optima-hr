const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Auto-updater
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  installUpdate: () => ipcRenderer.send('install-update'),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  
  // App info
  getVersion: () => {
    try {
      return require('electron').app?.getVersion() || '1.0.0';
    } catch {
      return '1.0.0';
    }
  },
  getPlatform: () => process.platform,

  // ==================== NATIVE NOTIFICATIONS ====================

  // Native bildirim goster
  showNativeNotification: (data) => ipcRenderer.invoke('show-native-notification', data),

  // Badge count (okunmamis mesaj sayisi)
  setBadgeCount: (count) => ipcRenderer.invoke('set-badge-count', count),

  // Tray flash (yanip sonen ikon)
  flashTrayIcon: (flash) => ipcRenderer.invoke('flash-tray-icon', flash),

  // Flash'i durdur
  stopFlashing: () => ipcRenderer.invoke('stop-flashing'),

  // Pencere durumunu sorgula
  getWindowState: () => ipcRenderer.invoke('get-window-state'),

  // ==================== NAVIGATION ====================

  // Odaya git (bildirim tiklandiginda)
  onNavigateToRoom: (callback) => {
    const handler = (event, roomId) => callback(roomId);
    ipcRenderer.on('navigate-to-room', handler);
    return () => ipcRenderer.removeListener('navigate-to-room', handler);
  },

  // ==================== WINDOW EVENTS ====================

  // Pencere odaklandiginda
  onWindowFocused: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('window-focused', handler);
    return () => ipcRenderer.removeListener('window-focused', handler);
  },

  // Pencere odak kaybettiginde
  onWindowBlurred: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('window-blurred', handler);
    return () => ipcRenderer.removeListener('window-blurred', handler);
  },

  // Pencere gosterildiginde
  onWindowShown: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('window-shown', handler);
    return () => ipcRenderer.removeListener('window-shown', handler);
  },

  // ==================== UTILITY ====================

  // Electron ortaminda mi?
  isElectron: true,
});
