import { app, BrowserWindow, Tray, Menu, ipcMain, Notification, shell, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import Store from 'electron-store';

// Setup logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store();
let mainWindow;
let tray;
let isDev = process.env.VITE_DEV_SERVER_URL !== undefined;

// Basic Deep Linking Setup (Schema: optima://)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('optima', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('optima');
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Deep link handling Windows/Linux
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();

      const deepLink = commandLine.find((arg) => arg.startsWith('optima://'));
      if (deepLink) {
        mainWindow.webContents.send('deep-link', deepLink);
        log.info('Deep link received (second-instance):', deepLink);
      }
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();

    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });
}

async function createWindow() {
  const savedBounds = store.get('windowBounds');

  mainWindow = new BrowserWindow({
    width: savedBounds?.width || 1400,
    height: savedBounds?.height || 900,
    x: savedBounds?.x,
    y: savedBounds?.y,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      scrollBounce: true
    },
    titleBarStyle: 'hiddenInset', // Mac: native traffic lights inset
    // frame: process.platform === 'darwin', // Win/Linux: custom frame? For now stick to default or hiddenInset logic
    // For Windows custom titlebar, we might need 'hidden' and implement HTML drag
    title: 'Optima HR',
    icon: path.join(__dirname, '../public/logo3.png'),
    show: false,
    backgroundColor: '#0a0a0a'
  });

  // Save window state on resize/move
  const saveState = () => {
    if (!mainWindow) return;
    store.set('windowBounds', mainWindow.getBounds());
  };
  mainWindow.on('resize', saveState);
  mainWindow.on('move', saveState);

  // Load app
  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Minimize to tray logic
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Handle external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

function createTray() {
  const trayIconPath = path.join(__dirname, isDev ? '../public/logo3.png' : '../public/logo3.png'); // Prod path might differ if packed differently, but usually safe in resources

  try {
    tray = new Tray(trayIconPath);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Optima HR', enabled: false },
      { type: 'separator' },
      { label: 'Göster', click: () => mainWindow.show() },
      { label: 'Çıkış', click: () => { app.isQuitting = true; app.quit(); } }
    ]);
    tray.setToolTip('Optima HR');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => mainWindow.show());
  } catch (error) {
    log.error('Failed to create tray:', error);
  }
}

// Deep Link Handling (Mac)
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.send('deep-link', url);
  }
  log.info('Deep link received (open-url):', url);
});

// Auto-Updater Events
autoUpdater.on('update-available', () => {
  log.info('Update available');
  mainWindow.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  log.info('Update downloaded');
  mainWindow.webContents.send('update-downloaded');

  // Ask user to restart
  dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Yükle ve Yeniden Başlat', 'Daha Sonra'],
    title: 'Güncelleme Hazır',
    message: 'Yeni bir sürüm indirildi. Şimdi yüklemek ister misiniz?'
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

// IPC Handlers
ipcMain.on('show-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

ipcMain.on('new-message', () => {
  if (process.platform === 'darwin') app.dock.bounce();
  if (process.platform === 'win32' && mainWindow) mainWindow.flashFrame(true);
});

ipcMain.handle('get-app-version', () => app.getVersion());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow.show();
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
