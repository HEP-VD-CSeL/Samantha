import { contextBridge, ipcRenderer }  from 'electron'
import os, { platform } from 'os'
import { execSync } from 'child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { type Workspace } from 'src/stores/wpStore'
import utils from 'src/utils'
import ffmpeg from 'fluent-ffmpeg'
import ffprobeStatic from 'ffprobe-static'

async function checkAndDownload(modelsFolderPath: string, files: string[], file: string, url: string) {
  if (!files.includes(file)) {
    ipcRenderer.send('setup-progress', `Downloading ${file}...`)
    await ipcRenderer.invoke('download-models', path.join(modelsFolderPath, file), url)
  }
  else {
    ipcRenderer.send('setup-progress', `${file} already exists, skipping download...`)
  }
}

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
  getVideoFPS(workspace: string, filePath: string): Promise<number | null> {
    ffmpeg.setFfprobePath(`${workspace}/models/ffprobe`)
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) 
          return reject(err)
        // Find the video stream
        const videoStream = metadata.streams.find(s => s.codec_type === 'video')
        if (!videoStream || !videoStream.r_frame_rate) 
          return resolve(null)
        // r_frame_rate is a string like "25/1" or "30000/1001"
        const [num, denom] = videoStream.r_frame_rate.split('/').map(Number)
        if (!num || !denom) 
          return resolve(null)
        resolve(num / denom)
      })
    })
  }
})

// get system information
contextBridge.exposeInMainWorld('sys', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  pickFile: () => ipcRenderer.invoke('pick-file'),
  deleteFolder: async (folderPath: string) => {
    await fs.rm(folderPath, { recursive: true, force: true })
  },
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
    } 
    catch {
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

    // download the following files if they don't exist
    await checkAndDownload(modelsFolderPath, files, 'rt-detr-x.pt', 'https://github.com/ultralytics/assets/releases/download/v8.3.0/rtdetr-x.pt')
    await checkAndDownload(modelsFolderPath, files, 'ffmpeg', 'http://static.grosjean.io/samantha/ffmpeg_osx') 
    await checkAndDownload(modelsFolderPath, files, 'ffprobe', 'http://static.grosjean.io/samantha/ffprobe_osx') 
    


    // download ffmpeg if it doesn't exist

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




