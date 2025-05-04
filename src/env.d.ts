declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
  }


}

export declare global {
  interface Window {
    sys: {
      platform: () => string,
      cpu: () => {
        cores: number,
        model: string,
        speed: number
      },
      mem: number,
      gpu: () => { 
        cuda?: boolean, 
        mps?: boolean, 
        name: string,
        memory: number
      },
      streamCpuUsage: () => void,
      ipcRenderer: {
        on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
      };
    };
  }
}