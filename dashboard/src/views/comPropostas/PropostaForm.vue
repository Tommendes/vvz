<script setup>
import { onBeforeMount, onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';

// Cookies do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import Breadcrumb from '@/components/Breadcrumb.vue';

import { useRoute } from 'vue-router';
const route = useRoute();

import { useRouter } from 'vue-router';
const router = useRouter();

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

// Campos de formulário
const itemData = ref({});
// Modelo de dados usado para comparação
const itemDataComparision = ref({});
// Modo do formulário
const mode = ref('view');
// Aceite do formulário
const accept = ref(false);
// Mensages de erro
const errorMessages = ref({});
// Loadings
const loading = ref(true);
// Props do template
const props = defineProps({
    mode: String
});
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/com-propostas`);
// Carragamento de dados do form
const loadData = async () => {
    setTimeout(async () => {
        if (route.params.id || itemData.value.id) {
            if (route.params.id) itemData.value.id = route.params.id;
            const url = `${urlBase.value}/${itemData.value.id}`;

            await axios.get(url).then(async (res) => {
                const body = res.data;
                if (body && body.id) {
                    body.id = String(body.id);
                    itemData.value = body;
                    itemDataComparision.value = { ...itemData.value };
                    loading.value = false;
                } else {
                    defaultWarn('Proposta não localizada');
                    router.push({ path: `/${userData.cliente}/propostas` });
                }
            });
        } else loading.value = false;
    }, Math.random() * 1000 + 250);
};
const saveData = async () => {
    if (formIsValid()) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`;
        axios[method](url, itemData.value)
            .then(async (res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    itemDataComparision.value = { ...itemData.value };
                    emit('changed');
                    mode.value = 'view';
                } else {
                    defaultWarn('Erro ao salvar registro');
                }
            })
            .catch((error) => {
                if (typeof error.response.data == 'string') defaultWarn(error.response.data);
                else if (typeof error.response == 'string') defaultWarn(error.response);
                else if (typeof error == 'string') defaultWarn(error);
                else {
                    console.log(error);
                    defaultWarn('Erro ao carregar dados!');
                }
            });
    }
};
// Verifica se houve alteração nos dados do formulário
const isItemDataChanged = () => {
    const ret = JSON.stringify(itemData.value) !== JSON.stringify(itemDataComparision.value);
    if (!ret) {
        accept.value = false;
        // errorMessages.value = {};
    }
    return ret;
};
// Validar formulário
const formIsValid = () => {
    return true;
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
    accept.value = false;
    errorMessages.value = {};
    loadData();
    emit('cancel');
};
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
    // loadOptions();
});
onMounted(() => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
});
// Observar alterações nos dados do formulário
watchEffect(() => {
    isItemDataChanged();
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todas as propostas', to: `/${userData.cliente}/propostas` }, { label: itemData.pessoa_contato + (userData.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card" style="min-width: 100rem">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-3">
                            <label for="id_pipeline">Tipo</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_pipeline" id="id_pipeline" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="pessoa_contato">Contato</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.pessoa_contato" id="pessoa_contato" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="telefone_contato">Telefone</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.telefone_contato" id="telefone_contato" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="email_contato">Email</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email_contato" id="email_contato" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="desconto_ativo">Desconto Ativo</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.desconto_ativo" id="desconto_ativo" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="desconto_total">Desconto Total</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.desconto_total" id="desconto_total" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="prz_entrega">Prazo de Entrega</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.prz_entrega" id="prz_entrega" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="forma_pagto">Forma de Pagamento</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.forma_pagto" id="forma_pagto" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="validade_prop">Validade da Proposta</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.validade_prop" id="validade_prop" type="text" />
                        </div>
                        <!-- <div class="col-12 md:col-3">
                            <label for="old_id">old_id</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.old_id" id="old_id" type="text"/>
                        </div> -->
                        <div class="col-12 md:col-12">
                            <label for="saudacao_inicial">Sudação Inicial</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Editor v-else-if="!loading && mode != 'view'" v-model="itemData.saudacao_inicial" id="saudacao_inicial" editorStyle="height: 160px" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.saudacao_inicial" class="p-inputtext p-component p-filled"></p>
                        </div>
                        <div class="col-12 md:col-12">
                            <label for="garantia">Garantia</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Editor v-else-if="!loading && mode != 'view'" v-model="itemData.garantia" id="garantia" editorStyle="height: 160px" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.garantia" class="p-inputtext p-component p-filled"></p>
                        </div>
                        <div class="col-12 md:col-12">
                            <label for="conclusao">Conclusão</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Editor v-else-if="!loading && mode != 'view'" v-model="itemData.conclusao" id="conclusao" editorStyle="height: 160px" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.conclusao" class="p-inputtext p-component p-filled"></p>
                        </div>
                        <div class="col-12 md:col-12">
                            <label for="assinatura">Assinatura</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Editor v-else-if="!loading && mode != 'view'" v-model="itemData.assinatura" id="assinatura" editorStyle="height: 160px" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.assinatura" class="p-inputtext p-component p-filled"></p>
                        </div>
                        <div class="col-12 md:col-12">
                            <label for="observacoes_finais">Observacoes Finais</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Editor v-else-if="!loading && mode != 'view'" v-model="itemData.observacoes_finais" id="observacoes_finais" editorStyle="height: 160px" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.observacoes_finais" class="p-inputtext p-component p-filled"></p>
                        </div>
                    </div>
                    <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
                        <p>route.name {{ route.name }}</p>
                        <p>mode: {{ mode }}</p>
                        <p>itemData: {{ itemData }}</p>
                        <p v-if="props.idCadastro">idCadastro: {{ props.idCadastro }}</p>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!isItemDataChanged() || !formIsValid()" />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
