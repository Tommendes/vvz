<script setup>
import { onBeforeUnmount, onMounted, ref, watchEffect } from 'vue';
import { FilterMatchMode } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultWarn, defaultSuccess } from '@/toast';
// import FinanceiroForm from './FinanceiroForm.vue';
import { formatCurrency, removeHtmlTags } from '@/global';
import Breadcrumb from '@/components/Breadcrumb.vue';
import moment from 'moment';
import Prompts from '@/components/Prompts.vue';
import { useDialog } from 'primevue/usedialog';
const dialog = useDialog();

const screenWidth = ref(window.innerWidth);
const isMobile = ref(window.matchMedia('(max-width: 767px)').matches);
const updateScreenWidth = () => {
    isMobile.value = window.matchMedia('(max-width: 767px)').matches;
    screenWidth.value = window.innerWidth;
};

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    initFilters();
    uProf.value = await store.getProfile()
    getEmpresas();
});

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();

const urlBase = ref(`${baseApiUrl}/fin-lancamentos`);
const dt = ref();
const totalRecords = ref(0); // O total de registros (deve ser atualizado com o total real)
const rowsPerPageOptions = ref([5, 10, 20, 50, 200]); // Opções de registros por página
const sumRecords = ref(0); // O valor total de registros (deve ser atualizado com o total real)
const loading = ref(false); // Indica se está carregando
const gridData = ref([]); // Dados do grid
const dropdownEmpresas = ref([]); // Itens do dropdown de Empresas
const dropdownCentros = ref([
    { value: 0, label: 'Todos os Centros...' },
    { value: 1, label: 'Receitas' },
    { value: 2, label: 'Despesas' }
]); // Itens do dropdown de Centros
const dropdownSituacao = ref([
    { label: 'Todas as Situações...', value: 0 },
    { label: 'Aberto', value: STATUS_REGISTRO_ABERTO },
    { label: 'Pago', value: STATUS_REGISTRO_PAGO },
    { label: 'Conciliado', value: STATUS_REGISTRO_CONCILIADO },
    { label: 'Cancelado', value: STATUS_REGISTRO_CANCELADO }
]); // Itens do dropdown de Situação
const empresa = ref(null); // Empresa selecionada
const empresaLabel = ref(null); // Empresa selecionada
const centro = ref(0); // Centro selecionado
const situacao = ref(0); // Situação selecionada
const periodo = ref(null); // Período selecionado

const STATUS_REGISTRO_ABERTO = 1
const STATUS_REGISTRO_PAGO = 2
const STATUS_REGISTRO_CONCILIADO = 3
const STATUS_REGISTRO_CANCELADO = 99

import { Mask } from 'maska';
const masks = ref({
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    }),
    valor: new Mask({
        mask: '0,99'
    })
});

// Obter Empresas
const getEmpresas = async () => {
    const url = `${baseApiUrl}/empresas`;
    await axios.get(url).then((res) => {
        res.data.data.map((item) => {
            dropdownEmpresas.value.push({
                value: item.id,
                label: `${item.razaosocial} - ${masks.value.cpf_cnpj.masked(item.cpf_cnpj_empresa)}`
            });
        });
        if (uProf.value.id_empresa && uProf.value.multiCliente < 1) empresa.value = uProf.value.id_empresa;
        else {
            dropdownEmpresas.value = [
                { value: "0", label: 'Selecione aqui uma empresa para exibir os registros (Ou esta opção para todas...)' },
                ...dropdownEmpresas.value
            ];
            empresa.value = "0";
        }
        if (dropdownEmpresas.value.length <= 2) empresa.value = dropdownEmpresas.value[1].value;
        empresaLabel.value = dropdownEmpresas.value.find((item) => item.value == uProf.value.id_empresa).label;
        // TODO: Se houver apenas uma empresa ou uProf.multiCliente < 1, remova listaNomes[0]
        if (dropdownEmpresas.value.length <= 2 || uProf.value.multiCliente < 1) listaNomes.value.shift();
    });
};
// Itens do grid
const limitDescription = 150;
const limitNome = 80;

// Lista de tipos
const listaNomes = ref([
    { field: 'emp_fantasia', label: 'Empresa', matchMode: FilterMatchMode.EQUALS },
    { field: 'destinatario_agrupado', label: 'Credor | Devedor', matchMode: FilterMatchMode.CONTAINS, minWidth: '15rem' },
    // { field: 'data_emissao', label: 'Emissão', type: 'date', tagged: true, matchMode: FilterMatchMode.BETWEEN },
    { field: 'data_vencimento', label: 'Vencimento', type: 'date', tagged: true, matchMode: FilterMatchMode.BETWEEN },
    { field: 'data_pagto', label: 'Pagamento', type: 'date', tagged: true, matchMode: FilterMatchMode.BETWEEN },
    { field: 'valor_bruto_conta', label: 'R$ Bruto', matchMode: FilterMatchMode.CONTAINS, class: isMobile.value || screenWidth.value < 960 ? 'hidden' : 'md:text-right' },
    { field: 'valor_liquido_conta', label: 'R$ Liquido', matchMode: FilterMatchMode.CONTAINS, class: isMobile.value || screenWidth.value < 960 ? 'hidden' : 'md:text-right' },
    { field: 'valor_vencimento_parcela', label: 'R$ Vencimento', matchMode: FilterMatchMode.CONTAINS, class: isMobile.value || screenWidth.value < 960 ? 'hidden' : 'md:text-right' },
    { field: 'descricao_agrupada', label: 'Descrição', matchMode: FilterMatchMode.CONTAINS, minWidth: '20rem', class: isMobile.value || screenWidth.value < 1000 ? 'hidden' : '' },
    // { field: 'duplicata', label: 'Duplicata', matchMode: FilterMatchMode.CONTAINS, class: isMobile.value || screenWidth.value < 1000 ? 'hidden' : '' },
    // { field: 'documento', label: 'Documento', matchMode: FilterMatchMode.CONTAINS, class: isMobile.value || screenWidth.value < 1000 ? 'hidden' : '' },
    // { field: 'pedido', label: 'Pedido', matchMode: FilterMatchMode.CONTAINS, class: isMobile.value || screenWidth.value < 1000 ? 'hidden' : '' },
]);

// Inicializa os filtros do grid
const initFilters = () => {
    filters.value = {};
    listaNomes.value.forEach((element) => {
        filters.value = {
            [element.field]: { value: '', matchMode: element.matchMode },
            ...filters.value
        };
    });
    filters.value = {
        doc_venda: { value: '', matchMode: 'contains' },
        ...filters.value
    };
};
const filters = ref({});
const lazyParams = ref({});
const urlFilters = ref('');
// Limpa os filtros do grid
const clearFilter = async () => {
    loading.value = true;
    empresa.value = "0";
    centro.value = "0";
    situacao.value = "0";
    initFilters();
    lazyParams.value = {
        first: dt.value.first,
        rows: dt.value.rows,
        sortField: null,
        sortOrder: null,
        filters: filters.value
    };
    await mountUrlFilters();
};
const reload = () => {
    router.replace({ query: {} });
    clearFilter();
};
// Carrega os dados do grid
const loadLazyData = async () => {
    loading.value = true;
    const url = `${urlBase.value}${urlFilters.value}`;
    await axios
        .get(url)
        .then(async (axiosRes) => {
            gridData.value = axiosRes.data.data;
            totalRecords.value = axiosRes.data.totalRecords;
            sumRecords.value = axiosRes.data.sumRecords;
            const quant = totalRecords.value;
            // TODO: Remover todos os valores eu rowsPerPageOptions que forem maiores que o total de registros e ao fim adicionar rowsPerPageOptions.value.push(quant);
            rowsPerPageOptions.value = rowsPerPageOptions.value.filter((item) => item <= totalRecords.value);
            // if (quant > 1) 
            rowsPerPageOptions.value.push(quant);
            // TODO: Remova todos os valores duplicados de rowsPerPageOptions
            rowsPerPageOptions.value = [...new Set(rowsPerPageOptions.value)];
            gridData.value.forEach((element) => {
                element.data_emissao = element.data_emissao ? moment(element.data_emissao).format('DD/MM/YYYY') : '';
                element.data_vencimento = element.data_vencimento ? moment(element.data_vencimento).format('DD/MM/YYYY') : '';
                element.data_pagto = element.data_pagto ? moment(element.data_pagto).format('DD/MM/YYYY') : '';
                element.centroLabel = String(element.centro) == "1" ? "Receita" : "Despesa"

                let destinatario_agrupado = element.destinatario || undefined;
                if (destinatario_agrupado) {
                    destinatario_agrupado = destinatario_agrupado.trim().substr(0, limitNome);
                }
                if (element.destinatario.length > limitNome) destinatario_agrupado += ' ...';
                if (element.cpf_cnpj_destinatario) destinatario_agrupado += ' ' + masks.value.cpf_cnpj.masked(element.cpf_cnpj_destinatario);
                if (uProf.value.admin >= 1) destinatario_agrupado += `(${element.id})`;
                element.destinatario_agrupado = destinatario_agrupado;

                let descricao_agrupada = element.descricao_parcela || undefined;
                descricao_agrupada += element.descricao_conta
                if (descricao_agrupada) {
                    descricao_agrupada = descricao_agrupada.trim().substr(0, limitDescription);
                }
                if (element.descricao_parcela.length > limitDescription) descricao_agrupada += ' ...';
                if (element.duplicata) descricao_agrupada += `<p>Duplicata: ${element.duplicata}</p>`;
                if (element.documento) descricao_agrupada += `<p>Documento: ${element.documento}</p>`;
                if (element.pedido) descricao_agrupada += `<p>Pedido: ${element.pedido}</p>`;
                element.descricao_agrupada = descricao_agrupada;

                const numero = element.numero || undefined;
                if (numero) element.numero = numero + (uProf.value.admin >= 1 ? ` (${element.id})` : '');
            });
            loading.value = false;
        })
        .catch((error) => {
            const erro = error.response.data || error.response || 'Erro ao carregar dados!'
            defaultWarn(erro);
            if (error.response && error.response.status == 401) router.push('/');
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
// Armazena o modo de operação do grid
const mode = ref('grid');
/**
 * Monta a url com os filtros
 */
const mountUrlFilters = async () => {
    let url = '';
    Object.keys(filters.value).forEach((key) => {
        if (filters.value[key].value) {
            const macthMode = filters.value[key].matchMode || 'contains';
            let value = filters.value[key].value;
            if (key && ['data_emissao', 'data_vencimento', 'data_pagto'].includes(key)) {
                const dI = value[0] || undefined;
                const dF = value[1] || undefined;
                value = `${moment(dI).format('YYYY-MM-DD')},${moment(dF).format('YYYY-MM-DD')}`;
                periodo.value = undefined;
            }
            url += `field:${key}=${macthMode}:${value}&`;
        }
    });
    if (empresa.value > 0) url += `field:id_empresa=${FilterMatchMode.EQUALS}:${empresa.value}&`;
    if (centro.value > 0) url += `field:centro=${FilterMatchMode.EQUALS}:${centro.value}&`;
    if (situacao.value > 0) url += `field:situacao=${FilterMatchMode.EQUALS}:${situacao.value}&`;
    if (lazyParams.value.originalEvent && (lazyParams.value.originalEvent.page || lazyParams.value.originalEvent.rows))
        Object.keys(lazyParams.value.originalEvent).forEach((key) => {
            url += `params:${key}=${lazyParams.value.originalEvent[key]}&`;
        });
    if (lazyParams.value.sortField) url += `sort:${lazyParams.value.sortField}=${Number(lazyParams.value.sortOrder) == 1 ? 'asc' : 'desc'}&`;
    urlFilters.value = `?${url}`;

    await loadLazyData();
};

onMounted(async () => {
    window.addEventListener('resize', updateScreenWidth);
    updateScreenWidth(); // Atualize a propriedade inicialmente

    // queryUrl.value = route.query;
    // Limpa os filtros do grid
    clearFilter();
    // router.replace({ query: {} });
    // await mountUrlFilters();
});

import xlsx from 'json-as-xlsx';
let dataToExcelExport = [
    {
        sheet: 'Lançamentos Financeiros',
        columns: [
            {
                label: "Centro", value: (row) => {
                    let answer = String(row.centro);
                    switch (answer) {
                        case '1': answer = 'Receita';
                            break;
                        case '2': answer = 'Despesa';
                            break;
                        default: answer = 'N/D';
                            break;
                    }
                    return answer;
                }
            },
            {
                label: "Situacao", value: (row) => {
                    let answer = row.situacao;
                    switch (answer) {
                        case STATUS_REGISTRO_ABERTO: answer = 'Aberto';
                            break;
                        case STATUS_REGISTRO_PAGO: answer = 'Pago';
                            break;
                        case STATUS_REGISTRO_CONCILIADO: answer = 'Conciliado';
                            break;
                        case STATUS_REGISTRO_CANCELADO: answer = 'Cancelado';
                            break;
                        default: answer = 'N/D';
                            break;
                    }
                    return answer;
                }
            },
            { label: "Empresa", value: (row) => row.empresa },
            { label: "CNPJ Empresa", value: (row) => masks.value.cpf_cnpj.masked(row.cpf_cnpj_empresa) },
            { label: "Credor | Devedor", value: (row) => row.destinatario },
            { label: "CNPJ | CPF", value: (row) => masks.value.cpf_cnpj.masked(row.cpf_cnpj_destinatario) },
            { label: "Emissão em", value: (row) => moment(row.data_emissao, 'DD/MM/YYYY', true).isValid() ? row.data_emissao : 'Não informado' },
            { label: "Vencimento em", value: (row) => moment(row.data_vencimento, 'DD/MM/YYYY', true).isValid() ? row.data_vencimento : 'Não informado' },
            { label: "Pagamento em", value: (row) => moment(row.data_pagto, 'DD/MM/YYYY', true).isValid() ? row.data_pagto : 'Não informado' },
            { label: "Duplicata", value: (row) => row.duplicata },
            { label: "Documento Pagto", value: (row) => row.documento },
            { label: "Pedido", value: (row) => row.pedido },
            { label: "Descricao", value: (row) => removeHtmlTags(row.descricao_parcela) },
            { label: "Valor Bruto", value: (row) => Number(row.valor_bruto || 0.0), format: 'R$ #,##0.00' },
            { label: "Valor Liquido", value: (row) => Number(row.valor_liquido || 0.0), format: 'R$ #,##0.00' },
            { label: "Valor Parcela", value: (row) => Number(row.valor_vencimento || 0.0), format: 'R$ #,##0.00' },
        ],
        content: []
    }
];

const exportXls = () => {
    // const toExport = dt.value;
    const toExport = gridData;
    dataToExcelExport[0].content = [];
    toExport.value.forEach((element) => {
        dataToExcelExport[0].content.push(element);
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

// Determina a qualificação baseado no tempo de existência do registro (data_emissao)
// Se o registro tiver 120 dias ou mais, retorne 'danger'
// Se o registro tiver 120 dias ou menos, retorne 'help'
// Se o registro tiver 80 dias ou menos, retorne 'warning'
// Se o registro tiver 40 dias ou menos, retorne 'info'
// Se o registro tiver Até 7 dias, retorne 'success'
const daysToQualify = ref([
    { days: 7, qualify: 'success', label: 'Até 7 dias' },
    { days: 39, qualify: 'info', label: 'Inferior a 40 dias' },
    { days: 79, qualify: 'warning', label: 'Inferior a 80 dias' },
    { days: 119, qualify: 'help', label: 'Inferior a 120 dias' },
    { days: 120, qualify: 'danger', label: '120 dias ou mais' }
]);
const getSeverity = (field, type = 'date') => {
    if (type == 'date') {
        const ageInDays = moment().diff(moment(field, 'DD/MM/YYYY'), 'days');
        for (let i = 0; i < daysToQualify.value.length; i++) {
            const element = daysToQualify.value[i];
            if (ageInDays <= element.days) {
                return element.qualify;
            }
        }
    } else if (type == 'number') {
        if (field <= 7) return 'success';
        if (field <= 39) return 'info';
        if (field <= 79) return 'warning';
        if (field <= 119) return 'help';
        if (field >= 120) return 'danger';
    } else if (type == 'sn') {
        if (field == 'Sim') return 'success';
        if (field == 'Não') return 'danger';
    }
    return 'danger';
};
const goField = (data) => {
    window.open(`#/${uProf.value.schema_description}/financeiro/${data.id}`, '_blank');
};
// // Carrega os dados do filtro do grid
// watchEffect(() => {
//     mountUrlFilters();
// });
onBeforeUnmount(() => {
    // Remova o ouvinte ao destruir o componente para evitar vazamento de memória
    window.removeEventListener('resize', updateScreenWidth);
});
const customFilterOptions = ref({ filterclear: false });
const newDocument = () => { defaultSuccess('Em breve...') };

const rowStyle = (data) => {
    if (data.centro == "2") return { 'color': '#d32f2f' };
    else return { 'color': '#00796b' };
};
</script>

<template>
    <div class="grid">
        <div class="col-12">
            <Breadcrumb :items="[{ label: 'Registros Financeiros', to: `/${uProf.schema_description}/notas-fiscais` }]" />
        </div>
        <div class="col-12">
            <!-- <FinanceiroForm :mode="mode" @changed="loadLazyData()" @cancel="mode = 'grid'" v-if="mode == 'new'" /> -->
        </div>

        <div class="col-12">
            <div class="card">
                <DataTable ref="dt" :value="gridData" lazy :rowStyle="rowStyle" paginator :rows="gridData.length"
                    dataKey="id" :rowHover="true" v-model:filters="filters" filterDisplay="row" :loading="loading"
                    :filters="filters" responsiveLayout="scroll" :totalRecords="totalRecords"
                    :rowsPerPageOptions="rowsPerPageOptions.length > 1 ? rowsPerPageOptions : [5, 10, 20, 50, 200, 500]"
                    @page="onPage($event)" @sort="onSort($event)" @filter="onFilter($event)"
                    paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
                    :currentPageReportTemplate="`{first} a {last} de ${totalRecords} registros`" scrollable
                    :filter-options="customFilterOptions">
                    <template #header>
                        <div class="flex justify-content-end gap-3 mb-3 p-tag-esp">
                            <Tag class="tagQualify" :severity="qualify.qualify" v-for="qualify in daysToQualify"
                                :key="qualify" :value="qualify.label"> </Tag>
                            <Tag class="tagRes"
                                :value="`Total geral${totalRecords && totalRecords > 0 ? ` - ${totalRecords} registro(s)` : ''}: ${formatCurrency(sumRecords)}`">
                            </Tag>
                        </div>
                        <div v-if="dropdownEmpresas.length > 2 && uProf.multiCliente >= 1"
                            class="flex justify-content-end gap-3 mb-3 p-tag-esp">
                            <Dropdown placeholder="Situação...?" id="situacao" optionLabel="label" optionValue="value"
                                v-model="situacao" :options="dropdownSituacao" @change="mountUrlFilters();" />
                            <Dropdown placeholder="Centros...?" id="centro" optionLabel="label" optionValue="value"
                                v-model="centro" :options="dropdownCentros" @change="mountUrlFilters();" />
                            <Dropdown placeholder="Emitentes...?" id="id_empresa" optionLabel="label"
                                optionValue="value" v-model="empresa" :options="dropdownEmpresas"
                                @change="mountUrlFilters();" />
                            <span class="p-button p-button-outlined" severity="info">Exibindo os primeiros {{
                                gridData.length }} de {{ totalRecords }} registros</span>
                        </div>
                        <div v-else class="flex justify-content-end gap-3 mb-3 p-tag-esp">
                            <Dropdown placeholder="Situação...?" id="situacao" optionLabel="label" optionValue="value"
                                v-model="situacao" :options="dropdownSituacao" @change="mountUrlFilters();" />
                            <Dropdown placeholder="Centros...?" id="centro" optionLabel="label" optionValue="value"
                                v-model="centro" :options="dropdownCentros" @change="mountUrlFilters();" />
                            <span class="p-button p-button-outlined" severity="info">Exibindo os primeiros {{
                                gridData.length }} de {{ totalRecords }} registros para {{ empresaLabel }}</span>
                        </div>
                        <div class="flex justify-content-end gap-3 mb-3 p-tag-esp">
                            <Button type="button" icon="fa-solid fa-cloud-arrow-down" label="Exportar dados"
                                @click="exportXls()" />
                            <Button type="button" icon="fa-solid fa-refresh" label="Todos os Registros" outlined
                                @click="reload()" />
                            <Button type="button" icon="fa-solid fa-plus" label="Novo Lançamento" outlined
                                @click="newDocument()" />
                        </div>
                    </template>
                    <template #empty>
                        <h2>Sem dados a apresentar para o filtro/período selecionado</h2>
                    </template>
                    <template #loading>
                        <h2>Carregando dados. Por favor aguarde...</h2>
                    </template>
                    <template v-for="nome in listaNomes" :key="nome">
                        <Column :header="nome.label" :showFilterMenu="false" :filterField="nome.field"
                            :filterMatchMode="'contains'" :filterMenuStyle="{ width: '14rem' }"
                            :style="`min-width: ${nome.minWidth ? nome.minWidth : '12rem'}`" sortable
                            :sortField="nome.field" :class="nome.class">
                            <template #body="{ data }">
                                <Tag v-if="nome.tagged == true && data[nome.field]" :value="data[nome.field]"
                                    :severity="getSeverity(data[nome.field], nome.type)" />
                                <span v-else-if="data[nome.field]"
                                    v-html="nome.maxLength && String(data[nome.field]).trim().length >= nome.maxLength ? String(data[nome.field]).trim().substring(0, nome.maxLength) + '...' : String(data[nome.field]).trim()"></span>
                                <span v-else v-html="''"></span>
                            </template>
                            <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                                <Dropdown :id="nome.field" optionLabel="label" optionValue="value"
                                    v-model="filterModel.value" :options="nome.list" @change="filterCallback()" filter
                                    showClear placeholder="Pesquise..." />
                            </template>
                            <template v-else-if="nome.type == 'date'" #filter="{ filterModel, filterCallback }">
                                <Calendar v-model="filterModel.value" dateFormat="dd/mm/yy" selectionMode="range"
                                    showButtonBar :numberOfMonths="2" placeholder="dd/mm/aaaa" mask="99/99/9999"
                                    @update:modelValue="filterCallback()" />
                            </template>
                            <template v-else #filter="{ filterModel, filterCallback }">
                                <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()"
                                    class="p-column-filter" placeholder="Pesquise..." />
                            </template>
                            <template #filterclear="{ filterCallback }">
                                <Button type="button" icon="fa-regular fa-circle-xmark" @click="filterCallback()"
                                    class="p-button-secondary"></Button>
                            </template>
                            <template #filterapply="{ filterCallback }">
                                <Button type="button" icon="fa-solid fa-check" @click="filterCallback()"
                                    class="p-button-success"></Button>
                            </template>
                        </Column>
                    </template>
                    <Column headerStyle="width: 5rem; text-align: center"
                        bodyStyle="text-align: center; overflow: visible">
                        <template #body="{ data }">
                            <Button type="button" class="p-button-outlined" rounded icon="fa-solid fa-bars"
                                @click="goField(data)" v-tooltip.left="'Clique para mais opções'" />
                        </template>
                    </Column>
                </DataTable>
                <div v-if="uProf.admin >= 1">
                    <p>mode: {{ mode }}</p>
                    <p>uProf: {{ uProf }}</p>
                    <p>empresa: {{ empresa }}</p>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.tagQualify {
    font-size: 1.5rem;
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