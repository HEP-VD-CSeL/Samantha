<template>
  <q-dialog v-model="newProjectAlert" persistent>
    <q-card style="min-width:350px;">
      <q-card-section>
        <div class="text-h6">Create a new project</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input v-model="newProjectName" 
          lazy-rules 
          label="Project name" 
          filled 
          type="text" 
          :rules="[
            v => !!v || `Mandatory field`,
            v => v.length <= 255 || `Maximum length is 255 characters`,
          ]" />

        <q-btn @click="selectFile" color="primary q-mt-md" label="Select a video file" />

        <p v-if="videoFilePath" class="q-mt-md">File path: {{ videoFilePath }}</p>

      </q-card-section>

      <q-card-actions align="right">
        <q-btn @click="createProject" flat label="Create" color="primary" :disable="!newProjectName.length || newProjectName.length > 255 || videoFilePath == null" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-page style="width:100%" class="">
    <q-list>
      <q-item @click="newProject()" clickable v-ripple>
        <q-item-section>
          <q-item-label>
            <q-icon name="add" /> Create a new project
          </q-item-label>
        </q-item-section>
      </q-item>
    </q-list>

    <q-item-label header>My projects ({{ wp.workspace?.projects.length }})</q-item-label>

    <div v-if="!wp.workspace?.projects.length" class="q-mt-sm text-center">
      <span>You have no projects</span>
    </div>
    <div v-else>
      <q-list separator>
        <q-separator spaced />

        <q-item v-for="(project, index) of wp.workspace?.projects" clickable @click="">
          <q-item-section @click="">
            <q-item-label>{{ project.name }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </div>

  </q-page>
</template>

<script setup lang="ts">
//import { app } from 'electron';
import { ref, onMounted, watch } from 'vue';
import { type Ref } from 'vue';
import { appStore } from 'stores/appStore'
import { wpStore } from 'src/stores/wpStore';
import { type Project } from 'src/stores/wpStore';
import utils from 'src/utils'

const store = appStore()
const wp = wpStore()
const newProjectAlert: Ref<boolean> = ref(false)
const newProjectName: Ref<string> = ref('')
const videoFilePath: Ref<string|null> = ref(null)

function newProject(){
  newProjectAlert.value = true
  newProjectName.value = ''
  videoFilePath.value = null
}

async function createProject(){
  const folder = utils.sanitize(newProjectName.value)

  const project: Project = {
    id: utils.uid(),
    name: newProjectName.value,
    folder: folder,
    filePath: videoFilePath.value || '',
    createdAt: utils.getCurrentDataTime()
  }

  try {
    // try to create the project folder first
    await window.sys.createFolder(`${store.workSpacePath}/projects/${folder}`)
  }
  catch (e) {
    console.error('Error creating project folder:', e)
    return
  }
  
  wp.workspace?.projects.unshift(project)
  wp.persist()

  newProjectAlert.value = false
}

async function selectFile() {
  const filePath = await window.sys.pickFile()
  if (filePath) {
    console.log('Selected file:', filePath)
    videoFilePath.value = filePath
  }
  else {
    console.log('No file selected')
    videoFilePath.value = null
  }
}

onMounted(async () => {

});

</script>
  