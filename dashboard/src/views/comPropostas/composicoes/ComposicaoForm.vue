<script setup>
import { onBeforeMount, onMounted, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';

import { guide } from '@/guides/propostasComposFormGuide.js';

import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();

import moment from 'moment';

// Campos de formulário
const itemData = ref({});
const dataRegistro = ref('');
// Modo do formulário
const mode = ref('view');
// Loadings
const loading = ref(false);
// Props do template
const props = defineProps(['mode', 'idComposicao', 'modeParent']);
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/com-prop-compos/${route.params.id}`);
// Carragamento de dados do form
const loadData = async () => {
    if (props.idComposicao) {
        loading.value = true;
        setTimeout(async () => {
            const url = `${urlBase.value}/${props.idComposicao}`;
            await axios.get(url).then(async (res) => {
                const body = res.data;
                if (body && body.id) {
                    body.id = String(body.id);
                    itemData.value = body;
                    itemData.value.comp_ativa = isTrue(itemData.value.comp_ativa);
                    itemData.value.compoe_valor = isTrue(itemData.value.compoe_valor);
                    dataRegistro.value = moment(itemData.value.updated_at || itemData.value.created_at).format('DD/MM/YYYY HH:mm:ss');
                    if (props.modeParent == 'clone') {
                        mode.value = 'new';
                        delete itemData.value.id;
                        delete itemData.value.compos_nr;
                        delete itemData.value.ordem;
                        delete itemData.value.created_at;
                        delete itemData.value.updated_at;
                        delete itemData.value.old_id;
                        itemData.value.comp_ativa = true;
                        itemData.value.compoe_valor = true;
                    }
                    loading.value = false;
                } else {
                    defaultWarn('Registro não localizado');
                    router.push({ path: `/${userData.schema_description}/proposta/${route.params.id}` });
                }
            });
            loading.value = false;
        }, Math.random() * 1000 + 250);
    } else {
        itemData.value = {
            id_com_propostas: route.params.id,
            comp_ativa: true,
            compoe_valor: true
        };
        mode.value = 'new';
        loading.value = false;
    }
};
// Salvar dados do formulário
const saveData = async () => {
    if (!formIsValid()) {
        defaultWarn('Verifique os campos obrigatórios');
        return;
    }
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    axios[method](url, itemData.value)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                itemData.value = body;
                itemData.value.comp_ativa = isTrue(itemData.value.comp_ativa);
                itemData.value.compoe_valor = isTrue(itemData.value.compoe_valor);
                mode.value = 'view';
                emit('changed');
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((err) => {
            defaultWarn(err.response.data);
        });
};

// Verifica se o valor é 1
const isTrue = (value) => [1].includes(value);

// Validar formulário
const formIsValid = () => {
    return true;
};
// Recarregar dados do formulário
const reload = () => {
    emit('cancel');
};
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
});
const form = ref();
onMounted(() => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
    form.value.scrollIntoView({ behavior: 'smooth' });
});
</script>

<template>
    <div class="card" ref="form">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-8">
                            <div class="flex justify-content-start gap-5">
                                <div class="switch-label" v-if="itemData.compos_nr">Número da composição: {{ itemData.compos_nr }}</div>
                                <div class="switch-label" v-else>Nova composição</div>
                                <div class="switch-label">
                                    Composição ativa
                                    <InputSwitch id="comp_ativa" :disabled="mode == 'view'" v-model="itemData.comp_ativa" />
                                </div>
                                <div class="switch-label">
                                    Compõe valor
                                    <InputSwitch id="compoe_valor" :disabled="mode == 'view'" v-model="itemData.compoe_valor" />
                                </div>
                            </div>
                        </div>
                        <div class="col-12 md:col-5">
                            <label for="localizacao">Descrição curta(60 caracteres)</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.localizacao" id="localizacao" type="text" maxlength="60" />
                        </div>
                        <div class="col-12 md:col-7">
                            <label for="tombamento">Descrição longa(90 caracteres)</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.tombamento" id="tombamento" type="text" maxlength="90" />
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                        <Button type="button" v-if="mode == 'view'" label="Fechar" icon="fa-solid fa-xmark" severity="secondary" text raised @click="reload()" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="fa-solid fa-ban" severity="danger" text raised @click="reload()" />
                    </div>
                </div>
                <div class="col-12">
                    <Fieldset class="bg-green-200" toggleable :collapsed="true">
                        <template #legend>
                            <div class="flex align-items-center text-primary">
                                <span class="fa-solid fa-circle-info mr-2"></span>
                                <span class="font-bold text-lg">Instruções</span>
                            </div>
                        </template>
                        <p class="m-0">
                            <span v-html="guide" />
                        </p>
                    </Fieldset>
                </div>
                <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
                    <p>mode: {{ mode }}</p>
                    <p>modeParent: {{ props.modeParent }}</p>
                    <p>itemData: {{ itemData }}</p>
                </div>
            </div>
        </form>
    </div>
</template>
<style scoped>
.switch-label {
    font-size: 1.75rem;
    font-family: inherit;
    font-weight: 500;
    line-height: 1.2;
    color: var(--surface-900);
}
</style>
