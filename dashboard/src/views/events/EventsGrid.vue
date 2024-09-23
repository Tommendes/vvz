<script setup>
import { onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultError } from '@/toast';
import moment from 'moment';
import Breadcrumb from '@/components/Breadcrumb.vue';

import Prompts from '@/components/Prompts.vue';
import { useDialog } from 'primevue/usedialog';
const dialog = useDialog();

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile()
});

import { useRoute } from 'vue-router';
const route = useRoute();

import { Mask } from 'maska';
const masks = ref({
    date: new Mask({
        mask: '##/##/####'
    })
});
const urlBase = ref(`${baseApiUrl}/sis-events`);

onBeforeMount(() => {
    // Inicializa os filtros do grid
    initFilters();
});

const queryUrl = ref('');
onMounted(async () => {
    queryUrl.value = route.query;
    
    await mountUrlFilters();
});

const dt = ref();
const totalRecords = ref(0); // O total de registros (deve ser atualizado com o total real)
const rowsPerPageOptions = ref([5, 10, 20, 50, 200, 500, 1000]); // Opções de registros por página
const loading = ref(false);
const gridData = ref([]); // Seus dados iniciais

// Itens do grid
const listaNomes = ref([
    { field: 'created_at', label: 'Data de criação' },
    { field: 'evento', label: 'Evento', minWidth: '10rem' },
    { field: 'classevento', label: 'Classe' },
    { field: 'tabela_bd', label: 'Tabela' },
    { field: 'id_registro', label: 'Registro' },
    { field: 'user', label: 'Usuário' }
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
const clearFilter = async () => {
    loading.value = true;
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

// Carregar dados
const loadLazyData = async () => {
    loading.value = true;
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
    console.log(url);
    
    const maxStringLength = 100;
    axios
        .get(url)
        .then((axiosRes) => {
            gridData.value = axiosRes.data.data;
            totalRecords.value = axiosRes.data.totalRecords;
            const quant = totalRecords.value;
            // TODO: Remover todos os valores eu rowsPerPageOptions que forem maiores que o total de registros e ao fim adicionar rowsPerPageOptions.value.push(quant);
            rowsPerPageOptions.value = rowsPerPageOptions.value.filter((item) => item <= totalRecords.value);
            rowsPerPageOptions.value.push(quant);

            // TODO: Remover todos os valores eu rowsPerPageOptions que forem maiores que o total de registros e ao fim adicionar rowsPerPageOptions.value.push(quant);
            rowsPerPageOptions.value = rowsPerPageOptions.value.filter((item) => item <= totalRecords.value);
            rowsPerPageOptions.value.push(quant);
            // TODO: Remova todos os valores duplicados de rowsPerPageOptions
            rowsPerPageOptions.value = [...new Set(rowsPerPageOptions.value)];
            gridData.value.forEach((element) => {
                element.evento_full = element.evento;
                if (element.created_at) element.created_at = moment(element.created_at).format('DD/MM/YYYY H:mm:ss');
                if (element.evento && element.evento.length > maxStringLength) element.evento = element.evento.substring(0, maxStringLength).trim() + ' ...';
            });
            loading.value = false;
        })
        .catch((error) => {
            try {
                defaultError(error.response.data);
            } catch (error) {
                defaultError('Erro ao carregar dados!');
            }
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
const mountUrlFilters = async () => {
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

    await loadLazyData();
};
const dialogRef = ref(null);
const messagesButtoms = ref([
    {
        label: 'Ok',
        icon: 'fa-solid fa-check',
        severity: 'success'
    }
]);
const showEvent = (evento) => {
    let header = `${evento.user} em ${evento.created_at} - Evento: ${evento.id}`;
    if (evento.classevento) header += ` (${evento.classevento}`;
    if (evento.tabela_bd) header += ` em ${evento.tabela_bd}`;
    if (evento.id_registro) header += ` ID ${evento.id_registro}`;
    if (evento.classevento) header += `)`;
    const body = {
        label: header,
        message: ["Pressione ESC para fechar", evento.evento_full],
        buttons: messagesButtoms.value
    };

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
        }
        // onClose: async (options) => {}
    });
};
</script>

<template>
    <Breadcrumb :items="[{ label: 'Todos os Eventos', to: `/${uProf.schema_description}/eventos` }]" />
    <div class="card">
        <DataTable style="font-size: 1rem" :value="gridData" lazy paginator :first="0" v-model:filters="filters"
            ref="dt" dataKey="id" :totalRecords="totalRecords" :rows="gridData.length"
            :rowsPerPageOptions="rowsPerPageOptions" :loading="loading" @page="onPage($event)" @sort="onSort($event)"
            @filter="onFilter($event)" filterDisplay="row" tableStyle="min-width: 75rem"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            :currentPageReportTemplate="`{first} a {last} de ${totalRecords} registros`" scrollable>
            <!-- scrollHeight="420px" -->
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <Button type="button" icon="fa-solid fa-filter" label="Limpar filtro" outlined
                        @click="clearFilter()" />
                </div>
                <div class="flex justify-content-end gap-3 mt-3 p-tag-esp">
                    <span class="p-button p-button-outlined" severity="info">Exibindo os primeiros {{ gridData.length }}
                        resultados</span>
                </div>
            </template>
            <template v-for="nome in listaNomes" :key="nome">
                <Column :field="nome.field" :header="nome.label" :filterField="nome.field" :filterMatchMode="'contains'"
                    sortable :dataType="nome.type" :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}`">
                    <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                        <Dropdown :id="nome.field" optionLabel="label" optionValue="value" v-model="filterModel.value"
                            :options="nome.list" @change="filterCallback()" :class="nome.class"
                            :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}`" placeholder="Pesquise..." />
                    </template>
                    <template v-else-if="nome.type == 'date'" #filter="{ filterModel, filterCallback }">
                        <Calendar v-model="filterModel.value" dateFormat="dd/mm/yy" selectionMode="range" showButtonBar
                            :numberOfMonths="2" placeholder="dd/mm/aaaa" mask="99/99/9999" @input="filterCallback()"
                            :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}`" />
                    </template>
                    <template v-else #filter="{ filterModel, filterCallback }">
                        <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()"
                            class="p-column-filter" placeholder="Pesquise..."
                            :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}`" />
                    </template>
                    <template #body="{ data }">
                        <Tag v-if="nome.tagged == true" :value="data[nome.field]"
                            :severity="getSeverity(data[nome.field])" />
                        <span v-else-if="nome.mask" v-html="masks[nome.mask].masked(data[nome.field])"></span>
                        <span v-else
                            v-html="data[nome.maxLength] ? String(data[nome.field]).trim().substring(0, data[nome.maxLength]) : String(data[nome.field]).trim()"></span>
                    </template>
                </Column>
            </template>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" icon="fa-solid fa-bars" rounded @click="showEvent(data)" aria-haspopup="true"
                        v-tooltip.left="'Clique para ver completo'" aria-controls="overlay_menu"
                        class="p-button-outlined" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
