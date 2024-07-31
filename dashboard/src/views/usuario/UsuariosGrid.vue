<script setup>
import { onMounted, ref } from 'vue';
import { FilterMatchMode } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import Breadcrumb from '../../components/Breadcrumb.vue';
import UsuarioForm from './UsuarioForm.vue';

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile()
});

import { Mask } from 'maska';
const masks = ref({
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    })
});

const filters = ref(null);
const gridData = ref(null);
const itemData = ref(null);
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/users`);
// Itens do grid
const listaNomes = ref([
    { field: 'name', label: 'Nome', minWidth: '15rem' },
    { field: 'cpf', label: 'CPF', minWidth: '15rem' },
    { field: 'email', label: 'Email', minWidth: '25rem' },
    { field: 'telefone', label: 'Telefone', minWidth: '15rem' },
    { field: 'status', label: 'Situação', minWidth: '15rem' }
]);

const STATUS_INACTIVE = '0'; // Perfil inativo
const STATUS_WAITING = '1'; // Perfil aguardando o token de liberação
const STATUS_SUSPENDED_BY_TKN = '8'; // Perfil suspenso por envio de token
const STATUS_SUSPENDED = '9'; // Perfil suspenso
const STATUS_ACTIVE = '10'; // Usuário ok
const STATUS_PASS_EXPIRED = '19'; // Senha expirada por tempo de criação
const STATUS_DELETE = '99'; // Usuário excluído

//Scrool quando um Novo Registro for criado
const scrollToTop = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};
// Inicializa os filtros do grid
const initFilters = () => {
    filters.value = { global: { value: '', matchMode: FilterMatchMode.CONTAINS } };
    listaNomes.value.forEach((element) => {
        filters.value = { ...filters.value, [element.field]: { value: '', matchMode: 'contains' } };
    });
};
initFilters();
const clearFilter = () => {
    initFilters();
};
const goField = () => {
    router.push({ path: `/${uProf.value.schema_description}/usuario/${itemData.value.id}` });
};
const getItem = (data) => {
    itemData.value = data;
};
const loadData = async () => {
    gridData.value = null;
    loading.value = true;
    await axios.get(`${urlBase.value}`).then((axiosRes) => {
        gridData.value = axiosRes.data.data;
        gridData.value.forEach((element) => {
            if (element.cpf && element.cpf.trim().length >= 8) element.cpf = masks.value.cpf_cnpj.masked(element.cpf);
            switch (element.status) {
                case STATUS_ACTIVE:
                    element.status = 'Ativo';
                    break;
                case STATUS_INACTIVE:
                    element.status = 'Inativo';
                    break;
                case STATUS_WAITING:
                    element.status = 'Aguardando';
                    break;
                case STATUS_SUSPENDED_BY_TKN:
                    element.status = 'Suspenso por Token';
                    break;
                case STATUS_SUSPENDED:
                    element.status = 'Suspenso';
                    break;
                case STATUS_PASS_EXPIRED:
                    element.status = 'Senha Expirada';
                    break;
                case STATUS_DELETE:
                    element.status = 'Excluído';
                    break;
                default:
                    element.status = 'Desconhecido';
                    break;
            }
        });
        loading.value = false;
    });
};
const mode = ref('grid');
onMounted(async () => {
    initFilters();
    await loadData();
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os Usuários', to: route.fullPath }]" />
    <div class="card">
        <UsuarioForm :mode="mode" @changed="loadData" @cancel="mode = 'grid'" v-if="mode == 'new'" />
        <DataTable style="font-size: 1rem" :value="gridData" :paginator="true" :rows="10" dataKey="id" :rowHover="true"
            v-model:filters="filters" :loading="loading" responsiveLayout="scroll"
            :globalFilterFields="['name', 'cpf', 'email', 'telefone', 'status']">
            <template #header>
                <div class="flex justify-content-end gap-3">
                    <Button type="button" icon="fa-solid fa-plus" label="Novo Registro" outlined
                        @click="(mode = 'new'), scrollToTop()" />
                    <Button type="button" icon="fa-solid fa-filter" label="Limpar filtro" outlined
                        @click="clearFilter()" />
                    <span class="p-input-icon-left">
                        <i class="fa-solid fa-magnifying-glass" />
                        <InputText v-model="filters['global'].value" placeholder="Pesquise..." />
                    </span>
                </div>
            </template>
            <template v-for="nome in listaNomes" :key="nome">
                <Column :field="nome.field" :header="nome.label" :filterField="nome.field" :filterMatchMode="'contains'"
                    sortable :dataType="nome.type"
                    :style="`min-width: ${nome.minWidth ? nome.minWidth : '6rem'}; max-width: ${nome.maxWidth ? nome.maxWidth : '6rem'}; overflow: hidden`">
                    <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                        <Dropdown :id="nome.field" optionLabel="label" optionValue="value" v-model="filterModel.value"
                            :options="nome.list" @change="filterCallback()" style="min-width: 20rem" />
                    </template>
                    <template v-else-if="nome.type == 'date'" #filter="{ filterModel, filterCallback }">
                        <Calendar v-model="filterModel.value" dateFormat="dd/mm/yy" selectionMode="range"
                            :numberOfMonths="2" placeholder="dd/mm/aaaa" mask="99/99/9999" @input="filterCallback()" />
                    </template>
                    <template v-else #filter="{ filterModel, filterCallback }">
                        <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()"
                            class="p-column-filter" placeholder="Pesquise..." />
                    </template>
                    <template #body="{ data }">
                        <Tag v-if="nome.tagged == true" :value="data[nome.field]"
                            :severity="getSeverity(data[nome.field])" />
                        <span v-else v-html="data[nome.field]"></span>
                    </template>
                </Column>
            </template>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" icon="fa-solid fa-bars" rounded v-on:click="getItem(data)" @click="goField"
                        class="p-button-outlined" v-tooltip.left="'Clique para mais opções'" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
<style scoped>
.foundMark {
    background-color: yellow;
    padding: 0;
}
</style>
