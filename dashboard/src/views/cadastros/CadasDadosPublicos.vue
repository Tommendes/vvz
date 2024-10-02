<script setup>
import moment from 'moment';

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount, ref } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile();
});

// Props do template
const props = defineProps({
    itemData: Object // O próprio cadastro
});
const dataPt = moment(props.itemData.created_at).format('DD/MM/YYYY HH:mm:ss');
</script>

<template>
    <div class="card bg-blue-200 mt-3 max-w-screen">
        <h2>{{ `Dados registrados em ${dataPt}` }}{{ uProf.admin >= 2 ? ` (Registro ${props.itemData.id})` : '' }}</h2>
        <span v-html="props.itemData.dados"></span>
    </div>
    <div class="card bg-green-200 mt-3" v-if="uProf.admin >= 2">
        <p>itemData: {{ props.itemData }}</p>
    </div>
</template>
