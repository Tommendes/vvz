<script setup>
import { ref, onBeforeMount, onMounted } from 'vue';
import { FilterMatchMode, FilterOperator } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { useRouter } from 'vue-router';
import moment from 'moment';
import EnderecoForm from './EnderecoForm.vue';

import { useUserStore } from '@/stores/user';
const store = useUserStore();

const router = useRouter();

const filters = ref(null);
const menu = ref();
const gridData = ref(null);
const itemData = ref(null);
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/cad-enderecos/${props.itemDataRoot.id}`);
const mode = ref('grid');
const visible = ref(false);
// Props do template
const props = defineProps({
    itemDataRoot: Object // O próprio cadastro
})

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
        id_params_tipo: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        cep: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        logradouro: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        nr: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        cidade: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        bairro: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        uf: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] }
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
const loadData = async () => {
    const url = `${urlBase.value}`;
    await axios.get(url).then((axiosRes) => {
        gridData.value = axiosRes.data.data;
        gridData.value.forEach(element => {
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
        <h5>{{ props.itemDataRoot.nome + (store.userStore.admin >= 1 ? `: (${props.itemDataRoot.id})` : '') }}</h5>
        <EnderecoForm :mode="mode" @changed="loadData" v-if="mode == 'new' && props.itemDataRoot.id"
            :itemDataRoot="props.itemDataRoot" />
        <DataTable :value="gridData" v-if="loading">
            <Column field="id_params_tipo" header="Tipo de Contato" style="min-width: 14rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column field="cep" header="CEP" style="min-width: 25rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column field="logradouro" header="Logradouro" style="min-width: 14rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column field="nr" header="Número" style="min-width: 14rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column field="cidade" header="Cidade" style="min-width: 14rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column field="bairro" header="Bairro" style="min-width: 14rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column field="uf" header="UF" style="min-width: 14rem">
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
            responsiveLayout="scroll" :globalFilterFields="['id_params_tipo', 'cep', 'logradouro', 'nr', 'cidade', 'bairro', 'uf']">
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <Button type="button" icon="pi pi-filter-slash" label="Limpar filtro" outlined @click="clearFilter()" />
                    <Button type="button" icon="pi pi-plus" label="Novo Registro" outlined
                        @click="mode = 'new'; visible = !visible" />
                    <span class="p-input-icon-left">
                        <i class="pi pi-search" />
                        <InputText v-model="filters['global'].value" placeholder="Pesquise..." />
                    </span>
                </div>
            </template>
            <Column field="id_params_tipo" header="Tipo" sortable style="min-width: 14rem">
                <template #body="{ data }">
                    {{ data.id_params_tipo }}
                </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter"
                        placeholder="Filtre por tipo" />
                </template>
            </Column>
            <Column field="cep" header="CEP" sortable style="min-width: 14rem">
                <template #body="{ data }">
                    {{ data.cep }}
                </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter"
                        placeholder="Filtre por CEP" />
                </template>
            </Column>
            <Column field="logradouro" header="Logradouro" sortable style="min-width: 25rem">
                <template #body="{ data }">
                    {{ data.logradouro }}
                </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter"
                        placeholder="Filtre por logradouro" />
                </template>
            </Column>
            <Column field="nr" header="Número" sortable style="min-width: 14rem">
                <template #body="{ data }">
                    {{ data.nr }}
                </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter"
                        placeholder="Filtre por número" />
                </template>
            </Column>
            <Column field="cidade" header="Cidade" sortable style="min-width: 14rem">
                <template #body="{ data }">
                    {{ data.cidade }}
                </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter"
                        placeholder="Filtre por cidade" />
                </template>
            </Column>
            <Column field="bairro" header="Bairro" sortable style="min-width: 14rem">
                <template #body="{ data }">
                    {{ data.bairro }}
                </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter"
                        placeholder="Filtre por bairro" />
                </template>
            </Column>
            <Column field="uf" header="UF" sortable style="min-width: 14rem">
                <template #body="{ data }">
                    {{ data.uf }}
                </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter"
                        placeholder="Filtre por UF" />
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
