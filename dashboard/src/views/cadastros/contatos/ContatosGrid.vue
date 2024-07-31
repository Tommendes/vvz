<script setup>
import { ref, onBeforeMount } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';

// Profile do usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile();
});

import ContatoForm from './ContatoForm.vue';
const gridData = ref(null);
const itemData = ref({});
const props = defineProps({
    itemDataRoot: Object // O próprio cadastro
});
const mode = ref('grid');
const urlBase = ref(`${baseApiUrl}/cad-contatos-itens/${props.itemDataRoot.id}`);
// Carrega os dados da grid
const loadData = async () => {
    mode.value = 'grid';
    const url = `${urlBase.value}`;
    await axios.get(url).then((axiosRes) => {
        gridData.value = axiosRes.data.data;
    });
};
const cancelNewItem = () => {
    mode.value = 'grid';
};
const newItem = () => {
    mode.value = 'newItem';
    itemData.value = {
        id_cadastros: props.itemDataRoot.id
    };
};
// Carrega as operações básicas do formulário
onBeforeMount(() => {
    setTimeout(async () => {
        await loadData();
    }, Math.random() * 1000 + 250);
});
</script>

<template>
    <div class="flex overflow-x-auto gap-1 mb-2">
        <div class="flex-grow-1 flex align-items-center justify-content-center">
            <span class="text-center text-lg p-inputtext p-component surface-100">
                <i class="fa-solid fa-angles-down fa-shake"></i> Contatos adicionais do cadastro
                <i class="fa-solid fa-angles-down fa-shake" />
            </span>
        </div>
        <div class="flex-grow-0 flex align-items-center justify-content-center">
            <Button type="button" class="h-full" icon="fa-solid fa-plus" label="Novo contato" outlined @click="newItem()" v-tooltip.top="'Clique para registrar uma nova comissão'" />
        </div>
    </div>
    <ContatoForm v-if="mode == 'newItem'" @cancel="cancelNewItem()" @reload="loadData" :itemDataRoot="itemData" />
    <ContatoForm v-for="item in gridData" :key="item.id" :itemDataRoot="item" @reload="loadData" />
    <Fieldset class="bg-green-200 mb-1" toggleable :collapsed="true" v-if="uProf && uProf.admin >= 3">
        <template #legend>
            <div class="flex align-items-center text-primary">
                <span class="fa-solid fa-circle-info mr-2"></span>
                <span class="font-bold text-lg">FormData Contatos</span>
            </div>
        </template>
        <p>mode: {{ mode }}</p>
        <p>itemData: {{ itemData }}</p>
        <p>props.itemDataRoot: {{ props.itemDataRoot }}</p>
        <p>gridData: {{ gridData }}</p>
    </Fieldset>
</template>
