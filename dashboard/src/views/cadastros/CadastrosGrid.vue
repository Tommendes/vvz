<script setup>
import { ref, onBeforeMount } from 'vue';
import { FilterMatchMode, FilterOperator } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import moment from 'moment';
import CadastroForm from './CadastroForm.vue';

const store = useUserStore();

const router = useRouter();

const filters = ref(null);
const menu = ref();
const gridData = ref(null);
const itemData = ref(null);
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/cadastros`);
const mode = ref('grid')
const visible = ref(false)

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
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        tipo_cadas: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        cpf_cnpj: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        nome: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        id_params_atuacao: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        aniversario: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
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
    axios.get(`${urlBase.value}`).then((axiosRes) => {
        gridData.value = axiosRes.data.data;
        gridData.value.forEach(element => {
            // Exibe dado com máscara
            if (element.cpf_cnpj && element.cpf_cnpj.length == 11) element.cpf_cnpj = masks.value.cpf.masked(element.cpf_cnpj);
            else if (element.cpf_cnpj && element.cpf_cnpj.length == 14) element.cpf_cnpj = masks.value.cnpj.masked(element.cpf_cnpj);
            // Converte data en para pt
            if (element.aniversario) element.aniversario = moment(element.aniversario).format('DD/MM/YYYY');
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
        <Dialog v-model:visible="visible" modal header="Header" :style="{ width: '50vw' }">
            <CadastroForm :mode="mode" @changed="loadData" />
        </Dialog>

        <DataTable :value="gridData" v-if="loading">
            <Column field="tipo_cadas" header="Tipo" style="min-width: 14rem">
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
            <Column field="id_params_atuacao" header="Atuação" style="min-width: 14rem">
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
        <DataTable v-else :value="gridData" :paginator="true" class="p-datatable-gridlines" :rows="10" dataKey="id"
            :rowHover="true" v-model:filters="filters" filterDisplay="menu" :loading="loading" :filters="filters"
            responsiveLayout="scroll"
            :globalFilterFields="['tipo_cadas', 'cpf_cnpj', 'nome', 'id_params_atuacao', 'aniversario']">
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <Button type="button" icon="pi pi-filter-slash" label="Limpar filtro" outlined @click="clearFilter()" />
                    <Button type="button" icon="pi pi-plus" label="Novo Registro" outlined @click="mode = 'new'; visible=!visible" />
                    <span class="p-input-icon-left">
                        <i class="pi pi-search" />
                        <InputText v-model="filters['global'].value" placeholder="Pesquise..." />
                    </span>
                </div>
            </template>
            <!-- <template #empty> Sem registros por enquanto. </template> -->
            <Column field="tipo_cadas" header="Tipo" sortable style="min-width: 14rem">
                <template #body="{ data }">
                    {{ data.tipo_cadas }}
                </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter"
                        placeholder="Filtre por Tipo" />
                </template>
            </Column>
            <Column field="cpf_cnpj" header="CPF/CNPJ" sortable style="min-width: 14rem">
                <template #body="{ data }">
                    {{ data.cpf_cnpj }}
                </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter"
                        placeholder="Filtre por CPF ou CNPJ" />
                </template>
            </Column>
            <Column field="nome" header="Nome" sortable style="min-width: 25rem">
                <template #body="{ data }">
                    {{ data.nome }}
                </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter"
                        placeholder="Filtre por nome" />
                </template>
            </Column>
            <Column field="atuacao" header="Atuação" sortable style="min-width: 14rem">
                <template #body="{ data }">
                    {{ data.atuacao }}
                </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter"
                        placeholder="Filtre por Atuação" />
                </template>
            </Column>
            <Column field="aniversario" header="Aniversário" sortable style="min-width: 14rem">
                <template #body="{ data }">
                    {{ data.aniversario }}
                </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter"
                        placeholder="Filtre por Aniversário" />
                </template>
            </Column>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" icon="pi pi-bars" rounded v-on:click="getItem(data)" @click="toggle"
                        aria-haspopup="true" aria-controls="overlay_menu" class="p-button-outlined" />
                    <Menu ref="menu" id="overlay_menu" :model="itemsButtons" :popup="true" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
