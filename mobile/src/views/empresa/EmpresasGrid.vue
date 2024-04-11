<script setup>
import { ref, onBeforeMount } from 'vue';
import { FilterMatchMode } from 'primevue/api';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import Breadcrumb from '../../components/Breadcrumb.vue';
import EmpresaForm from './EmpresaForm.vue';

// Cookies do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();
const filters = ref(null);
const gridData = ref(null);
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/empresa`);
// Itens do grid
const listaNomes = ref([
    // { field: 'razaosocial', label: 'Razão Social' },
    { field: 'fantasia', label: 'Nome Fantasia' },
    { field: 'cpf_cnpj_empresa', label: 'CNPJ / CPF' }
]);
// Inicializa os filtros do grid
const initFilters = () => {
    filters.value = { global: { value: '', matchMode: FilterMatchMode.CONTAINS } };
    listaNomes.value.forEach((element) => {
        filters.value = { ...filters.value, [element.field]: { value: '', matchMode: 'contains' } };
    });
};
import { Mask } from 'maska';
const masks = ref({
    cpf: new Mask({
        mask: '###.###.###-##'
    }),
    cnpj: new Mask({
        mask: '##.###.###/####-##'
    })
});
initFilters();
const clearFilter = () => {
    initFilters();
};
const loadData = () => {
    setTimeout(() => {
        loading.value = true;
        axios.get(`${urlBase.value}`).then((axiosRes) => {
            gridData.value = axiosRes.data.data;
            gridData.value.forEach((element) => {
                if (element.cpf_cnpj_empresa && element.cpf_cnpj_empresa.length == 11) element.cpf_cnpj_empresa = masks.value.cpf.masked(element.cpf_cnpj_empresa);
                else element.cpf_cnpj_empresa = masks.value.cnpj.masked(element.cpf_cnpj_empresa);
            });
            loading.value = false;
        });
    }, Math.random() * 1000);
};
const mode = ref('grid');
onBeforeMount(() => {
    initFilters();
    loadData();
});
//Scrool quando criar um Novo Registro
const scrollToTop = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os registros de empresas', to: route.fullPath }]" />
    <div class="card w-95">
        <EmpresaForm :mode="mode" @changed="loadData" @cancel="mode = 'grid'" v-if="mode == 'new'" />
        <DataTable
            style="font-size: 1rem"
            :value="gridData"
            :paginator="true"
            :rows="10"
            dataKey="id"
            :rowHover="true"
            v-model:filters="filters"
            filterDisplay="menu"
            :loading="loading"
            :filters="filters"
            responsiveLayout="scroll"
            :globalFilterFields="['fantasia', 'cpf_cnpj_empresa']"
        >
            <template #header>
                <div class="flex flex-column gap-3">
                    <Button type="button" icon="fa-solid fa-plus" label="Novo Registro" outlined @click="mode = 'new', scrollToTop()" />
                    <Button type="button" icon="fa-solid fa-filter" label="Limpar filtro" outlined @click="clearFilter()" />
                    <span class="p-input-icon-left">
                        <i class="fa-solid fa-magnifying-glass" />
                        <InputText class="w-full" v-model="filters['global'].value" placeholder="Pesquise..." />
                    </span>
                </div>
            </template>
            <template v-for="nome in listaNomes" :key="nome">
                <Column :field="nome.field" :header="nome.label" :filterField="nome.field" :filterMatchMode="'contains'" sortable :dataType="nome.type" >
                    <template v-if="nome.list" #filter="{ filterModel, filterCallback }">
                        <Dropdown :id="nome.field" optionLabel="label" optionValue="value" v-model="filterModel.value" :options="nome.list" @change="filterCallback()" />
                    </template>
                    <template v-else-if="nome.type == 'date'" #filter="{ filterModel, filterCallback }">
                        <Calendar v-model="filterModel.value" dateFormat="dd/mm/yy" selectionMode="range" :numberOfMonths="2" placeholder="dd/mm/aaaa" mask="99/99/9999" @input="filterCallback()" />
                    </template>
                    <template v-else #filter="{ filterModel, filterCallback }">
                        <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter" placeholder="Pesquise..." />
                    </template>
                    <template #body="{ data }">
                        <span v-html="data[nome.field]"></span>
                    </template>
                </Column>
            </template>
            <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                <template #body="{ data }">
                    <Button type="button" icon="fa-solid fa-bars" rounded @click="router.push({ path: `/${userData.schema_description}/empresa/${data.id}` })" aria-haspopup="true" aria-controls="overlay_menu" class="p-button-outlined" />
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
.p-column-filter-menu{
    display: inline; /* Ícone de filtro do grid*/
}
.container{
    overflow-x: hidden;
}
</style>