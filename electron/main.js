const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, Notification } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;
let tray;
let trayFlashInterval = null;
let originalTrayIcon = null;
let isFlashing = false;
let unreadCount = 0;

// Auto-updater configuration
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false
  });

  // Load URL
  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startURL);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Check for updates (only in production)
    if (!isDev) {
      checkForUpdates();
    }
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Pencere odaklandiginda flash'i durdur
  mainWindow.on('focus', () => {
    stopTrayFlash();
    mainWindow.webContents.send('window-focused');
  });

  // Pencere odak kaybettiginde
  mainWindow.on('blur', () => {
    mainWindow.webContents.send('window-blurred');
  });

  // Pencere gosterildiginde
  mainWindow.on('show', () => {
    stopTrayFlash();
    mainWindow.webContents.send('window-shown');
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets/tray-icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Optima HR\'ı Göster',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Güncellemeleri Kontrol Et',
      click: () => {
        checkForUpdates(true);
      }
    },
    { type: 'separator' },
    {
      label: 'Çıkış',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Optima HR');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.show();
  });
}

function checkForUpdates(showNoUpdateDialog = false) {
  autoUpdater.checkForUpdates().then((updateCheckResult) => {
    if (!updateCheckResult.updateInfo || updateCheckResult.updateInfo.version === app.getVersion()) {
      if (showNoUpdateDialog) {
        mainWindow.webContents.send('update-not-available');
      }
    }
  }).catch((error) => {
    console.error('Update check failed:', error);
  });
}

// Auto-updater events
autoUpdater.on('update-available', (info) => {
  mainWindow.webContents.send('update-available', {
    version: info.version,
    releaseNotes: info.releaseNotes
  });
});

autoUpdater.on('update-not-available', () => {
  mainWindow.webContents.send('update-not-available');
});

autoUpdater.on('download-progress', (progressObj) => {
  mainWindow.webContents.send('download-progress', {
    percent: progressObj.percent,
    transferred: progressObj.transferred,
    total: progressObj.total
  });
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update-downloaded');
});

// IPC handlers
ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.on('check-for-updates', () => {
  checkForUpdates(true);
});

// ==================== NATIVE NOTIFICATION HANDLERS ====================

// Native Notification goster
ipcMain.handle('show-native-notification', async (event, data) => {
  const { title, body, icon, roomId, silent = false } = data;

  const notification = new Notification({
    title: title || 'Optima HR',
    body: body || '',
    icon: icon || path.join(__dirname, 'assets/icon.png'),
    silent: silent,
  });

  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      if (roomId) {
        mainWindow.webContents.send('navigate-to-room', roomId);
      }
    }
  });

  notification.show();
  return true;
});

// Badge Count (macOS dock badge)
ipcMain.handle('set-badge-count', async (event, count) => {
  unreadCount = count;

  if (process.platform === 'darwin') {
    app.dock.setBadge(count > 0 ? String(count) : '');
  } else if (process.platform === 'win32') {
    if (mainWindow) {
      if (count > 0) {
        mainWindow.setOverlayIcon(null, `${count} okunmamis mesaj`);
      } else {
        mainWindow.setOverlayIcon(null, '');
      }
    }
  }

  if (tray) {
    const tooltip = count > 0
      ? `Optima HR (${count} okunmamis)`
      : 'Optima HR';
    tray.setToolTip(tooltip);
  }

  return true;
});

// Tray Flash (yanip sonen ikon)
ipcMain.handle('flash-tray-icon', async (event, flash) => {
  if (flash && !isFlashing) {
    startTrayFlash();
  } else if (!flash && isFlashing) {
    stopTrayFlash();
  }
  return true;
});

// Flash'i durdur
ipcMain.handle('stop-flashing', async () => {
  stopTrayFlash();
  return true;
});

// Pencere durumu sorgula
ipcMain.handle('get-window-state', async () => {
  if (!mainWindow) return { focused: false, visible: false };
  return {
    focused: mainWindow.isFocused(),
    visible: mainWindow.isVisible(),
    minimized: mainWindow.isMinimized(),
  };
});

// Tray flash baslat
function startTrayFlash() {
  if (isFlashing || !tray) return;

  isFlashing = true;

  const iconPath = path.join(__dirname, 'assets/tray-icon.png');
  originalTrayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

  const alertIconPath = path.join(__dirname, 'assets/tray-icon-alert.png');
  let alertIcon;
  try {
    alertIcon = nativeImage.createFromPath(alertIconPath).resize({ width: 16, height: 16 });
  } catch {
    alertIcon = originalTrayIcon;
  }

  let showAlert = true;

  trayFlashInterval = setInterval(() => {
    if (tray) {
      tray.setImage(showAlert ? alertIcon : originalTrayIcon);
      showAlert = !showAlert;
    }
  }, 500);

  if (process.platform === 'win32' && mainWindow) {
    mainWindow.flashFrame(true);
  }
}

// Tray flash durdur
function stopTrayFlash() {
  if (!isFlashing) return;

  isFlashing = false;

  if (trayFlashInterval) {
    clearInterval(trayFlashInterval);
    trayFlashInterval = null;
  }

  if (tray && originalTrayIcon) {
    tray.setImage(originalTrayIcon);
  }

  if (process.platform === 'win32' && mainWindow) {
    mainWindow.flashFrame(false);
  }
}

// App events
app.on('ready', () => {
  createWindow();
  createTray();
  
  // Set application menu
  if (process.platform === 'darwin') {
    const template = [
      {
        label: app.name,
        submenu: [
          { role: 'about', label: 'Optima HR Hakkında' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide', label: 'Gizle' },
          { role: 'hideOthers', label: 'Diğerlerini Gizle' },
          { role: 'unhide', label: 'Tümünü Göster' },
          { type: 'separator' },
          { role: 'quit', label: 'Çıkış' }
        ]
      },
      {
        label: 'Düzenle',
        submenu: [
          { role: 'undo', label: 'Geri Al' },
          { role: 'redo', label: 'Yinele' },
          { type: 'separator' },
          { role: 'cut', label: 'Kes' },
          { role: 'copy', label: 'Kopyala' },
          { role: 'paste', label: 'Yapıştır' },
          { role: 'selectAll', label: 'Tümünü Seç' }
        ]
      },
      {
        label: 'Görünüm',
        submenu: [
          { role: 'reload', label: 'Yenile' },
          { role: 'forceReload', label: 'Zorla Yenile' },
          { role: 'toggleDevTools', label: 'Geliştirici Araçları' },
          { type: 'separator' },
          { role: 'resetZoom', label: 'Yakınlaştırmayı Sıfırla' },
          { role: 'zoomIn', label: 'Yakınlaştır' },
          { role: 'zoomOut', label: 'Uzaklaştır' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: 'Tam Ekran' }
        ]
      },
      {
        label: 'Pencere',
        submenu: [
          { role: 'minimize', label: 'Simge Durumuna Küçült' },
          { role: 'zoom', label: 'Yakınlaştır' },
          { type: 'separator' },
          { role: 'front', label: 'Tümünü Öne Getir' }
        ]
      }
    ];
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
