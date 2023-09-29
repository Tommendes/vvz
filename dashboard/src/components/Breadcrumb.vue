<script setup>
import { ref } from 'vue';

const home = ref({
    icon: 'pi pi-home',
    to: '/'
});
const pilha = defineProps(['items']);
</script>

<template>
    <div class="card flex justify-content-center">
        <Breadcrumb :home="home" :model="pilha.items" />
    </div>
</template>
