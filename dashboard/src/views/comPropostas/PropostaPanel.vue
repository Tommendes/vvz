<script setup>
import { onMounted, provide, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import router from '../../router';
import { defaultWarn } from '@/toast';
import PropostaForm from './PropostaForm.vue';
import ComposicoesGrid from './composicoes/ComposicoesGrid.vue';
import ItensGrid from './itens/ItensGrid.vue';
import Breadcrumb from '@/components/Breadcrumb.vue';
import Eventos from '@/components/Eventos.vue';
const fSEventos = ref({});

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
import { formatCurrency } from '../../global';
import moment from 'moment';
const masks = ref({
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    }),
    valor: new Mask({
        mask: '0,99'
    })
});

const itemData = ref({});
const itemDataPipeline = ref({});
const itemDataPipelineParams = ref({});
const loading = ref(true);
const urlBase = ref(`${baseApiUrl}/com-propostas`);
const urlBasePipeline = ref(`${baseApiUrl}/pipeline`);
const urlBasePipelineParams = ref(`${baseApiUrl}/pipeline-params`);
const mode = ref('view');
// Carrega os dados do formulário
provide('itemData', itemData);
// Dados do pipeline
provide('itemDataPipeline', itemDataPipeline);
// Dados do parametros do pipeline
provide('itemDataPipelineParams', itemDataPipelineParams);
// Carrega o modo do formulário
provide('mode', mode);
// Itens do breadcrumb
const breadItems = ref([]);
// Carragamento de dados do form
const loadData = async () => {
    const url = `${urlBase.value}/${route.params.id}`;
    await axios.get(url).then(async (res) => {
        const body = res.data;
        if (body && body.id) {
            body.id = String(body.id);
            itemData.value = body;
            if (itemData.value.desconto_total) itemData.value.desconto_total = formatCurrency(itemData.value.desconto_total);
            if (itemData.value.id_pipeline) await loadDataPipeline();
            if (itemDataPipeline.value.id_pipeline_params) await loadPipelineParamsData();
            breadItems.value = [{ label: 'Todas as propostas', to: `/${uProf.value.schema_description}/propostas` }];
            if (nomeCliente.value) breadItems.value.push({ label: nomeCliente.value + (uProf.value.admin >= 1 ? `: (${itemData.value.id})` : ''), to: route.fullPath });
            if (itemDataPipeline.value.id_cadastros) breadItems.value.push({ label: 'Ir ao Cadastro', to: `/${uProf.value.schema_description}/cadastro/${itemDataPipeline.value.id_cadastros}` });
            mode.value = 'view';
            loading.value = false;
            await fSEventos.value.getEventos();
        } else {
            defaultWarn('Proposta não localizada');
            router.push({ path: `/${uProf.value.schema_description}/propostas` });
        }
    });
    loading.value = false;
};

const loadDataPipeline = async () => {
    loading.value = true;
    const id = itemData.value.id_pipeline;
    const url = `${urlBasePipeline.value}/${id}`;
    await axios.get(url).then(async (res) => {
        const body = res.data;
        if (body && body.id) {
            body.id = String(body.id);
            itemDataPipeline.value = body;
            await getNomeCliente();
        } else {
            defaultWarn('Pipeline não localizado');
        }
    });
    loading.value = false;
};

const loadPipelineParamsData = async () => {
    loading.value = true;
    const id = itemDataPipeline.value.id_pipeline_params;
    const url = `${urlBasePipelineParams.value}/${id}`;
    await axios.get(url).then(async (res) => {
        const body = res.data;
        itemDataPipelineParams.value = body;
    });
    loading.value = false;
};

const nomeCliente = ref();
const getNomeCliente = async () => {
    if (itemDataPipeline.value.id_cadastros) {
        try {
            const url = `${baseApiUrl}/cadastros/f-a/glf?fld=id&vl=${itemDataPipeline.value.id_cadastros}&slct=nome,cpf_cnpj`;
            const response = await axios.get(url);
            if (response.data.data.length > 0) {
                nomeCliente.value = response.data.data[0].nome + ' - ' + masks.value.cpf_cnpj.masked(response.data.data[0].cpf_cnpj);
            }
        } catch (error) {
            console.error('Erro ao buscar cadastros:', error);
        }
    }
};

onMounted(async () => {
    await loadData();
});
</script>

<template>
    <Breadcrumb :items="breadItems" />
    <div class="grid">
        <div class="col-12">
            <div class="card">
                <h3
                    v-if="itemDataPipelineParams && itemDataPipelineParams.descricao && itemDataPipeline && itemDataPipeline.documento">
                    {{ itemDataPipelineParams.descricao.replaceAll('_', ' ') }} {{ itemDataPipeline.documento }}</h3>
                <TabView lazy>
                    <TabPanel :disabled="!itemData.id">
                        <template #header>
                            <i class="fa-regular fa-address-card mr-2"></i>
                            <span>Dados básicos</span>
                        </template>
                        <PropostaForm :padroes="false" @changed="loadData()" />
                    </TabPanel>
                    <TabPanel :disabled="!itemData.id">
                        <template #header>
                            <i class="fa-solid fa-sitemap mr-2"></i>
                            <span>Composições</span>
                        </template>
                        <ComposicoesGrid />
                    </TabPanel>
                    <TabPanel :disabled="!itemData.id">
                        <template #header>
                            <i class="fa-solid fa-list-ol mr-2"></i>
                            <span>Itens</span>
                        </template>
                        <ItensGrid />
                    </TabPanel>
                    <TabPanel :disabled="!itemData.id">
                        <template #header>
                            <i class="fa-solid fa-cog mr-2"></i>
                            <i class="fa-solid fa-print mr-2"></i>
                            <span>Termos e Impressão</span>
                        </template>
                        <PropostaForm :padroes="true" @changed="loadData()" />
                    </TabPanel>
                </TabView>
                <Eventos ref="fSEventos" :tabelaBd="'com_propostas'" :idRegistro="Number(itemData.id)" v-if="itemData.id" />
            </div>
            <div class="card bg-green-200 mt-3" v-if="uProf.admin >= 2">
                <p>route.name {{ route.name }}</p>
                <p>itemData: {{ itemData }}</p>
                <p>itemDataPipeline: {{ itemDataPipeline }}</p>
                <p>itemDataPipelineParams: {{ itemDataPipelineParams }}</p>
            </div>
        </div>
    </div>
</template>
