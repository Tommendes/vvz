<script setup>
import { onBeforeMount, onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultError } from '@/toast';
import ProdutoForm from './ProdutoForm.vue';
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
    aniversario: new Mask({
        mask: '##/##/####'
    }),
    telefone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    })
});

const urlBase = ref(`${baseApiUrl}/com-produtos`);

onBeforeMount(() => {
    // Inicializa os filtros do grid
    initFilters();
});
onMounted(() => {
    clearFilter();
});
//Scrool quando criar um Novo Registro
const scrollToTop = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

const dt = ref();
const totalRecords = ref(0); // O total de registros (deve ser atualizado com o total real)
const rowsPerPage = ref(10); // Quantidade de registros por página
const loading = ref(false);
const gridData = ref([]); // Seus dados iniciais

// Itens do grid
const listaNomes = ref([
    { field: 'fornecedor', label: 'Fornecedor', minWidth: '15rem' },
    { field: 'nome_comum', label: 'Nome Comum' },
    // { field: 'descricao', label: 'Descrição', minWidth: '15rem' }
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
                    // Converte data en para pt
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
    urlFilters.value = url;
};
const menu = ref();
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
watchEffect(() => {
    mountUrlFilters();
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os Produtos', to: route.fullPath }]" />
    <div class="card w-95">
        <ProdutoForm :mode="mode" @changed="loadLazyData()" @cancel="mode = 'grid'" v-if="mode == 'new'" />
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
        >
            <!-- scrollHeight="420px" -->
            <template #header>
                <div class="flex flex-column gap-3">
                    <Button v-if="userData.gestor" icon="fa-solid fa-cloud-arrow-down" label="Exportar" @click="exportCSV($event)" />
                    <Button type="button" icon="fa-solid fa-filter" label="Limpar filtro" outlined @click="clearFilter()" />
                    <Button type="button" icon="fa-solid fa-plus" label="Novo Registro" outlined @click="mode = 'new', scrollToTop()" />
                </div>
            </template>
            <template v-for="nome in listaNomes" :key="nome">
                <Column :field="nome.field" :header="nome.label" :filterField="nome.field" :filterMatchMode="'contains'" sortable :dataType="nome.type" >
                    <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                        <Dropdown
                            :id="nome.field"
                            optionLabel="label"
                            optionValue="value"
                            v-model="filterModel.value"
                            :options="nome.list"
                            @change="filterCallback()"
                            :class="nome.class"
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
                        />
                    </template>
                    <template v-else #filter="{ filterModel, filterCallback }">
                        <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter" placeholder="Pesquise..." />
                    </template>
                    <template #body="{ data }">
                        <Tag v-if="nome.tagged == true" :value="data[nome.field]" :severity="getSeverity(data[nome.field])" />
                        <span v-else-if="nome.mask" v-html="masks[nome.mask].masked(data[nome.field])"></span>
                        <span v-else v-html="data[nome.maxLength] ? String(data[nome.field]).trim().substring(0, data[nome.maxLength]) : String(data[nome.field]).trim()"></span>
                    </template>
                </Column>
            </template>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button
                        type="button"
                        icon="fa-solid fa-bars"
                        rounded
                        @click="router.push({ path: `/${userData.schema_description}/produto/${data.id}` })"
                        aria-haspopup="true"
                        v-tooltip.left="'Clique para mais opções'"
                        aria-controls="overlay_menu"
                        class="p-button-outlined"
                    />
                    <Menu ref="menu" id="overlay_menu" :popup="true" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<style scoped>
.w-95{ /* Ajuste mobile*/
    width: 95vw;
    max-width: 100%;
    margin-left: auto;
    margin-right: auto;
}
th.p-filter-column{ /* Tamanho das colunas */
    min-width: 8rem;
    max-width: 9rem;
}
</style>
<style>
/* Mensagens */
ul#overlay_messages_list{
    padding: 0px;
    margin: 0;
}
.p-menuitem-link{
    display: flex;
}
/* Fim Mensagens */
nav>ol{ /* Nav */
    display: flex;
    list-style: none;
    align-items: center;
}
.p-dropdown-items-wrapper{
    overflow: auto; /* Necessário para o Scrool do dropdown funcionar*/
}
#pv_id_5{
    width: 4rem;
}
.layout-overlay{ /* Remoção de rolagem horizontal */
    max-width: 100vw;
}
.layout-main-container{ /* Ajuste de largura da página */
    padding-left: 0 !important;
    padding-right: 0;
}
.p-column-filter{
    width: 100%;
}
.p-column-filter-row .p-column-filter-menu-button, .p-column-filter-row .p-column-filter-clear-button {
    display: none;
}
</style>
