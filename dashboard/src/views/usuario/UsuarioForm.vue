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

import { useToast } from 'primevue/usetoast'; //IA
const toast = useToast(); //IA


// Cookies do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

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
const urlBase = ref(`${baseApiUrl}/users`);

// Converte 1 ou 0 para boolean
const isTrue = (value) => value === 1;

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

                    // Certificação de que loading.value é um objeto antes de acessar a propriedade form
                    if (typeof loading.value === 'object') {
                        loading.value.form = false;
                    }
                } else {
                    defaultWarn('Registro não localizado');
                    router.push({ path: `/${userData.schema_description}/usuarios` });
                }
            });
        } else {
            // Certificação de que loading.value é um objeto antes de acessar a propriedade form
            if (typeof loading.value === 'object') {
                loading.value = false;
            }
        }
    }, Math.random() * 1000);
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
    if (itemData.value.cpf) itemData.value.cpf = masks.value.cpf_cnpj.unmasked(itemData.value.cpf);
    axios[method](url, itemData.value)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                itemData.value = body;
                if (mode.value == 'new') router.push({ path: `/${userData.schema_description}/usuario/${itemData.value.id}` });
                mode.value = 'view';
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((err) => {
            defaultWarn(err.response.data);
        });
};
//DropDowns
const dropdownSN = ref([
    { value: 0, label: 'Não' },
    { value: 1, label: 'Sim' }
]);
const dropdownAlcadas = ref([
    { value: 0, label: 'Negado' },
    { value: 1, label: 'Pesquisa' },
    { value: 2, label: 'Inclusão' },
    { value: 3, label: 'Edição' },
    { value: 4, label: 'Administrar' }
]);
// Troca de senha
const changePassword = async () => {
  const urlRequestRequestPassReset = `${baseApiUrl}/request-password-reset/`;

  try {
    const response = await axios.post(urlRequestRequestPassReset, { cpf: userData.cpf });
    if (response.data.id) {
      redirectToPasswordReset(response.data.id);
      defaultSuccess(response.data.msg);
    } else {
      defaultWarn('Ops! Parece que houve um erro ao executar sua solicitação. Por favor, tente novamente.');
    }
  } catch (error) {
    defaultError(error);
  }
};
const redirectToPasswordReset = (passwordResetId) => {
  router.push({ path: `/${userData.schema_description}/password-reset`, query: { q: passwordResetId } });
};
// Validar CPF
const validateCPF = () => {
    errorMessages.value.cpf = null;
    if (cpf.isValid(itemData.value.cpf) || cnpj.isValid(itemData.value.cpf)) return true;
    else {
        errorMessages.value.cpf = 'CPF/CNPJ informado é inválido';
        return false;
    }
};
// Validar telefone
const validateTelefone = () => {
    errorMessages.value.telefone = null;
    if (itemData.value.telefone && itemData.value.telefone.trim().length > 0 && ![10, 11].includes(masks.value.telefone.unmasked(itemData.value.telefone).length)) {
        errorMessages.value.telefone = 'Formato de telefone inválido';
        return false;
    }
    return true;
};
// Validar email
const validateEmail = () => {
    errorMessages.value.email = null;
    if (itemData.value.email && itemData.value.email.trim().length > 0 && !isValidEmail(itemData.value.email)) {
        errorMessages.value.email = 'Formato de email inválido';
        return false;
    }
    return true;
};
// Validar formulário
const formIsValid = () => {
    return validateCPF() && validateTelefone() && validateEmail();
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
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
watchEffect(() => {});
</script>

<template>
    <Breadcrumb
        v-if="mode != 'new'"
        :items="[
            { label: 'Usuários', to: `/${userData.schema_description}/usuarios` },
            { label: itemData.name + (userData.admin >= 1 ? `: (${itemData.id})` : ''), to: route.fullPath }
        ]"
    />
    <div class="card">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-12">
                            <label id="secaodadosbasicos">Dados básicos</label>
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="name">Nome</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.name" id="name" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="cpf">CPF/CNPJ</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.cpf" id="cpf" type="text" @input="validateCPF()" v-maska data-maska="['##.###.###/####-##','###.###.###-##']" />
                            <small id="text-error" class="p-error" v-if="errorMessages.cpf">{{ errorMessages.cpf }}</small>
                        </div>
                        <div v-if="!itemData.email && mode == 'new'" class="col-12 md:col-3">
                            <label for="email">E-mail</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email" id="email" type="text" @input="validateEmail()" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email">{{ errorMessages.email }}</small>
                        </div>
                        <div v-else class="col-12 md:col-3">
                            <label for="email">E-mail</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <p class="p-inputtext p-component p-filled"> {{ itemData.email }} </p>
                        </div>                        
                        <div class="col-12 md:col-3">
                            <label for="telefone">Telefone</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.telefone" id="telefone" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.telefone">{{ errorMessages.telefone }}</small>
                        </div>
                        <div class="col-12 md:col-12">
                            <label id="secaopermissao">Permissões</label>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="gestor">Gestor</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Dropdown v-else id="gestor" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.gestor" :options="dropdownSN" placeholder="Selecione..."/>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="multiCliente">MultiCliente</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Dropdown v-else id="multiCliente" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.multiCliente" :options="dropdownSN" placeholder="Selecione..."/>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="cadastros">Gestão de cadastros</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Dropdown v-else id="cadastros" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.cadastros" :options="dropdownAlcadas" placeholder="Selecione..."/>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="pipeline">Gestão de pipeline</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Dropdown v-else id="pipeline" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.pipeline" :options="dropdownAlcadas" placeholder="Selecione..."/>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="pv">Gestão de pós-venda</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Dropdown v-else id="pv" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.pv" :options="dropdownAlcadas" placeholder="Selecione..."/>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="comercial">Gestão comercial</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Dropdown v-else id="comercial" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.comercial" :options="dropdownAlcadas" placeholder="Selecione..."/>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="fiscal">Gestão fiscal</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Dropdown v-else id="fiscal" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.fiscal" :options="dropdownAlcadas" placeholder="Selecione..."/>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="financeiro">Gestão financeira</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Dropdown v-else id="financeiro" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.financeiro" :options="dropdownAlcadas" placeholder="Selecione..."/>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="comissoes">Gestão de comissões</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Dropdown v-else id="comissoes" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.comissoes" :options="dropdownAlcadas" placeholder="Selecione..."/>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="agente_v">Agente vendedor</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Dropdown v-else id="agente_v" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.agente_v" :options="dropdownSN" placeholder="Selecione..."/>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="agente_arq">Agente arquiteto</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Dropdown v-else id="agente_arq" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.agente_arq" :options="dropdownSN" placeholder="Selecione..."/>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="agente_at">Agente de atendimento</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Dropdown v-else id="agente_at" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.agente_at" :options="dropdownSN" placeholder="Selecione..."/>
                        </div>
                        <!-- Botão trocar senha -->
                        <div id="divTS" class="col-12 md:col-2 m-0 font-normal">
                            <Button id="btnTS" class="shadow-none text-left font-normal	custom-font-weight" @click="changePassword" label="Trocar Senha" icon="fa-solid fa-external-link" raised :disabled="mode === 'view'" />
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
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="fa-solid fa-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
<style scoped>
.grid {
    margin-left: 0rem;
}
#secaodadosbasicos,
#secaopermissao {
    margin-left: -1rem;
    color: gray;
}
#btnTS{
    border-color: #ced4da;
    color: #495057;
    background-color: rgba(240, 248, 255, 0);
}
#btnTS .p-button-label{
    font-weight: 400 !important;
}
#btnTS:hover{
    border-color: #6366F1;
    background-color: #e9eef1;
}
</style>
