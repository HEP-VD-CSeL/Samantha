import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { appStore } from 'stores/appStore'

const store = appStore()

const dataFilePath = `${store.workSpacePath}/data.json`

export type Project = {
  id: string,
  name: string,
  folder: string,
  filePath: string,
  createdAt: string,
}

export type Workspace = {
  logs: Array<string>,
  projects: Array<Project>,
}

export const wpStore = defineStore('wpStore', () => {
  
  const workspace: Ref<Workspace|null> = ref(null)

  async function loadWorkspace() {
    const data = await window.workspaceAPI.readWorkspace(dataFilePath)
    workspace.value = data
  }

  async function persist(){
    await window.workspaceAPI.writeWorkspace(dataFilePath, JSON.stringify(workspace.value))
  }

  return {
    workspace,
    loadWorkspace,
    persist,
  }
})
