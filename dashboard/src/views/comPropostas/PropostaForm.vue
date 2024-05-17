<script setup>
import { inject, onBeforeMount, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { isValidEmail, formatCurrency } from '@/global';
import { defaultSuccess, defaultWarn } from '@/toast';

import { guide1, guide2 } from '@/guides/propostasFormGuide.js';
import EditorComponent from '@/components/EditorComponent.vue';

// Cookies do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { Mask } from 'maska';
const masks = ref({
    telefone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    }),
    valor: new Mask({
        mask: '0,99'
    })
});

const props = defineProps({
    padroes: {
        type: Boolean,
        default: false
    }
});

// Campos de formulário
const itemData = inject('itemData');
// const itemDataPipeline = inject('itemDataPipeline');
// const itemDataPipelineParams = inject('itemDataPipelineParams');
// Modo do formulário
const mode = inject('mode');
// Mensages de erro
const errorMessages = ref({});
// Loadings
const loading = ref(true);
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/com-propostas`);
// Carragamento de dados do form
const loadData = async () => {
    loading.value = true;
    if (itemData && itemData.id) {
        if (itemData.telefone_contato) itemData.telefone_contato = masks.value.telefone.masked(itemData.telefone_contato);
        if (itemData.desconto_total) itemData.desconto_total = formatCurrency(itemData.desconto_total);
    }
    loading.value = false;
};
const saveData = async () => {
    if (!formIsValid()) {
        defaultWarn('Verifique os campos obrigatórios');
        return;
    }
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    const obj = { ...itemData.value };
    if (obj.telefone_contato) obj.telefone_contato = masks.value.telefone.unmasked(obj.telefone_contato);
    if (obj.desconto_total) obj.desconto_total = obj.desconto_total.replace(',', '.');
    axios[method](url, obj)
        .then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
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
                defaultWarn('Erro ao carregar dados!');
            }
        });
};
// DropDown Desconto Ativo
const dropdownDescontoAtivo = ref([
    { value: 0, label: 'Não' },
    { value: 1, label: 'Sim' }
]);
// Validar email
const validateEmail = () => {
    errorMessages.value.email_contato = null;
    if (itemData.value.email_contato && itemData.value.email_contato.trim().length > 0 && !isValidEmail(itemData.value.email_contato)) {
        errorMessages.value.email_contato = 'Formato de email inválido';
        return false;
    }
    return true;
};
// Validar telefone
const validateTelefone = () => {
    errorMessages.value.telefone_contato = null;
    if (itemData.value.telefone_contato && itemData.value.telefone_contato.trim().length > 0 && ![10, 11].includes(masks.value.telefone.unmasked(itemData.value.telefone_contato).length)) {
        errorMessages.value.telefone_contato = 'Formato de telefone inválido';
        return false;
    }
    return true;
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
// Carregar opções do formulário
const dropdownPrazo = ref([]);
const dropdownFormaPagto = ref([]);
const dropdownValidade = ref([]);
const loadOptions = async () => {
    setTimeout(async () => {
        // Prazo de entrega da proposta
        await optionLocalParams({ field: 'grupo', value: 'com_pr05', select: 'id,parametro' }).then((res) => {
            res.data.data.map((item) => {
                dropdownPrazo.value.push({ value: item.id, label: item.parametro });
            });
        });
        // Forma de pagamento da proposta
        await optionLocalParams({ field: 'grupo', value: 'com_pr06', select: 'id,parametro' }).then((res) => {
            res.data.data.map((item) => {
                dropdownFormaPagto.value.push({ value: item.id, label: item.parametro });
            });
        });
        // Validade da proposta
        await optionLocalParams({ field: 'grupo', value: 'com_pr07', select: 'id,parametro' }).then((res) => {
            res.data.data.map((item) => {
                dropdownValidade.value.push({ value: item.id, label: item.parametro });
            });
        });
    }, Math.random() * 1000);
};

const imprimirProposta = async (resumo = false) => {
    defaultSuccess('Por favor aguarde...');
    let url = `${baseApiUrl}/printing/`;
    if (resumo) url += 'resumo/';
    else url += 'proposta/';
    await axios
        .post(url, { idProposta: itemData.value.id, encoding: 'base64', exportType: 'pdf' })
        .then((res) => {
            const body = res.data;
            let pdfWindow = window.open('');
            pdfWindow.document.write(`<iframe width='100%' height='100%' src='data:application/pdf;base64, ${encodeURI(body)} '></iframe>`);
        })
        .catch((error) => {
            if (typeof error.response.data == 'string') defaultWarn(error.response.data);
            else if (typeof error.response == 'string') defaultWarn(error.response);
            else if (typeof error == 'string') defaultWarn(error);
            else {
                defaultWarn('Erro ao carregar dados!');
            }
        });
};

// Carregar dados do formulário
onBeforeMount(async () => {
    await loadOptions();
    loadData();
});
// Observar alterações nos dados do formulário
watchEffect(() => {});
</script>

<template>
    <form @submit.prevent="saveData">
        <div class="grid">
            <div class="col-12">
                <div class="p-fluid grid" v-if="!props.padroes">
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
                    <div class="col-12 md:col-4">
                        <label for="email_contato">Email</label>
                        <Skeleton v-if="loading" height="2rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email_contato" id="email_contato" type="text" class="lowercase" />
                        <small id="text-error" class="p-error" v-if="errorMessages.email_contato">{{ errorMessages.email_contato }}</small>
                    </div>
                    <div class="col-12 md:col-2">
                        <label for="prz_entrega">Prazo de Entrega</label>
                        <Skeleton v-if="loading" height="2rem"></Skeleton>
                        <Dropdown v-else id="prz_entrega" optionLabel="label" optionValue="value" :disabled="mode == 'view'" v-model="itemData.prz_entrega" :options="dropdownPrazo" placeholder="Selecione..."> </Dropdown>
                    </div>
                    <div class="col-12 md:col-4">
                        <label for="forma_pagto">Forma de Pagamento</label>
                        <Skeleton v-if="loading" height="2rem"></Skeleton>
                        <Dropdown v-else id="forma_pagto" optionLabel="label" optionValue="value" :disabled="mode == 'view'" v-model="itemData.forma_pagto" :options="dropdownFormaPagto" placeholder="Selecione..."> </Dropdown>
                    </div>
                    <div class="col-12 md:col-4">
                        <label for="validade_prop">Validade da Proposta</label>
                        <Skeleton v-if="loading" height="2rem"></Skeleton>
                        <Dropdown v-else id="validade_prop" optionLabel="label" optionValue="value" :disabled="mode == 'view'" v-model="itemData.validade_prop" :options="dropdownValidade" placeholder="Selecione..."> </Dropdown>
                    </div>
                    <div class="col-12 md:col-2">
                        <label for="desconto_total">Desconto Total</label>
                        <Skeleton v-if="loading" height="2rem"></Skeleton>
                        <div v-else-if="!['view'].includes(mode)" class="p-inputgroup flex-1" style="font-size: 1rem">
                            <span class="p-inputgroup-addon">R$</span>
                            <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.desconto_total" id="desconto_total" type="text" v-maska data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                        </div>
                        <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                            <span class="p-inputgroup-addon">R$</span>
                            <span disabled v-html="formatCurrency(itemData.desconto_total || 0)" id="desconto_total" class="p-inputtext p-component disabled" />
                        </div>
                    </div>
                    <div class="col-12 md:col-2">
                        <label for="desconto_ativo">Desconto Ativo</label>
                        <Skeleton v-if="loading" height="2rem"></Skeleton>
                        <Dropdown v-else id="desconto_ativo" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.desconto_ativo" :options="dropdownDescontoAtivo" />
                    </div>
                </div>
                <div class="p-fluid grid" v-if="props.padroes">
                    <div class="col-12 md:col-6">
                        <label for="saudacao_inicial">Saudação Inicial</label>
                        <Skeleton v-if="loading" height="2rem"></Skeleton>
                        <EditorComponent v-else-if="!loading && mode != 'view'" v-model="itemData.saudacao_inicial" id="saudacao_inicial" editorStyle="height: 160px" aria-describedby="editor-error" />
                        <p v-else v-html="itemData.saudacao_inicial" class="p-inputtext p-component p-filled disabled"></p>
                    </div>
                    <div class="col-12 md:col-6">
                        <label for="garantia">Garantia</label>
                        <Skeleton v-if="loading" height="2rem"></Skeleton>
                        <EditorComponent v-else-if="!loading && mode != 'view'" v-model="itemData.garantia" id="garantia" editorStyle="height: 160px" aria-describedby="editor-error" />
                        <p v-else v-html="itemData.garantia" class="p-inputtext p-component p-filled disabled"></p>
                    </div>
                    <div class="col-12 md:col-6">
                        <label for="conclusao">Conclusão</label>
                        <Skeleton v-if="loading" height="2rem"></Skeleton>
                        <EditorComponent v-else-if="!loading && mode != 'view'" v-model="itemData.conclusao" id="conclusao" editorStyle="height: 160px" aria-describedby="editor-error" />
                        <p v-else v-html="itemData.conclusao" class="p-inputtext p-component p-filled disabled"></p>
                    </div>
                    <div class="col-12 md:col-6">
                        <label for="assinatura">Assinatura</label>
                        <Skeleton v-if="loading" height="2rem"></Skeleton>
                        <EditorComponent v-else-if="!loading && mode != 'view'" v-model="itemData.assinatura" id="assinatura" editorStyle="height: 160px" aria-describedby="editor-error" />
                        <p v-else v-html="itemData.assinatura" class="p-inputtext p-component p-filled disabled"></p>
                    </div>
                    <div class="col-12 md:col-12">
                        <label for="observacoes_finais">Observacoes Finais</label>
                        <Skeleton v-if="loading" height="2rem"></Skeleton>
                        <EditorComponent v-else-if="!loading && mode != 'view'" v-model="itemData.observacoes_finais" id="observacoes_finais" editorStyle="height: 160px" aria-describedby="editor-error" />
                        <p v-else v-html="itemData.observacoes_finais" class="p-inputtext p-component p-filled disabled"></p>
                    </div>
                </div>
            </div>
            <div class="col-12">
                <div class="card flex justify-content-center flex-wrap gap-3">
                    <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                    <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                    <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="fa-solid fa-ban" severity="danger" text raised @click="reload" />
                    <Button type="button" v-if="props.padroes" label="Imprimir Proposta" icon="fa-solid fa-print" severity="success" text raised @click="imprimirProposta()" />
                    <Button type="button" v-if="props.padroes" label="Imprimir Resumo" icon="fa-solid fa-cash-register" severity="success" text raised @click="imprimirProposta(true)" />
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
                    <p class="mb-3" v-if="itemData.old_id">
                        <span>Para acessar o registro no lynkos.com.br acesse <a :href="`https://lynkos.com.br/com-proposta/${itemData.old_id}`" target="_blank">aqui</a>. Edições e inclusões não são mais permitidas no LynkOs</span>
                        <span style="font-size: 20px">&#128521;</span>
                    </p>
                    <p class="m-0">
                        <span v-if="!props.padroes" v-html="guide1" />
                        <span v-if="props.padroes" v-html="guide2" />
                    </p>
                </Fieldset>
                <Fieldset class="bg-green-200" v-if="userData.admin >= 2" toggleable :collapsed="true">
                    <template #legend>
                        <div class="flex align-items-center text-primary">
                            <span class="fa-solid fa-circle-info mr-2"></span>
                            <span class="font-bold text-lg">FormData</span>
                        </div>
                    </template>
                    <p>props.padroes: {{ props.padroes }}</p>
                    <p>mode: {{ mode }}</p>
                    <p>itemData: {{ itemData }}</p>
                </Fieldset>
            </div>
        </div>
    </form>
</template>
<style>
.disabled {
    opacity: 0.6;
}
</style>
