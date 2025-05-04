<template>
  <q-layout view="lHh Lpr lFf">
    <q-header>
      <q-toolbar >
        <q-breadcrumbs active-color="white">
          <q-breadcrumbs-el label="Home" icon="home" />
          <q-breadcrumbs-el label="Components" icon="widgets" />
          <q-breadcrumbs-el label="Toolbar" />
        </q-breadcrumbs>

        <q-space />
        <div>
          <q-item>
            <q-item-section>
              <q-item-label caption><q-badge :color="getColorBadgeBg(cpu)" text-color="white">cpu {{cpu.toString().padStart(3, ' ')}}%</q-badge></q-item-label>
              <q-item-label caption><q-badge :color="getColorBadgeBg(cpu)" text-color="white">mem {{cpu.toString().padStart(3, ' ')}}%</q-badge></q-item-label>
            </q-item-section>
            <q-item-section>
              <q-item-label caption><q-badge :color="getColorBadgeBg(cpu)" text-color="white">cpu {{cpu.toString().padStart(3, ' ')}}%</q-badge></q-item-label>
              <q-item-label caption><q-badge :color="getColorBadgeBg(cpu)" text-color="white">mem {{cpu.toString().padStart(3, ' ')}}%</q-badge></q-item-label>
            </q-item-section>
          </q-item>
          
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" show-if-above :mini="true" :breakpoint="0" bordered :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-3'">
      <div class="column fit" style="overflow: hidden;">
        <q-scroll-area class="col">
          <q-list padding>
            <q-item clickable v-ripple>
              <q-item-section avatar>
                <q-icon name="mdi-file-multiple" />
              </q-item-section>
            </q-item>

            <q-item clickable v-ripple>
              <q-item-section avatar>
                <q-icon name="mdi-console" />
              </q-item-section>
            </q-item>

            <q-separator />
          </q-list>
        </q-scroll-area>

        <q-item clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="settings" />
          </q-item-section>
        </q-item>
      </div>
    </q-drawer>



    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeMount } from 'vue'
import { type Ref } from 'vue'

const drawer: Ref<boolean> = ref(true)

const cpu: Ref<number> = ref(76)

  function getColorBadgeBg(value: number): string {
  if (value < 50) 
    return 'green-9'
  else if (value < 75)
    return 'deep-orange'
  else 
    return 'red-14'
}

onBeforeMount(() => {

})



onMounted(() => {
  console.log('Platform', window.sys.platform())
  console.log('CPU Cores:', window.sys.cpu())
  console.log('System memory:', window.sys.mem)
  console.log('GPU:', window.sys.gpu()) 

  window.sys.streamCpuUsage();
  window.sys.ipcRenderer.on('cpu-usage-update', (event, usage) => {
    cpu.value = usage;
  });
})

</script>
