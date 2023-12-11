<script setup>
import { inject, onBeforeMount, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { isValidEmail } from '@/global';
import { defaultSuccess, defaultWarn } from '@/toast';

// Cookies do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { Mask } from 'maska';
const masks = ref({
    telefone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    })
});

// Campos de formulário
const itemData = inject('itemData');
// Modo do formulário
const mode = inject('mode');
// Dados do pipeline
const itemDataPipeline = inject('itemDataPipeline');
// Modelo de dados usado para comparação
const itemDataComparision = ref({});
// Mensages de erro
const errorMessages = ref({});
// Loadings
const loading = ref(true);
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/com-propostas`);
// Carragamento de dados do form
const loadData = () => {
    loading.value = true;
    if (itemData.id) {
        if (itemData.telefone_contato) itemData.telefone_contato = masks.value.telefone.masked(itemData.telefone_contato);
        itemDataComparision.value = { ...itemData };
    }
    loading.value = false;
};
const saveData = async () => {
    if (formIsValid()) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`;
        if (itemData.value.telefone_contato) itemData.value.telefone_contato = masks.value.telefone.unmasked(itemData.value.telefone_contato);
        axios[method](url, itemData.value)
            .then(async (res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemDataComparision.value = { ...itemData };
                    emit('changed');
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
    const ret = JSON.stringify(itemData) !== JSON.stringify(itemDataComparision.value);
    return ret;
};
// DropDown Desconto Ativo
const dropdownDescontoAtivo = ref([
    { value: 0, label: 'Não' },
    { value: 1, label: 'Sim' }
]);
// Validar email
const validateEmail = () => {
    if (itemData.value.email_contato && itemData.value.email_contato.trim().length > 0 && !isValidEmail(itemData.value.email_contato)) {
        errorMessages.value.email_contato = 'Formato de email inválido';
    } else errorMessages.value.email_contato = null;
    return !errorMessages.value.email_contato;
};
// Validar telefone
const validateTelefone = () => {
    if (itemData.value.telefone_contato && itemData.value.telefone_contato.trim().length > 0 && ![10, 11].includes(masks.value.telefone.unmasked(itemData.value.telefone_contato).length)) {
        errorMessages.value.telefone_contato = 'Formato de telefone inválido';
    } else errorMessages.value.telefone_contato = null;
    return !errorMessages.value.telefone_contato;
};
// Validar formulário
const formIsValid = () => {
    return validateEmail() && validateTelefone();
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
    errorMessages.value = {};
    loadData();
    emit('cancel');
};

// Obter parâmetros do BD
const optionLocalParams = async (query) => {
    const selects = query.select ? `&slct=${query.select}` : undefined;
    const url = `${baseApiUrl}/local-params/f-a/gbf?fld=${query.field}&vl=${query.value}${selects}`;
    return await axios.get(url);
};

// http://localhost:55596/local-params/f-a/gbf?fld=grupo&vl=com_pr05&slct=id,parametro,label

// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
});
// Observar alterações nos dados do formulário
watchEffect(() => {
    isItemDataChanged();
});
</script>

<template>
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
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.telefone_contato" id="telefone_contato" type="text" />
                        <small id="text-error" class="p-error" v-if="errorMessages.telefone_contato">{{ errorMessages.telefone_contato }}</small>
                    </div>
                    <div class="col-12 md:col-3">
                        <label for="email_contato">Email</label>
                        <Skeleton v-if="loading" height="2rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email_contato" id="email_contato" type="text" />
                        <small id="text-error" class="p-error" v-if="errorMessages.email_contato">{{ errorMessages.email_contato }}</small>
                    </div>
                    <div class="col-12 md:col-3">
                        <label for="desconto_ativo">Desconto Ativo</label>
                        <Skeleton v-if="loading" height="2rem"></Skeleton>
                        <Dropdown v-else id="desconto_ativo" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.desconto_ativo" :options="dropdownDescontoAtivo" />
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
                    <div class="col-12 md:col-12">
                        <label for="saudacao_inicial">Sudação Inicial</label>
                        <Skeleton v-if="loading" height="2rem"></Skeleton>
                        <Editor v-else-if="!loading && mode != 'view'" v-model="itemData.saudacao_inicial" id="saudacao_inicial" editorStyle="height: 160px" aria-describedby="editor-error" />
                        <p v-else v-html="itemData.saudacao_inicial" class="p-inputtext p-component p-filled"></p>
                    </div>
                    <div class="col-12 md:col-12">
                        <label for="observacoes_finais">Observacoes Finais</label>
                        <Skeleton v-if="loading" height="2rem"></Skeleton>
                        <Editor v-else-if="!loading && mode != 'view'" v-model="itemData.observacoes_finais" id="observacoes_finais" editorStyle="height: 160px" aria-describedby="editor-error" />
                        <p v-else v-html="itemData.observacoes_finais" class="p-inputtext p-component p-filled"></p>
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
                </div>
            </div>
            <div class="col-12">
                <div class="card flex justify-content-center flex-wrap gap-3">
                    <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                    <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!isItemDataChanged() || !formIsValid()" />
                    <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                </div>
            </div>
            <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
                <h5>FormData</h5>
                <p>mode: {{ mode }}</p>
                <p>itemData: {{ itemData }}</p>
                <p>itemDataPipeline: {{ itemDataPipeline }}</p>
            </div>
        </div>
    </form>
</template>
