<template>
  <div class="col row items-center justify-center" style="">

    <div style=" min-width: 350px;">
      <p class="text-center text-subtitle2">Object detection preparation</p>
      
      <p>Please select the detection classes.</p>

      <div>
        <q-btn @click="selectClass(key as string)" class="q-ma-xs" v-for="(value, key) in detectionClasses" outline round :color="value.select ? `primary`: `grey`" :icon="value.icon" :key="key">
          <q-tooltip>
            {{ value.label }}
          </q-tooltip>
        </q-btn>
      </div>
    </div>

    <q-footer class="bg-grey-3 text-black" style="z-index:9999">
      <q-toolbar>
        <q-btn @click="wp.step = 1" color="primary" label="Previous" />
        <q-space/>
        <q-btn :disabled="!wp.selectedProject?.classes?.length" @click="wp.step = 3" color="primary" label="Next" />
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

const q: QVueGlobals = useQuasar()
const store = appStore()
const wp = wpStore()

type DetectionClassMap = {
  [className: string]: {
    label: string,
    icon: string
    select: boolean,
    classes: Array<number>,
  }
}

const detectionClasses: Ref<DetectionClassMap> = ref({
  face: { label: 'Face', icon: 'mdi-face-recognition', select: true, classes: [-1] },
  person: { label: 'Person', icon: 'mdi-account', select: true, classes: [1] },
  vehicle: { label:'Bicycle, Car, Motorcycle, Airplane, Bus, Train, Truck, Boat', icon: 'mdi-car-multiple', select: false, classes: [2, 3, 4, 5, 6, 7, 8, 9] },
  street_object: { label:'Traffic light, Fire hydrant, Stop sign, Parking meter, Bench', icon: 'mdi-city', select: false, classes: [10, 11, 12, 13, 14] },
  animal: { label:'Bird, Cat, Dog, Horse, Sheep, Cow, Elephant, Bear, Zebra, Giraffe', icon: 'mdi-paw', select: false, classes: [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25] },
  bag: { label:'Backpack, Umbrella, Handbag, Tie, Suitcase', icon: 'mdi-bag-personal', select: false, classes: [25, 26, 27, 28, 29] },
  sports: { label:'Frisbee, Skis, Snowboard, Sports ball, Kite, Baseball bat, Baseball glove, Skateboard, Surfboard, Tennis racket', icon: 'mdi-soccer', select: false, classes: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39] },
  tableware: { label:'Bottle, Wine glass, Cup, Fork, Knife, Spoon, Bowl', icon: 'mdi-bottle-soda-classic-outline', select: false, classes: [40, 41, 42, 43, 44, 45, 46] },
  food: { label:'Banana, Apple, Sandwich, Orange, Broccoli, Carrot, Hot dog, Pizza, Donut, Cake', icon: 'mdi-food', select: true, classes: [47, 48, 49, 50, 51, 52, 53, 54, 55, 56] },
  furniture: { label:'Chair, Couch, Potted plant, Bed, Dining table, Toilet', icon: 'mdi-sofa', select: false, classes: [57, 58, 59, 60, 61, 62] },
  electronics: { label:'TV, Laptop, Mouse, Remote, Keyboard, Cell phone', icon: 'mdi-monitor', select: false, classes: [63, 64, 65, 66, 67, 68] },
  kitchen: { label:'Microwave, Oven, Toaster, Sink, Refrigerator', icon: 'mdi-stove', select: false, classes: [69, 70, 71, 72, 73] },
  household_items: { label:'Book, Clock, Vase, Scissors, Teddy bear, Hair drier, Toothbrush', icon: 'mdi-home', select: false, classes: [74, 75, 76, 77, 78, 79, 80] },
})

async function selectClass(key: string){
  if (detectionClasses.value[key] == null)
    return
  
  detectionClasses.value[key].select = !detectionClasses.value[key].select
  await persistClasses()
}

async function persistClasses() {
  const classes: Array<number> = []
  for (const [key, value] of Object.entries(detectionClasses.value)) 
    if (value.select)
      classes.push(...value.classes)

  wp.selectedProject!.classes = classes
  await wp.persist()
} 

onMounted(async () => {

  // create the detection classes if it does not exist
  if (wp.selectedProject?.classes == null)
    await persistClasses()
  else {
    // if the classes are not empty, we need to sync the detection classes
    for (const [key, value] of Object.entries(detectionClasses.value)) {
      if (value.classes.some((c) => wp.selectedProject!.classes!.includes(c)))
        value.select = true
      else
        value.select = false
    }
  }
  
})


</script>

<style scoped>

</style>