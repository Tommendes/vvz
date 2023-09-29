<script setup>
import { onBeforeMount, onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultError } from '@/toast';
import moment from 'moment';
import EmpresaForm from './EmpresaForm.vue';

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

import { useUserStore } from '@/stores/user';
const store = useUserStore();

import { useRouter } from 'vue-router';
const router = useRouter();

// import { Mask } from 'maska';
// const masks = ref({
//     aniversario: new Mask({
//         mask: '##/##/####'
//     }),
//     cpf: new Mask({
//         mask: '###.###.###-##'
//     }),
//     cnpj: new Mask({
//         mask: '##.###.###/####-##'
//     })
// });

const urlBase = ref(`${baseApiUrl}/empresa`);

onBeforeMount(() => {
    initFilters();
});
onMounted(() => {
    clearFilter();
});

const deleteRow = () => {
    confirm.require({
        group: 'templating',
        header: 'Corfirmar exclusão',
        message: 'Você tem certeza que deseja excluir este registro?',
        icon: 'pi pi-question-circle',
        acceptIcon: 'pi pi-check',
        rejectIcon: 'pi pi-times',
        acceptClass: 'p-button-danger',
        accept: () => {
            axios.delete(`${urlBase.value}/${itemData.value.id}`).then(() => {
                defaultSuccess('Registro excluído com sucesso!');
                loadData();
            });
        },
        reject: () => {
            return false;
        }
    });
};

const dt = ref();
const totalRecords = ref(0); // O total de registros (deve ser atualizado com o total real)
const rowsPerPage = ref(10); // Quantidade de registros por página
const loading = ref(false);
const gridData = ref([]); // Seus dados iniciais
const itemData = ref(null);
// Itens do grid
const listaNomes = ref([
    { field: 'razaosocial', label: 'Razão Social' },
    { field: 'fantasia', label: 'Nome Fantasia', type: 'date' },
    { field: 'cpf_cnpj_empresa', label: 'CNPJ / CPF' }
]);
// Inicializa os filtros do grid
const initFilters = () => {
    filters.value = {};
    listaNomes.value.forEach((element) => {
        filters.value = { ...filters.value, [element.field]: { value: '', matchMode: 'contains' } };
    });
};
const filters = ref({});
const lazyParams = ref({});
const urlFilters = ref('');

const clearFilter = () => {
    loading.value = true;

    rowsPerPage.value = 10;
    initFilters();
    lazyParams.value = {
        first: dt.value.first,
        rows: dt.value.rows,
        sortField: null,
        sortOrder: null,
        filters: filters.value
    };

    loadData();
};

const loadData = () => {
    axios.get(`${urlBase.value}`).then((axiosRes) => {
        gridData.value = axiosRes.data.data;
        loading.value = false;
    });
};
const mode = ref('grid');
const menu = ref();

const exportCSV = () => {
    dt.value.exportCSV();
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
        command: ($event) => {
            deleteRow($event);
        }
    }
]);
const toggle = (event) => {
    menu.value.toggle(event);
};
const getItem = (data) => {
    itemData.value = data;
};
watchEffect(() => {
    mountUrlFilters();
});
</script>

<template>
    <div class="card">
        <EmpresaForm :mode="mode" @changed="loadData" @cancel="mode = 'grid'" v-if="mode == 'new'" />
        <DataTable
            class="p-fluid"
            :value="gridData"
            lazy
            paginator
            :first="0"
            v-model:filters="filters"
            ref="dt"
            dataKey="id"
            :totalRecords="totalRecords"
            :rows="rowsPerPage"
            :rowsPerPageOptions="[5, 10, 20, 50]"
            :loading="loading"
            @page="onPage($event)"
            @sort="onSort($event)"
            @filter="onFilter($event)"
            filterDisplay="row"
            tableStyle="min-width: 75rem"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            :currentPageReportTemplate="`{first} a {last} de ${totalRecords} registros`"
            scrollable
            scrollHeight="420px"
        >
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <Button icon="pi pi-external-link" label="Exportar" @click="exportCSV($event)" />
                    <Button type="button" icon="pi pi-filter-slash" label="Limpar filtro" outlined @click="clearFilter()" />
                    <Button type="button" icon="pi pi-plus" label="Novo Registro" outlined @click="mode = 'new'" />
                </div>
            </template>
            <!-- <Column field="status" header="Tipo (Ativo: S|N)" :filterMatchMode="'contains'" sortable>
                <template #filter="{ filterModel, filterCallback }">
                    <Dropdown id="mes" optionLabel="label" optionValue="value" v-model="filterModel.value" :options="dropdownMes" @change="filterCallback()" />
                </template>
            </Column> -->
            <Column field="cpf_cnpj_empresa" header="CPF/CNPJ" filterField="cpf_cnpj_empresa" :filterMatchMode="'contains'" sortable>
                <template #filter="{ filterModel, filterCallback }">
                    <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter" placeholder="Pesquise..." />
                </template>
            </Column>
            <Column field="razaosocial" header="Razão Social" filterField="razaosocial" :filterMatchMode="'contains'" sortable>
                <template #filter="{ filterModel, filterCallback }">
                    <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter" placeholder="Pesquise..." />
                </template>
            </Column>
            <Column field="fantasia" header="Nome Fantasia" filterField="fantasia" :filterMatchMode="'contains'" sortable>
                <template #filter="{ filterModel, filterCallback }">
                    <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter" placeholder="Pesquise..." />
                </template>
            </Column>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" icon="pi pi-bars" rounded v-on:click="getItem(data)" @click="toggle" aria-haspopup="true" aria-controls="overlay_menu" class="p-button-outlined" />
                    <Menu ref="menu" id="overlay_menu" :model="itemsButtons" :popup="true" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>