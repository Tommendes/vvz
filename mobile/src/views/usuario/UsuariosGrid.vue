<script setup>
import { ref, onBeforeMount } from 'vue';
import { FilterMatchMode } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import Breadcrumb from '../../components/Breadcrumb.vue';
import UsuarioForm from './UsuarioForm.vue';

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { Mask } from 'maska';
const masks = ref({
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    })
});

const filters = ref(null);
const gridData = ref(null);
const itemData = ref(null);
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/users`);
// Itens do grid
const listaNomes = ref([
    { field: 'name', label: 'Nome' },
    { field: 'cpf', label: 'CPF' }
]);
//Scrool quando criar um Novo Registro
const scrollToTop = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}
// Inicializa os filtros do grid
const initFilters = () => {
    filters.value = { global: { value: '', matchMode: FilterMatchMode.CONTAINS } };
    listaNomes.value.forEach((element) => {
        filters.value = { ...filters.value, [element.field]: { value: '', matchMode: 'contains' } };
    });
};
initFilters();
const clearFilter = () => {
    initFilters();
};
const goField = () => {
    router.push({ path: `/${userData.schema_description}/usuario/${itemData.value.id}` });
};
const getItem = (data) => {
    itemData.value = data;
};
const loadData = () => {
    setTimeout(() => {
        gridData.value = null;
        loading.value = true;
        axios.get(`${urlBase.value}`).then((axiosRes) => {
            gridData.value = axiosRes.data.data;
            gridData.value.forEach((element) => {
                if (element.cpf && element.cpf.trim().length >= 8) element.cpf = masks.value.cpf_cnpj.masked(element.cpf);
            });
            loading.value = false;
        });
    }, Math.random() * 1000);
};
const mode = ref('grid');

onBeforeMount(() => {
    initFilters();
    loadData();
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os Usuários', to: route.fullPath }]" />
    <div id="screen" class="card">
        <UsuarioForm :mode="mode" @changed="loadData" @cancel="mode = 'grid'" v-if="mode == 'new'" />
        <DataTable
            style="font-size: 1rem"
            :value="gridData"
            :paginator="true"
            :rows="10"
            dataKey="id"
            :rowHover="true"
            v-model:filters="filters"
            filterDisplay="menu"
            :loading="loading"
            :filters="filters"
            responsiveLayout="scroll"
            :globalFilterFields="['name', 'cpf']"
        >
            <template #header>
                <div class="flex justify-content-end flex-column gap-3">
                    <span class="flex justify-content-between">
                        <Button class="mr-1 w-full" type="button" icon="fa-solid fa-plus" label="Novo Registro" outlined @click="mode = 'new', scrollToTop()" />
                        <Button class="ml-1 w-full" type="button" icon="fa-solid fa-filter" label="Limpar filtro" outlined @click="clearFilter()" />
                    </span>
                    <span class="p-input-icon-left">
                        <i class="fa-solid fa-magnifying-glass" />
                        <InputText class="w-full" id="searchInput" @input="imprimir(filters.global.value)" v-model="filters['global'].value" v-maska data-maska="###.###.###-##', '##.###.###/####-##'" placeholder="Pesquise..." />
                    </span>
                </div>
            </template>
            <template v-for="nome in listaNomes" :key="nome">
                <Column
                    :field="nome.field"
                    :header="nome.label"
                    :filterField="nome.field"
                    :filterMatchMode="'contains'"
                    sortable
                    :dataType="nome.type"
                    :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}; max-width: ${nome.maxWidth ? nome.maxWidth : '6rem'}; overflow: hidden`"
                >
                    <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                        <Dropdown :id="nome.field" optionLabel="label" optionValue="value" v-model="filterModel.value" :options="nome.list" @change="filterCallback()" style="min-width: 20rem" />
                    </template>
                    <template v-else-if="nome.type == 'date'" #filter="{ filterModel, filterCallback }">
                        <Calendar v-model="filterModel.value" dateFormat="dd/mm/yy" selectionMode="range" :numberOfMonths="2" placeholder="dd/mm/aaaa" mask="99/99/9999" @input="filterCallback()" />
                    </template>
                    <template v-else #filter="{ filterModel, filterCallback }">
                        <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter" placeholder="Pesquise..." />
                    </template>
                    <template #body="{ data }">
                        <Tag v-if="nome.tagged == true" :value="data[nome.field]" :severity="getSeverity(data[nome.field])" />
                        <span v-else v-html="data[nome.field]"></span>
                    </template>
                </Column>
            </template>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" icon="fa-solid fa-bars" rounded v-on:click="getItem(data)" @click="goField" class="p-button-outlined" v-tooltip.left="'Clique para mais opções'" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
<style scoped>
#screen{
    width: 95vw;
}
</style>
<style>
.container{
    overflow-x: hidden;
}
</style>