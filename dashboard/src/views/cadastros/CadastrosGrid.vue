<script setup>
import { onBeforeMount, onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultError } from '@/toast';
import moment from 'moment';
import CadastroForm from './CadastroForm.vue';
import Breadcrumb from '@/components/Breadcrumb.vue';
import { renderizarHTML, removeHtmlTags, userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();

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

const urlBase = ref(`${baseApiUrl}/cadastros`);

onBeforeMount(() => {
    // Inicializa os filtros do grid
    initFilters();
    loadOptions();
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
const dropdownMes = ref([
    { label: 'Janeiro', value: '01' },
    { label: 'Fevereiro', value: '02' },
    { label: 'Março', value: '03' },
    { label: 'Abril', value: '04' },
    { label: 'Maio', value: '05' },
    { label: 'Junho', value: '06' },
    { label: 'Julho', value: '07' },
    { label: 'Agosto', value: '08' },
    { label: 'Setembro', value: '09' },
    { label: 'Outubro', value: '10' },
    { label: 'Novembro', value: '11' },
    { label: 'Dezembro', value: '12' }
]);

// Itens do grid
const listaNomes = ref([
    { field: 'tipo_cadas', label: 'Tipo Cadastro', showDefault: false },
    { field: 'cpf_cnpj', label: 'CPF/CNPJ', showDefault: true },
    { field: 'nome', label: 'Nome', showDefault: true },
    { field: 'atuacao', label: 'Área de atuação', showDefault: false },
    // { field: 'email', label: 'Email', showDefault: true },
    { field: 'telefone', label: 'Telefone', showDefault: true, mask: 'telefone' },
    { field: 'aniversario', label: 'Aniv/Fundação', showDefault: true, list: dropdownMes.value }
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
const dropdownTipoCadastro = ref([]); // Dropdown de tipo de cadastro
const dropdownAtuacao = ref([]); // Dropdown de área de atuação
const tipoCadastro = ref(null); // Tipo de cadastro
const areaAtuacao = ref(null); // Área de atuação

// Obter parâmetros do BD
const optionLocalParams = async (query) => {
    const selects = query.select ? `&slct=${query.select}` : undefined;
    const url = `${baseApiUrl}/local-params/f-a/gbf?fld=${query.field}&vl=${query.value}${selects}`;
    return await axios.get(url);
};
// Carregar opções do formulário de pesquisa
const loadOptions = async () => {
    filtrarTiposCadastro();
    filtrarAtuacao();
};
const filtrarTiposCadastro = async () => {
    // Tipo de adastro
    await optionLocalParams({ field: 'grupo', value: 'tipo_cadastro', select: 'id,label' }).then((res) => {
        res.data.data.map((item) => {
            dropdownTipoCadastro.value.push({ value: item.id, label: item.label });
        });
    });
};
const filtrarAtuacao = async () => {
    // Áreas de atuação
    await optionLocalParams({ field: 'grupo', value: 'id_atuacao', select: 'id,label' }).then((res) => {
        res.data.data.map((item) => {
            dropdownAtuacao.value.push({ value: item.id, label: item.label });
        });
    });
};
// Limpa os filtros do grid
const clearFilter = () => {
    loading.value = true;
    areaAtuacao.value = tipoCadastro.value = null;
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
                    if (element.aniversario) element.aniversario = moment(element.aniversario).format('DD/MM/YYYY');
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
    if (tipoCadastro.value) url += `field:id_params_tipo=equals:${tipoCadastro.value}&`;
    if (areaAtuacao.value) url += `field:id_params_atuacao=equals:${areaAtuacao.value}&`;
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
            <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os Cadastros', to: `/${userData.schema_description}/cadastros` }]" />
        </div>
        <div class="col-12">
            <CadastroForm :mode="mode" @changed="loadLazyData()" @cancel="mode = 'grid'" v-if="mode == 'new'" />
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
                            <Dropdown
                                filter
                                placeholder="Filtrar por Tipo de Cadastro..."
                                :showClear="tipoCadastro"
                                style="min-width: 200px"
                                id="tipoCadastro"
                                optionLabel="label"
                                optionValue="value"
                                v-model="tipoCadastro"
                                :options="dropdownTipoCadastro"
                                @change="loadLazyData()"
                            />
                            <Dropdown
                                filter
                                placeholder="Filtrar por Área de Atuação..."
                                :showClear="areaAtuacao"
                                style="min-width: 200px"
                                id="areaAtuacao"
                                optionLabel="label"
                                optionValue="value"
                                v-model="areaAtuacao"
                                :options="dropdownAtuacao"
                                @change="loadLazyData()"
                            />
                            <Button v-if="userData.gestor" icon="fa-solid fa-cloud-arrow-down" label="Exportar" @click="exportCSV($event)" />
                            <Button type="button" icon="fa-solid fa-filter" label="Limpar filtro" outlined @click="clearFilter()" />
                            <Button type="button" icon="fa-solid fa-plus" label="Novo Registro" outlined @click="novoRegistro()" />
                        </div>
                    </template>
                    <template v-for="nome in listaNomes" :key="nome">
                        <Column :header="nome.label" :showFilterMenu="false" :filterField="nome.field" :filterMatchMode="'contains'" :filterMenuStyle="{ width: '14rem' }" style="min-width: 12rem" sortable :sortField="nome.field" :class="nome.class">
                            <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                                <Dropdown :id="nome.field" optionLabel="label" optionValue="value" v-model="filterModel.value" :options="nome.list" @change="filterCallback()" :class="nome.class" :style="``" />
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
                    <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible" style="0.6rem">
                        <template #body="{ data }">
                            <Button type="button" class="p-button-outlined" rounded icon="fa-solid fa-bars" @click="router.push({ path: `/${userData.schema_description}/cadastro/${data.id}` })" title="Clique para mais opções" />
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>
    </div>
</template>
