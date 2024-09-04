<script setup>
import { ref, onBeforeMount } from 'vue';
import { FilterMatchMode } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import Breadcrumb from '@/components/Breadcrumb.vue';
import AgenteForm from './AgenteForm.vue';
import { renderizarHTML } from '@/global';

import { useRoute } from 'vue-router';
const route = useRoute();

// Profile do usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile()
});

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
const urlBase = ref(`${baseApiUrl}/comis-agentes`);
// Itens do grid
const listaNomes = ref([
    { field: 'agente_representante', label: 'Tipo Agente', tagged: true },
    { field: 'apelido', label: 'Nome/Nome curto' },
    { field: 'ordem', label: 'Ordem' },
    { field: 'dsr', label: 'DSR', tagged: true }
]);
//Scrool quando um Novo Registro for criado
const scrollToTop = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};
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
const getItem = (data) => {
    mode.value = 'grid';
    setTimeout(() => {
        itemData.value = data;
        mode.value = 'view';
        scrollToTop();
    }, 100);
};
const tiposAr = ref([
    { value: '0', label: 'Representação' },
    { value: '1', label: 'Representada' },
    { value: '2', label: 'Agente' },
    { value: '3', label: 'Terceiro' }
]);
const loadData = () => {
    gridData.value = null;
    loading.value = true;
    axios.get(`${urlBase.value}`).then((axiosRes) => {
        gridData.value = axiosRes.data.data;
        gridData.value.forEach((element) => {
            if (element.cpf_cnpj && element.cpf_cnpj.trim().length >= 8) element.cpf_cnpj = masks.value.cpf_cnpj.masked(element.cpf_cnpj);
            // Localize em tiposAr o valor de agente_representante e retorne o label em element.agente_representante
            element.agente_representante = String(element.agente_representante);
            element.agente_representante = tiposAr.value.find((x) => x.value == element.agente_representante).label;
            element.dsr = String(element.dsr);
            element.dsr = element.dsr == '1' ? 'Sim' : 'Não';
            element.apelido = (element.apelido || element.nome).trim();
            if (element.nome && element.ordem) element.nome = element.nome.trim() + ' (' + element.ordem.padStart(3, '0').toString() + ')';
            if (element.email) element.email = renderizarHTML(element.email);
            if (element.telefone) element.telefone = renderizarHTML(element.telefone, { to: element.nome, from: uProf.value.name });
        });
        loading.value = false;
    });
};
const mode = ref('grid');
const breadCrumbItems = ref([]);
const refreshBreadcrumb = () => {
    breadCrumbItems.value = [{ label: 'Todos os Agentes', to: route.fullPath }];
};
const newAgent = () => {
    mode.value = 'grid';
    itemData.value = {};
    setTimeout(() => {
        mode.value = 'new';
        scrollToTop();
        refreshBreadcrumb();
        breadCrumbItems.value.push({ label: 'Novo Registro' });
    }, 100);
};
onBeforeMount(() => {
    refreshBreadcrumb();
    initFilters();
    loadData();
});
const reload = () => {
    mode.value = 'grid';
    refreshBreadcrumb();
    loadData();
};
const getSeverity = (value) => {
    switch (value) {
        case 'Sim':
        case 'Representação':
            return 'success';
        case 'Representada':
            return 'warning';
        case 'Agente':
            return 'Info';
        case 'Terceiro':
            return 'secondary';
        default:
            return 'danger';
    }
};
</script>

<template>
    <Breadcrumb :items="breadCrumbItems" />
    <div class="card">
        <AgenteForm :mode="mode" :itemDataRoot="itemData" @changed="
            mode = 'grid';
        loadData();
        " @cancel="reload" v-if="['new', 'view'].includes(mode)" />
        <DataTable style="font-size: 1rem" :value="gridData" :paginator="true" :rows="10" dataKey="id" :rowHover="true"
            v-model:filters="filters" filterDisplay="menu" :loading="loading" :filters="filters"
            responsiveLayout="scroll" :globalFilterFields="['name', 'apelido', 'ordem']">
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <Button type="button" icon="fa-solid fa-plus" label="Novo Registro" outlined @click="newAgent" />
                    <Button type="button" icon="fa-solid fa-filter" label="Limpar filtro" outlined
                        @click="clearFilter()" />
                    <span class="p-input-icon-left">
                        <i class="fa-solid fa-magnifying-glass" />
                        <InputText v-model="filters['global'].value" placeholder="Pesquise..." />
                    </span>
                </div>
            </template>
            <template v-for="nome in listaNomes" :key="nome">
                <Column :field="nome.field" :header="nome.label" :filterField="nome.field" :filterMatchMode="'contains'"
                    sortable :dataType="nome.type">
                    <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                        <Dropdown :id="nome.field" optionLabel="label" optionValue="value" v-model="filterModel.value"
                            :options="nome.list" @change="filterCallback()" />
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
                        <span v-else v-html="data[nome.field]"></span>
                    </template>
                </Column>
            </template>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" icon="fa-solid fa-bars" rounded @click="getItem(data)"
                        class="p-button-outlined" v-tooltip.left="'Clique para mais opções'" />
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
