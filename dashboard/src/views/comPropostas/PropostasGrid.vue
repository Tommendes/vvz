<script setup>
import { onBeforeMount, onMounted, provide, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultError } from '@/toast';
import Breadcrumb from '@/components/Breadcrumb.vue';
import { removeHtmlTags } from '@/global';
import Prompts from '@/components/Prompts.vue';
import { useDialog } from 'primevue/usedialog';
const dialog = useDialog();

// Cookies do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();

const urlBase = ref(`${baseApiUrl}/com-propostas`);

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
const itemData = ref({});

//Scrool quando um Novo Registro for criado
const scrollToTop = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};
// Itens do grid
const listaNomes = ref([
    { field: 'descricao', label: 'Proponente' },
    { field: 'documento', label: 'Proposta' },
    { field: 'nome', label: 'Cliente' },
    // { field: 'pessoa_contato', label: 'Contato' },
    { field: 'email_contato', label: 'Email' }
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
                    if (element.descricao) element.descricao = element.descricao.replaceAll('_', ' ');
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
    }, Math.random() * 1000 + 250);
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
// Carrega os dados do formulário
provide('itemData', itemData);
provide('mode', 'new');

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
watchEffect(() => {
    mountUrlFilters();
});

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
                router.push({ path: `/${userData.schema_description}/pipeline` });
            }
        }
    });
};
const newProposal = () => {
    // messagesButtoms.value.forEach((elementButton) => {
    //     // Adicionar ao elementButton o id da mensagem
    //     elementButton.id = element.id;
    //     elementButton.message = element.msg;
    //     elementButton.title = element.title;
    // });
    showMessage({
        label: 'Nova Proposta',
        message: `Para criar uma nova proposta, clique no botão "${messagesButtoms.value[1].label}" abaixo. Você será direcionado para a tela de cadastro de propostas no Pipeline. Lá você poderá criar uma nova proposta ou selecionar uma proposta existente.`,
        buttons: messagesButtoms.value
    });
};
</script>

<template>
    <div class="grid">
        <div class="col-12">
            <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todas as Propostas', to: route.fullPath }]" />
        </div>
        <div class="col-12">
            <div class="card">
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
                        <div class="flex justify-content-end gap-3">
                            <Button v-if="userData.gestor" icon="fa-solid fa-cloud-arrow-down" label="Exportar" @click="exportCSV($event)" />
                            <Button type="button" icon="fa-solid fa-filter" label="Limpar filtro" outlined @click="clearFilter()" />
                            <Button type="button" icon="fa-solid fa-plus" label="Novo Registro" outlined @click="newProposal()" />
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
                                @click="router.push({ path: `/${userData.schema_description}/proposta/${data.id}` })"
                                aria-haspopup="true"
                                v-tooltip.left="'Clique para mais opções'"
                                aria-controls="overlay_menu"
                                class="p-button-outlined"
                            />
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>
    </div>
</template>
