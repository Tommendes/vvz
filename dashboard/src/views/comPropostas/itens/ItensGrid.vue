<script setup>
import { ref, onBeforeMount, inject } from 'vue';
import { FilterMatchMode } from 'primevue/api';
import { baseApiUrl } from '@/env';
import { formatValor } from '@/global';
import axios from '@/axios-interceptor';
import ItemForm from './ItemForm.vue';
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
import { useRoute } from 'vue-router';
const route = useRoute();
import { defaultSuccess } from '@/toast';

const filters = ref(null);
const gridData = ref(null);
// Campos de formulário
// Campos de formulário
const itemDataProposta = inject('itemData');
const props = defineProps({
    idComposicao: Number
});
const itemData = ref({});
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/com-prop-itens`);
const limitDescription = 50;
// Itens do grid
const listaNomes = ref([
    { field: 'item', label: 'Item' },
    { field: 'item_ativo', label: 'Ativo', tagged: true },
    { field: 'compoe', label: 'Compõe', tagged: true },
    { field: 'nome_comum', label: 'Produto' },
    { field: 'descricao', label: 'Descrição Adicional', maxLength: limitDescription },
    { field: 'quantidade', label: 'Quantidade' }
    // { field: 'valor_unitario', label: 'Valor Unitário', minWidth: '15rem' },
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
    setTimeout(() => {
        itemData.value = data;
        mode.value = 'view';
    }, Math.random() * 1000);
};

const duplicateField = (data) => {
    mode.value = 'grid';
    setTimeout(() => {
        itemData.value = data;
        mode.value = 'clone';
    }, Math.random() * 1000);
};

const newItem = () => {
    mode.value = 'grid';
    setTimeout(() => {
        itemData.value = {
            id_com_prop_compos: props.idComposicao
        };
        mode.value = 'new';
    }, Math.random() * 1000);
};

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
const removeItem = (item) => {
    confirm.require({
        group: 'templating',
        header: 'Confirmar exclusão',
        message: 'Você tem certeza que deseja excluir este item?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            const url = `${urlBase.value}/${itemDataProposta.value.id}/${item.id}`;
            axios.delete(url).then(() => {
                defaultSuccess('Item excluído com sucesso!');
                loadData();
            });
        },
        reject: () => {
            return false;
        }
    });
};

const semComposicao = ref(true);
const loadData = () => {
    setTimeout(() => {
        loading.value = true;
        let idComposicao = null;
        if (props.idComposicao) `?idComposicao=${props.idComposicao}`;
        else if (semComposicao.value == true) idComposicao = `?idComposicao=noComposition`;
        const url = `${urlBase.value}/${route.params.id}${idComposicao}`;
        axios.get(url).then((axiosRes) => {
            gridData.value = axiosRes.data.data;
            gridData.value.forEach((element) => {
                element.compoe = element.compoe_valor ? 'Sim' : 'Não';
                element.item_ativo = element.item_ativo ? 'Sim' : 'Não';
                if (!idComposicao && element.compos_nr) {
                    element.item = `${element.localizacao || element.compos_nr} / ${element.item}`;
                    listaNomes.value[0].label = 'Composição/Item';
                }
                if (element.descricao) element.descricao = element.descricao.trim();
                else element.descricao = '';
                element.quantidade = formatValor(element.quantidade, 'pt');
                // const description = element.descricao || undefined;
                // if (description) {
                //     element.descricao = description.trim().substr(0, limitDescription);
                //     if (description.length > limitDescription) element.descricao += ' ...';
                // }
            });
            loading.value = false;
        });
    }, Math.random() * 1000);
};

const mode = ref('grid');
const getSeverity = (value) => {
    return value == 'Sim' ? 'success' : 'danger';
};
onBeforeMount(() => {
    initFilters();
    loadData();
});
</script>

<template>
    <div class="grid">
        <div class="col-12">
            <ItemForm :idItem="itemData.id" :idComposicao="props.idComposicao" :modeParent="mode" @changed="loadData" @cancel="mode = 'grid'" v-if="['view', 'new', 'edit', 'clone'].includes(mode)" />
        </div>
        <div class="col-12">
            <DataTable
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
                :globalFilterFields="['id_com_prop_compos', 'descricao', 'quantidade', 'valor_unitario', 'item']"
            >
                <template #header>
                    <div class="flex justify-content-end gap-3">
                        <Button type="button" icon="fa-solid fa-plus" label="Novo Registro" outlined @click="newItem()" />
                        <Button type="button" icon="fa-solid fa-filter" label="Limpar filtro" outlined @click="clearFilter()" />
                        <span class="p-input-icon-left">
                            <i class="fa-solid fa-magnifying-glass" />
                            <InputText id="searchInput" v-model="filters['global'].value" placeholder="Pesquise..." />
                        </span>
                        <Button
                            v-if="gridData"
                            :icon="`fa-solid fa-${semComposicao ? 'times' : 'filter'}`"
                            :outlined="semComposicao"
                            type="button"
                            :label="semComposicao ? `Itens sem composição` : `Todos os itens`"
                            :badge="gridData.length"
                            v-tooltip.top="semComposicao ? `Clique para mostrar todos os itens` : `Clique para mostrar somente os itens sem composição`"
                            @click="
                                semComposicao = !semComposicao;
                                loadData();
                            "
                        />
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
                            <span v-else v-html="nome.maxLength ? String(data[nome.field]).trim().substring(0, nome.maxLength) + (String(data[nome.field]).trim() > nome.maxLength ? '...' : '') : String(data[nome.field]).trim()"></span>
                        </template>
                    </Column>
                </template>
                <Column headerStyle="text-align: center" bodyStyle="text-align: center; overflow: visible">
                    <template #body="{ data }">
                        <div class="flex justify-content-center gap-1">
                            <Button type="button" icon="fa-solid fa-bars" rounded @click="goField(data)" class="p-button-outlined" v-tooltip.left="'Clique para mais opções'" />
                            <Button type="button" icon="fa-regular fa-copy" rounded @click="duplicateField(data)" class="p-button-outlined" v-tooltip.left="'Clique para duplicar o item'" />
                            <Button type="button" icon="fa-solid fa-trash" rounded @click="removeItem(data)" class="p-button-outlined" severity="danger" v-tooltip.left="'Clique para excluir o item'" />
                        </div>
                    </template>
                </Column>
            </DataTable>
            <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
                <p>mode: {{ mode }}</p>
            </div>
        </div>
    </div>
</template>
