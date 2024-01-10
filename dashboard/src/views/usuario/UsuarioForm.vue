<script setup>
import { onBeforeMount, onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { isValidEmail } from '@/global';

import Breadcrumb from '@/components/Breadcrumb.vue';

import { Mask } from 'maska';
const masks = ref({
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    }),
    telefone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    })
});

// Validar o cpf_cnpj
import { cpf, cnpj } from 'cpf-cnpj-validator';

import { useRoute } from 'vue-router';
const route = useRoute();

import { useRouter } from 'vue-router';
const router = useRouter();

// Cookies do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

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
const loading = ref(false);
// Props do template
const props = defineProps({
    mode: String
});
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/users`);
// Carragamento de dados do form
const loadData = async () => {
    setTimeout(async () => {
        if (route.params.id || itemData.value.id) {
            if (route.params.id) itemData.value.id = route.params.id;
            const url = `${urlBase.value}/${itemData.value.id}`;
            await axios.get(url).then((res) => {
                const body = res.data;
                if (body && body.id) {
                    body.id = String(body.id);
                    body.prospect = isTrue(body.prospect);

                    itemData.value = body;
                    if (itemData.value.cpf) itemData.value.cpf = masks.value.cpf_cnpj.masked(itemData.value.cpf);
                    itemDataComparision.value = { ...itemData.value };

                    loading.value.form = false;
                } else {
                    defaultWarn('Registro não localizado');
                    router.push({ path: `/${userData.schema_description}/usuarios` });
                }
            });
        } else loading.value = false;
    }, Math.random() * 1000 + 250);
};
// Salvar dados do formulário
const saveData = async () => {
    if (formIsValid()) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`;
        if (itemData.value.cpf) itemData.value.cpf = masks.value.cpf_cnpj.unmasked(itemData.value.cpf);
        axios[method](url, itemData.value)
            .then((res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    itemDataComparision.value = { ...itemData.value };
                    if (mode.value == 'new') router.push({ path: `/${userData.schema_description}/usuario/${itemData.value.id}` });
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
// Verifica se houve alteração nos dados do formulário
const isItemDataChanged = () => {
    const ret = JSON.stringify(itemData.value) !== JSON.stringify(itemDataComparision.value);
    if (!ret) {
        accept.value = false;
        // errorMessages.value = {};
    }
    return ret;
};
// Validar CPF
const validateCPF = () => {
    if (cpf.isValid(itemData.value.cpf) || cnpj.isValid(itemData.value.cpf)) errorMessages.value.cpf = null;
    else errorMessages.value.cpf = 'CPF/CNPJ informado é inválido';
    return !errorMessages.value.cpf;
};
// Validar telefone
const validateTelefone = () => {
    if (itemData.value.telefone && itemData.value.telefone.trim().length > 0 && ![10, 11].includes(masks.value.telefone.unmasked(itemData.value.telefone).length)) {
        errorMessages.value.telefone = 'Formato de telefone inválido';
    } else errorMessages.value.telefone = null;
    return !errorMessages.value.telefone;
};
// Validar email
const validateEmail = () => {
    if (itemData.value.email && itemData.value.email.trim().length > 0 && !isValidEmail(itemData.value.email)) {
        errorMessages.value.email = 'Formato de email inválido';
    } else errorMessages.value.email = null;
    return !errorMessages.value.email;
};
// Validar formulário
const formIsValid = () => {
    return validateCPF() && validateTelefone() && validateEmail();
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
onBeforeMount(() => {});
onMounted(() => {
    loadData();
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
    else {
        if (itemData.value.id) mode.value = 'view';
        else mode.value = 'new';
    }
});
// Observar alterações nos dados do formulário
watchEffect(() => {
    isItemDataChanged();
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Usuários', to: `/${userData.schema_description}/usuarios` }, { label: itemData.name + (userData.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-4">
                            <label for="name">Nome</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.name" id="name" type="text" />
                        </div>

                        <div class="field col-12 md:col-2">
                            <label for="cpf">CPF/CNPJ</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.cpf" id="cpf" type="text" @input="validateCPF()" v-maska data-maska="['##.###.###/####-##','###.###.###-##']" />
                            <small id="text-error" class="p-error" v-if="errorMessages.cpf">{{ errorMessages.cpf }}</small>
                        </div>

                        <div class="col-12 md:col-4">
                            <label for="email">E-mail</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email" id="tecnico" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email">{{ errorMessages.email }}</small>
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="telefone">Telefone</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.telefone" id="telefone" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.telefone">{{ errorMessages.telefone }}</small>
                        </div>
                    </div>
                    <div class="col-12" v-if="userData.admin >= 2">
                        <div class="card bg-green-200 mt-3">
                            <p>Mode: {{ mode }}</p>
                            <p>itemData: {{ itemData }}</p>
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-beat" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!isItemDataChanged() || !formIsValid()" />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>