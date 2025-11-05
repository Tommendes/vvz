<script setup>
import { onBeforeUnmount, onMounted, ref, watchEffect } from 'vue';
import { FilterMatchMode } from 'primevue/api';
const baseApiUrl = import.meta.env.VITE_BASE_API_URL;
import axios from '@/axios-interceptor';
import { defaultWarn } from '@/toast';
import FisNotasForm from './FisNotasForm.vue';
import { formatCurrency } from '@/global';
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
    uProf.value = await store.getProfile();
});

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();

const urlBase = ref(`${baseApiUrl}/fiscal-notas`);
const dt = ref();
const totalRecords = ref(0); // O total de registros (deve ser atualizado com o total real)
const rowsPerPageOptions = ref([5, 10, 20, 50, 200, 500, 1000]); // Opções de registros por página
const sumRecords = ref(0); // O valor total de registros (deve ser atualizado com o total real)
const rowsPerPage = ref(10); // Quantidade de registros por página
const loading = ref(false); // Indica se está carregando
const gridData = ref([]); // Dados do grid
const dropdownEmpresas = ref([]); // Itens do dropdown de Empresas
const dropdownFornecedores = ref([]); // Itens do dropdown de Fornecedores
const empresa = ref(null); // Tipo de documento selecionado
const fornecedor = ref(null); // Unidade de negócio selecionada
const periodo = ref(null); // Período selecionado

// Obter Empresas
const getEmpresas = async () => {
    const url = `${baseApiUrl}/empresas`;
    dropdownEmpresas.value = [];
    await axios.get(url).then((res) => {
        res.data.data.map((item) => {
            dropdownEmpresas.value.push({
                value: item.id,
                label: item.razaosocial
            });
        });
    });
};
// Obter Fornecedores
const getFornecedores = async () => {
    const url = `${baseApiUrl}/fiscal-notas/f-a/gfr`;
    dropdownFornecedores.value = [];
    await axios.get(url).then((res) => {
        res.data.map((item) => {
            dropdownFornecedores.value.push({
                value: item.id,
                label: `${item.nome} - ${item.cpf_cnpj}`
            });
        });
    });
};
// Lista de tipos
const listaNomes = ref([
    { field: 'numero', label: 'Nota fiscal', matchMode: FilterMatchMode.CONTAINS, minWidth: '25rem' },
    { field: 'serie', label: 'Série', matchMode: FilterMatchMode.CONTAINS, minWidth: '25rem' },
    { field: 'data_emissao', label: 'Emissão', type: 'date', tagged: true, matchMode: FilterMatchMode.BETWEEN, minWidth: '25rem' },
    { field: 'fornecedor', label: 'Fornecedor', matchMode: FilterMatchMode.EQUALS, list: dropdownFornecedores.value, class: isMobile.value || screenWidth.value < 1000 ? 'hidden' : '' },
    { field: 'empresa', label: 'Empresa', matchMode: FilterMatchMode.EQUALS, list: dropdownEmpresas.value, class: isMobile.value || screenWidth.value < 1000 ? 'hidden' : '' }
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
            const quant = totalRecords.value;
            // TODO: Remover todos os valores eu rowsPerPageOptions que forem maiores que o total de registros e ao fim adicionar rowsPerPageOptions.value.push(quant);
            rowsPerPageOptions.value = rowsPerPageOptions.value.filter((item) => item <= totalRecords.value);
            // if (quant > 1)
            rowsPerPageOptions.value.push(quant);
            // TODO: Remova todos os valores duplicados de rowsPerPageOptions
            rowsPerPageOptions.value = [...new Set(rowsPerPageOptions.value)];
            gridData.value.forEach((element) => {
                element.data_emissao = moment(element.data_emissao).format('DD/MM/YYYY');
                const numero = element.numero || undefined;
                if (numero) element.numero = numero + (uProf.value.admin >= 1 ? ` (${element.id})` : '');
            });
            loading.value = false;
        })
        .catch((error) => {
            const erro = error.response.data || error.response || 'Erro ao carregar dados!';
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
            if (key && key == 'data_emissao') {
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
    urlFilters.value = `?${url}`;

    await loadLazyData();
};

onMounted(async () => {
    window.addEventListener('resize', updateScreenWidth);
    updateScreenWidth(); // Atualize a propriedade inicialmente

    // queryUrl.value = route.query;
    // Limpa os filtros do grid
    clearFilter();
    router.replace({ query: {} });
    await mountUrlFilters();
});

import xlsx from 'json-as-xlsx';
let dataToExcelExport = [
    {
        sheet: 'Notas Fiscais',
        columns: [
            {
                label: 'Movimento E/S',
                value: (row) => {
                    let answer = row.data_e_s;
                    switch (row.data_e_s) {
                        case '0':
                            answer = 'Entrada';
                            break;
                        case '1':
                            answer = 'Saída';
                            break;
                        default:
                            answer = 'Entrada';
                            break;
                    }
                    return answer;
                }
            },
            { label: 'Número', value: (row) => row.numero },
            { label: 'Série', value: (row) => row.serie },
            { label: 'Chave', value: (row) => row.chave },
            { label: 'Emissão em', value: (row) => moment(row.data_emissao).format('DD/MM/YYYY') },
            { label: 'Fornecedor', value: (row) => row.fornecedor },
            { label: 'Doc Fornecedor', value: (row) => row.cpf_cnpj_fornecedor },
            { label: 'Empresa', value: (row) => row.empresa },
            { label: 'Doc Empresa', value: (row) => row.cpf_cnpj_empresa },
            { label: 'Descricao', value: (row) => row.descricao },
            { label: 'Valor Total', value: (row) => Number(row.valor_total), format: 'R$ #,##0.00' },
            { label: 'Valor Desconto', value: (row) => Number(row.valor_desconto), format: 'R$ #,##0.00' },
            { label: 'Valor Liquido', value: (row) => Number(row.valor_liquido), format: 'R$ #,##0.00' },
            { label: 'Valor Icms', value: (row) => Number(row.valor_icms), format: 'R$ #,##0.00' },
            { label: 'Valor Ipi', value: (row) => Number(row.valor_ipi), format: 'R$ #,##0.00' },
            { label: 'Valor Pis', value: (row) => Number(row.valor_pis), format: 'R$ #,##0.00' },
            { label: 'Valor Cofins', value: (row) => Number(row.valor_cofins), format: 'R$ #,##0.00' },
            { label: 'Valor Iss', value: (row) => Number(row.valor_iss), format: 'R$ #,##0.00' },
            { label: 'Valor IR', value: (row) => Number(row.valor_ir), format: 'R$ #,##0.00' },
            { label: 'Valor Csll', value: (row) => Number(row.valor_csll), format: 'R$ #,##0.00' },
            { label: 'Valor Inss', value: (row) => Number(row.valor_inss), format: 'R$ #,##0.00' },
            { label: 'Valor Outros', value: (row) => Number(row.valor_outros), format: 'R$ #,##0.00' },
            { label: 'Valor Servicos', value: (row) => Number(row.valor_servicos), format: 'R$ #,##0.00' },
            { label: 'Valor Produtos', value: (row) => Number(row.valor_produtos), format: 'R$ #,##0.00' },
            { label: 'Valor Frete', value: (row) => Number(row.valor_frete), format: 'R$ #,##0.00' },
            { label: 'Valor Seguro', value: (row) => Number(row.valor_seguro), format: 'R$ #,##0.00' },
            { label: 'Valor Despesas', value: (row) => Number(row.valor_despesas), format: 'R$ #,##0.00' }
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
    window.open(`#/${uProf.value.schema_description}/notas-fiscais/${data.id}`, '_blank');
};
onBeforeMount(() => {
    // Inicializa os filtros do grid
    initFilters();
    getEmpresas();
    getFornecedores();
});
onBeforeUnmount(() => {
    // Remova o ouvinte ao destruir o componente para evitar vazamento de memória
    window.removeEventListener('resize', updateScreenWidth);
});
const customFilterOptions = ref({ filterclear: false });

const dialogRef = ref(null);
const messagesButtoms = ref([
    {
        label: 'Ok',
        icon: 'fa-solid fa-check',
        severity: 'success'
    },
    {
        label: 'Selecionar/Criar registro no Pipeline',
        icon: 'fa-regular fa-trash-can',
        severity: 'default'
    }
]);
const showMessage = (body) => {
    dialogRef.value = dialog.open(Prompts, {
        data: {
            body: body
        },
        props: {
            header: body.label,
            style: {
                width: '50vw'
            },
            breakpoints: {
                '960px': '75vw',
                '640px': '90vw'
            },
            modal: true
        },
        onClose: async (options) => {
            if (options.data.label == messagesButtoms.value[0].label) {
                /* empty */
            } else if (options.data.label == messagesButtoms.value[1].label) {
                router.push({ path: `/${uProf.value.schema_description}/pipeline`, query: { tpd: '2' } });
            }
        }
    });
};
const newDocument = () => {
    // messagesButtoms.value.forEach((elementButton) => {
    //     // Adicionar ao elementButton o id da mensagem
    //     elementButton.id = element.id;
    //     elementButton.message = element.msg;
    //     elementButton.title = element.title;
    // });
    showMessage({
        label: 'Nova Nota Fiscal',
        message: [
            'Pressione ESC para fechar',
            `<p>Para registrar uma nota fiscal, clique no botão "${messagesButtoms.value[1].label}" abaixo. Você será direcionado para o Pipeline</p><p>Após selecionar o pedido, clique no botão "Comissionamento" para registrar a comissão</p>`
        ],
        buttons: messagesButtoms.value
    });
};
</script>

<template>
    <div class="grid">
        <div class="col-12">
            <Breadcrumb :items="[{ label: 'Notas Fiscais', to: `/${uProf.schema_description}/notas-fiscais` }]" />
        </div>
        <div class="col-12">
            <FisNotasForm :mode="mode" @changed="loadLazyData()" @cancel="mode = 'grid'" v-if="mode == 'new'" />
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
                    :rowsPerPageOptions="rowsPerPageOptions.length > 1 ? rowsPerPageOptions : [5, 10, 20, 50, 200]"
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
                        <div class="flex justify-content-end gap-3 mb-3 p-tag-esp">
                            <span class="p-button p-button-outlined" severity="info">Exibindo os primeiros {{ gridData.length }} resultados</span>
                        </div>
                        <div class="flex justify-content-end gap-3 mb-3 p-tag-esp">
                            <Button type="button" icon="fa-solid fa-cloud-arrow-down" label="Exportar dados" @click="exportXls()" />
                            <Button type="button" icon="fa-solid fa-refresh" label="Todos os Registros" outlined @click="reload()" />
                            <Button type="button" icon="fa-solid fa-plus" label="Novo Lançamento" outlined @click="newDocument()" />
                        </div>
                    </template>
                    <template #empty>
                        <h2>Sem dados a apresentar para o filtro/período selecionado</h2>
                    </template>
                    <template #loading>
                        <h2>Carregando dados. Por favor aguarde...</h2>
                    </template>
                    <template v-for="nome in listaNomes" :key="nome">
                        <Column :header="nome.label" :showFilterMenu="false" :filterField="nome.field" :filterMatchMode="'contains'" :filterMenuStyle="{ width: '14rem' }" style="min-width: 12rem" sortable :sortField="nome.field" :class="nome.class">
                            <template #body="{ data }">
                                <Tag v-if="nome.tagged == true && data[nome.field]" :value="data[nome.field]" :severity="getSeverity(data[nome.field], nome.type)" />
                                <span
                                    v-else-if="data[nome.field]"
                                    v-html="nome.maxLength && String(data[nome.field]).trim().length >= nome.maxLength ? String(data[nome.field]).trim().substring(0, nome.maxLength) + '...' : String(data[nome.field]).trim()"
                                ></span>
                                <span v-else v-html="''"></span>
                            </template>
                            <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                                <Dropdown :id="nome.field" optionLabel="label" optionValue="value" v-model="filterModel.value" :options="nome.list" @change="filterCallback()" filter showClear placeholder="Pesquise..." />
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
