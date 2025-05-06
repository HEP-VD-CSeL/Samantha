<template>
  <q-layout view="lHh Lpr lFf">

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
      <template v-if="!store.sysOK">
        <SystemRequirements />
      </template>
      <template v-else>
        <WorkSpace v-if="!store.ready" />
      </template>
      
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeMount } from 'vue'
import { type Ref } from 'vue'
import { appStore } from 'stores/appStore'
import SystemRequirements from 'src/components/SystemRequirements.vue'
import WorkSpace from 'src/components/WorkSpace.vue'

const store = appStore()
const drawer: Ref<boolean> = ref(true)



onMounted(() => {
})

</script>
