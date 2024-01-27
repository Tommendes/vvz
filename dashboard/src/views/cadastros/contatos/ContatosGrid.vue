<script setup>
import { ref, onBeforeMount, provide } from 'vue';
import { FilterMatchMode, FilterOperator } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess } from '@/toast';
import ContatoForm from './ContatoForm.vue';
import { renderizarHTML } from '@/global';
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

const filters = ref(null);
const menu = ref();
const gridData = ref(null);
const itemData = ref(null);
const loading = ref(false);
const urlBase = ref(`${baseApiUrl}/cad-contatos/${props.itemDataRoot.id}`);
const mode = ref('grid');
// Props do template
const props = defineProps({
    itemDataRoot: Object // O próprio cadastro
});
// Ref do gridData
const dt = ref(null);
// Inicializa os filtros
const initFilters = () => {
    filters.value = {
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        tipo: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        pessoa: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        departamento: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        meio: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] }
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
    loading.value = true;
    await axios.get(url).then((axiosRes) => {
        gridData.value = axiosRes.data.data;
        gridData.value.forEach((element) => {
            element.meioRenderizado = renderizarHTML(element.meio);
        });
        loading.value = false;
    });
};
// Exclui o registro
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
            axios.delete(`${urlBase.value}/${itemData.value.id}`).then(async () => {
                defaultSuccess('Registro excluído com sucesso!');
                await loadData();
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
    <div class="card">
        <ContatoForm @changed="loadData" v-if="['new', 'edit'].includes(mode) && props.itemDataRoot.id" :itemDataRoot="props.itemDataRoot" />
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
            :globalFilterFields="['tipo', 'pessoa', 'departamento', 'meio']"
        >
            <!-- scrollHeight="420px" -->
            <template #header>
                <div class="flex justify-content-end gap-3">
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
                        <InputText v-model="filters['global'].value" placeholder="Pesquise..." />
                    </span>
                </div>
            </template>
            <Column field="tipo" header="Tipo de Contato" sortable style="min-width: 14rem">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2 text-lg">
                        {{ data.tipo }}
                    </div>
                </template>
            </Column>
            <Column field="pessoa" header="Pessoa" sortable style="min-width: 20rem">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2 text-lg">
                        {{ data.pessoa }}
                    </div>
                </template>
            </Column>
            <Column field="meio" header="Meio" sortable style="min-width: 30rem">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2 text-lg">
                        <span v-html="data.meioRenderizado" />
                    </div>
                </template>
            </Column>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" icon="fa-solid fa-bars" rounded v-on:click="getItem(data)" @click="toggle" aria-haspopup="true" aria-controls="overlay_menu" class="p-button-outlined" />
                    <Menu ref="menu" id="overlay_menu" :model="itemsButtons" :popup="true" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
