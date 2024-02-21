<script setup>
import { onBeforeMount, onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultError } from '@/toast';
import PosVendaForm from './PosVendaForm.vue';
import Breadcrumb from '@/components/Breadcrumb.vue';
import { removeHtmlTags } from '@/global';

// Cookies do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();

import { Mask } from 'maska';
const masks = ref({
    telefone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    })
});

const urlBase = ref(`${baseApiUrl}/pv`);
const props = defineProps(['idCadastro']);
const idRegs = ref(null); // Id do registro selecionado

onBeforeMount(() => {
    // Se props.idCadastro for declarado, remover o primeiro item da lista de campos, pois é o nome do cliente
    if (props.idCadastro) listaNomes.value = listaNomes.value.filter((item) => !['nome'].includes(item.field));
    // Inicializa os filtros do grid
    initFilters();
});
onMounted(() => {
    clearFilter();
});

const dt = ref();
const totalRecords = ref(0); // O total de registros (deve ser atualizado com o total real)
const rowsPerPage = ref(10); // Quantidade de registros por página
const loading = ref(false);
const gridData = ref([]); // Seus dados iniciais
//Scrool quando criar um Novo Registro
const scrollToTop = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}
// Lista de tipos
const dropdownTipos = ref([
    { label: 'Suporte', value: '0' },
    { label: 'Montagem', value: '1' },
    { label: 'Venda', value: '2' }
]);

/*
Lista de situações

STATUS_PENDENTE = 0;
STATUS_REATIVADO = 1;
STATUS_EM_ANDAMENTO = 60;
STATUS_FINALIZADO = 80;
STATUS_CANCELADO = 89;
STATUS_EXCLUIDO = 99; 
*/
const dropdownSituacoes = ref([
    // { label: 'Aberto', value: '0' },
    // { label: 'Reaberto', value: '1' },
    { label: 'Em andamento', value: '60' },
    { label: 'Finalizado', value: '80' },
    { label: 'Cancelado', value: '89' }
    // { label: 'Excluído', value: '99' }
]);

// Itens do grid
const listaNomes = ref([
    { field: 'nome', label: 'Cliente', minWidth: '2rem' },
    { field: 'pv_nr', label: 'Número' },
    // { field: 'pipeline', label: 'Pipeline' },
    { field: 'tipo', label: 'Tipo', list: dropdownTipos.value },
    // { field: 'last_status_pv', label: 'Situação', list: dropdownSituacoes.value }
]);
// Inicializa os filtros do grid
const initFilters = () => {
    filters.value = {};
    listaNomes.value.forEach((element) => {
        filters.value = { ...filters.value, [element.field]: { value: '', matchMode: 'contains' } };
    });
    filters.value = { ...filters.value, doc_venda: { value: '', matchMode: 'contains' } };
};
const filters = ref({});
const lazyParams = ref({});
const urlFilters = ref('');
// Limpa os filtros do grid
const clearFilter = () => {
    loading.value = true;
    rowsPerPage.value = 10;
    initFilters();
    lazyParams.value = {
        first: dt.value.first,
        rows: dt.value.rows,
        sortField: null,
        sortOrder: null,
        filters: filters.value
    };

    loadLazyData();
};

const loadLazyData = () => {
    loading.value = true;

    setTimeout(() => {
        const url = `${urlBase.value}${urlFilters.value}`;
        axios
            .get(url)
            .then((axiosRes) => {
                gridData.value = axiosRes.data.data;
                totalRecords.value = axiosRes.data.totalRecords;
                gridData.value.forEach((element) => {
                    // Exibe dados formatados
                    if (element.documento) element.pipeline = `${element.tipo_doc.replaceAll('_', ' ')} (${element.documento})`;
                    else element.pipeline = '';
                    element.tipo = String(element.tipo);
                    // alterar o valor de element.last_status_pv de acordo com o dropdownSituacoes
                    dropdownSituacoes.value.forEach((item) => {
                        if (item.value == element.last_status_pv) element.last_status_pv = item.label;
                    });
                    switch (element.tipo) {
                        case '1':
                            element.tipo = 'Montagem';
                            break;
                        case '2':
                            element.tipo = 'Venda';
                            break;
                        default:
                            element.tipo = 'Suporte';
                            break;
                    }
                });
                loading.value = false;
            })
            .catch((error) => {
                const logTo = error;
                try {
                    defaultError(error.response.data);
                } catch (error) {
                    defaultError('Erro ao carregar dados!');
                }
            });
    }, Math.random() * 1000);
};
const onPage = (event) => {
    lazyParams.value = event;
    loadLazyData();
};
const onSort = (event) => {
    lazyParams.value = event;
    loadLazyData();
};
const onFilter = () => {
    lazyParams.value.filters = filters.value;
    mountUrlFilters();
    loadLazyData();
};
const mode = ref('grid');
const mountUrlFilters = () => {
    let url = '?';
    Object.keys(filters.value).forEach((key) => {
        if (filters.value[key].value) {
            const macthMode = filters.value[key].matchMode || 'contains';
            url += `field:${key}=${macthMode}:${filters.value[key].value}&`;
        }
    });
    if (lazyParams.value.originalEvent && (lazyParams.value.originalEvent.page || lazyParams.value.originalEvent.rows))
        Object.keys(lazyParams.value.originalEvent).forEach((key) => {
            url += `params:${key}=${lazyParams.value.originalEvent[key]}&`;
        });
    if (lazyParams.value.sortField) url += `sort:${lazyParams.value.sortField}=${Number(lazyParams.value.sortOrder) == 1 ? 'asc' : 'desc'}&`;
    if (props.idCadastro) url += `field:tbl1.id_cadastros=equals:${props.idCadastro}&`;
    urlFilters.value = url;
};
// Exporta os dados do grid para CSV
const exportCSV = () => {
    const toExport = dt.value;
    toExport.value.forEach((element) => {
        Object.keys(element).forEach((key) => {
            element[key] = removeHtmlTags(element[key]);
        });
    });
    toExport.exportCSV();
};
const goField = (data) => {
    idRegs.value = data.id;
    router.push({ path: `/${userData.schema_description}/pos-venda/${data.id}` });
};
watchEffect(() => {
    mountUrlFilters();
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new' && !props.idCadastro" :items="[{ label: 'Pós-Vendas', to: `/${userData.schema_description}/pos-venda` }]" />
    <div class="card w-95">
        <PosVendaForm
            :mode="mode"
            :idCadastro="props.idCadastro"
            :idRegs="idRegs"
            @changed="loadLazyData()"
            @cancel="
                mode = 'grid';
                idRegs = undefined;
            "
            v-if="mode == 'new' || idRegs"
        />
        <DataTable
            style="font-size: 1rem"
            :value="gridData"
            lazy
            paginator
            :first="0"
            v-model:filters="filters"
            ref="dt"
            dataKey="id"
            :totalRecords="totalRecords"
            :rows=15
            :loading="loading"
            @page="onPage($event)"
            @sort="onSort($event)"
            @filter="onFilter($event)"
            filterDisplay="row"
            paginatorTemplate="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            :currentPageReportTemplate="`{first} a {last} de ${totalRecords} Pós-Vendas`"
            scrollable
        >
            <!-- scrollHeight="420px" -->
            <template #header>
                <div class="flex flex-column-reverse gap-3">
                    <Button v-if="userData.gestor" icon="fa-solid fa-cloud-arrow-down" label="Exportar" @click="exportCSV($event)" />
                    <Button type="button" icon="fa-solid fa-filter" label="Limpar filtro" outlined @click="clearFilter()" />
                    <Button type="button" icon="fa-solid fa-plus" label="Novo Registro" outlined @click="mode = 'new', scrollToTop()" />
                </div>
            </template>
            <template v-for="nome in listaNomes" :key="nome">
                <Column
                    :field="nome.field"
                    :header="nome.label"
                    :filterField="nome.field"
                    :filterMatchMode="'contains'"
                    sortable
                    :dataType="nome.type"
                    :style="`max-width: ${nome.maxWidth ? nome.maxWidth : '6rem'}; overflow: hidden`"
                >
                    <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                        <Dropdown
                            :id="nome.field"
                            optionLabel="label"
                            optionValue="value"
                            v-model="filterModel.value"
                            :options="nome.list"
                            @change="filterCallback()"
                            :class="nome.class"
                            :style="`max-width: ${nome.maxWidth ? nome.maxWidth : '6rem'}; overflow: hidden`"
                            showClear
                        />
                    </template>
                    <template v-else-if="nome.type == 'date'" #filter="{ filterModel, filterCallback }">
                        <Calendar
                            v-model="filterModel.value"
                            dateFormat="dd/mm/yy"
                            selectionMode="range"
                            showButtonBar
                            :numberOfMonths="2"
                            placeholder="dd/mm/aaaa"
                            mask="99/99/9999"
                            @input="filterCallback()"
                            :style="`max-width: ${nome.maxWidth ? nome.maxWidth : '6rem'}; overflow: hidden`"
                        />
                    </template>
                    <template v-else #filter="{ filterModel, filterCallback }">
                        <InputText
                            type="text"
                            v-model="filterModel.value"
                            @keydown.enter="filterCallback()"
                            class="p-column-filter"
                            placeholder="Pesquise..."
                            :style="`max-width: ${nome.maxWidth ? nome.maxWidth : '6rem'}; overflow: hidden`"
                        />
                    </template>
                    <template #body="{ data }">
                        <Tag v-if="nome.tagged == true" :value="data[nome.field]" :severity="getSeverity(data[nome.field])" />
                        <span v-else-if="nome.mask" v-html="masks[nome.mask].masked(data[nome.field])"></span>
                        <span v-else v-html="nome.maxLength && String(data[nome.field]).trim().length == nome.maxLength ? String(data[nome.field]).trim().substring(0, nome.maxLength) + '...' : String(data[nome.field]).trim()"></span>
                    </template>
                </Column>
            </template>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" class="p-button-outlined" rounded icon="fa-solid fa-bars" @click="goField(data)" v-tooltip.left="'Clique para mais opções'" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
<style scoped>
.w-95{
    width: 95vw;
    max-width: 100%;
    margin-left: auto;
    margin-right: auto;
}
</style>
<style>
.container{
    overflow-x: hidden;
}
.p-column-filter-menu-button, .p-column-filter-clear-button {
    display: none;
}
.p-dropdown-clear-icon {
    display: none;
}
</style>
