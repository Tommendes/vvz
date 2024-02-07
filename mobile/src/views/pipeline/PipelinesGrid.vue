<script setup>
import { onBeforeMount, onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultError } from '@/toast';
import PipelineForm from './PipelineForm.vue';
import { removeHtmlTags, formatCurrency } from '@/global';
import Breadcrumb from '../../components/Breadcrumb.vue';
import moment from 'moment';

// Cookies do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();

const urlBase = ref(`${baseApiUrl}/pipeline`);
const props = defineProps(['idCadastro']);
const dt = ref();
const totalRecords = ref(0); // O total de registros (deve ser atualizado com o total real)
const rowsPerPage = ref(10); // Quantidade de registros por página
const loading = ref(false); // Indica se está carregando
const gridData = ref([]); // Seus dados iniciais
const idPipeline = ref(null); // Id do registro selecionado
const expandedRows = ref([]); // Registro expandido
// Itens do dropdown de Tipos
const dropdownTiposDoc = ref([
    { label: 'Outros', value: '0' },
    { label: 'Propostas', value: '1' },
    { label: 'Pedidos', value: '2' }
]);
const dropdownUnidades = ref([]); // Itens do dropdown de Unidades de Negócio
const tipoDoc = ref(null); // Tipo de documento selecionado
const unidade = ref(null); // Unidade de negócio selecionada
const periodo = ref(null); // Período selecionado

// Obter parâmetros do BD
const optionParams = async (query) => {
    const url = `${baseApiUrl}/pipeline-params/f-a/${query.func}?doc_venda=${query.tipoDoc ? query.tipoDoc : ''}&gera_baixa=&descricao=${query.unidade ? query.unidade : ''}`;
    return await axios.get(url);
};
// Carregar opções do formulário de pesquisa
const loadOptions = async () => {
    filtrarUnidades();
    filtrarUnidadesDescricao();
};
const filtrarUnidades = async () => {
    // Unidades de negócio
    await optionParams({
        func: 'gun',
        tipoDoc: tipoDoc.value,
        unidade: unidade.value
    }).then((res) => {
        dropdownUnidades.value = [];
        res.data.data.map((item) => {
            dropdownUnidades.value.push({
                value: item.descricao,
                label: item.descricao
            });
        });
    });
    filtrarUnidadesDescricao();
};
const filtrarUnidadesDescricao = async () => {
    // Unidades de negócio por tipo
    await optionParams({
        func: 'ubt',
        tipoDoc: tipoDoc.value,
        unidade: unidade.value
    })
};

// Itens do grid
const limitDescription = 150;
const limitNome = 25;

// Lista de tipos
const dropdownStatus = ref([
    { label: 'Pendente', value: '0' },
    { label: 'Convertido', value: '10' },
    { label: 'Pedido', value: '20' },
    { label: 'Liquidado', value: '80' },
    { label: 'Cancelado', value: '89' }
    // { label: 'Excluído', value: '99' }
]);
// { field: 'agente', label: 'Agente', minWidth: '6rem' },
const listaNomes = ref([
    { field: 'nome', label: 'Cliente', minWidth: '9rem' },
    { field: 'documento', label: 'Documento', maxWidth: '3rem' }
]);
// Inicializa os filtros do grid
const initFilters = () => {
    filters.value = {};
    listaNomes.value.forEach((element) => {
        filters.value = {
            ...filters.value,
            [element.field]: { value: '', matchMode: 'contains' }
        };
    });
    filters.value = {
        ...filters.value,
        doc_venda: { value: '', matchMode: 'contains' }
    };
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
    // router.push({ path: `/${userData.schema_description}/pipeline` });
};
const reload = () => {
    router.replace({ query: {} });
    clearFilter();
};
//Scrool quando criar um Novo Registro
const scrollToTop = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};
// Carrega os dados do grid
const loadLazyData = () => {
    loading.value = true;
    expanded.value = false;
    setTimeout(() => {
        let urlQueryes = '';
        let objetcQueryes = Object.keys(queryUrl.value);
        if (objetcQueryes.length > 0) {
            urlQueryes = Object.keys(queryUrl.value)
                .map((key) => `${key}=${queryUrl.value[key]}`)
                .join('&');
            // Pesquise filters.value, identifique a atribua o valor de acordo com o que foi passado na URL (queryUrl.value)
            Object.keys(filters.value).forEach((key) => {
                if (queryUrl.value[key]) filters.value[key].value = queryUrl.value[key];
            });
        }
        const url = `${urlBase.value}${urlFilters.value}${urlQueryes}`;
        axios
            .get(url)
            .then((axiosRes) => {
                gridData.value = axiosRes.data.data;
                totalRecords.value = axiosRes.data.totalRecords;
                gridData.value.forEach((element) => {
                    if (element.tipo_doc) element.tipo_doc = element.tipo_doc.replaceAll('_', ' ');
                    const nome = element.nome || undefined;
                    if (nome) {
                        element.nome = nome.trim().substr(0, limitNome);
                        if (nome.length > limitNome) element.nome += ' ...';
                    }
                    if (!element.proposta) element.proposta = '';
                    // alterar o valor de element.last_status_params de acordo com o dropdownStatus
                    dropdownStatus.value.forEach((item) => {
                        if (item.value == element.last_status_params) element.last_status_params = item.label;
                    });
                    if (element.descricao)
                        element.descricao = element.descricao
                            .replaceAll('Este documento foi versionado. Estes são os dados do documento original:', '')
                            .replaceAll('Este documento foi liquidado quando foi versionado.', '')
                            .replaceAll('Segue a descrição original do documento:', '')
                            .trim();
                    else element.descricao = '';
                    if (element.valor_bruto && element.valor_bruto >= 0) element.valor_bruto = formatCurrency(element.valor_bruto);
                    else element.valor_bruto = '';
                });
                loading.value = false;
            })
            .catch((error) => {
                console.log(error);
                try {
                    defaultError(error.response.data);
                } catch (error) {
                    defaultError('Erro ao carregar dados!');
                }
            });
    }, Math.random() * 1000);
};
// Carrega os dados do grid
const onPage = (event) => {
    lazyParams.value = event;
    loadLazyData();
};
// Ordena os dados do grid
const onSort = (event) => {
    lazyParams.value = event;
    loadLazyData();
};
// Filtra os dados do grid
const onFilter = () => {
    lazyParams.value.filters = filters.value;
    mountUrlFilters();
    loadLazyData();
};
// Armazena o modo de operação do grid
const mode = ref('grid');
/**
 * Monta a url com os filtros
 */
const mountUrlFilters = () => {
    let url = '';
    Object.keys(filters.value).forEach((key) => {
        if (filters.value[key].value) {
            const macthMode = filters.value[key].matchMode || 'contains';
            let value = filters.value[key].value;
            if (key && key == 'status_created_at') {
                const dI = value[0] || undefined;
                const dF = value[1] || undefined;
                value = `${moment(dI).format('YYYY-MM-DD')},${moment(dF).format('YYYY-MM-DD')}`;
                periodo.value = undefined;
            }
            url += `field:${key}=${macthMode}:${value}&`;
        }
    });
    if (lazyParams.value.originalEvent && (lazyParams.value.originalEvent.page || lazyParams.value.originalEvent.rows))
        Object.keys(lazyParams.value.originalEvent).forEach((key) => {
            url += `params:${key}=${lazyParams.value.originalEvent[key]}&`;
        });
    if (lazyParams.value.sortField) url += `sort:${lazyParams.value.sortField}=${Number(lazyParams.value.sortOrder) == 1 ? 'asc' : 'desc'}&`;
    if (tipoDoc.value) url += `field:doc_venda=equals:${tipoDoc.value}&`;
    if (unidade.value) url += `field:unidade=equals:${unidade.value}&`;
    if (periodo.value) url += `field:status_created_at=contains:${periodo.value}&`;
    if (props.idCadastro) url += `field:id_cadastros=equals:${props.idCadastro}&`;
    urlFilters.value = `?${url}`;
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
    idPipeline.value = data.id;
    router.push({ path: `/${userData.schema_description}/pipeline/${data.id}` });
};
// const onRowExpand = (event) => {
//     // defaultInfo('Product Expanded: ' + event.data.documento);
// };
// const onRowCollapse = (event) => {
//     // defaultSuccess('Product Collapsed: ' + event.data.documento);
// };
const expanded = ref(false);
const expandAll = () => {
    expanded.value = true;
    expandedRows.value = gridData.value.filter((p) => p.id);
};
const collapseAll = () => {
    expanded.value = false;
    expandedRows.value = null;
};
// Carrega os dados do filtro do grid
watchEffect(() => {
    mountUrlFilters();
});
onBeforeMount(() => {
    // Se props.idCadastro for declarado, remover o primeiro item da lista de campos, pois é o nome do cliente e a descrição pois ficará muito largo
    if (props.idCadastro) listaNomes.value = listaNomes.value.filter((item) => !['descricao', 'nome'].includes(item.field));
    // Inicializa os filtros do grid
    initFilters();
    loadOptions();
});
const queryUrl = ref('');
onMounted(() => {
    queryUrl.value = route.query;
    // Limpa os filtros do grid
    clearFilter();
    let load = false;
    if (route.query.tpd && route.query.tpd.length) {
        tipoDoc.value = route.query.tpd;
        load = true;
        filtrarUnidades();
    }
    if (route.query.per && route.query.per.length) {
        periodo.value = route.query.per;
        load = true;
    }
    if (load) loadLazyData();
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new' && !props.idCadastro" :items="[{ label: 'Todo o Pipeline', to: `/${userData.schema_description}/pipeline` }]" />
    <div class="card w-95" :style="route.name == 'pipeline' ? 'width: 120rem;' : ''">
        <PipelineForm
            :mode="mode"
            :idCadastro="props.idCadastro"
            :idPipeline="idPipeline"
            @changed="loadLazyData()"
            @cancel="
                mode = 'grid';
                idPipeline = undefined;
            "
            v-if="mode == 'new' || idPipeline"
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
            :rows="rowsPerPage"
            :rowsPerPageOptions="[5, 10, 20, 50, 200, 500]"
            :loading="loading"
            @page="onPage($event)"
            @sort="onSort($event)"
            @filter="onFilter($event)"
            filterDisplay="row"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            :currentPageReportTemplate="`{first} a {last} de ${totalRecords} registros`"
            scrollable
            v-model:expandedRows="expandedRows"
        >
            <!-- @rowExpand="onRowExpand" -->
            <!-- @rowCollapse="onRowCollapse" -->
            <!-- scrollHeight="600px" -->
            <template #header>
                <div class="flex flex-column justify-content-end gap-3 mb-3 p-tag-esp">
                </div>
                <div class="flex flex-column justify-content-end gap-3">
                    <Dropdown
                        placeholder="Todos...?"
                        :showClear="!!tipoDoc"
                        style="min-width: 150px"
                        id="doc_venda"
                        optionLabel="label"
                        optionValue="value"
                        v-model="tipoDoc"
                        :options="dropdownTiposDoc"
                        @change="
                            loadLazyData();
                            filtrarUnidades();
                        "
                    />
                    <Dropdown
                        filter
                        placeholder="Filtrar por Representada..."
                        :showClear="!!unidade"
                        style="min-width: 150px"
                        id="unidades"
                        optionLabel="label"
                        optionValue="value"
                        v-model="unidade"
                        :options="dropdownUnidades"
                        @change="
                            loadLazyData();
                        "
                    />
                    <Button icon="fa-solid fa-cloud-arrow-down" label="Exportar" @click="exportCSV($event)" />
                    <Button type="button" icon="fa-solid fa-filter" label="Limpar consulta" outlined @click="clearFilter()" />
                    <Button type="button" icon="fa-solid fa-refresh" label="Todo o pipeline" outlined @click="reload()" />
                    <Button type="button" icon="fa-solid fa-plus" label="Novo Registro" outlined @click="(mode = 'new'), scrollToTop()" />
                    <Button type="button" icon="fa-solid fa-angles-up" @click="collapseAll()" v-if="expanded" />
                    <Button type="button" icon="fa-solid fa-angles-down" @click="expandAll()" v-else />
                </div>
            </template>
            <Column expander style="width: 5rem" />
            <template v-for="nome in listaNomes" :key="nome">
                <Column
                    :class="nome.class"
                    :field="nome.field"
                    :header="nome.label"
                    :filterField="nome.field"
                    :filterMatchMode="'contains'"
                    sortable
                    :dataType="nome.type"
                    :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}; max-width: ${nome.maxWidth ? nome.maxWidth : '6rem'}; overflow: hidden`"
                >
                    <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                        <Dropdown
                            :id="nome.field"
                            optionLabel="label"
                            optionValue="value"
                            v-model="filterModel.value"
                            :options="nome.list"
                            @change="filterCallback()"
                            showClear
                            :class="nome.class"
                            :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}; max-width: ${nome.maxWidth ? nome.maxWidth : '6rem'}; overflow: hidden`"
                            placeholder="Pesquise..."
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
                            :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}; max-width: ${nome.maxWidth ? nome.maxWidth : '6rem'}; overflow: hidden`"
                        />
                    </template>
                    <template v-else #filter="{ filterModel, filterCallback }">
                        <InputText
                            type="text"
                            v-model="filterModel.value"
                            @keydown.enter="filterCallback()"
                            class="p-column-filter"
                            placeholder="Pesquise..."
                            :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}; max-width: ${nome.maxWidth ? nome.maxWidth : '6rem'}; overflow: hidden`"
                        />
                    </template>
                    <template #body="{ data }">
                        <Tag v-if="nome.tagged == true" :value="data[nome.field]" :severity="getSeverity(data[nome.field])" />
                        <span v-else v-html="nome.maxLength && String(data[nome.field]).trim().length == nome.maxLength ? String(data[nome.field]).trim().substring(0, nome.maxLength) + '...' : String(data[nome.field]).trim()"></span>
                    </template>
                </Column>
            </template>
            <template #expansion="slotProps">
                <div class="ml-5 p-3">
                    <PipelineForm
                        :mode="'expandedFormMode'"
                        :idCadastro="props.idCadastro"
                        :idPipeline="slotProps.data.id"
                        @changed="loadLazyData()"
                        @cancel="
                            mode = 'grid';
                            idPipeline = undefined;
                        "
                    />
                </div>
            </template>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible" style="0.6rem">
                <template #body="{ data }">
                    <Button type="button" class="p-button-outlined" rounded icon="fa-solid fa-bars" @click="goField(data)" v-tooltip.left="'Clique para mais opções'" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
<style scoped>
.tagQualify {
    font-size: 1.2rem;
}
.tagRes {
    background-color: #077a59;
    color: rgb(255, 255, 255);
    font-size: 1.5rem;
    margin-left: 3rem;
    padding-left: 1rem;
    padding-right: 1rem;
}
</style>
<style>
.w-95{
    width: 95vw !important;
    max-width: 100%;
}
</style>
