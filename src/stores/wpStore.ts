import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { appStore } from 'stores/appStore'

const store = appStore()

function getWPPath(){
  return `${store.workSpacePath}/data.json`
}

export type Detection = {
  id: number,
  classid: number,
  classname: string, 
  positions: {
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  },
  blur: boolean,
  inpaint:boolean,
}

export type Project = {
  id: string,
  name: string,
  folder: string,
  filePath: string,
  createdAt: string,
  cuts: Array<number> | null,
  classes: Array<number> | null,
  detections: Array<Array<Detection>> | null,
}

export type Workspace = {
  logs: Array<string>,
  projects: Array<Project>,
}

export const wpStore = defineStore('wpStore', () => {
  
  const workspace: Ref<Workspace|null> = ref(null)
  const selectedProject: Ref<Project|null> = ref(null)
  const step: Ref<number> = ref(0)

  async function loadWorkspace() {
    const data = await window.workspaceAPI.readWorkspace(getWPPath())
    workspace.value = data
  }

  async function persist(){
    await window.workspaceAPI.writeWorkspace(getWPPath(), JSON.stringify(workspace.value))
  }

  function selectProjectById(id: string|null) {
    if (id == null) {
      selectedProject.value = null
      return
    }
    if (workspace.value)
      selectedProject.value = workspace.value.projects.find(p => p.id === id) || null

    step.value = 3
  }

  return {
    workspace,
    step,
    selectedProject,
    selectProjectById,
    loadWorkspace,
    persist,
  }
})
