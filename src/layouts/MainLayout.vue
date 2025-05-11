<template>
  <q-layout view="lHh Lpr lFf">

    <q-drawer v-model="drawer" show-if-above :mini="true" :breakpoint="0" bordered class="bg-grey-3">
      <div class="column fit" style="overflow: hidden;">
        <q-scroll-area class="col">
          <q-list v-if="store.ready">
            <q-item @click="store.openTab('projects')" :style="store.tab == 'projects' ? `border-left:3px solid #1976D2`:``" :active="store.tab == 'projects'" clickable v-ripple>
              <q-item-section avatar>
                <q-icon name="mdi-file-multiple" />
              </q-item-section>
            </q-item>

            <q-item @click="store.openTab('console')" :style="store.tab == 'console' ? `border-left:3px solid #1976D2`:``" :active="store.tab == 'console'" clickable v-ripple>
              <q-item-section avatar>
                <q-icon name="mdi-console" />
              </q-item-section>
            </q-item>

            <q-separator />
          </q-list>
        </q-scroll-area>

        <q-item clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="mdi-information" />
          </q-item-section> 
        </q-item>
      </div>
    </q-drawer>

    <q-page-container class="fit">

      <q-splitter v-model="store.splitter" 
                  :limits="[0, store.upperLimit]" 
                  separator-class="bg-grey" 
                  :separator-style="store.upperLimit > 0 ? `width: 2px`: `width: 0px`" 
                  class="fit">
        <template v-slot:before>
          <Projects v-if="store.tab == 'projects'" />
          <Logs v-else-if="store.tab == 'console'" />
        </template>
        <template v-slot:after>
          <template v-if="!store.sysOK">
            <SystemRequirements />
          </template>
          <template v-else>
            <WorkSpace v-if="!store.ready" />
            <div v-else>
              <NoProject v-if="wp.selectedProject == null" />
              <Project v-else />
            </div>
          </template>
        </template>
      </q-splitter>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeMount, watch } from 'vue'
import { type Ref } from 'vue'
import { appStore } from 'stores/appStore'
import { wpStore } from 'src/stores/wpStore'
import SystemRequirements from 'src/components/SystemRequirements.vue'
import WorkSpace from 'src/components/WorkSpace.vue'
import Projects from 'src/components/Projects.vue'
import Logs from 'src/components/Logs.vue'
import NoProject from 'src/components/NoProject.vue'
import Project from 'src/components/Project.vue'

const store = appStore()
const wp = wpStore()
const drawer: Ref<boolean> = ref(true)


onMounted(() => {
  //store.appReady()
})

</script>
