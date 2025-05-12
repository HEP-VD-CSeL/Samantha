<template>
  <div class="col row items-center justify-center" style="border:1px solid red">
    <div style="width:100%; ;">
      <div>
        <p class="text-center text-subtitle2">Video encoding</p> 
        <div>
          <video style="border:1px solid grey; border-radius: 5px;"
            ref="videoRef"
            class="video-js vjs-default-skin"
            controls
            preload="auto"
            :src="videoSrc"
          />
        </div>
        <div class="q-mt-md flex flex-center">

          <q-btn
            :label="isPlaying ? 'Pause' : 'Play'"
            color="primary"
            @click="togglePlay"
            class="q-mr-sm"
          />
          <q-btn
            label="Next Frame"
            color="secondary"
            @click="stepForward"
          />

        </div>
      </div>
    </div>
    <q-footer class="bg-grey-3 text-black">
      <q-toolbar>
        <q-btn @click="wp.step = 0" color="primary" label="Previous" />
        <q-space/>
        <q-btn @click="wp.step = 1" color="primary" label="Next" :disable="next" />
        <q-btn @click="wp.step = 1" color="deep-orange" label="Encode video" class="q-ml-md" />
      </q-toolbar>
    </q-footer>
  </div>
</template>
    
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { type Ref } from 'vue'
import { appStore } from 'stores/appStore'
import { wpStore } from 'src/stores/wpStore'
import { type Project } from 'src/stores/wpStore'
import utils from 'src/utils'
import { useQuasar, QVueGlobals } from 'quasar'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'

const q: QVueGlobals = useQuasar()
const store = appStore()
const wp = wpStore()
const next: Ref<boolean> = ref(false)

const videoSrc: Ref<string> = ref(`file://${wp.selectedProject?.filePath}`)
const videoRef = ref<Element|string>('')
let player: any = null

const isPlaying: Ref<boolean> = ref(false)
function togglePlay() {
  const el = player || videoRef.value
  if (el) {
    if (isPlaying.value)
      el.pause()
    else
      el.play()
  }
}
function stepForward() {
  // Always use the native video element for frame stepping
  const el = videoRef.value as HTMLVideoElement
  if (el && typeof el.currentTime === 'number') {
    const fps = 25 // or your actual framerate
    el.currentTime = Math.min(el.currentTime + 1 / fps, el.duration)
  }
}

onMounted(async () => {
  // @ts-ignore
  videoRef.value.addEventListener('loadeddata', () => {
    next.value = true
  })

  // @ts-ignore
  videoRef.value.addEventListener('error', () => {
    next.value = false
  })

  // @ts-ignore
  videoRef.value.addEventListener('play', () => {
    isPlaying.value = true 
  })

  // @ts-ignore
  videoRef.value.addEventListener('pause', () => { 
    isPlaying.value = false 
  })
  

  player = videojs(videoRef.value, { 
    autoplay: false, 
    responsive: true, 
    fluid: true,

    controlBar: {
      playToggle: false,
      volumePanel: false,
      pictureInPictureToggle: false,
      fullscreenToggle: false
    }
  })
})

</script>

<style scoped>
:deep(.video-js .vjs-progress-holder) {
  position: relative;
  background: transparent !important;
  overflow: visible;
}
:deep(.video-js .vjs-progress-holder)::before {
  content: '';
  position: absolute;
  left: 0; top: 0; right: 0; bottom: 0;
  z-index: 1;
  pointer-events: none;
  border-radius: 4px;
  background: linear-gradient(
    to right,
    #4caf50 0%,      /* green */
    #4caf50 33.33%,  /* green */
    #f44336 33.33%,  /* red */
    #f44336 66.66%,  /* red */
    #2196f3 66.66%,  /* blue */
    #2196f3 100%     /* blue */
  );
}

/* Make the played and loaded bars transparent */
:deep(.video-js .vjs-play-progress),
:deep(.video-js .vjs-load-progress) {
  background: transparent !important;
}

/* Always show the control bar, even when inactive */
:deep(.video-js .vjs-control-bar) {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  transition: none !important;
}
:deep(.video-js.vjs-user-inactive) {
  cursor: default !important;
}
:deep(.video-js.vjs-user-inactive .vjs-control-bar) {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  transition: none !important;
}

/* Hide picture-in-picture and fullscreen buttons */
:deep(.video-js .vjs-picture-in-picture-control),
:deep(.video-js .vjs-fullscreen-control) {
  display: none !important;
}

/*
:deep(.video-js .vjs-tech) {
  pointer-events: none;
}
*/
</style>