<script setup>
import { ref, onBeforeMount, inject } from 'vue';
import { FilterMatchMode } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import ComposicaoForm from './ComposicaoForm.vue';
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { useRoute } from 'vue-router';
const route = useRoute();

const filters = ref(null);
const gridData = ref(null);
// Campos de formulário
const itemDataProposta = inject('itemData');
const itemData = ref({});
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/com-prop-compos`);
// Itens do grid
const listaNomes = ref([
    { field: 'comp_ativa', label: 'Ativo', minWidth: '5rem', tagged: true },
    { field: 'compoe', label: 'Compõe', minWidth: '5rem', tagged: true },
    { field: 'compos_nr', label: 'Número', minWidth: '5rem' },
    { field: 'localizacao', label: 'Descrição um', minWidth: '15rem' },
    { field: 'tombamento', label: 'Descrição dois', minWidth: '15rem' }
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
const goField = (data) => {
    mode.value = 'grid';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
        itemData.value = data;
        mode.value = 'view';
    }, Math.random() * 1000);
};

const duplicateField = (data) => {
    mode.value = 'grid';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
        itemData.value = data;
        mode.value = 'clone';
    }, Math.random() * 1000);
};

import { useConfirm } from 'primevue/useconfirm';
import { defaultSuccess } from '@/toast';
const confirm = useConfirm();
const removeComposicao = (item) => {
    confirm.require({
        id: 'removeComposicao',
        group: 'templating',
        header: 'Confirmar exclusão',
        message: `Deseja excluir a composição ${item.localizacao} (${item.compos_nr}) e seus itens?`,
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            const url = `${urlBase.value}/${itemDataProposta.value.id}/${item.id}`;
            axios.delete(url).then(() => {
                defaultSuccess('Composição e itens excluídos com sucesso');
                loadData();
            });
        },
        reject: () => {
            return false;
        }
    });
};

const loadData = () => {
    setTimeout(() => {
        loading.value = true;
        const url = `${urlBase.value}/${route.params.id}`;
        axios.get(url).then((axiosRes) => {
            gridData.value = axiosRes.data.data;
            gridData.value.forEach((element) => {
                element.compoe = element.compoe_valor ? 'Sim' : 'Não';
                element.comp_ativa = element.comp_ativa ? 'Sim' : 'Não';
                if (element.localizacao) element.localizacao = element.localizacao.trim();
                else element.localizacao = '';
                if (element.tombamento) element.tombamento = element.tombamento.trim();
                else element.tombamento = '';
            });
            loading.value = false;
        });
    }, Math.random() * 1000);
};
const mode = ref('grid');
const getSeverity = (value) => {
    return value == 'Sim' ? 'success' : 'danger';
};
const newCompos = () => {
    mode.value = 'grid';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
        itemData.value = {};
        mode.value = 'new';
    }, Math.random() * 1000);
};
onBeforeMount(() => {
    initFilters();
    loadData();
});
</script>

<template>
    <div>
        <ComposicaoForm :idComposicao="itemData.id" :modeParent="mode" @changed="loadData" @cancel="mode = 'grid'" v-if="['view', 'new', 'edit', 'clone'].includes(mode)" />
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
            :globalFilterFields="['compos_nr', 'localizacao', 'tombamento']"
        >
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <Button type="button" icon="fa-solid fa-plus" label="Novo Registro" outlined @click="newCompos" />
                    <Button type="button" icon="fa-solid fa-filter" label="Limpar filtro" outlined @click="clearFilter()" />
                    <span class="p-input-icon-left">
                        <i class="fa-solid fa-magnifying-glass" />
                        <InputText id="searchInput" v-model="filters['global'].value" placeholder="Pesquise..." />
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
                        <Tag v-if="nome.tagged == true" :value="data[nome.field]" :severity="getSeverity(data[nome.field])" />
                        <span v-else-if="data[nome.field] && nome.mask" v-html="masks[nome.mask].masked(data[nome.field])"></span>
                        <span v-else v-html="data[nome.maxLength] ? String(data[nome.field]).trim().substring(0, data[nome.maxLength]) : String(data[nome.field]).trim()"></span>
                    </template>
                </Column>
            </template>
            <Column headerStyle="text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <div class="flex justify-content-center gap-1">
                        <Button type="button" icon="fa-solid fa-bars" rounded @click="goField(data)" class="p-button-outlined" v-tooltip.left="'Clique para mais opções'" />
                        <Button type="button" icon="fa-regular fa-copy" rounded @click="duplicateField(data)" class="p-button-outlined" v-tooltip.left="'Clique para duplicar a composição'" />
                        <Button type="button" icon="fa-solid fa-trash" rounded @click="removeComposicao(data)" class="p-button-outlined" severity="danger" v-tooltip.left="'Clique para excluir a composição'" />
                    </div>
                </template>
            </Column>
        </DataTable>
        <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
            <p>mode: {{ mode }}</p>
        </div>
    </div>
</template>
