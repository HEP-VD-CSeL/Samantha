import { contextBridge, ipcRenderer }  from 'electron'
import os, { platform } from 'os'
import { execSync } from 'child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { type Workspace } from 'src/stores/wpStore'
import utils from 'src/utils'


contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    on: (channel: string, listener: (...args: any[]) => void) =>
      ipcRenderer.on(channel, listener),
    send: (channel: string, ...args: any[]) =>
      ipcRenderer.send(channel, ...args),
  },
})

contextBridge.exposeInMainWorld('workspaceAPI', {
  readWorkspace: (filePath: string) => ipcRenderer.invoke('read-workspace', filePath),
  writeWorkspace: (filePath: string, data: any) => ipcRenderer.invoke('write-workspace', filePath, data),
})

// get system information
contextBridge.exposeInMainWorld('sys', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  pickFile: () => ipcRenderer.invoke('pick-file'),
  createFolder: async (folderPath: string) => {
    try {
      await fs.access(folderPath)
      // If no error, the folder exists
      throw new Error('This project already exists')
    } catch (err: any) {
      // Only create the folder if the error is "not exists"
      if (err && err.code === 'ENOENT') {
        // Folder does not exist, create it
        await fs.mkdir(folderPath, { recursive: true })
      } 
      else
        throw err
    }
  },
  setupWorkspace: async (wpPath: string) => {
    console.log(`setting workdspace at ${wpPath}`)
    ipcRenderer.send('setup-progress', 'Starting workspace setup...')
    
    // make sure path exists
    await fs.mkdir(wpPath, { recursive: true })

    // Check if data.json exists, otherwise create it
    const dataFilePath = path.join(wpPath, 'data.json')
    try {
      await fs.access(dataFilePath)
      ipcRenderer.send('setup-progress', 'Data file already exists, skipping creation...')
    } catch {
      ipcRenderer.send('setup-progress', 'Creating data file...')
      const baseData = {
        projects: [],
        logs: [`${utils.getCurrentDataTime()}: Creating new workspace at ${wpPath}`],
      } as Workspace
      await fs.writeFile(dataFilePath, JSON.stringify(baseData), 'utf-8') // Create an empty JSON file
    }

    // Check if models folder exists, otherwise create it
    const modelsFolderPath = path.join(wpPath, 'models')
    await fs.mkdir(modelsFolderPath, { recursive: true })
    
    // List all files in the models folder
    const files = await fs.readdir(modelsFolderPath)

    // Check if projects folder exists, otherwise create it
    await fs.mkdir(path.join(wpPath, 'projects'), { recursive: true })

    // download rt-detr-x.pt if it doesn't exist
    if (!files.includes('rt-detr-x.pt')) {
      ipcRenderer.send('setup-progress', 'Downloading RT-DETR-X.pt...')
      const url = 'https://github.com/ultralytics/assets/releases/download/v8.3.0/rtdetr-x.pt'
      await ipcRenderer.invoke('download-models', path.join(modelsFolderPath, `rt-detr-x.pt`), url)
    }
    else {
      ipcRenderer.send('setup-progress', 'RT-DETR-X model already exists, skipping download...')
    }

    console.log(`Setup DONE`);
  },
  platform: () => {
    let name;
    switch (os.platform()) {
      case 'win32':
        name = 'Windows'; break;
      case 'darwin':
        name = 'macOS'; break;
      case 'linux':
        name = 'Linux'; break;
      default:
        name = 'Unknown';
    }
    return {
      name,
      version: os.release(),
      arch: os.arch(),
    }
  },
  cpu: () => {
    const cpus = os.cpus();
    return {
      cores: os.cpus().length,
      model: os.cpus()[0]?.model,
      speed: os.cpus()[0]?.speed,
    }
  },
  mem: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
  gpu: () => {
    try {
      const platform = os.platform();
      if (platform === 'win32' || platform === 'linux') {
        // Check for CUDA compatibility and GPU memory using nvidia-smi
        const cudaOutput = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader', { encoding: 'utf-8' });
        const [gpuName, gpuMemory] = cudaOutput.trim().split(',').map((item) => item.trim());
        return { cuda: true, name: gpuName, memory: parseInt(gpuMemory || '0' ) / 1024};
      } 
      else if (platform === 'darwin') {
        // Check for MPS compatibility (Metal) on macOS
        const mpsOutput = execSync('system_profiler SPDisplaysDataType | grep "Metal"', { encoding: 'utf-8' });
        return { mps: mpsOutput.includes('Metal'), name: 'Metal-compatible GPU', memory: 'Not available' };
      }
    } catch (error) {
      return { cuda: false, mps: false, name: 'Unknown', memory: 'Unknown' };
    }
  },

})




