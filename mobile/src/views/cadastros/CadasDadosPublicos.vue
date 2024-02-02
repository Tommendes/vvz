<script setup>
// Cookies de usuário
import { userKey } from '@/global';
import moment from 'moment';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
// Props do template
const props = defineProps({
    itemData: Object // O próprio cadastro
});
const dataPt = moment(props.itemData.created_at).format('DD/MM/YYYY HH:mm:ss');
</script>

<template>
    <div class="card bg-blue-200 mt-3 max-w-screen">
        <h2>{{ `Dados registrados em ${dataPt}` }}{{ userData.admin >= 2 ? ` (Registro ${props.itemData.id})` : '' }}</h2>
        <span v-html="props.itemData.dados"></span>
    </div>
    <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
        <p>itemData: {{ props.itemData }}</p>
    </div>
</template>
