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
const dropdownUnidadesFilter = ref([]); // Itens do dropdown de Unidades de Negócio do grid
const tipoDoc = ref(null); // Tipo de documento selecionado
const unidade = ref(null); // Unidade de negócio selecionada
const unidadeNegocio = ref(null); // Unidade de negócio selecionada

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
// { field: 'agente', label: 'Agente', minWidth: '6rem' },
const listaNomes = ref([
    { field: 'nome', label: 'Cliente' },
    { field: 'tipo_doc', label: 'Tipo' },
    { field: 'documento', label: 'Documento', minWidth: '5rem' },
    { field: 'descricao', label: 'Descrição', minWidth: '8rem' },
    { field: 'valor_bruto', label: 'R$ bruto', minWidth: '5rem' },
    {
        field: 'status_created_at',
        label: 'Data',
        type: 'date',
        minWidth: '5rem',
        tagged: true
    }
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
    tipoDoc.value = unidade.value = unidadeNegocio.value = null;
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
// Carrega os dados do grid
const loadLazyData = () => {
    loading.value = true;
    expanded.value = false;
    setTimeout(() => {
        const url = `${urlBase.value}${urlFilters.value}`;
        axios
            .get(url)
            .then((axiosRes) => {
                gridData.value = axiosRes.data.data;
                totalRecords.value = axiosRes.data.totalRecords;
                gridData.value.forEach((element) => {
                    if (element.tipo_doc) element.tipo_doc = element.tipo_doc.replaceAll('_', ' '); //dropdownStatusParams.value.find((item) => item.value == element.tipo_doc).label;
                    const limitDescription = 100;
                    const description = element.descricao || undefined;
                    if (description) {
                        element.descricao = description.replaceAll('Este documento foi convertido para pedido. Segue a descrição original do documento:', '').trim().substr(0, limitDescription);
                        if (description.length > limitDescription) element.descricao += ' ...';
                    }
                    if (element.valor_bruto && element.valor_bruto >= 0) element.valor_bruto = formatCurrency(element.valor_bruto);
                    // .toLocaleString('pt-BR', {
                    //         style: 'currency',
                    //         currency: 'BRL'
                    //     });
                });
                loading.value = false;
            })
            .catch((error) => {
                const logTo = error;
                try {
                    defaultError(error.response.data);
                } catch (error) {
                    defaultError('Erro ao carregar dados!');
                    console.log(typeof logTo, logTo);
                }
                router.push({ path: '/' });
            });
    }, Math.random() * 1000 + 250);
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
    if (tipoDoc.value) url += `field:doc_venda=equals:${tipoDoc.value}&`;
    if (unidade.value) url += `field:unidade=equals:${unidade.value}&`;
    if (unidadeNegocio.value) url += `field:descricaoUnidade=equals:${unidadeNegocio.value}&`;
    if (props.idCadastro) url += `field:id_cadastros=equals:${props.idCadastro}&`;
    console.log(url);
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
    router.push({ path: `/${userData.cliente}/${userData.dominio}/pipeline/${data.id}` });
};
const onRowExpand = (event) => {
    // defaultInfo('Product Expanded: ' + event.data.documento);
};
const onRowCollapse = (event) => {
    // defaultSuccess('Product Collapsed: ' + event.data.documento);
};
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
    // Se props.idCadastro for declarado, remover o primeiro item da lista de campos, pois é o nome do cliente
    if (props.idCadastro) listaNomes.value.shift();
    // Inicializa os filtros do grid
    initFilters();
    loadOptions();
});
onMounted(() => {
    // Limpa os filtros do grid
    clearFilter();
    if (route.query.tpd) {
        tipoDoc.value = route.query.tpd;

        loadLazyData();
        filtrarUnidades();
    }
    console.log(tipoDoc.value);
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new' && !props.idCadastro" :items="[{ label: 'Todo o Pipeline' }]" />
    <div class="card" :style="!route.name == 'pipeline' ? 'min-width: 100%' : ''">
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
            class="hidden lg:block"
            style="font-size: 0.9rem"
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
            tableStyle="min-width: 75rem"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            :currentPageReportTemplate="`{first} a {last} de ${totalRecords} registros`"
            scrollable
            v-model:expandedRows="expandedRows"
            @rowExpand="onRowExpand"
            @rowCollapse="onRowCollapse"
        >
            <!-- scrollHeight="600px" -->
            <template #header>
                <div class="flex justify-content-end gap-3 mb-3">
                    <Tag :severity="qualify.qualify" v-for="qualify in daysToQualify" :key="qualify" :value="qualify.label"> </Tag>
                </div>
                <div class="flex justify-content-end gap-3">
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
                        placeholder="Filtrar por Unidade..."
                        :showClear="!!unidade"
                        style="min-width: 150px"
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
                    <Dropdown
                        filter
                        placeholder="Filtrar por Tipo..."
                        :showClear="!!unidadeNegocio"
                        style="min-width: 200px"
                        id="unidade_tipos"
                        optionLabel="label"
                        optionValue="value"
                        v-model="unidadeNegocio"
                        :options="dropdownUnidadesFilter"
                        @change="loadLazyData()"
                    />
                    <Button icon="pi pi-external-link" label="Exportar" @click="exportCSV($event)" />
                    <Button type="button" icon="pi pi-filter-slash" label="Limpar filtro" outlined @click="clearFilter()" />
                    <Button type="button" icon="pi pi-plus" label="Novo Registro" outlined @click="mode = 'new'" />
                    <Button type="button" icon="fa-solid fa-angles-up" @click="collapseAll()" v-if="expanded" />
                    <Button type="button" icon="fa-solid fa-angles-down" @click="expandAll()" v-else />
                </div>
            </template>
            <Column expander style="width: 5rem" />
            <template v-for="nome in listaNomes" :key="nome">
                <Column :field="nome.field" :header="nome.label" :filterField="nome.field" :filterMatchMode="'contains'" sortable :dataType="nome.type" :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}`">
                    <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                        <Dropdown :id="nome.field" optionLabel="label" optionValue="value" v-model="filterModel.value" :options="nome.list" @change="filterCallback()" :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}`" />
                    </template>
                    <template v-else-if="nome.type == 'date'" #filter="{ filterModel, filterCallback }">
                        <Calendar
                            v-model="filterModel.value"
                            dateFormat="dd/mm/yy"
                            selectionMode="range"
                            :numberOfMonths="2"
                            placeholder="dd/mm/aaaa"
                            mask="99/99/9999"
                            @input="filterCallback()"
                            :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}`"
                        />
                    </template>
                    <template v-else #filter="{ filterModel, filterCallback }">
                        <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter" placeholder="Pesquise..." :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}`" />
                    </template>
                    <template #body="{ data }">
                        <Tag v-if="nome.tagged == true" :value="data[nome.field]" :severity="getSeverity(data[nome.field])" />
                        <span v-else v-html="data[nome.field]"></span>
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
