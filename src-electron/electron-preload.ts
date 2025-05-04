import { contextBridge, ipcRenderer }  from 'electron'
import os, { platform } from 'os';
import { execSync } from 'child_process';


// get system information
contextBridge.exposeInMainWorld('sys', {
  platform: () => {
    switch (os.platform()) {
      case 'win32':
        return 'Windows';
      case 'darwin':
        return 'macOS';
      case 'linux':
        return 'Linux';
      default:
        return 'Unknown';
    }
  },
  cpu: () => {
    const cpus = os.cpus();
    const cpu = cpus[0];
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
  streamCpuUsage: () => {
    let previousIdle = 0;
    let previousTotal = 0;
  
    setInterval(() => {
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
  
      // Aggregate idle and total times across all CPU cores
      for (const { times } of cpus) {
        totalIdle += times.idle;
        totalTick += times.user + times.nice + times.sys + times.idle + times.irq;
      }
  
      // Calculate the difference from the previous snapshot
      const idleDifference = totalIdle - previousIdle;
      const totalDifference = totalTick - previousTotal;
  
      // Update the previous values
      previousIdle = totalIdle;
      previousTotal = totalTick;
  
      // Calculate CPU usage as a percentage
      const usage = Math.round((1 - idleDifference / totalDifference) * 100);
  
      // Send CPU usage to the frontend
      ipcRenderer.send('cpu-usage', usage);
    }, 1500); // Every second
  },
  ipcRenderer: {
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => ipcRenderer.on(channel, listener),
    send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  },
})




