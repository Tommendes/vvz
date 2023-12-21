<script setup>
import { onBeforeMount, onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultError } from '@/toast';
import moment from 'moment';
import Breadcrumb from '@/components/Breadcrumb.vue';
import { removeHtmlTags } from '@/global';
import Dialog from 'primevue/dialog';
import Prompts from '@/components/Prompts.vue';
import { useDialog } from 'primevue/usedialog';
const dialog = useDialog();

// Cookies do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { Mask } from 'maska';
const masks = ref({
    date: new Mask({
        mask: '##/##/####'
    })
});
const visible = ref(false);
const itemsMessages = ref([]);
import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();
const urlBase = ref(`${baseApiUrl}/sis-events`);

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

// Itens do grid
const listaNomes = ref([
    { field: 'created_at', label: 'Criação', minWidth: '15rem' },
    { field: 'evento', label: 'Tipo do evento', minWidth: '10rem' },
    { field: 'classevento', label: 'Classe', minWidth: '5rem' },
    { field: 'tabela_bd ', label: 'Descrição do evento', minWidth: '20rem' }
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

// Carregar dados
const loadLazyData = () => {
    loading.value = true;

    setTimeout(() => {
        const url = `${urlBase.value}${urlFilters.value}`;    
        const maxStringLength = 100;   
        axios
            .get(url)
            .then((axiosRes) => {
                gridData.value = axiosRes.data.data;
                totalRecords.value = axiosRes.data.totalRecords;
                gridData.value.forEach((element) => {
                    if (element.created_at) element.created_at = moment(element.created_at).format('DD/MM/YYYY H:mm:ss');                    
                    if (element.evento && element.evento.length > maxStringLength) element.evento = element.evento.substring(0, maxStringLength).trim() + ' ...';
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

//Carregar Mensagens
const newMessages = ref(0);
const getUserMessages = async () => {
    setTimeout(async () => {
        const url = `${baseApiUrl}/sis-messages/f-a/gbf?fld=id_user&vl=${userData.id}&slct=id,title,msg,status`;
        await axios.get(url).then((res) => {
            const body = res.data.data;
            itemsMessages.value = [];
            newMessages.value = 0;
            if (body && body.length) {
                body.forEach((element) => {
                    if (element.status == 10) ++newMessages.value;
                    // element.msg = element.msg.replaceAll('[userName]', userData.name.split(' ')[0]);
                    // Substitua [userName] pelos dois primeiros nomes do usuário com o cuidade de que o usuário pode ter apenas um nome registrado
                    element.msg = element.msg.replace('[userName]', userData.name.split(' ').slice(0, 2).join(' '));
                    itemsMessages.value.push({
                        icon: element.status == 10 ? 'fa-solid fa-asterisk fa-fade' : 'fa-solid fa-check',
                        status: element.status,
                        label: element.title,
                        message: element.msg,
                        command: () => {
                            messagesButtoms.value.forEach((elementButton) => {
                                // Adicionar ao elementButton o id da mensagem
                                elementButton.id = element.id;
                                elementButton.message = element.msg;
                                elementButton.title = element.title;
                            });
                            showMessage({
                                label: element.title,
                                message: element.msg,
                                buttons: messagesButtoms.value
                            });
                        }
                    });
                });
            }
        });
    }, Math.floor(Math.random() * 1000) + 250);
};
const dialogRef = ref(null);
const messagesButtoms = ref([
    {
        label: 'Ok',
        icon: 'fa-solid fa-check',
        severity: 'success'
    },
    {
        label: 'Excluir',
        icon: 'fa-regular fa-trash-can',
        severity: 'danger'
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
                console.log(options.data);
                const bodyTo = {
                    title: options.data.title,
                    msg: options.data.message,
                    status: 11
                };
                await axios
                    .put(`${baseApiUrl}/sis-messages/${options.data.id}`, bodyTo)
                    .then(async () => await getUserMessages())
                    .catch((error) => {
                        defaultError(error);
                    });
            } else if (options.data.label == messagesButtoms.value[1].label) {
                await axios
                    .delete(`${baseApiUrl}/sis-messages/${options.data.id}`)
                    .then(async () => {
                        await getUserMessages();
                        defaultSuccess('Mensagem excluída com sucesso!');
                    })
                    .catch((error) => {
                        defaultError(error);
                    });
            }
        }
    });
};
onBeforeMount(() => {
    getUserMessages();
});
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
const menuMessages = ref();
const toggleMenuMessages = (event) => {
    menuMessages.value.toggle(event);
};
const toggle = (event) => {
    menu.value.toggle(event);
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
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os Eventos' }]" />
    <div class="card">        
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
                    <Dialog v-model:visible="visible" modal header="Header" :style="{ width: '50vw' }" :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
                        <p class="m-0">
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                        </p>
                    </Dialog>
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
                    <Button
                        type="button"
                        icon="pi pi-bars"
                        rounded
                        @click="toggleMenuMessages"
                        aria-haspopup="true"
                        v-tooltip.left="'Clique para ver completo'"
                        aria-controls="overlay_menu"
                        class="p-button-outlined"
                    />
                    <Menu 
                    ref="menuMessages" 
                    id="overlay_messages" 
                    :model="itemsMessages" 
                    :popup="true" 
                    v-if="itemsMessages.length" />

            
                    <Menu ref="menu" id="overlay_menu" :popup="true" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
