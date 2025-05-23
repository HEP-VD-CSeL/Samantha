<template>
  <div class="col row" style="">
    <q-dialog class="full-width-dialog q-pa-xl" style="width:100%" v-model="anonymizationModal" persistent backdrop-filter="blur(4px)">
      <div>
        <p class="text-center text-subtitle2">Anonymization, this may take a while...</p>
        <div id="detection"></div>
        <div class="text-center">
          <q-btn class="q-mt-lg align-center" label="CANCEL ANONYMIZATIOB" icon="mdi-cancel" color="deep-orange" @click="" />
        </div>
      </div>
    </q-dialog>

    <div class="" style="width:200px;float:left;border-right:1px solid grey;">
      <p class="text-center text-subtitle2 q-mt-lg">Detections</p> 
      <q-scroll-area visible style="height: calc(100vh - 150px)">
        <q-list separator>
          <q-item 
            v-if="wp.selectedProject?.detections" v-for="(detection, index) in (wp.selectedProject?.detections[currentFrame] || []).filter(det => (wp.selectedProject?.classes || []).includes(det.classid))" dense clickable v-ripple
            class="q-pa-xs"
            :focused="detection.id == highlightedDetection?.id && detection.classid == highlightedDetection?.classid">
            <q-item-section @click="highlightDetection(detection)">{{detection.blur ? '🚫' : '🟢'}} {{ detection.classname }} {{ detection.id }}</q-item-section>
            <q-item-section avatar>
              <q-btn flat dense round icon="mdi-dots-vertical">
                <q-menu>
                  <q-list style="min-width: 100px">
                    <q-item @click="applyFilter(detection.classid, detection.id)" clickable v-close-popup>
                      <q-item-section>Blur</q-item-section>
                    </q-item>
                  </q-list>
                  <q-list style="min-width: 100px">
                    <q-item @click="deleteDetection(detection.classid, detection.id)" clickable v-close-popup>
                      <q-item-section>Delete</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </div>
    <div class="row items-center justify-center" style="flex:1;">
      <div style="width:100%" class="q-pa-xs">
        <p class="text-center text-subtitle2">Object selection</p> 
        <div style="position:relative;">
          <video
            ref="videoRef"
            class="video-js vjs-default-skin"
            controls
            preload="auto"
            :src="filePath"
            style="border:1px solid grey; border-radius: 5px; width:100%;"
          />
          <canvas
            ref="canvasRef"
            style="position:absolute; top:0; left:0; width:100%; height:100%;"
          ></canvas>
        </div>
        <div class="q-mt-md text-center" style="">
          <q-btn round icon="mdi-skip-backward" color="secondary" @click="skipFrame(fps, 'backward')" class="q-mrl-sm q-mr-sm">
            <q-tooltip>Skip back {{ fps }} frames</q-tooltip>
          </q-btn>
          <q-btn round icon="mdi-skip-previous" color="secondary" @click="skipFrame(1, 'backward')" class="q-mrl-sm q-mr-sm">
            <q-tooltip>Skip back 1 frame</q-tooltip>
          </q-btn>
          <q-btn round :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" color="primary" @click="togglePlay" class="q-mrl-sm q-mr-sm">
            <q-tooltip>{{ isPlaying ? 'Pause' : 'Play' }}</q-tooltip>
          </q-btn>
          <q-btn round icon="mdi-skip-next" color="secondary" @click="skipFrame(1, 'forward')" class="q-mrl-sm q-mr-sm">
            <q-tooltip>Step forward 1 frame</q-tooltip>
          </q-btn>
          <q-btn round icon="mdi-skip-forward" color="secondary" @click="skipFrame(fps, 'forward')" class="q-mrl-sm q-mr-sm">
            <q-tooltip>Skip forward {{ fps }} frames</q-tooltip>
          </q-btn>
        </div>
      </div>
    </div>
    <q-footer class="bg-grey-3 text-black" style="z-index:9999">
      <q-toolbar>
        <q-btn @click="wp.step = 2" color="primary" label="Previous" />
        <q-space/>
        <q-btn @click="wp.step = 3" color="primary" label="Next" :disable="!next" />
        <q-btn @click="startAnonymization()" color="deep-orange" label="start anonymization" class="q-ml-md" />
      </q-toolbar>
    </q-footer>
  </div>
</template>
    
<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { type Ref } from 'vue'
import { appStore } from 'stores/appStore'
import { wpStore } from 'src/stores/wpStore'
import { type Project } from 'src/stores/wpStore'
import utils from 'src/utils'
import { useQuasar, QVueGlobals } from 'quasar'
import { type Detection } from 'src/stores/wpStore'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'

const q: QVueGlobals = useQuasar()
const store = appStore()
const wp = wpStore()
const next: Ref<boolean> = ref(false)

const filePath: string = `file://${store.workSpacePath}/projects/${wp.selectedProject?.folder}/base.mp4`
const videoRef = ref<Element|string>('')
let player: any = null
let fps = 25
const isPlaying: Ref<boolean> = ref(false)
const totalFrames: Ref<number> = ref(0)
const currentFrame: Ref<number> = ref(0)
const canvasRef = ref<HTMLCanvasElement|null>(null)
const anonymizationModal: Ref<boolean> = ref(false)

let iconHitboxes: Array<{x: number, y: number, w: number, h: number, classid: number, detid: number}> = []
const highlightedDetection = ref<{ classid: number, id: number } | null>(null)

function deleteDetection(classid: number, id: number) {
  for (const detections of wp.selectedProject?.detections || []) {
    for (const detection of detections) {
      if (detection.classid === classid && detection.id === id) {
        detections.splice(detections.indexOf(detection), 1)
      }
    }
  }
  wp.persist()
  drawDetections()
}

function highlightDetection(detection:  Detection){
  highlightedDetection.value = { classid: detection.classid, id: detection.id }
  drawDetections()
}

function drawDetections() {
  const detections = wp.selectedProject?.detections?.[currentFrame.value] || []
  const allowedClasses = wp.selectedProject?.classes || []
  const video = videoRef.value as HTMLVideoElement
  const canvas = canvasRef.value
  if (!canvas || !video) return

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  iconHitboxes = []

  // Split detections into normal and highlighted
  let highlighted: Detection | null = null
  const filtered = detections.filter(det => allowedClasses.includes(det.classid))
  filtered.forEach(det => {
    if (
      highlightedDetection.value &&
      det.classid === highlightedDetection.value.classid &&
      det.id === highlightedDetection.value.id
    ) {
      highlighted = det
    } else {
      drawDetection(ctx, det)
    }
  })
  if (highlighted) drawDetection(ctx, highlighted, true)

  ctx.textAlign = 'start'
  ctx.textBaseline = 'alphabetic'
}

// Helper to draw a single detection (optionally highlighted)
function drawDetection(ctx: CanvasRenderingContext2D, det: Detection, isHighlight = false) {
  const { x1, y1, x2, y2 } = det.positions
  ctx.font = '30px Arial'
  ctx.textAlign = 'start'
  ctx.textBaseline = 'alphabetic'
  const icon = det.blur ? '🚫' : '🟢'
  const label = `${icon} ${det.classname} ${det.id}`
  const textWidth = ctx.measureText(label).width
  const labelX = x1 + 8
  const labelY = y1 - 16

  // Draw label background
  const padding = 5
  ctx.fillStyle = isHighlight ? 'rgba(255,215,0,0.8)' : 'rgba(0,0,0,0.6)'
  ctx.fillRect(
    labelX - 6 - padding,
    y1 - 34 - padding - 8,
    textWidth + 12 + 2 * padding,
    34 + 2 * padding
  )

  // Draw bounding box
  ctx.strokeStyle = isHighlight ? '#FFD600' : (det.blur ? '#FF0000' : '#00FF00')
  ctx.lineWidth = isHighlight ? 6 : 4
  ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)

  // Draw label text
  ctx.fillStyle = '#fff'
  ctx.fillText(label, labelX, labelY)

  // Store icon hitbox
  const iconWidth = ctx.measureText(icon).width
  iconHitboxes.push({
    x: labelX,
    y: labelY - 30 + 8,
    w: iconWidth,
    h: 30,
    classid: det.classid,
    detid: det.id
  })
}

function onVideoFrame(now: number, metadata: VideoFrameCallbackMetadata) {
  const el = videoRef.value as HTMLVideoElement
  currentFrame.value = Math.floor(el.currentTime * fps)
  drawDetections()
  el.requestVideoFrameCallback(onVideoFrame)
}

// go to a specific frame
function goToFrame(frame: number) {
  if (player)
    player.currentTime(Math.min(frame / fps, player.duration()))
}

function togglePlay() {
  const el = player || videoRef.value
  if (el) {
    if (isPlaying.value)
      el.pause()
    else
      el.play()

  }
}
function skipFrame(nbFrames: number, direction: "forward"|"backward") {
  const el = videoRef.value as HTMLVideoElement
  if (el && typeof el.currentTime === 'number') 
    el.currentTime = Math.min(el.currentTime + (direction == 'forward' ? nbFrames : -nbFrames) / fps, el.duration)
}

function applyFilter(classId: number, detId: number) {
  for (const detections of wp.selectedProject?.detections || []) {
    for (const detection of detections) {
      if (detection.classid === classId && detection.id === detId)
        detection.blur = !detection.blur
    }
  }
  drawDetections()
  wp.persist()
}

let ws: WebSocket | null = null
async function startAnonymization(){
  ws = new WebSocket('ws://localhost:3000/anonymize')
  anonymizationModal.value = true

  ws.onmessage = (event) => {
    //console.log('Anonymization ws message:', event.data)
    // parse json data
    if (event.data.startsWith('{')) {
      const data = JSON.parse(event.data)
      
      // we don't show keepalive messages
      if (data?.status == 'alive')
        return

      // detection is done, save the detections and go next
      if (data?.status == 'done'){
        console.log(`Anonymization done !`)
      }
    }
    else {
      // if it's not a json, it's a base64 jpg image
      const imgId = 'detection-img'
      let img = document.getElementById(imgId) as HTMLImageElement | null
      if (!img) {
        img = document.createElement('img')
        img.id = imgId
        img.style.width = '100%'
        img.style.display = 'block'
        document.getElementById('detection')?.appendChild(img)
      }
      
      img.src = 'data:image/jpeg;base64,' + event.data
    }
  }

  ws.onopen = () => {
    console.log('Anonymization ws connection opened')
    // send all the needed information to the server
    const data = {
      file: filePath,
      workspace: store.workSpacePath,
      detections: wp.selectedProject?.detections,
    }
    if (ws)
      ws.send(JSON.stringify(data))
  }

  ws.onclose = () => {
    console.log('Anonymization ws connection closed')
    anonymizationModal.value = false
  }

  ws.onerror = (err) => {
    anonymizationModal.value = false
    console.error('WebSocket error:', err)
    q.dialog({
      title: 'Error',
      message: `A WebSocket error occurred: ${err.type || err.toString()}`,
    })
  }
}

onMounted(async () => {
  // get video framerate
  try {
    fps = await window.workspaceAPI.getVideoFPS(store.workSpacePath || '', filePath) || 25
    console.log('FPS:', fps)
  }
  catch (e) {
    console.error('Error getting video framerate:', e)
  }

  const el = videoRef.value as HTMLVideoElement
  el.requestVideoFrameCallback(onVideoFrame)
  
  // video js player initialization without controls
  player = videojs(videoRef.value, { 
    autoplay: false, 
    responsive: true, 
    fluid: true,
    controlBar: {
      playToggle: false,
      volumePanel: true,
      pictureInPictureToggle: false,
      fullscreenToggle: false
    }
  })

  player.on('loadedmetadata', () => {
    const duration = (videoRef.value as HTMLVideoElement).duration
    totalFrames.value = Math.floor(duration * fps)
    drawDetections()
  })

  player.on('timeupdate', () => {
    const el = videoRef.value as HTMLVideoElement
    currentFrame.value = Math.floor(el.currentTime * fps)
    drawDetections()
  })

  // @ts-ignore
  player.on('error', () => {
    next.value = false
  })

  // @ts-ignore
  player.on('play', () => {
    isPlaying.value = true 
  })

  // @ts-ignore
  player.on('pause', () => { 
    isPlaying.value = false 
  })  

  // make the canvas clickable
  const canvas = canvasRef.value
  if (canvas) {
    canvas.addEventListener('click', (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY
      for (const hit of iconHitboxes) {
        if (x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h) {
          applyFilter(hit.classid, hit.detid)
          break
        }
      }
    })
  
    // Mousemove event for cursor change
    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY
      let overIcon = false
      for (const hit of iconHitboxes) {
        if (x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h) {
          overIcon = true
          break
        }
      }
      canvas.style.cursor = overIcon ? 'pointer' : 'default'
    })
  }
})


</script>

<style scoped>
:deep(.vjs-big-play-button) {
  display: none !important;
}

:deep(.vjs-control-bar) {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  z-index: 10 !important;
  transition: none !important;
}

:deep(.vjs-has-started .vjs-control-bar) {
  display: flex !important;
}

.q-dialog__inner > div {
  width: 100vw !important;
  max-width: 100vw !important;
  min-width: 50vw !important;
  box-sizing: border-box;
}

</style>