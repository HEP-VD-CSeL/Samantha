<template>
  <div class="col row items-center justify-center" style="border:1px solid red">
    <div style="min-width:400px;border:1px solid green">
    coucou
    </div>
    <q-footer class="bg-grey-3 text-black">
      <q-toolbar>
        <q-space/>
        <q-btn color="primary" label="Next" />
      </q-toolbar>
    </q-footer>
  </div>
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

const q: QVueGlobals = useQuasar()
const store = appStore()
const wp = wpStore()

//const next: Ref<boolean> = ref(false)


onMounted(async () => {
//  next.value = true
})

</script>
  