<script setup>
import { ref, onBeforeMount } from 'vue';
import { FilterMatchMode, FilterOperator } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultError } from '@/toast';
import moment from 'moment';
import CadastroForm from './CadastroForm.vue';

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

import { useUserStore } from '@/stores/user';
const store = useUserStore();

import { useRouter } from 'vue-router';
const router = useRouter();

const filters = ref(null);
const menu = ref();
const gridData = ref(null);
const itemData = ref(null);
const loading = ref(false);
const urlBase = ref(`${baseApiUrl}/cadastros`);
const urlFilter = ref('');
const mode = ref('grid');
const totalRecords = ref(0);
const dt = ref();

import { Mask } from 'maska';
const masks = ref({
    cpf: new Mask({
        mask: '###.###.###-##'
    }),
    cnpj: new Mask({
        mask: '##.###.###/####-##'
    })
});

const initFilters = () => {
    filters.value = {
        // global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        global: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        tipo_cadas: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        cpf_cnpj: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        nome: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        id_params_atuacao: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        aniversario: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] }
    };
};

initFilters();
const clearFilter = () => {
    initFilters();
};
const itemsButtons = ref([
    {
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => {
            router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/cadastro/${itemData.value.id}` });
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
const loadData = () => {
    if (!loading.value) {
        loading.value = true;
        const url = `${urlBase.value}${urlFilter.value}`;
        axios
            .get(url)
            .then((axiosRes) => {
                gridData.value = axiosRes.data.data;
                totalRecords.value = axiosRes.data.totalRecords;
                gridData.value.forEach((element) => {
                    // Exibe dado com máscara
                    if (element.cpf_cnpj && element.cpf_cnpj.length == 11) element.cpf_cnpj = masks.value.cpf.masked(element.cpf_cnpj);
                    else if (element.cpf_cnpj && element.cpf_cnpj.length == 14) element.cpf_cnpj = masks.value.cnpj.masked(element.cpf_cnpj);
                    // Converte data en para pt
                    if (element.aniversario) element.aniversario = moment(element.aniversario).format('DD/MM/YYYY');
                });
                loading.value = false;
            })
            .catch((error) => {
                defaultError(error);
                loading.value = false;
            });
    }
};

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

const exportCSV = () => {
    dt.value.exportCSV();
};

const onPage = (event) => {
    console.log(event);
    // loadData();
};
const onSort = (event) => {
    console.log(event);
    // loadData();
};
const onFilter = (event) => {
    if (event.filteredValue.length < 100) {
        totalRecords.value = event.filteredValue.length;
        if (filters.value.global.value && filters.value.global.value.trim().length >= 3) {
            urlFilter.value = `?filter=${filters.value.global.value}`;
            loadData();
        } else {
            urlFilter.value = '';
        }
    }
};

onBeforeMount(() => {
    initFilters();
    loadData();
});
</script>

<template>
    <div class="card">
        <CadastroForm :mode="mode" @changed="loadData" @cancel="mode = 'grid'" v-if="mode == 'new'" />
        <p>{{ filters.global.value }}</p>
        <p>{{ filters.global.value ? filters.global.value.trim().length : '0' }}</p>
        <p>{{ urlFilter }}</p>
        <DataTable :value="gridData" class="p-datatable-sm p-datatable-md p-datatable-lg p-datatable-xl p-fluid" v-if="loading">
            <Column field="tipo_cadas" class="sm:d-sm-none md:d-block" header="Tipo" style="min-width: 14rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column field="cpf_cnpj" header="CPF/CNPJ" style="min-width: 14rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column field="nome" header="Nome" style="min-width: 25rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column field="id_params_atuacao" class="sm:d-sm-none md:d-block" header="Atuação" style="min-width: 14rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column field="aniversario" header="Aniversário" style="min-width: 14rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column headerStyle="width: 5rem; text-align: center">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
        </DataTable>
        <!-- class="p-datatable-gridlines" -->
        <DataTable
            v-else
            ref="dt"
            :first="0"
            :totalRecords="totalRecords"
            @page="onPage($event)"
            @sort="onSort($event)"
            @filter="onFilter($event)"
            :value="gridData"
            :paginator="true"
            :rowsPerPageOptions="[5, 10, 20, 50]"
            tableStyle="min-width: 50rem"
            :rows="5"
            dataKey="id"
            :rowHover="true"
            v-model:filters="filters"
            filterDisplay="menu"
            :loading="loading"
            :filters="filters"
            :globalFilterFields="['tipo_cadas', 'cpf_cnpj', 'nome', 'id_params_atuacao', 'aniversario']"
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
                    <span class="p-input-icon-left">
                        <i class="pi pi-search" />
                        <InputText v-model="filters['global'].value" placeholder="Pesquise..." />
                    </span>
                </div>
            </template>
            <Column field="tipo_cadas" class="sm:d-sm-none md:d-block" header="Tipo" sortable style="min-width: 14rem">
                <template #body="{ data }">
                    {{ data.tipo_cadas }}
                </template>
                <!-- <template #filter="{ filterModel, filterCallback }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Filtre por Tipo" @keydown.enter="filterCallback()" />
                </template> -->
            </Column>
            <Column field="cpf_cnpj" header="CPF/CNPJ" sortable style="min-width: 14rem">
                <template #body="{ data }">
                    {{ data.cpf_cnpj }}
                </template>
                <!-- <template #filter="{ filterModel, filterCallback }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Filtre por CPF ou CNPJ" @keydown.enter="filterCallback()" />
                </template> -->
            </Column>
            <Column field="nome" header="Nome" sortable style="min-width: 25rem">
                <template #body="{ data }">
                    {{ data.nome }}
                </template>
                <!-- <template #filter="{ filterModel, filterCallback }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Filtre por nome" @keydown.enter="filterCallback()" />
                </template> -->
            </Column>
            <Column field="atuacao" class="sm:d-sm-none md:d-block" header="Atuação" sortable style="min-width: 14rem">
                <template #body="{ data }">
                    {{ data.atuacao }}
                </template>
                <!-- <template #filter="{ filterModel, filterCallback }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Filtre por Atuação" @keydown.enter="filterCallback()" />
                </template> -->
            </Column>
            <Column field="aniversario" header="Aniversário" sortable style="min-width: 14rem">
                <template #body="{ data }">
                    {{ data.aniversario }}
                </template>
                <!-- <template #filter="{ filterModel, filterCallback }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Filtre por Aniversário" @keydown.enter="filterCallback()" />
                </template> -->
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
