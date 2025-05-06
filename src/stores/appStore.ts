import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Ref } from 'vue'

export const appStore = defineStore('appStore', () => {
  const ready: Ref<boolean> = ref(false)
  
  const sysOK: Ref<boolean> = ref(false)

  // '/Users/marcel/Desktop/samantha'
  const workSpacePath: Ref<string|null> = ref(null)

  const splitter: Ref<number> = ref(0)
  const upperLimit: Ref<number> = ref(0)

  function appReady(){
    console.log('appReady')
    ready.value = true
    splitter.value = 40
    upperLimit.value = 100
  }

  return {
    appReady,
    ready,
    sysOK,
    workSpacePath,
    splitter,
    upperLimit
  }
})
