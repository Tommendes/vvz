<script setup>
import { onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultError } from '@/toast';
import PosVendaForm from './PosVendaForm.vue';
import Breadcrumb from '@/components/Breadcrumb.vue';
import { removeHtmlTags } from '@/global';

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile();
});

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

const dt = ref();
const totalRecords = ref(0); // O total de registros (deve ser atualizado com o total real)
const rowsPerPage = ref(10); // Quantidade de registros por página
const loading = ref(false);
const gridData = ref([]); // Seus dados iniciais
// Lista de tipos
const dropdownTipos = ref([
    { label: 'Suporte', value: '0' },
    { label: 'Montagem', value: '1' },
    { label: 'Venda', value: '2' }
]);
//Scrool quando um Novo Registro for criado
const scrollToTop = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};

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
    { field: 'nome', label: 'Cliente' },
    { field: 'pipeline', label: 'Pipeline' },
    { field: 'tipo', label: 'Tipo', list: dropdownTipos.value },
    { field: 'pv_nr', label: 'Número' },
    { field: 'last_status_pv', label: 'Situação', list: dropdownSituacoes.value },
    { field: 'observacao', label: 'Observações', maxLength: 150 }
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
const clearFilter = async () => {
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

    await loadLazyData();
};

const loadLazyData = async () => {
    loading.value = true;
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
                if (element.observacao) element.observacao = removeHtmlTags(element.observacao);
                else element.observacao = '';
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
};
// Carrega os dados do grid
const onPage = async (event) => {
    lazyParams.value = event;
    await mountUrlFilters();
};
// Ordena os dados do grid
const onSort = async (event) => {
    lazyParams.value = event;
    await mountUrlFilters();
};
// Filtra os dados do grid
const onFilter = async () => {
    lazyParams.value.filters = filters.value;
    await mountUrlFilters();
};
const mode = ref('grid');
const mountUrlFilters = async () => {
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

    await loadLazyData();
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
    router.push({ path: `/${uProf.value.schema_description}/pos-venda/${data.id}` });
};
watchEffect(() => {
    mountUrlFilters();
});
const breadCrumbItems = ref([]);
const refreshBreadcrumb = () => {
    breadCrumbItems.value = [{ label: 'Todos os Pós-vendas', to: route.fullPath }];
};
const newPostSales = () => {
    mode.value = 'new';
    scrollToTop();
    refreshBreadcrumb();
    breadCrumbItems.value.push({ label: 'Novo Registro' });
};
const reload = () => {
    mode.value = 'grid';
    idRegs.value = undefined;
    refreshBreadcrumb();
};
onBeforeMount(() => {
    refreshBreadcrumb();
    // Se props.idCadastro for declarado, remover o primeiro item da lista de campos, pois é o nome do cliente
    if (props.idCadastro) listaNomes.value = listaNomes.value.filter((item) => !['nome'].includes(item.field));
    // Inicializa os filtros do grid
    initFilters();
});
onMounted(() => {
    clearFilter();
});
</script>

<template>
    <Breadcrumb :items="breadCrumbItems" />
    <div class="grid">
        <div class="col-12">
            <PosVendaForm :mode="mode" :idCadastro="props.idCadastro" :idRegs="idRegs" @changed="loadLazyData()" @cancel="reload" v-if="mode == 'new' || idRegs" />
        </div>

        <div class="col-12">
            <div class="card">
                <DataTable
                    :value="gridData"
                    lazy
                    paginator
                    :first="0"
                    v-model:filters="filters"
                    ref="dt"
                    dataKey="id"
                    :totalRecords="totalRecords"
                    :rows="rowsPerPage"
                    :rowsPerPageOptions="[5, 10, 20, 50, 200, 500]"
                    :loading="loading"
                    @page="onPage($event)"
                    @sort="onSort($event)"
                    @filter="onFilter($event)"
                    filterDisplay="row"
                    paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
                    :currentPageReportTemplate="`{first} a {last} de ${totalRecords} Pós-Vendas`"
                    scrollable
                >
                    <!-- scrollHeight="420px" -->
                    <template #header>
                        <div class="flex justify-content-end gap-3">
                            <Button v-if="uProf.gestor" icon="fa-solid fa-cloud-arrow-down" label="Exportar" @click="exportCSV($event)" />
                            <Button type="button" icon="fa-solid fa-filter" label="Limpar filtro" outlined @click="clearFilter()" />
                            <Button type="button" icon="fa-solid fa-plus" label="Novo Registro" outlined @click="newPostSales" />
                        </div>
                        <div class="flex justify-content-end gap-3 mt-3 p-tag-esp">
                            <span class="p-button p-button-outlined" severity="info">Exibindo os primeiros {{ gridData.length }} resultados</span>
                        </div>
                    </template>
                    <template v-for="nome in listaNomes" :key="nome">
                        <Column :header="nome.label" :showFilterMenu="false" :filterField="nome.field" :filterMatchMode="'contains'" :filterMenuStyle="{ width: '14rem' }" style="min-width: 12rem" sortable :sortField="nome.field" :class="nome.class">
                            <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                                <Dropdown
                                    :id="nome.field"
                                    optionLabel="label"
                                    optionValue="value"
                                    v-model="filterModel.value"
                                    :options="nome.list"
                                    @change="filterCallback()"
                                    :class="nome.class"
                                    :style="`overflow: hidden`"
                                    placeholder="Pesquise..."
                                    showClear
                                />
                            </template>
                            <template v-else-if="nome.type == 'date'" #filter="{ filterModel, filterCallback }">
                                <Calendar v-model="filterModel.value" dateFormat="dd/mm/yy" selectionMode="range" showButtonBar :numberOfMonths="2" placeholder="dd/mm/aaaa" mask="99/99/9999" @input="filterCallback()" :style="`overflow: hidden`" />
                            </template>
                            <template v-else #filter="{ filterModel, filterCallback }">
                                <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter" placeholder="Pesquise..." :style="`overflow: hidden`" />
                            </template>
                            <template #body="{ data }">
                                <Tag v-if="nome.tagged == true" :value="data[nome.field]" :severity="getSeverity(data[nome.field])" />
                                <span v-else-if="nome.mask" v-html="masks[nome.mask].masked(data[nome.field])"></span>
                                <span v-else v-html="nome.maxLength && String(data[nome.field]).trim().length >= nome.maxLength ? String(data[nome.field]).trim().substring(0, nome.maxLength) + '...' : String(data[nome.field]).trim()"></span>
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
        </div>
    </div>
</template>
