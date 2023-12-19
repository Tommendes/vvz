<script setup>
import { ref, onBeforeMount, inject } from 'vue';
import { FilterMatchMode } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import ComposicaoForm from './ComposicaoForm.vue';

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();

// Cookies e dados do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

const filters = ref(null);
const gridData = ref(null);
// Campos de formulário
const itemData = inject('itemData');
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/com-prop-compos`);
// Itens do grid
const listaNomes = ref([
    { field: 'ativo', label: 'Ativo', minWidth: '5rem', tagged: true },
    { field: 'compoe', label: 'Compõe', minWidth: '5rem', tagged: true },
    { field: 'compos_nr', label: 'Número', minWidth: '5rem' },
    { field: 'localizacao', label: 'Descrição um', minWidth: '15rem' },
    { field: 'tombamento', label: 'Descrição dois', minWidth: '15rem' }
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
    }, 100);
};

const loadData = () => {
    setTimeout(() => {
        loading.value = true;
        const url = `${urlBase.value}/${route.params.id}`;
        axios.get(url).then((axiosRes) => {
            gridData.value = axiosRes.data.data;
            gridData.value.forEach((element) => {
                element.compoe = element.compoe_valor == 1 ? 'Sim' : 'Não';
                element.ativo = element.status == 10 ? 'Sim' : 'Não';
            });
            loading.value = false;
        });
    }, Math.random() * 1000 + 250);
};
const mode = ref('grid');
const getSeverity = (value) => {
    return value == 'Sim' ? 'success' : 'danger';
};
onBeforeMount(() => {
    initFilters();
    loadData();
});
</script>

<template>
    <div>
        <ComposicaoForm :mode="mode" :idComposicao="itemData.id" @changed="loadData" @cancel="mode = 'grid'"
            v-if="['view', 'new', 'edit'].includes(mode)" />
        <DataTable style="font-size: 0.9rem" :value="gridData" :paginator="true" :rows="10" dataKey="id" :rowHover="true"
            v-model:filters="filters" filterDisplay="menu" :loading="loading" :filters="filters" responsiveLayout="scroll"
            :globalFilterFields="['compos_nr', 'localizacao', 'tombamento']">
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <Button type="button" icon="pi pi-plus" label="Novo Registro" outlined @click="mode = 'new'" />
                    <Button type="button" icon="pi pi-filter-slash" label="Limpar filtro" outlined @click="clearFilter()" />
                    <span class="p-input-icon-left">
                        <i class="pi pi-search" />
                        <InputText id="searchInput" v-model="filters['global'].value" placeholder="Pesquise..." />
                    </span>
                </div>
            </template>
            <template v-for="nome in listaNomes" :key="nome">
                <Column :field="nome.field" :header="nome.label" :filterField="nome.field" :filterMatchMode="'contains'"
                    sortable :dataType="nome.type" :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}`">
                    <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                        <Dropdown :id="nome.field" optionLabel="label" optionValue="value" v-model="filterModel.value"
                            :options="nome.list" @change="filterCallback()" style="min-width: 20rem" />
                    </template>
                    <template v-else-if="nome.type == 'date'" #filter="{ filterModel, filterCallback }">
                        <Calendar v-model="filterModel.value" dateFormat="dd/mm/yy" selectionMode="range"
                            :numberOfMonths="2" placeholder="dd/mm/aaaa" mask="99/99/9999" @input="filterCallback()" />
                    </template>
                    <template v-else #filter="{ filterModel, filterCallback }">
                        <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()"
                            class="p-column-filter" placeholder="Pesquise..." />
                    </template>
                    <template #body="{ data }">
                        <Tag v-if="nome.tagged == true" :value="data[nome.field]"
                            :severity="getSeverity(data[nome.field])" />
                        <span v-else-if="data[nome.field] && nome.mask"
                            v-html="masks[nome.mask].masked(data[nome.field])"></span>
                        <span v-else v-html="data[nome.field]"></span>
                    </template>
                </Column>
            </template>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" icon="pi pi-bars" rounded @click="goField(data)" class="p-button-outlined"
                        v-tooltip.left="'Clique para mais opções'" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
