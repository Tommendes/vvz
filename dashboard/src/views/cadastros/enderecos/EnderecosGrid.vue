<script setup>
import { ref, onBeforeMount, provide } from 'vue';
import { FilterMatchMode, FilterOperator } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import EnderecoForm from './EnderecoForm.vue';

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

import { useRouter } from 'vue-router';
import moment from 'moment';

import { useUserStore } from '@/stores/user';
const store = useUserStore();

const router = useRouter();

const filters = ref(null);
const menu = ref();
const gridData = ref(null);
const itemData = ref(null);
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/cad-enderecos/${props.itemDataRoot.id}`);
const mode = ref('grid');
const visible = ref(false);
// Props do template
const props = defineProps({
    itemDataRoot: Object // O próprio cadastro
})
// Máscaras
import { Mask } from 'maska';
const masks = ref({
    cpf: new Mask({
        mask: '###.###.###-##'
    }),
    cnpj: new Mask({
        mask: '##.###.###/####-##'
    })
});
// Inicializa os filtros
const initFilters = () => {
    filters.value = {
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        id_params_tipo: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        cep: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        logradouro: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        nr: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        cidade: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        bairro: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        uf: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] }
    };
};
// Inicializa os filtros
initFilters();
// Limpa os filtros
const clearFilter = () => {
    initFilters();
};
// Itens do menu de contexto
const itemsButtons = ref([
    {
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => {
            mode.value = 'edit';
        }
    },
    {
        label: 'Excluir',
        icon: 'pi pi-trash',
        command: ($event) => {
            deleteRow($event);
        }
    }
]);
// Abre o menu de contexto
const toggle = (event) => {
    menu.value.toggle(event);
};
// Obtém o item selecionado
const getItem = (data) => {
    itemData.value = data;
};
// Carrega os dados da grid
const loadData = async () => {
    const url = `${urlBase.value}`;
    await axios.get(url).then((axiosRes) => {
        gridData.value = axiosRes.data.data;
        gridData.value.forEach(element => {
            element.endereco = '';
            if (element.logradouro) element.endereco += element.logradouro;
            if (element.nr) element.endereco += `, ${element.nr}`;
            if (element.complnr && element.complnr.trim().length > 0) element.endereco += `, ${element.complnr.trim()}`;
            if (element.bairro) element.endereco += ` - ${element.bairro}`;
            if (element.cidade) element.endereco += ` - ${element.cidade}`;
            if (element.uf) element.endereco += ` - ${element.uf}`;
            if (element.cep) element.endereco += ` - CEP ${element.cep}`;
        });
        loading.value = false;
    });
};
// Excluir registro
const deleteRow = () => {
    confirm.require({
        group: 'templating',
        header: 'Corfirmar exclusão',
        message: 'Você tem certeza que deseja excluir este registro?',
        icon: 'pi pi-question-circle',
        acceptIcon: 'pi pi-check',
        rejectIcon: 'pi pi-times',
        acceptClass: 'p-button-danger',
        accept: () => {
            axios.delete(`${urlBase.value}/${itemData.value.id}`).then(() => {
                defaultSuccess('Registro excluído com sucesso!');
                loadData();
            });
        },
        reject: () => {
            return false;
        }
    });
};
// Renderiza o HTML
const renderizarHTML = (conteudo) => {
    // Verifique se o conteúdo parece ser um link da web ou um endereço de e-mail
    if (conteudo.includes('http') || conteudo.includes('https')) {
        return `<a href="${conteudo}" target="_blank">${conteudo}</a>`;
    } else if (conteudo.includes('www') && !conteudo.includes('https')) {
        return `<a href="https://${conteudo}" target="_blank">${conteudo}</a>`;
    } else if (conteudo.includes('@')) {
        return `<a href="mailto:${conteudo}">${conteudo}</a>`;
    } else {
        return conteudo;
    }
};
// Carrega os dados do formulário
provide('itemData', itemData);
// Carrega o modo do formulário
provide('mode', mode);
// Carrega as operações básicas do formulário
onBeforeMount(() => {
    initFilters();
    loadData();
});
</script>

<template>
    <div class="card">
        <h5>{{ props.itemDataRoot.nome + (store.userStore.admin >= 1 ? `: (${props.itemDataRoot.id})` : '') }}</h5>
        <EnderecoForm @changed="loadData" v-if="['new', 'edit'].includes(mode) && props.itemDataRoot.id" :itemDataRoot="props.itemDataRoot" />
        <DataTable :value="gridData" v-if="loading">
            <Column field="id_params_tipo" header="Tipo de Endereço" style="min-width: 14rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column field="cep" header="CEP" style="min-width: 25rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column field="logradouro" header="Logradouro" style="min-width: 14rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column field="nr" header="Número" style="min-width: 14rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column field="cidade" header="Cidade" style="min-width: 14rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column field="bairro" header="Bairro" style="min-width: 14rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column field="uf" header="UF" style="min-width: 14rem">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
            <Column headerStyle="width: 5rem; text-align: center">
                <template #body>
                    <Skeleton></Skeleton>
                </template>
            </Column>
        </DataTable>
        <DataTable
            v-else
            :value="gridData"
            :paginator="true"
            class="p-datatable-gridlines"
            :rows="10"
            dataKey="id"
            :rowHover="true"
            v-model:filters="filters"
            filterDisplay="menu"
            :loading="loading"
            :filters="filters"
            responsiveLayout="scroll"
            :globalFilterFields="['id_params_tipo', 'cep', 'logradouro', 'nr', 'cidade', 'bairro', 'uf']"
        >
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <Button type="button" icon="pi pi-filter-slash" label="Limpar filtro" outlined @click="clearFilter()" />
                    <Button
                        type="button"
                        icon="pi pi-plus"
                        label="Novo Registro"
                        outlined
                        @click="
                            itemData = { id_cadastros: props.itemDataRoot.id };
                            mode = 'new';
                        "
                    />
                    <span class="p-input-icon-left">
                        <i class="pi pi-search" />
                        <InputText v-model="filters['global'].value" placeholder="Pesquise..." />
                    </span>
                </div>
            </template>
            <Column field="allFields" header="Endereços" sortable style="min-width: 400px">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-2 text-lg">
                        {{ data.endereco }}
                    </div>
                </template>
                <template #filter="{ filterModel }">
                    <InputText v-model="filterModel.value" type="text" class="p-column-filter"
                        placeholder="Filtre por informações" />
                </template>
            </Column>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" icon="pi pi-bars" rounded v-on:click="getItem(data)" @click="toggle" aria-haspopup="true" aria-controls="overlay_menu" class="p-button-outlined" />
                    <Menu ref="menu" id="overlay_menu" :model="itemsButtons" :popup="true" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
