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

// Campos de formulário
const itemData = ref({});
// Modo do formulário
const mode = ref('view');
// Mensages de erro
const errorMessages = ref({});
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
const urlBase = ref(`${baseApiUrl}/fin-lancamentos`);
// Carragamento de dados do form
const loadData = async () => {
    if (route.params.id || itemData.value.id) {
        if (route.params.id) itemData.value.id = route.params.id;
        const url = `${urlBase.value}/${itemData.value.id}`;

        await axios.get(url).then((res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);

                itemData.value = body;

                loading.value.form = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${userData.schema_description}/lancamentos` });
            }
        });
    } else loading.value.form = false;
};
// Salvar dados do formulário
const saveData = async () => {
    if (formIsValid()) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`;
        axios[method](url, itemData.value)
            .then((res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    if (mode.value == 'new') router.push({ path: `/${userData.schema_description}/lancamento/${itemData.value.id}` });
                    mode.value = 'view';
                } else {
                    defaultWarn('Erro ao salvar registro');
                }
            })
            .catch((err) => {
                defaultWarn(err.response.data);
            });
    }
};
// DropDown situacao
const dropdownSituacao = ref([
    { value: 0, label: 'Todos' },
    { value: 1, label: 'Pendente' },
    { value: 2, label: 'Cancelado' },
    { value: 3, label: 'Quitado' },
    { value: 4, label: 'Conciliado' }
]);
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
onBeforeMount(() => {
    loadData();
    // loadOptions();
});
onMounted(() => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
    else {
        if (itemData.value.id) mode.value = 'view';
        else mode.value = 'new';
    }
});
// Observar alterações nos dados do formulário
watchEffect(() => {});
const menu = ref();
const preview = ref(false);
const items = ref([
    {
        label: 'View',
        icon: 'pi pi-fw pi-search',
        command: () => {
            alert('Enviar nova imagem');
        }
    },
    {
        label: 'Delete',
        icon: 'pi pi-fw pi-trash',
        command: () => {
            alert('Excluir imagem');
        }
    }
]);
</script>
<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Registros', to: `/${userData.schema_description}/registros` }, { label: itemData.tecnico + (userData.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-4">
                            <label for="tp_cta">Tipo de CTA</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.tp_cta" id="tp_cta" type="text" />
                        </div>
                        <!-- <div class="col-12 md:col-4">
                            <label for="id_empresa">iD da Empresa</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_empresa" id="id_empresa" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="id_cadastros">iD do Cadastros</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_cadastros" id="id_cadastros" type="text" />
                        </div> -->
                        <!-- <div class="col-12 md:col-4">
                            <label for="id_centro_custo">Codigo relacional com a tabela fin_centro_custo</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_centro_custo" id="id_centro_custo" type="text" />
                        </div> -->
                        <div class="col-12 md:col-4">
                            <label for="tipoDocumento">Tipo de Documento Gerado</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.tipoDocumento" id="tipoDocumento" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="doc_fiscal">Nota fiscal do lancamento</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.doc_fiscal" id="doc_fiscal" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="data_lanc">Data do lancamento da conta no sistema</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.data_lanc" id="data_lanc" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="data_vencimento">Data de vencimento programado</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.data_vencimento" id="data_vencimento" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="data_pagto">Data do Pagamento</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.data_pagto" id="data_pagto" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="valor_bruto">Valor bruto da conta</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_bruto" id="valor_bruto" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="valor_bruto_nf">Valor Bruto da Nota Fiscal</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_bruto_nf" id="valor_bruto_nf" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="valor_retencao">Valor da Retenção</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_retencao" id="valor_retencao" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="valor_liquido">Valor Liquido da Conta</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_liquido" id="valor_liquido" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="descricao_retencao">Descrição do Motivo da Retencao</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.descricao_retencao" id="descricao_retencao" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="valor_vencimentos">Valor Bruto da Conta</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_vencimentos" id="valor_vencimentos" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="valor_nota_fiscal">Valor Total da Nota Fiscal</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_nota_fiscal" id="valor_nota_fiscal" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="duplicata">Duplicata da conta gerada no faturamento</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.duplicata" id="duplicata" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="duplicata_impr">Quantidade de vezes que a duplicata foi impresso</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.duplicata_impr" id="duplicata_impr" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="descricao_conta">Descrição da conta</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.descricao_conta" id="descricao_conta" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="obs_da_conta">Observação da conta</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.obs_da_conta" id="obs_da_conta" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="vencimento">vencimento</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.vencimento" id="vencimento" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="forma_pagto">Forma de pagamento utilizada</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.forma_pagto" id="forma_pagto" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="doc_pagto">Documento que quitou o pagamento</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.doc_pagto" id="doc_pagto" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="situacao">Situacao</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown v-else id="situacao" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.situacao" :options="dropdownSituacao" />
                        </div>
                        <div v-if="situacao == 2" class="col-12 md:col-4">
                            <label for="motiv_cancel">Motivo do cancelamento</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.motiv_cancel" id="motiv_cancel" type="text" />
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-beat" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!formIsValid()" />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
