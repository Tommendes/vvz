<script setup>
import { ref } from 'vue';
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

const home = ref({
    icon: 'pi pi-home',
    to: `/${userData.schema_description}`
});
const pilha = defineProps(['items']);
</script>

<template>
    <div class="card justify-content-left" style="padding: 0.5rem">
        <Breadcrumb :home="home" :model="pilha.items" />
    </div>
</template>
