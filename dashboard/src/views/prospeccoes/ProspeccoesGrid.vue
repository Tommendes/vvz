<script setup>
import { onBeforeMount, onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultError } from '@/toast';
import moment from 'moment';
import ProspeccaoForm from './ProspeccaoForm.vue';
import Breadcrumb from '@/components/Breadcrumb.vue';
import { renderizarHTML, removeHtmlTags, userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

import { useUserStore } from '@/stores/user';
const store = useUserStore();

import { useRouter } from 'vue-router';
const router = useRouter();

import { Mask } from 'maska';
const masks = ref({
    aniversario: new Mask({
        mask: '##/##/####'
    }),
    telefone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    })
});

const urlBase = ref(`${baseApiUrl}/com-prospeccoes`);

onBeforeMount(() => {
    // Inicializa os filtros do grid
    initFilters();
});
onMounted(() => {
    clearFilter();
});

const deleteRow = () => {
    confirm.require({
        group: 'templating',
        header: 'Confirmar exclusão',
        message: 'Você tem certeza que deseja excluir este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'pi pi-check',
        rejectIcon: 'pi pi-times',
        acceptClass: 'p-button-danger',
        accept: () => {
            axios.delete(`${urlBase.value}/${itemData.value.id}`).then(() => {
                defaultSuccess('Registro excluído com sucesso!');
                loadLazyData();
            });
        },
        reject: () => {
            return false;
        }
    });
};

const dt = ref();
const totalRecords = ref(0); // O total de registros (deve ser atualizado com o total real)
const rowsPerPage = ref(10); // Quantidade de registros por página
const loading = ref(false);
const gridData = ref([]); // Seus dados iniciais
const itemData = ref(null);
// Lista de períodos
const dropdownPeriodo = ref([
    { value: '0', label: 'Manhã' },
    { value: '1', label: 'Tarde' }
]);

// Itens do grid
const listaNomes = ref([
    { field: 'nome', label: 'Cliente', minWidth: '15rem' },
    { field: 'pessoa', label: 'Pessoa contatada', minWidth: '11rem' },
    { field: 'contato', label: 'Forma de Contato', minWidth: '12rem' },
    { field: 'periodo', label: 'Período da visita', minWidth: '8rem', list: dropdownPeriodo.value },
    { field: 'data_visita', label: 'Data da visita', minWidth: '8rem', type: 'date' }
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
                    if (element.data_visita) element.data_visita = moment(element.data_visita).format('DD/MM/YYYY');
                    if (element.contato) element.contato = renderizarHTML(element.contato);
                    element.periodo = String(element.periodo);
                    if (element.periodo) element.periodo = dropdownPeriodo.value.find((x) => x.value == element.periodo).label;
                    console.log(element.periodo);
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
            });
    }, Math.random() * 100 + 250);
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
    console.log(url);
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
const itemsButtons = ref([
    {
        label: 'Ver',
        icon: 'fa-regular fa-eye fa-beat-fade',
        command: () => {
            router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/prospeccao/${itemData.value.id}` });
        }
    },
    {
        label: 'Excluir',
        icon: 'fa-solid fa-fire fa-fade',
        command: ($event) => {
            deleteRow($event);
        }
    }
]);
const toggle = (event) => {
    menu.value.toggle(event);
};
const getItem = (data) => {
    itemData.value = data;
};
watchEffect(() => {
    mountUrlFilters();
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os Registros' }]" />
    <div class="card" style="min-width: 100rem">
        <ProspeccaoForm :mode="mode" @changed="loadData" @cancel="mode = 'grid'" v-if="mode == 'new'" />
        <DataTable
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
        >
            <!-- scrollHeight="420px" -->
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <!-- <Dropdown
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
                    /> -->
                    <Button v-if="userData.gestor" icon="pi pi-external-link" label="Exportar" @click="exportCSV($event)" />
                    <Button type="button" icon="pi pi-filter-slash" label="Limpar filtro" outlined @click="clearFilter()" />
                    <Button type="button" icon="pi pi-plus" label="Novo Registro" outlined @click="mode = 'new'" />
                </div>
            </template>
            <template v-for="nome in listaNomes" :key="nome">
                <Column :field="nome.field" :header="nome.label" :filterField="nome.field" :filterMatchMode="'contains'" sortable :dataType="nome.type" :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}`">
                    <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                        <Dropdown
                            :id="nome.field"
                            optionLabel="label"
                            optionValue="value"
                            v-model="filterModel.value"
                            :options="nome.list"
                            @change="filterCallback()"
                            :class="nome.class"
                            :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}`"
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
                            :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}`"
                        />
                    </template>
                    <template v-else #filter="{ filterModel, filterCallback }">
                        <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter" placeholder="Pesquise..." :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}`" />
                    </template>
                    <template #body="{ data }">
                        <Tag v-if="nome.tagged == true" :value="data[nome.field]" :severity="getSeverity(data[nome.field])" />
                        <span v-else-if="nome.mask" v-html="masks[nome.mask].masked(data[nome.field])"></span>
                        <span v-else v-html="data[nome.field]"></span>
                    </template>
                </Column>
            </template>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" icon="pi pi-bars" rounded v-on:click="getItem(data)" @click="toggle" aria-haspopup="true" aria-controls="overlay_menu" class="p-button-outlined" />
                    <Menu ref="menu" id="overlay_menu" :model="itemsButtons" :popup="true" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
