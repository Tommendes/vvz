<script setup>
import { ref } from 'vue';
import { glKey } from '../global';

// use default algorithm and renderer
const jsonGL = localStorage.getItem(glKey);
const userGL = JSON.parse(jsonGL);
const props = defineProps({
    zoom: {
        type: Number,
        required: false,
        default: 16
    },
    mapTypeId: {
        type: String,
        required: false,
        default: 'roadmap'
    },
    markers: {
        type: Array,
        required: true,
        default: () => []
    },
    center: {
        type: Object,
        required: true,
        default: () => ({ lat: 0, lng: 0 })
    },
    mapFrameStyle: { type: String, required: true, default: 'width:250px;height:250px;' }
});
const center = ref({ lat: userGL.geolocation.latitude, lng: userGL.geolocation.longitude });
</script>

<template>
    <GMapMap :center="props.center" :zoom="props.zoom" :map-type-id="props.mapTypeId" :style="props.mapFrameStyle">
        <!-- <GMapCluster :zoomOnClick="true"> -->
        <GMapMarker :key="index" v-for="(m, index) in props.markers" :position="m.position" :clickable="true" :draggable="true" @click="center = m.position" />
        <!-- </GMapCluster> -->
    </GMapMap>
</template>

<style>
body {
    margin: 0;
}
</style>
