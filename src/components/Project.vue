<template>
  <q-page style="width:100%" class="q-pl-xs q-pt-xs q-pr-xs fit column">
    <q-breadcrumbs>
      <q-breadcrumbs-el @click="step = 0" class="cursor-pointer"
        :label="wp.selectedProject?.name ? `${wp.selectedProject.name.slice(0, 10)}${wp.selectedProject.name.length > 10 ? '...' : ''}`: ''"/>      
      
      <q-breadcrumbs-el v-if="step >= 1" @click="step = 1" class="cursor-pointer" label="Components" />
      
    </q-breadcrumbs>
    <div class="col fit column">
      <Step0 v-if="step == 0" class="" />
    </div>
    
  </q-page>
</template>
  
<script setup lang="ts">
//import { app } from 'electron';
import { ref, onMounted, watch } from 'vue'
import { type Ref } from 'vue'
import { appStore } from 'stores/appStore'
import { wpStore } from 'src/stores/wpStore'
import { type Project } from 'src/stores/wpStore'
import utils from 'src/utils'
import { useQuasar, QVueGlobals } from 'quasar'
import Step0 from 'src/components/Step0.vue'

const q: QVueGlobals = useQuasar()
const store = appStore()
const wp = wpStore()

const step: Ref<number> = ref(0)


onMounted(async () => {

})

</script>
  