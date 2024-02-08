<script setup>
import { ref, onBeforeMount, provide } from 'vue';
import { FilterMatchMode, FilterOperator } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess } from '@/toast';
import EnderecoForm from './EnderecoForm.vue';

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
const filters = ref(null);
const menu = ref();
const gridData = ref(null);
const itemData = ref(null);
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/cad-enderecos/${props.itemDataRoot.id}`);
const mode = ref('grid');
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
        id_params_tipo: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        cep: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        logradouro: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        nr: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        cidade: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        bairro: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        uf: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] }
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
        <EnderecoForm @changed="loadData" v-if="['new', 'edit'].includes(mode) && props.itemDataRoot.id" :itemDataRoot="props.itemDataRoot" />
        <DataTable
            style="font-size: 1rem"
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
            :globalFilterFields="['id_params_tipo', 'cep', 'logradouro', 'nr', 'cidade', 'bairro', 'uf']"
        >
            <template #header>
                <div class="flex flex-column-reverse gap-3">
                    <Button type="button" icon="fa-solid fa-filter" label="Limpar filtro" outlined @click="clearFilter()" />
                    <Button
                        type="button"
                        icon="fa-solid fa-plus"
                        label="Novo Registro"
                        outlined
                        @click="
                            itemData = { id_cadastros: props.itemDataRoot.id };
                            mode = 'new';
                        "
                    />
                    <span class="p-input-icon-left">
                        <i class="fa-solid fa-magnifying-glass" />
                        <InputText class="w-full" v-model="filters['global'].value" placeholder="Pesquise..." />
                    </span>
                </div>
            </template>
            <Column field="allFields" header="Endereços" sortable style="min-width: 470px">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2 text-lg">
                        {{ data.endereco }}
                    </div>
                </template>
            </Column>
            <Column field="cidade" header="Cidade" sortable style="min-width: 250px">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2 text-lg">{{ data.cidade }}{{ data.uf ? `, ${data.uf}` : '' }}</div>
                </template>
            </Column>
            <Column field="tipo" header="TIPO" sortable style="min-width: 120px">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2 text-lg">
                        {{ data.tipo }}
                    </div>
                </template>
            </Column>
            <template #filter="{ filterModel }">
                <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Filtre por informações" />
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
