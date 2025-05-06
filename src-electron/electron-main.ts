import { app, ipcMain, BrowserWindow, dialog } from 'electron';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url'
import axios from 'axios'
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';


// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

const currentDir = fileURLToPath(new URL('.', import.meta.url));

let mainWindow: BrowserWindow | undefined;

async function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(currentDir, 'icons/icon.png'), // tray icon
    width: 1024,
    height: 768,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(
        currentDir,
        path.join(process.env.QUASAR_ELECTRON_PRELOAD_FOLDER, 'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION)
      ),
    },
  });

  if (process.env.DEV) {
    await mainWindow.loadURL(process.env.APP_URL);
  } else {
    await mainWindow.loadFile('index.html');
  }

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools();
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
}

void app.whenReady().then(createWindow);

ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'], 
  });

  if (result.canceled) {
    return null; 
  }

  return result.filePaths[0]; 
});

ipcMain.on('setup-progress', (event, message) => {
  if (mainWindow) 
    mainWindow.webContents.send('setup-progress', message);
});

ipcMain.handle('download-rt-detr-x', async (_event, dest: string, url: string) => {
  const response = await axios.get(url, { responseType: 'stream' })
  await new Promise<void>((resolve, reject) => {
    const stream = createWriteStream(dest);
    response.data.pipe(stream);
    stream.on('finish', resolve);
    stream.on('error', reject);
  })
  return { success: true }
})

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === undefined) {
    void createWindow();
  }
});

