<script setup>
import { ref, onBeforeMount, provide, onMounted } from 'vue';
import { FilterMatchMode, FilterOperator } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import OatForm from './OatForm.vue';

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

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
    itemDataRoot: Object // O próprio pv
});
import { useDialog } from 'primevue/usedialog';
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
            showPvOatForm();
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
            if (element.int_ext == 0) element.int_ext = 'Interno';
            else element.int_ext = 'Externo';
            const maxStringLength = 150;
            if (element.descricao.length > maxStringLength) element.descricao = element.descricao.substring(0, maxStringLength).trim() + '...';
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

const dialog = useDialog();
const showPvOatForm = () => {
    dialog.open(OatForm, {
        data: {
            idPv: itemData.value.id_pv,
            idPvOat: itemData.value.id
        },
        props: {
            header: `OAT ${itemData.value.nr_oat ? itemData.value.nr_oat : ''}${userData.admin >= 1 ? ` - (Registro: ${itemData.value.id})` : ''}`,
            style: {
                width: '100rem',
            },
            breakpoints: {
                '1199px': '75vw',
                '575px': '90vw'
            },
            modal: true
        },
        // templates: {
        //     footer: markRaw(FooterDemo)
        // },
        onClose: (options) => {
            const data = options.data;
            if (data) {
                // const buttonType = data.buttonType;
                // const summary_and_detail = buttonType ? { summary: 'No Product Selected', detail: `Pressed '${buttonType}' button` } : { summary: 'Product Selected', detail: data.name };
            }
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
    <div class="card" style="min-width: 100%">
        <!-- <OatForm @changed="loadData" v-if="['new', 'edit'].includes(mode) && props.itemDataRoot.id" :itemDataRoot="props.itemDataRoot" /> -->
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
            <Column field="nr_oat" header="OAT" sortable style="min-width: 120px">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2 text-lg">
                        {{ data.nr_oat.toString().padStart(3, '0') }}
                    </div>
                </template>
            </Column>
            <Column field="int_ext" header="Atendimento" sortable style="min-width: 120px">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2 text-lg">{{ data.int_ext }}</div>
                </template>
            </Column>
            <Column field="garantia" header="Garantia" sortable style="min-width: 120px">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2 text-lg">
                        {{ data.garantia == 1 ? 'Sim' : 'Não' }}
                    </div>
                </template>
            </Column>
            <Column field="descricao" header="Descricao" sortable style="min-width: 120px">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2 text-lg">
                        <span v-html="data.descricao"></span>
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
