<script setup>
import { ref, onBeforeMount, inject } from 'vue';
import { FilterMatchMode } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import ItemForm from './ItemForm.vue';

import { useRoute } from 'vue-router';
const route = useRoute();

const filters = ref(null);
const gridData = ref(null);
// Campos de formulário
// Campos de formulário
const itemDataProposta = inject('itemData');
const itemData = ref({});
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/com-prop-itens`);
const limitDescription = 50;
// Itens do grid
const listaNomes = ref([
    { field: 'item', label: 'Composição/Item', minWidth: '5rem' },
    { field: 'item_ativo', label: 'Ativo', minWidth: '5rem', tagged: true },
    { field: 'compoe', label: 'Compõe', minWidth: '5rem', tagged: true },
    { field: 'nome_comum', label: 'Produto', minWidth: '8rem' },
    { field: 'descricao', label: 'Descrição', minWidth: '15rem', maxLength: limitDescription },
    { field: 'quantidade', label: 'Quantidade', minWidth: '15rem' }
    // { field: 'valor_unitario', label: 'Valor Unitário', minWidth: '15rem' },
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
const goField = (data) => {
    mode.value = 'grid';
    setTimeout(() => {
        itemData.value = data;
        mode.value = 'view';
    }, Math.random() * 250);
};

const loadData = () => {
    setTimeout(() => {
        loading.value = true;
        const url = `${urlBase.value}/${route.params.id}`;
        axios.get(url).then((axiosRes) => {
            gridData.value = axiosRes.data.data;
            gridData.value.forEach((element) => {
                element.compoe = element.compoe_valor ? 'Sim' : 'Não';
                element.item_ativo = element.item_ativo ? 'Sim' : 'Não';
                if (element.compos_nr) element.item = `${element.compos_nr} / ${element.item}`;
                // const description = element.descricao || undefined;
                // if (description) {
                //     element.descricao = description.trim().substr(0, limitDescription);
                //     if (description.length > limitDescription) element.descricao += ' ...';
                // }
            });
            loading.value = false;
        });
    }, Math.random() * 250);
};

const mode = ref('grid');
const getSeverity = (value) => {
    return value == 'Sim' ? 'success' : 'danger';
};
const newItem = () => {
    mode.value = 'grid';
    setTimeout(() => {
        itemData.value = {};
        mode.value = 'new';
    }, Math.random() * 250);
};
onBeforeMount(() => {
    initFilters();
    loadData();
});
</script>

<template>
    <div>
        <ItemForm :idItem="itemData.id" @changed="loadData" @cancel="mode = 'grid'" v-if="['view', 'new', 'edit'].includes(mode)" />
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
            :globalFilterFields="['id_com_prop_compos', 'descricao', 'quantidade', 'valor_unitario', 'item']"
        >
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <Button type="button" icon="pi pi-plus" label="Novo Registro" outlined @click="newItem" />
                    <Button type="button" icon="pi pi-filter-slash" label="Limpar filtro" outlined @click="clearFilter()" />
                    <span class="p-input-icon-left">
                        <i class="pi pi-search" />
                        <InputText id="searchInput" v-model="filters['global'].value" placeholder="Pesquise..." />
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
                        <span v-else-if="data[nome.field] && nome.mask" v-html="masks[nome.mask].masked(data[nome.field])"></span>
                        <span v-else v-html="nome.maxLength ? String(data[nome.field]).trim().substring(0, nome.maxLength) + '...' : String(data[nome.field]).trim()"></span>
                    </template>
                </Column>
            </template>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" icon="pi pi-bars" rounded @click="goField(data)" class="p-button-outlined" v-tooltip.left="'Clique para mais opções'" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
