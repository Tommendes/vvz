<script setup>
import { ref, onBeforeMount, onMounted } from 'vue';
import { FilterMatchMode, FilterOperator } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';

const store = useUserStore();

const router = useRouter();

const filters = ref(null);
const menu = ref();
const gridData = ref(null);
const itemData = ref(null);
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/empresa`);
// Itens do grid
const listaNomes = ref([
    { field: 'razaosocial', label: 'Razão Social' },
    { field: 'fantasia', label: 'Nome Fantasia' },
    { field: 'cpf_cnpj_empresa', label: 'CNPJ / CPF' }
]);
// Inicializa os filtros do grid
const initFilters = () => {
    filters.value = { global: { value: '', matchMode: FilterMatchMode.CONTAINS } };
    listaNomes.value.forEach((element) => {
        filters.value = { ...filters.value, [element.field]: { value: '', matchMode: 'contains' } };
    });
};
import { Mask } from 'maska';
const masks = ref({
    cpf: new Mask({
        mask: '###.###.###-##'
    }),
    cnpj: new Mask({
        mask: '##.###.###/####-##'
    })
});
initFilters();
const clearFilter = () => {
    initFilters();
};
const itemsButtons = ref([
    {
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => {
            router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/empresa/${itemData.value.id}` });
        }
    },
    {
        label: 'Excluir',
        icon: 'pi pi-trash',
        command: () => {
            defaultWarn('Excluir registro (ID): ' + itemData.value.id);
        }
    },
]);
const toggle = (event) => {
    menu.value.toggle(event);
};
const getItem = (data) => {
    itemData.value = data;
};
const loadData = () => {
    loading.value = true;
    axios.get(`${urlBase.value}`).then((axiosRes) => {
        gridData.value = axiosRes.data.data;
        gridData.value.forEach(element => {
            if (element.cpf_cnpj_empresa && element.cpf_cnpj_empresa.length == 11)
                element.cpf_cnpj_empresa = masks.value.cpf.masked(element.cpf_cnpj_empresa)
            else element.cpf_cnpj_empresa = masks.value.cnpj.masked(element.cpf_cnpj_empresa)
        });
        loading.value = false;
    });
};
onBeforeMount(() => {
    initFilters();
    loadData();
});
</script>

<template>
    <div class="card">
        <DataTable :value="gridData" :paginator="true" class="p-datatable-gridlines" :rows="10" dataKey="id"
            :rowHover="true" v-model:filters="filters" filterDisplay="menu" :loading="loading" :filters="filters"
            responsiveLayout="scroll" :globalFilterFields="['razaosocial', 'fantasia', 'cpf_cnpj_empresa']">
            <template #header>
                <div class="flex justify-content-between">
                    <Button type="button" icon="pi pi-filter-slash" label="Limpar filtro" outlined @click="clearFilter()" />
                    <span class="p-input-icon-left">
                        <i class="pi pi-search" />
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
                        <span v-html="data[nome.field]"></span>
                    </template>
                </Column>
            </template>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" icon="pi pi-bars" rounded v-on:click="getItem(data)" @click="toggle"
                        aria-haspopup="true" aria-controls="overlay_menu" class="p-button-outlined" />
                    <Menu ref="menu" id="overlay_menu" :model="itemsButtons" :popup="true" />
                </template>
            </Column>
        </DataTable>
</div></template>
