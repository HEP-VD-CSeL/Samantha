<template>
    <q-page style="width:100%" class="row items-center justify-evenly">
      logs
    </q-page>
  </template>
  
  <script setup lang="ts">
  //import { app } from 'electron';
  import { ref, onMounted } from 'vue';
  import { type Ref } from 'vue';
  import { appStore } from 'stores/appStore'
  
  const store = appStore()
  
  
  onMounted(() => {
  });
  
  </script>
    