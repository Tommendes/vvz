<script setup>
import { ref, onBeforeMount, onMounted } from 'vue';
import { FilterMatchMode, FilterOperator } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import OatForm from './OatForm.vue';
const filters = ref(null);
const gridData = ref(null);
const itemData = ref(null);
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/pv-oat/${props.itemDataRoot.id}`);
// Props do template
const props = defineProps(['itemDataRoot']); // O próprio pv
import { useDialog } from 'primevue/usedialog';
// Inicializa os filtros
const initFilters = () => {
    filters.value = {
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        nr_oat: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        int_ext: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        descricao: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] }
    };
};
// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
// Inicializa os filtros
initFilters();
// Limpa os filtros
const clearFilter = () => {
    initFilters();
};
// Carrega os dados da grid
const loadData = async () => {
    const url = `${urlBase.value}`;
    await axios.get(url).then((axiosRes) => {
        gridData.value = axiosRes.data.data;
        gridData.value.forEach((element) => {
            element.nr_oat = element.nr_oat.toString().padStart(3, '0');
            if (element.int_ext == 0) element.int_ext = 'Interno';
            else element.int_ext = 'Externo';
            const maxStringLength = 100;
            if (element.descricao && element.descricao.length > maxStringLength) element.descricao = element.descricao.substring(0, maxStringLength).trim() + ' ...';
        });
        loading.value = false;
    });
};
defineExpose({ loadData }); // Expondo a função para o componente pai

const dialog = useDialog();
const showPvOatForm = (data) => {
    itemData.value = data;
    dialog.open(OatForm, {
        data: {
            idPv: itemData.value.id_pv,
            idPvOat: itemData.value.id,
            idCadastro: props.itemDataRoot.id_cadastros,
            lastStatus: props.itemDataRoot.last_status
        },
        props: {
            header: `OAT ${props.itemDataRoot.pv_nr}.${itemData.value.nr_oat ? itemData.value.nr_oat.toString().padStart(3, '0') : ''}${userData.admin >= 2 ? ` (${itemData.value.id})` : ''}`,
            style: {
                width: Math.floor(window.innerWidth * 0.9) + 'px'
            },
            breakpoints: {
                '1199px': '75vw',
                '575px': '90vw'
            },
            modal: true
        },
        onClose: () => {
            loadData();
        }
    });
};

// Carrega as operações básicas do formulário
onBeforeMount(() => {
    initFilters();
});
onMounted(() => {
    setTimeout(() => {
        loadData();
    }, Math.random() * 1000 + 250);
});
</script>

<template>
    <div class="card">
        <div class="col-12" v-if="gridData && gridData.length == 0">
            <div class="card bg-green-200 mt-3">
                <div class="flex flex-wrap align-items-center justify-content-center">
                    <div class="border-round bg-primary-100 h-12rem p-3 m-3">
                        <div class="min-h-full border-round bg-primary font-bold p-3 flex align-items-center justify-content-center">Não foram registradas OATs para este Pós Venda</div>
                    </div>
                </div>
            </div>
        </div>
        <DataTable
            v-else
            style="font-size: 0.9rem"
            ref="dt"
            :value="gridData"
            :paginator="true"
            :rowsPerPageOptions="[5, 10, 20, 50]"
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
            :globalFilterFields="['nr_oat', 'int_ext', 'descricao']"
        >
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <Button type="button" icon="pi pi-filter-slash" label="Limpar filtro" outlined @click="clearFilter()" />
                    <span class="p-input-icon-left">
                        <i class="pi pi-search" />
                        <InputText v-model="filters['global'].value" placeholder="Pesquise..." />
                    </span>
                </div>
            </template>
            <Column field="nr_oat" header="OAT" sortable>
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2">
                        {{ data.nr_oat }}
                    </div>
                </template>
            </Column>
            <Column field="int_ext" header="Atendimento">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2">{{ data.int_ext }}</div>
                </template>
            </Column>
            <Column field="descricao" header="Descricao" sortable>
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2">
                        <span v-html="data.descricao"></span>
                    </div>
                </template>
            </Column>
            <template #filter="{ filterModel }">
                <InputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Filtre por informações" />
            </template>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" class="p-button-outlined" rounded icon="fa-solid fa-bars" @click="showPvOatForm(data)" v-tooltip.left="'Clique para mais opções'" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
