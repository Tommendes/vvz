<script setup>
import { onBeforeMount, onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultError } from '@/toast';
import moment from 'moment';
import ComissaoForm from './ComissaoForm.vue';
import Breadcrumb from '@/components/Breadcrumb.vue';
import { renderizarHTML, removeHtmlTags, userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { useRouter } from 'vue-router';
const router = useRouter();

import { Mask } from 'maska';
const masks = ref({
    aniversario: new Mask({
        mask: '##/##/####'
    }),
    cpf: new Mask({
        mask: '###.###.###-##'
    }),
    cnpj: new Mask({
        mask: '##.###.###/####-##'
    }),
    telefone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    })
});

const urlBase = ref(`${baseApiUrl}/comissoes`);

onBeforeMount(() => {
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
// Lista de meses

// Itens do grid
const listaNomes = ref([
    { field: 'id_pipeline', label: 'Documento relacionado' },
    { field: 'id_comis_agentes', label: 'Agente' },
    { field: 'liquidacao', label: 'Data da liquidação' }
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
                    // Exibe dado com máscara
                    if (element.cpf_cnpj && element.cpf_cnpj.length == 11) element.cpf_cnpj = masks.value.cpf.masked(element.cpf_cnpj);
                    else if (element.cpf_cnpj && element.cpf_cnpj.length == 14) element.cpf_cnpj = masks.value.cnpj.masked(element.cpf_cnpj);
                    // Tratamento para resultados nulos
                    if (element.aniversario == null) element.aniversario = '';
                    if (element.telefone == null) element.telefone = '';
                    // Converte data en para pt
                    const now = new Date();
                    if (element.aniversario) element.aniversario = `${moment(element.aniversario).format('DD/MM/YYYY')} (${moment(now).diff(element.aniversario, 'years')} anos)`;
                    if (element.email) element.email = renderizarHTML(element.email);
                });
                loading.value = false;
            })
            .catch((error) => {
                defaultError(error.response.data);
                router.push({ path: '/' });
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
const novoRegistro = () => {
    mode.value = 'new';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
watchEffect(() => {
    mountUrlFilters();
});
</script>

<template>
    <div class="grid">
        <div class="col-12">
            <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todas as Comissões', to: `/${userData.schema_description}/comissoes` }]" />
        </div>
        <div class="col-12">
            <ComissaoForm :mode="mode" @changed="loadLazyData()" @cancel="mode = 'grid'" v-if="mode == 'new'" />
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
                    :currentPageReportTemplate="`{first} a {last} de ${totalRecords} registros`"
                    scrollable
                >
                    <!-- scrollHeight="420px" -->
                    <template #header>
                        <div class="flex justify-content-end gap-3">
                            <Button v-if="userData.gestor" icon="fa-solid fa-cloud-arrow-down" label="Exportar" @click="exportCSV($event)" />
                            <Button type="button" icon="fa-solid fa-filter" label="Limpar filtro" outlined @click="clearFilter()" />
                            <Button type="button" icon="fa-solid fa-plus" label="Novo Registro" outlined @click="novoRegistro()" />
                        </div>
                    </template>
                    <template v-for="nome in listaNomes" :key="nome">
                        <Column :header="nome.label" :showFilterMenu="false" :filterField="nome.field" :filterMatchMode="'contains'" :filterMenuStyle="{ width: '14rem' }" style="min-width: 12rem" sortable :sortField="nome.field" :class="nome.class">
                            <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                                <Dropdown :id="nome.field" filter optionLabel="label" optionValue="value" v-model="filterModel.value" :options="nome.list" @change="filterCallback()" :class="nome.class" :style="``" />
                            </template>
                            <template v-else-if="nome.type == 'date'" #filter="{ filterModel, filterCallback }">
                                <Calendar v-model="filterModel.value" dateFormat="dd/mm/yy" selectionMode="range" :numberOfMonths="2" placeholder="dd/mm/aaaa" mask="99/99/9999" @input="filterCallback()" :style="``" />
                            </template>
                            <template v-else #filter="{ filterModel, filterCallback }">
                                <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter" placeholder="Pesquise..." :style="``" />
                            </template>
                            <template #body="{ data }">
                                <Tag v-if="nome.tagged == true" :value="data[nome.field]" :severity="getSeverity(data[nome.field])" />
                                <span v-else-if="data[nome.field] && nome.mask" v-html="masks[nome.mask].masked(data[nome.field])"></span>
                                <span v-else v-html="data[nome.maxLength] ? String(data[nome.field]).trim().substring(0, data[nome.maxLength]) : String(data[nome.field]).trim()"></span>
                            </template>
                        </Column>
                    </template>
                    <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                        <template #body="{ data }">
                            <Button type="button" class="p-button-outlined" rounded icon="fa-solid fa-bars" @click="router.push({ path: `/${userData.schema_description}/comissao/${data.id}` })" title="Clique para mais opções" />
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>
    </div>
</template>
