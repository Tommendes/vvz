<script setup>
import { onMounted, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultWarn } from '@/toast';
import PipelineForm from './PipelineForm.vue';
import ComissoesItensGrid from '../comissoes/itens/ComissoesItensGrid.vue';
import Breadcrumb from '@/components/Breadcrumb.vue';
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { useRoute } from 'vue-router';
const route = useRoute();

const activeTab = ref(0);
const mode = ref('grid');

const itemData = ref({});
const itemDataComissionamento = ref({});
const loading = ref(true);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/pipeline`);

const comissoesItensGrid = ref();

// Itens do breadcrumb
const breadItems = ref([{ label: 'Todo o Pipeline', to: `/${userData.schema_description}/pipeline` }]);
const itemDataParam = ref({});
// Itens do dropdown de Unidades de Negócio do grid
const dropdownUnidades = ref([]);
// Itens do dropdown de Agentes de Negócio do grid
const dropdownAgentes = ref([]);
const unidadeLabel = ref(undefined);

const getPipelineParam = async () => {
    if (itemData.value.id_pipeline_params) {
        const url = `${baseApiUrl}/pipeline-params/${itemData.value.id_pipeline_params}`;
        setTimeout(async () => {
            await axios.get(url).then((res) => {
                if (res.data && res.data.id) itemDataParam.value = res.data;
                // if (itemDataParam.value.autom_nr != 1) itemNovo.pop();
            });
        }, Math.random() * 1000 + 250);
    }
};
// Listar unidades de negócio
const listUnidadesDescricao = async () => {
    const query = { func: 'ubt', tipoDoc: undefined, unidade: undefined };
    let url = `${baseApiUrl}/pipeline-params/f-a/${query.func}?doc_venda=${query.tipoDoc ? query.tipoDoc : ''}&gera_baixa=&descricao=${query.unidade ? query.unidade : ''}`;
    await axios.get(url).then((res) => {
        dropdownUnidades.value = [];
        res.data.data.map((item) => {
            const label = item.descricao.toString().replaceAll(/_/g, ' ') + (userData.admin >= 1 ? ` (${item.id})` : '');
            const itemList = { value: item.id, label: label };
            if (item.id == itemData.value.id_pipeline_params) unidadeLabel.value = label;
            dropdownUnidades.value.push(itemList);
        });
    });
};
// Listar unidades de negócio
const listAgentesNegocio = async () => {
    let url = `${baseApiUrl}/users/f-a/gbf?fld=agente_v&vl=1&slct=id,name&order=name`;
    await axios.get(url).then((res) => {
        dropdownAgentes.value = [];
        res.data.data.map((item) => {
            dropdownAgentes.value.push({ value: item.id, label: item.name });
        });
    });
};
// Carragamento de dados do form
const loadData = async () => {
    loading.value = true;
    setTimeout(async () => {
        const id = route.params.id;
        const url = `${urlBase.value}/${id}`;
        await axios
            .get(url)
            .then(async (res) => {
                const body = res.data;
                body.id = String(body.id);

                itemData.value = body;
                // Retorna os parâmetros do registro
                await getPipelineParam();
                // Unidades de negócio
                await listUnidadesDescricao();
                // Eventos do registro
                breadItems.value = [{ label: 'Todo o Pipeline', to: `/${userData.schema_description}/pipeline` }];
                if (unidadeLabel.value) breadItems.value.push({ label: unidadeLabel.value + ' ' + itemData.value.documento + (userData.admin >= 2 ? `: (${itemData.value.id})` : ''), to: route.fullPath });
                if (itemData.value.id_cadastros) breadItems.value.push({ label: 'Ir ao Cadastro', to: `/${userData.schema_description}/cadastro/${itemData.value.id_cadastros}` });
            })
            .catch((error) => {
                if (typeof error == 'string') defaultWarn(error);
                else if (typeof error.response && typeof error.response == 'string') defaultWarn(error.response);
                else if (error.response && error.response.data && typeof error.response.data == 'string') defaultWarn(error.response.data);
                else {
                    console.log(error);
                    defaultWarn('Erro ao carregar dados!');
                }
            });
    }, Math.random() * 1000);
    loading.value = false;
};

const classFlashComissionamento = ref('');
const flashComissionamento = () => {
    classFlashComissionamento.value = 'animation-color animation-fill-none flex align-items-center justify-content-center font-bold border-round px-5';
};

// Carregar dados do formulário
onMounted(async () => {
    setTimeout(async () => {
        // Carrega os dados do formulário
        await loadData();
        // Carrega as unidades de negócio
        await listUnidadesDescricao();
        // Carrega os agentes de negócio
        await listAgentesNegocio();
    }, Math.random() * 1000);
});
const commissioning = async (value) => {
    if (value.id) {
        itemDataComissionamento.value = value;
        flashComissionamento();
        activeTab.value = 1;
    }
};
const getRefreshComiss = () => {
    comissoesItensGrid.value.loadData();
};
</script>

<template>
    <Breadcrumb :items="breadItems" />
    <div class="grid" :style="route.name == 'cadastro' ? 'min-width: 100rem;' : ''">
        <div class="col-12">
            <div class="card">
                <TabView v-model:activeIndex="activeTab">
                    <TabPanel>
                        <template #header>
                            <i class="fa-regular fa-address-card mr-2"></i>
                            <span>Dados do Registro</span>
                        </template>
                        <PipelineForm @commissioning="commissioning" />
                    </TabPanel>
                    <TabPanel v-if="itemDataComissionamento.id">
                        <template #header>
                            <div :class="classFlashComissionamento" @click="getRefreshComiss">
                                <i class="fa-regular fa-solid fa-dollar mr-2"></i>
                                <span>Comissionamento</span>
                            </div>
                        </template>
                        <h2 class="m-0">Comissões do pedido {{ unidadeLabel + ' ' + itemData.documento + (userData.admin >= 2 ? `: (${itemData.id})` : '') }}</h2>
                        <div class="mt-3">
                            <ComissoesItensGrid ref="comissoesItensGrid" :itemDataRoot="itemData" :itemDataComissionamento="itemDataComissionamento" />
                        </div>
                        <Fieldset class="bg-green-200 mt-3" toggleable :collapsed="false" v-if="userData.admin >= 2">
                            <template #legend>
                                <div class="flex align-items-center text-primary">
                                    <span class="fa-solid fa-circle-info mr-2"></span>
                                    <span class="font-bold text-lg">FormData</span>
                                </div>
                            </template>
                            <p>{{ route.name }}</p>
                            <p>mode: {{ mode }}</p>
                            <p>itemData: {{ itemData }}</p>
                            <p>itemDataComissionamento: {{ itemDataComissionamento }}</p>
                        </Fieldset>
                    </TabPanel>
                </TabView>
            </div>
        </div>
    </div>
</template>

<style scoped>
@keyframes animation-color {
    0% {
        background-color: var(--blue-500);
        color: var(--gray-50);
    }
    50% {
        background-color: var(--yellow-500);
        color: var(--gray-900);
    }
    100% {
        background-color: var(--surface-200);
        color: var(--gray-900);
    }
}

.animation-color {
    animation: animation-color 5s linear;
}
</style>
