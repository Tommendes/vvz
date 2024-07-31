<script setup>
import { onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { isValidEmail } from '@/global';
import EditorComponent from '@/components/EditorComponent.vue';

import Breadcrumb from '@/components/Breadcrumb.vue';

import { Mask } from 'maska';
const masks = ref({
    telefone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    })
});

import { useRoute } from 'vue-router';
const route = useRoute();

import { useRouter } from 'vue-router';
const router = useRouter();

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile()
});

// Campos de formulário
const itemData = ref({});
// Modo do formulário
const mode = ref('view');
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
const urlBase = ref(`${baseApiUrl}/pv-tecnicos`);
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
                if (itemData.value.telefone_contato) itemData.value.telefone_contato = masks.value.telefone.masked(itemData.value.telefone_contato);

                loading.value = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${uProf.value.schema_description}/pv-tecnicos` });
            }
        });
    } else loading.value = false;
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
    if (itemData.value.telefone_contato) itemData.value.telefone_contato = masks.value.telefone.unmasked(itemData.value.telefone_contato);
    axios[method](url, itemData.value)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                itemData.value = body;
                if (mode.value == 'new') router.push({ path: `/${uProf.value.schema_description}/tecnico-pv/${itemData.value.id}` });
                mode.value = 'view';
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((error) => {
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
        });
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
// Validar email
const validateEmail = () => {
    errorMessages.value.email_contato = null;
    if (itemData.value.email_contato && itemData.value.email_contato.trim().length > 0 && !isValidEmail(itemData.value.email_contato)) {
        errorMessages.value.email_contato = 'Formato de email inválido';
        return false;
    }
    return true;
};
// Validar formulário
const formIsValid = () => {
    return validateTelefone() && validateEmail();
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
    await loadData();
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
    else {
        if (itemData.value.id) mode.value = 'view';
        else mode.value = 'new';
    }
});
</script>

<template>
    <Breadcrumb
        v-if="mode != 'new'"
        :items="[
            { label: 'Técnicos Pós Vendas', to: `/${uProf.schema_description}/tecnicos-pv` },
            { label: itemData.tecnico + (uProf.admin >= 1 ? `: (${itemData.id})` : ''), to: route.fullPath }
        ]"
    />
    <div class="card">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-4">
                            <label for="tecnico">Técnico Responsável</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.tecnico" id="tecnico" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="telefone_contato">Telefone para Contato</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.telefone_contato" id="telefone_contato" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.telefone_contato">{{ errorMessages.telefone_contato }}</small>
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="email_contato">E-mail para contato</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email_contato" id="email_contato" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email_contato">{{ errorMessages.email_contato }}</small>
                        </div>
                        <div class="col-12 md:col-12" v-if="itemData.observacao || ['edit', 'new'].includes(mode)">
                            <label for="observacao">Observação</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <EditorComponent v-else-if="!loading && mode != 'view'" v-model="itemData.observacao" id="observacao" :editorStyle="{ height: '160px' }" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.observacao" class="p-inputtext p-component p-filled"></p>
                        </div>
                    </div>
                    <div class="col-12" v-if="uProf.admin >= 2">
                        <div class="card bg-green-200 mt-3">
                            <p>Mode: {{ mode }}</p>
                            <p>itemData: {{ itemData }}</p>
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-beat" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="fa-solid fa-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
