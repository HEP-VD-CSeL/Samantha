import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Ref } from 'vue'

export const appStore = defineStore('appStore', () => {
  const ready: Ref<boolean> = ref(false)
  
  const sysOK: Ref<boolean> = ref(false)

  // '/Users/marcel/Desktop/samantha'
  const workSpacePath: Ref<string|null> = ref(null)

  return {
    ready,
    sysOK,
    workSpacePath
  }
})
