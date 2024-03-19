<script setup>
import { onMounted, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import moment from 'moment';
import { guide } from '@/guides/cadastroFormGuide.js';

import { Mask } from 'maska';
const masks = ref({
    // Opções para máscaras
});

import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();

// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

// Campos de formulário
const itemData = ref({});
// Modo do formulário
const mode = ref('view');
// Mensages de erro
const errorMessages = ref({});
// Dropdowns
const dropdownTerceiro = ref([
    { value: 0, label: 'Sim' },
    { value: 1, label: 'Não' }
]);
// Loadings
const loading = ref({
    form: true,
    accepted: null,
    email: null,
    telefone: null
});
// Props do template
const props = defineProps({
    mode: String
});
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/comissoes`);
// Carragamento de dados do form
const loadData = async () => {
    loading.value.form = true;
    setTimeout(async () => {
        if (route.params.id || itemData.value.id) {
            if (route.params.id) itemData.value.id = route.params.id;
            const url = `${urlBase.value}/${itemData.value.id}`;
            await axios.get(url).then((res) => {
                const body = res.data;
                if (body && body.id) {
                    body.id = String(body.id);
                    body.prospecto = isTrue(body.prospecto);

                    itemData.value = body;
                    loading.value.form = false;
                } else {
                    defaultWarn('Registro não localizado');
                    router.push({ path: `/${userData.schema_description}/comissoes` });
                }
            });
        } else loading.value.form = false;
    }, Math.random() * 1000 + 250);
};
// Salvar dados do formulário
const saveData = async () => {
    if (!formIsValid()) {
        defaultWarn('Verifique os campos obrigatórios');
        return;
    }
    loading.value.form = true;
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    const obj = { ...itemData.value };
    
    await axios[method](url, obj)
        .then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                itemData.value = body;

                if (itemData.value.aniversario) itemData.value.aniversario = moment(itemData.value.aniversario).format('DD/MM/YYYY');
                emit('changed');
                // if (mode.value != 'new') reload();
                // else router.push({ path: `/${userData.schema_description}/cadastro/${itemData.value.id}` });
                if (mode.value == 'new') router.push({ path: `/${userData.schema_description}/comissao/${itemData.value.id}` });
                mode.value = 'view';
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((err) => {
            defaultWarn(err.response.data);
        });
    loading.value.form = false;
};
// Converte 1 ou 0 para boolean
const isTrue = (value) => value === 1;

// Validar formulário
const formIsValid = () => {
    return true;
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
    errorMessages.value = {};
    loadData();
    emit('cancel');
};
// Carregar dados do formulário
onMounted(async () => {
    loading.value.form = true;
    await loadData();
    await loadOptions();
});
onMounted(() => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
});
</script>

<template>
    <div class="grid">
        <form @submit.prevent="saveData">
            <div class="col-12">
                
                <div class="p-fluid formgrid grid">
                    <div class="field col-12 md:col-6">
                        <label for="id_pipeline">Documento relacionado</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_pipeline" id="id_pipeline" type="text" />
                    </div>
                    <div class="field col-12 md:col-6">
                        <label for="id_comis_agentes">Agente</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_comis_agentes" id="id_comis_agentes" type="text" />
                    </div>
                    <div class="field col-12 md:col-6">
                        <label for="terceiro">Se um terceiro</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <Dropdown v-else id="terceiro" optionLabel="label" optionValue="value" :disabled="mode == 'view'" v-model="itemData.terceiro" :options="dropdownTerceiro" placeholder="Selecione..."> </Dropdown>
                    </div>
                    <div class="field col-12 md:col-6">
                        <label for="inss">Informar INSS</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.inss" id="inss" type="text" />
                    </div>
                    <div class="field col-12 md:col-6">
                        <label for="valor_base">Valor base de cálculo da comissão</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_base" id="valor_base" type="text" />
                    </div>
                    <div class="field col-12 md:col-6">
                        <label for="participacao">Percentual de comissão</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.participacao" id="participacao" type="text" />
                    </div>
                    <div class="field col-12 md:col-6">
                        <label for="liquidacao">Data da liquidação</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.liquidacao" id="liquidacao" type="text" />
                    </div>

                </div>
                <div class="card flex justify-content-center flex-wrap gap-3">
                    <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                    <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                    <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="fa-solid fa-ban" severity="danger" text raised @click="reload" />
                </div>

                <div class="col-12">
                    <Fieldset class="bg-green-200" toggleable :collapsed="true">
                        <template #legend>
                            <div class="flex align-items-center text-primary">
                                <span class="fa-solid fa-circle-info mr-2"></span>
                                <span class="font-bold text-lg">Instruções</span>
                            </div>
                        </template>
                        <p class="mb-3" v-if="itemData.old_id">
                            <span>Para acessar o registro no lynkos.com.br acesse <a :href="`https://lynkos.com.br/cadastros/${itemData.old_id}`" target="_blank">aqui</a>. Edições e inclusões não são mais permitidas no LynkOs</span>
                            <span style="font-size: 20px">&#128521;</span>
                        </p>
                        <p class="m-0">
                            <span v-html="guide" />
                        </p>
                    </Fieldset>
                </div>
            </div>
        </form>
        <div class="col-12" v-if="userData.admin >= 2">
            <div class="card bg-green-200 mt-3">
                <p>Mode: {{ mode }}</p>
                <p>itemData: {{ itemData }}</p>
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
