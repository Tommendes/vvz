<script setup>
import { onBeforeMount, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultError } from '@/toast';
import PipelineForm from './PipelineForm.vue';
import { removeHtmlTags, formatCurrency } from '@/global';
import Breadcrumb from '../../components/Breadcrumb.vue';
import moment from 'moment';

// const isMobile = window.innerWidth < 768;
const screenWidth = ref(window.innerWidth);
const isMobile = ref(window.matchMedia('(max-width: 767px)').matches);
const updateScreenWidth = () => {
    isMobile.value = window.matchMedia('(max-width: 767px)').matches;
    screenWidth.value = window.innerWidth;
    console.log('isMobile', isMobile.value);
    console.log('screenWidth', screenWidth.value);
};

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
const sumRecords = ref(0); // O valor total de registros (deve ser atualizado com o total real)
const rowsPerPage = ref(10); // Quantidade de registros por página
const loading = ref(false); // Indica se está carregando
const gridData = ref([]); // Dados do grid
const gridDataRaw = ref([]); // Dados sem formatação
const idPipeline = ref(null); // Id do registro selecionado
// Itens do dropdown de Tipos
const dropdownTiposDoc = ref([
    { label: 'Outros', value: '0' },
    { label: 'Propostas', value: '1' },
    { label: 'Pedidos', value: '2' }
]);
const dropdownUnidades = ref([]); // Itens do dropdown de Unidades de Negócio
const dropdownUnidadesFilter = ref([]); // Itens do dropdown de Unidades de Negócio do grid
const dropdownAgentes = ref([]); // Itens do dropdown de Agentes de Negócio do grid
const tipoDoc = ref(null); // Tipo de documento selecionado
const unidade = ref(null); // Unidade de negócio selecionada
const periodo = ref(null); // Período selecionado
const unidadeNegocio = ref(null); // Unidade de negócio selecionada
const agenteNegocio = ref(null); // Agente de negócio selecionada
const statusNegocio = ref(null); // Situação de negócio selecionada

// Obter parâmetros do BD
const optionParams = async (query) => {
    const url = `${baseApiUrl}/pipeline-params/f-a/${query.func}?doc_venda=${query.tipoDoc ? query.tipoDoc : ''}&gera_baixa=&descricao=${query.unidade ? query.unidade : ''}`;
    return await axios.get(url);
};
// Obter Agentes de negócio
const getAgentes = async () => {
    setTimeout(async () => {
        const url = `${baseApiUrl}/users/f-a/gag`;
        await axios.get(url).then((res) => {
            res.data.map((item) => {
                dropdownAgentes.value.push({
                    value: item.name,
                    label: item.name
                });
            });
        });
    }, Math.random() * 1000 + 250);
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
    }).then((res) => {
        dropdownUnidadesFilter.value = [];
        res.data.data.map((item) => {
            const label = item.descricao.toString().replaceAll(/_/g, ' ');
            dropdownUnidadesFilter.value.push({
                value: item.descricao,
                label: label
            });
        });
    });
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
    { field: 'nome', label: 'Cliente', class: '' },
    // { field: 'tipo_doc', label: 'Tipo', class: isMobile.value ? 'hidden' : '' },
    // { field: 'proposta', label: 'Proposta', class: isMobile.value || screenWidth.value < 840 ? 'hidden' : 'md:text-center' },
    { field: 'documento', label: 'Documento', class: isMobile.value || screenWidth.value < 840 ? 'hidden' : '' },
    { field: 'valor_bruto', label: 'R$ Bruto', class: isMobile.value || screenWidth.value < 960 ? 'hidden' : 'md:text-right' },
    { field: 'descricao', label: 'Descrição', maxLength: limitDescription, class: isMobile.value || screenWidth.value < 1000 ? 'hidden' : '' },
    { field: 'agente', label: 'Agente', list: dropdownAgentes.value, class: isMobile.value || screenWidth.value < 1000 ? 'hidden' : '' },
    { field: 'status_created_at', label: 'Data', type: 'date', tagged: true, class: isMobile.value || screenWidth.value < 1000 ? 'hidden' : '' },
    { field: 'last_status_params', label: 'Situação', list: dropdownStatus.value, class: isMobile.value || screenWidth.value < 1000 ? 'hidden' : '' }
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
    tipoDoc.value = unidade.value = unidadeNegocio.value = periodo.value = agenteNegocio.value = statusNegocio.value = null;
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
        const url = `${urlBase.value}${urlFilters.value}`; //${urlQueryes}
        axios
            .get(url)
            .then(async (axiosRes) => {
                gridData.value = axiosRes.data.data;
                totalRecords.value = axiosRes.data.totalRecords;
                sumRecords.value = axiosRes.data.sumRecords;
                gridData.value.forEach((element) => {
                    gridDataRaw.value.push({ ...element });
                    // if (element.tipo_doc) element.tipo_doc = element.tipo_doc.replaceAll('_', ' ');
                    if (element.documento) element.documento = `${element.tipo_doc.replaceAll('_', ' ')}<br>(Documento: ${element.documento})`;
                    if (element.proposta) element.documento += `<br>(Proposta: ${element.proposta})`;
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
    if (unidadeNegocio.value) url += `field:descricaoUnidade=equals:${unidadeNegocio.value}&`;
    if (agenteNegocio.value) url += `field:agente=equals:${agenteNegocio.value}&`;
    if (statusNegocio.value) url += `field:last_status_params=equals:${statusNegocio.value}&`;
    if (props.idCadastro) url += `field:id_cadastros=equals:${props.idCadastro}&`;
    urlFilters.value = `?${url}`;
};

import xlsx from 'json-as-xlsx';
let dataToExcelExport = [
    {
        sheet: 'Pipeline',
        columns: [
            { label: 'Cliente', value: (row) => row.cliente },
            { label: 'Tipo', value: (row) => row.tipo },
            { label: 'Proposta', value: (row) => row.proposta },
            { label: 'Documento', value: (row) => row.documento },
            { label: 'R$ Bruto', value: (row) => row.valor_bruto, format: 'R$#,##0.00' },
            { label: 'Descrição', value: (row) => row.descricao },
            { label: 'Agente', value: (row) => row.agente },
            { label: 'Data', value: (row) => row.status_created_at },
            { label: 'Situação', value: (row) => row.last_status_params }
        ],
        content: []
    }
];

const exportXls = () => {
    gridDataRaw.value.forEach((element) => {
        let last_status_params = '';
        let descricao = '';
        dropdownStatus.value.forEach((item) => {
            if (item.value == element.last_status_params) last_status_params = item.label;
        });
        if (element.descricao)
            descricao = element.descricao
                .replaceAll('Este documento foi versionado. Estes são os dados do documento original:', '')
                .replaceAll('Este documento foi liquidado quando foi versionado.', '')
                .replaceAll('Segue a descrição original do documento:', '')
                .trim();

        dataToExcelExport[0].content.push({
            cliente: element.nome,
            tipo: element.tipo_doc.replaceAll('_', ' '),
            proposta: element.proposta,
            documento: element.documento,
            valor_bruto: element.valor_bruto,
            descricao: removeHtmlTags(descricao),
            agente: element.agente,
            status_created_at: element.status_created_at,
            last_status_params: last_status_params
        });
    });
    let settings = {
        fileName: dataToExcelExport[0].sheet // Name of the resulting spreadsheet
        // extraLength: 3, // A bigger number means that columns will be wider
        // writeMode: 'writeFile', // The available parameters are 'WriteFile' and 'write'. This setting is optional. Useful in such cases https://docs.sheetjs.com/docs/solutions/output#example-remote-file
        // writeOptions: {}, // Style options from https://docs.sheetjs.com/docs/api/write-options
        // RTL: true // Display the columns from right-to-left (the default value is false)
    };
    xlsx(dataToExcelExport, settings);
};

// Determina a qualificação baseado no tempo de existência do registro (status_created_at)
// Se o registro tiver 120 dias ou mais, retorne 'danger'
// Se o registro tiver 120 dias ou menos, retorne 'help'
// Se o registro tiver 80 dias ou menos, retorne 'warning'
// Se o registro tiver 40 dias ou menos, retorne 'info'
// Se o registro tiver 7 dias ou menos, retorne 'success'
const daysToQualify = ref([
    { days: 7, qualify: 'success', label: '7 dias ou menos' },
    { days: 39, qualify: 'info', label: 'Inferior a 40 dias' },
    { days: 79, qualify: 'warning', label: 'Inferior a 80 dias' },
    { days: 119, qualify: 'help', label: 'Inferior a 120 dias' },
    { days: 120, qualify: 'danger', label: '120 dias ou mais' }
]);
const getSeverity = (status_created_at) => {
    const ageInDays = moment().diff(moment(status_created_at, 'DD/MM/YYYY'), 'days');
    for (let i = 0; i < daysToQualify.value.length; i++) {
        const element = daysToQualify.value[i];
        if (ageInDays <= element.days) {
            return element.qualify;
        }
    }
    return 'danger';
};
const goField = (data) => {
    idPipeline.value = data.id;
    router.push({ path: `/${userData.schema_description}/pipeline/${data.id}` });
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
    getAgentes();
});
onBeforeUnmount(() => {
    // Remova o ouvinte ao destruir o componente para evitar vazamento de memória
    window.removeEventListener('resize', updateScreenWidth);
});

const queryUrl = ref('');
onMounted(async () => {
    window.addEventListener('resize', updateScreenWidth);
    updateScreenWidth(); // Atualize a propriedade inicialmente

    queryUrl.value = route.query;
    // Limpa os filtros do grid
    clearFilter();
    let load = false;
    if (route.query.tpd && route.query.tpd.length) {
        tipoDoc.value = route.query.tpd;
        filters.value.doc_venda = { value: route.query.tpd, matchMode: 'equals' };
        load = true;
        filtrarUnidades();
    }
    if (route.query.per && route.query.per.length) {
        const periodo = [];
        periodo.push(moment(route.query.per.split(',')[0]).format('YYYY-MM-DDTHH:mm:ss'));
        if (route.query.per.split(',')[1]) periodo.push(moment(route.query.per.split(',')[1]).format('YYYY-MM-DDTHH:mm:ss'));
        else periodo.push(moment(route.query.per.split(',')[0]).format('YYYY-MM-DDTHH:mm:ss'));
        periodo.value = periodo;
        filters.value.status_created_at = { value: periodo.value, matchMode: 'dateIs' };
        load = true;
    }
    if (route.query.tdoc && route.query.tdoc.length) {
        unidadeNegocio.value = route.query.tdoc;
        filters.value.tipo_doc = { value: route.query.tdoc, matchMode: 'equals' };
        load = true;
    }
    if (route.query.ag && route.query.ag.length) {
        agenteNegocio.value = route.query.ag;
        filters.value.agente = { value: route.query.ag, matchMode: 'equals' };
        load = true;
    }
    if (route.query.stt && route.query.stt.length) {
        statusNegocio.value = route.query.stt;
        filters.value.last_status_params = { value: route.query.stt, matchMode: 'equals' };
        load = true;
    }
    router.replace({ query: {} });
    if (load) loadLazyData();
});
const customFilterOptions = ref({ filterclear: false });
</script>

<template>
    <div class="grid">
        <div class="col-12">
            <Breadcrumb v-if="mode != 'new' && !props.idCadastro" :items="[{ label: 'Todo o Pipeline', to: `/${userData.schema_description}/pipeline` }]" />
        </div>
        <div class="col-12">
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
        </div>

        <div class="col-12">
            <div class="card">
                <DataTable
                    ref="dt"
                    :value="gridData"
                    lazy
                    paginator
                    :rows="rowsPerPage"
                    dataKey="id"
                    :rowHover="true"
                    v-model:filters="filters"
                    filterDisplay="row"
                    :loading="loading"
                    :filters="filters"
                    responsiveLayout="scroll"
                    :totalRecords="totalRecords"
                    :rowsPerPageOptions="[5, 10, 20, 50, 200, 500]"
                    @page="onPage($event)"
                    @sort="onSort($event)"
                    @filter="onFilter($event)"
                    paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
                    :currentPageReportTemplate="`{first} a {last} de ${totalRecords} registros`"
                    scrollable
                    :filter-options="customFilterOptions"
                >
                    <template #header>
                        <div class="flex justify-content-end gap-3 mb-3 p-tag-esp">
                            <Tag class="tagQualify" :severity="qualify.qualify" v-for="qualify in daysToQualify" :key="qualify" :value="qualify.label"> </Tag>
                            <Tag class="tagRes" :value="`Total geral${totalRecords && totalRecords > 0 ? ` - ${totalRecords} registro(s)` : ''}: ${formatCurrency(sumRecords)}`"> </Tag>
                        </div>
                        <div class="grid">
                            <div class="col-6 md:col-3">
                                <Dropdown
                                    placeholder="Todos...?"
                                    :showClear="!!tipoDoc"
                                    class="flex-none flex"
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
                            </div>
                            <div class="col-6 md:col-3">
                                <Dropdown
                                    filter
                                    placeholder="Filtrar por Representada..."
                                    :showClear="!!unidade"
                                    class="flex-none flex"
                                    id="unidades"
                                    optionLabel="label"
                                    optionValue="value"
                                    v-model="unidade"
                                    :options="dropdownUnidades"
                                    @change="
                                        loadLazyData();
                                        filtrarUnidadesDescricao();
                                    "
                                />
                            </div>
                            <div class="col-12 md:col-6">
                                <Dropdown
                                    filter
                                    placeholder="Filtrar por Tipo..."
                                    :showClear="!!unidadeNegocio"
                                    class="flex-grow-1 flex"
                                    id="unidade_tipos"
                                    optionLabel="label"
                                    optionValue="value"
                                    v-model="unidadeNegocio"
                                    :options="dropdownUnidadesFilter"
                                    @change="loadLazyData()"
                                />
                            </div>
                        </div>
                        <div class="flex justify-content-end gap-3 mb-3 p-tag-esp">
                            <Button type="button" icon="fa-solid fa-cloud-arrow-down" label="Exportar dados" @click="exportXls()" />
                            <Button type="button" icon="fa-solid fa-filter" label="Limpar consulta" outlined @click="clearFilter()" />
                            <Button type="button" icon="fa-solid fa-refresh" label="Todo o pipeline" outlined @click="reload()" />
                            <Button type="button" icon="fa-solid fa-plus" label="Novo Registro" outlined @click="(mode = 'new'), scrollToTop()" />
                        </div>
                    </template>
                    <template #empty> <h2>Sem dados a apresentar para o filtro/período selecionado</h2> </template>
                    <template #loading> <h2>Carregando dados. Por favor aguarde...</h2> </template>
                    <template v-for="nome in listaNomes" :key="nome">
                        <Column :header="nome.label" :showFilterMenu="false" :filterField="nome.field" :filterMatchMode="'contains'" :filterMenuStyle="{ width: '14rem' }" style="min-width: 12rem" sortable :class="nome.class">
                            <template #body="{ data }">
                                <Tag v-if="nome.tagged == true" :value="data[nome.field]" :severity="getSeverity(data[nome.field])" />
                                <span v-else v-html="nome.maxLength && String(data[nome.field]).trim().length == nome.maxLength ? String(data[nome.field]).trim().substring(0, nome.maxLength) + '...' : String(data[nome.field]).trim()"></span>
                            </template>
                            <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                                <Dropdown :id="nome.field" optionLabel="label" optionValue="value" v-model="filterModel.value" :options="nome.list" @change="filterCallback()" showClear placeholder="Pesquise..." />
                            </template>
                            <template v-else-if="nome.type == 'date'" #filter="{ filterModel, filterCallback }">
                                <Calendar v-model="filterModel.value" dateFormat="dd/mm/yy" selectionMode="range" showButtonBar :numberOfMonths="2" placeholder="dd/mm/aaaa" mask="99/99/9999" @update:modelValue="filterCallback()" />
                            </template>
                            <template v-else #filter="{ filterModel, filterCallback }">
                                <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter" placeholder="Pesquise..." />
                            </template>
                            <template #filterclear="{ filterCallback }">
                                <Button type="button" icon="fa-regular fa-circle-xmark" @click="filterCallback()" class="p-button-secondary"></Button>
                            </template>
                            <template #filterapply="{ filterCallback }">
                                <Button type="button" icon="fa-solid fa-check" @click="filterCallback()" class="p-button-success"></Button>
                            </template>
                        </Column>
                    </template>
                    <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible" style="0.6rem">
                        <template #body="{ data }">
                            <Button type="button" class="p-button-outlined" rounded icon="fa-solid fa-bars" @click="goField(data)" v-tooltip.left="'Clique para mais opções'" />
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>
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
