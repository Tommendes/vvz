<script setup>
import { onBeforeMount, onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultError } from '@/toast';
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
const rowsPerPage = ref(20); // Quantidade de registros por página
const loading = ref(false);
const gridData = ref([]); // Seus dados iniciais

// Itens do grid
const listaNomes = ref([{ field: 'cadastro', label: 'Cadastro' }]);
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
                    if (element.cpf_cnpj && element.cpf_cnpj.length == 11) element.cpf_cnpj = masks.value.cpf.masked(element.cpf_cnpj);
                    else if (element.cpf_cnpj && element.cpf_cnpj.length == 14) element.cpf_cnpj = masks.value.cnpj.masked(element.cpf_cnpj);
                    if (element.email) element.email = renderizarHTML(element.email);
                    if (element.telefone == null) element.telefone = '';
                    element.cadastro = `${element.nome} <br> ${element.cpf_cnpj} <br> ${element.email} <br> ${element.telefone}`;
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
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os Cadastros', to: route.fullPath }]" />
    <div class="card w-95">
        <CadastroForm :mode="mode" @changed="loadLazyData()" @cancel="mode = 'grid'" v-if="mode == 'new'" />
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
                <div class="flex justify-content-end flex-column gap-3">
                    <div class="flex flex-column gap-3">
                        <Button type="button" icon="fa-solid fa-plus" label="Novo Registro" outlined @click="novoRegistro()" />
                        <Button v-if="userData.gestor" icon="fa-solid fa-cloud-arrow-down" label="Exportar" @click="exportCSV($event)" />
                        <Button type="button" icon="fa-solid fa-filter" label="Limpar filtro" outlined @click="clearFilter()" />
                    </div>
                    <Dropdown
                        filter
                        placeholder="Filtrar por Tipo de Cadastro..."
                        :showClear="tipoCadastro"
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
                        id="areaAtuacao"
                        optionLabel="label"
                        optionValue="value"
                        v-model="areaAtuacao"
                        :options="dropdownAtuacao"
                        @change="loadLazyData()"
                    />
                </div>
            </template>
            <template v-for="nome in listaNomes" :key="nome">
                <Column :field="nome.field" :header="nome.label" :filterField="nome.field" :filterMatchMode="'contains'" sortable :dataType="nome.type">
                    <template #filter="{ filterModel, filterCallback }">
                        <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter" placeholder="Pesquise..." />
                    </template>
                    <template #body="{ data }">
                        <span v-html="data.cadastro"></span>
                    </template>
                </Column>
            </template>
            <Column headerStyle="text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" class="p-button-outlined" rounded icon="fa-solid fa-bars" @click="router.push({ path: `/${userData.schema_description}/cadastro/${data.id}` })" title="Clique para mais opções" />
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
nav>ol{ /* Ajuste  nav */
    display: flex;
    list-style: none;
}
.p-dropdown{ /* Dropdown do filtro do grid  */
    display: flex;
    align-items: center;
}
.p-dropdown-items-wrapper{
    overflow: auto; /* Necessário para o Scrool do dropdown funcionar*/
}
/* Mensagens */
ul#overlay_messages_list{
    padding: 0px;
    margin: 0;
}
.p-menuitem-link{
    display: flex;
}
/* Fim Mensagens */
.container{
    overflow-x: hidden;
}
tr.p-row-even>td{ /* Ajuste na largura da coluna*/
    display: table-column;
    max-width: 80%;
}
</style>
