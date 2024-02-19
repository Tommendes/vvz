<script setup>
import { ref, onBeforeMount } from 'vue';
import { FilterMatchMode } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess } from '@/toast';
import { useConfirm } from 'primevue/useconfirm';
import Breadcrumb from '../../components/Breadcrumb.vue';
import ComissaoForm from './ComissaoForm.vue';
const confirm = useConfirm();

// Cookies do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();
const filters = ref(null);
const menu = ref();
const gridData = ref(null);
const itemData = ref(null);
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/fin-cc`);
// Exlui um registro
const deleteRow = () => {
    confirm.require({
        group: 'templating',
        header: 'Confirmar exclusão',
        message: 'Você tem certeza que deseja excluir este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
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
// Itens do grid
const listaNomes = ref([
    { field: 'codigo', label:' Código da despesa ou receita' },
    { field: 'tipo', label:' Despesa ou receita' },
    { field: 'descricao', label:' Descrição do centro de custo' }
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
const itemsButtons = ref([
    {
        label: 'Ver',
        icon: 'fa-regular fa-eye fa-beat-fade',
        command: () => {
            router.push({ path: `/${userData.schema_description}/comissao/${itemData.value.id}` });
        }
    },
    {
        label: 'Excluir',
        icon: 'fa-solid fa-fire fa-fade',
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
    loading.value = true;
    axios.get(`${urlBase.value}`).then((axiosRes) => {
        gridData.value = axiosRes.data.data;
        gridData.value.forEach((element) => {
        });
        loading.value = false;
    });
};
const mode = ref('grid');
onBeforeMount(() => {
    initFilters();
    loadData();
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Comissões', to: route.fullPath }]" />
    <div class="card w-95">
        <ComissaoForm :mode="mode" @changed="loadData" @cancel="mode = 'grid'" v-if="mode == 'new'" />
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
            :globalFilterFields="['codigo', 'tipo', 'descricao']"
        >
            <template #header>
                <div class="flex flex-column gap-3">
                    <Button type="button" icon="fa-solid fa-plus" label="Novo Registro" outlined @click="mode = 'new'" />
                    <Button type="button" icon="fa-solid fa-filter" label="Limpar filtro" outlined @click="clearFilter()" />
                    <span class="p-input-icon-left">
                        <i class="fa-solid fa-magnifying-glass" />
                        <InputText class="w-full" v-model="filters['global'].value" placeholder="Pesquise..." />
                    </span>
                </div>
            </template>
            <template v-for="nome in listaNomes" :key="nome">
                <Column :field="nome.field" :header="nome.label" :filterField="nome.field" :filterMatchMode="'contains'" sortable :dataType="nome.type" >
                    <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                        <Dropdown :id="nome.field" optionLabel="label" optionValue="value" v-model="filterModel.value" :options="nome.list" @change="filterCallback()" />
                    </template>
                    <template v-else-if="nome.type == 'date'" #filter="{ filterModel, filterCallback }">
                        <Calendar v-model="filterModel.value" dateFormat="dd/mm/yy" selectionMode="range" :numberOfMonths="2" placeholder="dd/mm/aaaa" mask="99/99/9999" @input="filterCallback()" />
                    </template>
                    <template v-else #filter="{ filterModel, filterCallback }">
                        <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter" placeholder="Pesquise..." />
                    </template>
                    <template #body="{ data }">
                        <span v-html="data[nome.field]"></span>
                    </template>
                </Column>
            </template>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" icon="fa-solid fa-bars" rounded v-on:click="getItem(data)" @click="toggle" aria-haspopup="true" aria-controls="overlay_menu" class="p-button-outlined" />
                    <Menu ref="menu" id="overlay_menu" :model="itemsButtons" :popup="true" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
<style scoped>
.w-95{
    width: 95vw;
    max-width: 100%;
}
</style>
