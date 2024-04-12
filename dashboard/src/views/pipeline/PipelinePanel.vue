<script setup>
import { onMounted, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultWarn, defaultSuccess } from '@/toast';
import PipelineForm from './PipelineForm.vue';
import ComissoesItensGrid from '../comissoes/itens/ComissoesItensGrid.vue';
import Breadcrumb from '@/components/Breadcrumb.vue';
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { useRoute } from 'vue-router';
const route = useRoute();

const itemData = ref({});
const loading = ref(true);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/pipeline`);

const comissoesItensGrid = ref();
const pipelineForm = ref();

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
const refreshPipeline = async () => {
    pipelineForm.value.loadData();
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
</script>

<template>
    <Breadcrumb :items="breadItems" />
    <div class="grid" :style="route.name == 'cadastro' ? 'min-width: 100rem;' : ''">
        <div class="col-12">
            <div class="card">
                <PipelineForm ref="pipelineForm" />
                <div v-if="itemData.id">
                    <div class="p-fluid grid">
                        <div class="col-12" style="text-align: center">
                            <div class="flex align-items-end flex-wrap card-container purple-container">
                                <span class="p-inputtext p-component p-filled surface-100">
                                    <i class="fa-solid fa-angles-down fa-shake"></i> Comissionamento
                                    <i class="fa-solid fa-angles-down fa-shake" />
                                </span>
                            </div>
                        </div>
                    </div>
                    <ComissoesItensGrid v-if="route.name == 'pipeline-one'" ref="comissoesItensGrid" :itemDataRoot="itemData" @refreshPipeline="refreshPipeline()" />
                </div>
            </div>
        </div>
    </div>
</template>
