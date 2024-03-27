<script setup>
import { ref, onBeforeMount } from 'vue';
import { FilterMatchMode, FilterOperator } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess } from '@/toast';
import ContatoForm from './ContatoForm.vue';
import { renderizarHTML } from '@/global';
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

const filters = ref(null);
const gridData = ref(null);
const itemData = ref(null);
const loading = ref(false);
const props = defineProps({
    itemDataRoot: Object // O próprio cadastro
});
const urlBase = ref(`${baseApiUrl}/cad-contatos/${props.itemDataRoot.id}`);
const mode = ref('grid');
// Props do template
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
// Obtém o item selecionado
const viewItem = (data) => {
    mode.value = 'grid';
    setTimeout(() => {
        itemData.value = data;
        mode.value = 'edit';
    }, 100);
};
// Carrega os dados da grid
const loadData = async () => {
    const url = `${urlBase.value}`;
    loading.value = true;
    await axios.get(url).then((axiosRes) => {
        gridData.value = axiosRes.data.data;
        gridData.value.forEach((element) => {
            if (element.meio) element.meioRenderizado = renderizarHTML(element.meio);
        });
        loading.value = false;
    });
};
// Exclui o registro
const deleteItem = (row) => {
    confirm.require({
        group: 'templating',
        header: 'Confirmar exclusão',
        message: 'Você tem certeza que deseja excluir este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            axios.delete(`${urlBase.value}/${row.id}`).then(async () => {
                defaultSuccess('Registro excluído com sucesso!');
                await loadData();
            });
        },
        reject: () => {
            return false;
        }
    });
};
const setNewContact = () => {
    mode.value = 'grid';
    setTimeout(() => {
        itemData.value = { id_cadastros: props.itemDataRoot.id };
        mode.value = 'new';
    }, 100);
};
// Carrega as operações básicas do formulário
onBeforeMount(() => {
    initFilters();
    loadData();
});
</script>

<template>
    <div class="card">
        <ContatoForm @changed="loadData()" @cancel="mode = 'grid'" v-if="['new', 'edit'].includes(mode) && props.itemDataRoot.id" :itemDataRoot="itemData" :modeRoot="mode" />
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
                    <Button type="button" icon="fa-solid fa-plus" label="Novo contato" outlined @click="setNewContact" />
                    <span class="p-input-icon-left">
                        <i class="fa-solid fa-magnifying-glass" />
                        <InputText v-model="filters['global'].value" placeholder="Pesquise..." />
                    </span>
                </div>
            </template>
            <Column field="pessoa" header="Pessoa" sortable style="min-width: 20rem">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2 text-lg">
                        {{ data.pessoa }}
                    </div>
                </template>
            </Column>
            <Column field="departamento" header="Departamento" sortable style="min-width: 14rem">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2 text-lg">
                        {{ data.departamento }}
                    </div>
                </template>
            </Column>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <div class="p-inputgroup flex-1 gap-2">
                        <Button type="button" icon="fa-regular fa-eye fa-beat-fade" rounded class="p-button-outlined" severity="default" v-tooltip.top="'Clique para ver o contato'" @click="viewItem(data)" />
                        <Button type="button" icon="fa-solid fa-fire fa-fade" rounded class="p-button-outlined" severity="danger" v-tooltip.top="'Clique para excluir o contato'" @click="deleteItem(data)" />
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>
</template>
