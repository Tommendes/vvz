<script setup>
import { ref, onBeforeMount } from 'vue';
import { FilterMatchMode } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess } from '@/toast';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useConfirm } from 'primevue/useconfirm';
import Breadcrumb from '../../components/Breadcrumb.vue';
import AssistenciaForm from './AssistenciaForm.vue';
const confirm = useConfirm();

const store = useUserStore();
const router = useRouter();
const filters = ref(null);
const menu = ref();
const gridData = ref(null);
const itemData = ref(null);
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/pv-status`);
// Exlui um registro
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
// Itens do grid
const listaNomes = ref([
    { field: 'id_pv', label: 'PV', minWidth: '30rem' },
    { field: 'status_pv', label: 'Status PV', minWidth: '30rem' }
]);
// Inicializa os filtros do grid
const initFilters = () => {
    filters.value = { global: { value: '', matchMode: FilterMatchMode.CONTAINS } };
    listaNomes.value.forEach((element) => {
        filters.value = { ...filters.value, [element.field]: { value: '', matchMode: 'contains' } };
    });
};
// import { Mask } from 'maska';
// const masks = ref({
//     telefone: new Mask({
//         mask: '(##) #####-####'
//     })
// });
initFilters();
const clearFilter = () => {
    initFilters();
};
const itemsButtons = ref([
    {
        label: 'Ver',
        icon: 'fa-regular fa-eye fa-beat-fade',
        command: () => {
            router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/assistencia/${itemData.value.id}` });
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
            // if (itemData.value.telefone_contato) itemData.value.telefone_contato = masks.value.telefone.masked(itemData.value.telefone_contato);
            // if (element.cpf_cnpj_empresa && element.cpf_cnpj_empresa.length == 11) element.cpf_cnpj_empresa = masks.value.cpf.masked(element.cpf_cnpj_empresa);
            // else element.cpf_cnpj_empresa = masks.value.cnpj.masked(element.cpf_cnpj_empresa);
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
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Assistencias' }]" />
    <div class="card">
        <AssistenciaForm :mode="mode" @changed="loadData" @cancel="mode = 'grid'" v-if="mode == 'new'" />
        <DataTable
            style="font-size: 0.9rem"
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
            :globalFilterFields="['id_pv', 'status_pv']"
        >
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <Button type="button" icon="pi pi-plus" label="Novo Registro" outlined @click="mode = 'new'" />
                    <Button type="button" icon="pi pi-filter-slash" label="Limpar filtro" outlined @click="clearFilter()" />
                    <span class="p-input-icon-left">
                        <i class="pi pi-search" />
                        <InputText v-model="filters['global'].value" placeholder="Pesquise..." />
                    </span>
                </div>
            </template>
            <template v-for="nome in listaNomes" :key="nome">
                <Column :field="nome.field" :header="nome.label" :filterField="nome.field" :filterMatchMode="'contains'" sortable :dataType="nome.type" :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}`">
                    <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                        <Dropdown :id="nome.field" optionLabel="label" optionValue="value" v-model="filterModel.value" :options="nome.list" @change="filterCallback()" style="min-width: 20rem" />
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
                    <Button type="button" icon="pi pi-bars" rounded v-on:click="getItem(data)" @click="toggle" aria-haspopup="true" aria-controls="overlay_menu" class="p-button-outlined" />
                    <Menu ref="menu" id="overlay_menu" :model="itemsButtons" :popup="true" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
