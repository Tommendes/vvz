<script setup>
import { ref, onBeforeMount, watchEffect } from 'vue';
import { FilterMatchMode } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import Breadcrumb from '../../../components/Breadcrumb.vue';
import ItemForm from './ItemForm.vue';

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

const filters = ref(null);
const gridData = ref(null);
const itemData = ref(null);
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/com-prop-itens/35`);
const urlBaseProtoDocs = ref(`${baseApiUrl}/com-prop-itens`);
// Itens do grid
const listaNomes = ref([
    { field: 'id_com_propostas', label: 'Proposta', minWidth: '15rem' },
    { field: 'id_com_produtos', label: 'Produto', minWidth: '15rem' },
    { field: 'item', label: 'Item', minWidth: '15rem' }
]);
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
    router.push({ path: `/${userData.cliente}/${userData.dominio}/com-prop-itens/35/${itemData.value.id}` });
};
const getItem = (data) => {
    itemData.value = data;
};
const loadData = () => {
    setTimeout(() => {
        loading.value = true;
        axios.get(`${urlBase.value}`).then((axiosRes) => {
            gridData.value = axiosRes.data.data;
            gridData.value.forEach(async (element) => {
                const url = `${urlBaseProtoDocs.value}/${element.id}`;
                element.descricao = '';
                await axios.get(url).then((axiosRes) => {
                    const items = axiosRes.data.data;
                    items.forEach((protoDocs) => {
                        if (protoDocs.descricao) element.descricao += `${protoDocs.descricao.split(',')},`;
                    });
                });
                element.descricao = element.descricao.replaceAll(',', ', ').trim().slice(0, -1);
            });
            loading.value = false;
        });
    }, Math.random() * 1000 + 250);
};
const mode = ref('grid');
const searchInPage = () => {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const contentElement = document.getElementByTagName('tbody');

    if (searchTerm) {
        const contentText = contentElement.innerText.toLowerCase();

        if (contentText.includes(searchTerm)) {
            // Criamos uma expressão regular global (g) para encontrar todas as correspondências
            const regex = new RegExp(searchTerm, 'g');

            // Usamos o método replace para envolver as correspondências com uma tag de destaque
            contentElement.innerHTML = contentText.replace(regex, (match) => `<span style="background-color: yellow">${match}</span>`);

            // Definimos o foco de volta no campo de input
            document.getElementById('searchInput').focus();
        } else {
            alert('Nenhuma correspondência encontrada.');
        }
    }
};
onBeforeMount(() => {
    initFilters();
    loadData();
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os Itens' }]" />
    <div class="card" :style="'min-width: ' + (!route.name == 'protocolos' ? '100%' : '100rem')">
        <ItemForm :mode="mode" @changed="loadData" @cancel="mode = 'grid'" v-if="mode == 'new'" />
        <DataTable
            style="font-size: 0.9rem"
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
            :globalFilterFields="['id_com_prop_compos', 'descricao']"
        >
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <Button type="button" icon="pi pi-plus" label="Novo Registro" outlined @click="mode = 'new'" />
                    <Button type="button" icon="pi pi-filter-slash" label="Limpar filtro" outlined @click="clearFilter()" />
                    <span class="p-input-icon-left">
                        <i class="pi pi-search" />
                        <InputText id="searchInput" v-model="filters['global'].value" placeholder="Pesquise..." @input="searchInPage" />
                    </span>
                </div>
            </template>
            <template v-for="nome in listaNomes" :key="nome">
                <Column :field="nome.field" :header="nome.label" :filterField="nome.field" :filterMatchMode="'contains'" sortable :dataType="nome.type" :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}`">
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
                    <Button type="button" icon="pi pi-bars" rounded v-on:click="getItem(data)" @click="goField" class="p-button-outlined" v-tooltip.left="'Clique para mais opções'" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
<style scoped>
.foundMark {
    background-color: yellow;
    padding: 0;
}
</style>
