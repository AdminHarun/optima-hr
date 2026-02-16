import { app, BrowserWindow, Tray, Menu, ipcMain, Notification } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let tray;
let isDev = process.env.VITE_DEV_SERVER_URL !== undefined;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    icon: path.join(__dirname, '../public/logo3.png'),
    show: false,
    backgroundColor: '#0a0a0a'
  });

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

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// System Tray
function createTray() {
  const trayIconPath = path.join(__dirname, '../public/logo3.png');

  try {
    tray = new Tray(trayIconPath);

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Optima HR', enabled: false },
      { type: 'separator' },
      { label: 'Goster', click: () => mainWindow.show() },
      { label: 'Bildirimler', type: 'checkbox', checked: true },
      { type: 'separator' },
      {
        label: 'Cikis',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setToolTip('Optima HR');
    tray.setContextMenu(contextMenu);

    // Double-click to show
    tray.on('double-click', () => mainWindow.show());
  } catch (error) {
    console.error('Failed to create tray:', error);
  }
}

// Notification handling from renderer
ipcMain.on('show-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      icon: path.join(__dirname, '../public/logo3.png')
    });

    notification.on('click', () => {
      mainWindow.show();
      mainWindow.focus();
    });

    notification.show();
  }
});

// Flash tray icon for new message
ipcMain.on('new-message', (event, { fromName }) => {
  if (!mainWindow.isFocused()) {
    // Windows: Flash taskbar
    if (process.platform === 'win32') {
      mainWindow.flashFrame(true);
    }

    // macOS: Bounce dock
    if (process.platform === 'darwin') {
      app.dock.bounce('informational');
    }
  }
});

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
