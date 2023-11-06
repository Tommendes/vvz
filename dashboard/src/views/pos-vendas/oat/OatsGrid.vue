<script setup>
import { ref, onBeforeMount, provide } from 'vue';
import { FilterMatchMode, FilterOperator } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import OatForm from './OatForm.vue';

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
import moment from 'moment';

import { useUserStore } from '@/stores/user';
const store = useUserStore();
const filters = ref(null);
const menu = ref();
const gridData = ref(null);
const itemData = ref(null);
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/pv-oat/${props.itemDataRoot.id}`);
const mode = ref('grid');
const visible = ref(false);
// Props do template
const props = defineProps({
    itemDataRoot: Object // O próprio cadastro
});
// Máscaras
import { Mask } from 'maska';
const masks = ref({
    cep: new Mask({
        mask: '##.###-###'
    })
});
// Inicializa os filtros
const initFilters = () => {
    filters.value = {
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        nr_oat: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        int_ext: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        garantia: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        descricao: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        valor_total: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] }
    };
};
// Inicializa os filtros
initFilters();
// Limpa os filtros
const clearFilter = () => {
    initFilters();
};
// Itens do menu de contexto
const itemsButtons = ref([
    {
        label: 'Ver',
        icon: 'fa-regular fa-eye fa-beat-fade',
        command: () => {
            mode.value = 'edit';
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
// Abre o menu de contexto
const toggle = (event) => {
    menu.value.toggle(event);
};
// Obtém o item selecionado
const getItem = (data) => {
    itemData.value = data;
};
// Carrega os dados da grid
const loadData = async () => {
    const url = `${urlBase.value}`;
    await axios.get(url).then((axiosRes) => {
        gridData.value = axiosRes.data.data;
        gridData.value.forEach((element) => {
            element.endereco = '';
            if (element.logradouro) element.endereco += element.logradouro;
            if (element.nr) element.endereco += `, ${element.nr}`;
            if (element.complnr && element.complnr.trim().length > 0) element.endereco += `, ${element.complnr.trim()}`;
            if (element.cep && element.cep.trim().length >= 8) element.cep = masks.value.cep.masked(element.cep);
        });
        loading.value = false;
    });
};
// Excluir registro
const deleteRow = () => {
    confirm.require({
        group: 'templating',
        header: 'Confirmar exclusão',
        message: 'Você tem certeza que deseja excluir este registro?',
        icon: 'fa-solid fa-question fa-beat',
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
// Carrega os dados do formulário
provide('itemData', itemData);
// Carrega o modo do formulário
provide('mode', mode);
// Carrega as operações básicas do formulário
onBeforeMount(() => {
    initFilters();
    loadData();
});
</script>

<template>
    <div class="card" style="min-width: 100%">
        <OatForm @changed="loadData" v-if="['new', 'edit'].includes(mode) && props.itemDataRoot.id" :itemDataRoot="props.itemDataRoot" />
        <DataTable
            style="font-size: 0.9rem"
            ref="dt"
            :value="gridData"
            :paginator="true"
            :rowsPerPageOptions="[5, 10, 20, 50]"
            tableStyle="min-width: 50rem"
            :rows="5"
            dataKey="id"
            :rowHover="true"
            v-model:filters="filters"
            filterDisplay="menu"
            :filters="filters"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            currentPageReportTemplate="{first} a {last} de {totalRecords} registros"
            scrollable
            scrollHeight="415px"
            :globalFilterFields="['nr_oat', 'int_ext', 'garantia', 'descricao', 'valor_total']"
        >
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <Button type="button" icon="pi pi-filter-slash" label="Limpar filtro" outlined @click="clearFilter()" />
                    <Button
                        type="button"
                        icon="pi pi-plus"
                        label="Novo Registro"
                        outlined
                        @click="
                            itemData = { id_cadastros: props.itemDataRoot.id };
                            mode = 'new';
                        "
                    />
                    <span class="p-input-icon-left">
                        <i class="pi pi-search" />
                        <InputText v-model="filters['global'].value" placeholder="Pesquise..." />
                    </span>
                </div>
            </template>
            <Column field="nr_oat" header="Número OAT" sortable style="min-width: 200px">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2 text-lg">
                        {{ data.nr_oat }}
                    </div>
                </template>
            </Column>
            <Column field="int_ext" header="Interno/Externo" sortable style="min-width: 250px">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2 text-lg">{{ data.int_ext }}{{ data.uf ? `, ${data.uf}` : '' }}</div>
                </template>
            </Column>
            <Column field="garantia" header="Garantia" sortable style="min-width: 120px">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2 text-lg">
                        {{ data.garantia }}
                    </div>
                </template>
            </Column>
            <Column field="descricao" header="Descricao" sortable style="min-width: 120px">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2 text-lg">
                        {{ data.descricao }}
                    </div>
                </template>
            </Column>
            <template #filter="{ filterModel }">
                <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Filtre por informações" />
            </template>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" icon="pi pi-bars" rounded v-on:click="getItem(data)" @click="toggle" aria-haspopup="true" aria-controls="overlay_menu" class="p-button-outlined" />
                    <Menu ref="menu" id="overlay_menu" :model="itemsButtons" :popup="true" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
