<script setup>
import { onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn, defaultError } from '@/toast';
import { isValidEmail } from '@/global';

import { guide } from '@/guides/userFormGuide.js';

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

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile()
    if (uProf.value.admin >= 1) dropdownMulticliente.value.push({ value: '2', label: 'Multi Cliente e Multi Schema' });
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
const urlBase = ref(`${baseApiUrl}/users`);

// Carragamento de dados do form
const loadData = async () => {
    if (route.params.id) {
        loading.value = true;
        const url = `${urlBase.value}/${route.params.id}`;
        await axios.get(url).then((res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);

                itemData.value = body;
                if (itemData.value.cpf) itemData.value.cpf = masks.value.cpf_cnpj.masked(itemData.value.cpf);
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${uProf.value.schema_description}/usuarios` });
            }
            loading.value = false;
        })
            .catch((error) => {
                defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
                if (error.response && error.response.status == 401) router.push('/');
                loading.value = false;
            });
    } else {
        itemData.value = {
            "name": undefined,
            "cpf": undefined, "email": undefined, "telefone": undefined, "id_empresa": uProf.value.id_empresa,
            "gestor": "0", "multiCliente": "1", "cadastros": "1", "pipeline": "1",
            "pipeline_params": "0", "pv": "1", "at": "1", "comercial": "1",
            "prospeccoes": "1", "fiscal": "1", "financeiro": "1", "protocolo": "1",
            "comissoes": "0", "agente_arq": "0", "agente_at": "0", "status": "10", "agente_v": "0"
        };
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
    const obj = { ...itemData.value };
    if (obj.cpf) obj.cpf = masks.value.cpf_cnpj.unmasked(obj.cpf);
    axios[method](url, obj)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                itemData.value = { ...itemData.value, ...body };
                if (mode.value == 'new') router.push({ path: `/${uProf.value.schema_description}/usuario/${itemData.value.id}` });
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
// Consultar a lista de empresas do usuário
const getEmpresas = async () => {
    const url = `${baseApiUrl}/empresas/f-a/glf?fld=1&vl=1&literal=1&slct=id,razaosocial,cpf_cnpj_empresa`;
    await axios.get(url).then((res) => {
        const body = res.data.data;
        console.log(body);

        body.forEach(element => {
            dropdownEmpresas.value.push({ value: String(element.id), label: `${element.razaosocial} - ${masks.value.cpf_cnpj.masked(element.cpf_cnpj_empresa)}` });
        });
    });
};
//DropDowns
const STATUS_INACTIVE = '0'; // Perfil inativo
const STATUS_WAITING = '1'; // Perfil aguardando o token de liberação
const STATUS_SUSPENDED_BY_TKN = '8'; // Perfil suspenso por envio de token
const STATUS_SUSPENDED = '9'; // Perfil suspenso
const STATUS_ACTIVE = '10'; // Usuário ok
const STATUS_PASS_EXPIRED = '19'; // Senha expirada por tempo de criação
const STATUS_DELETE = '99'; // Usuário excluído
const dropdownEmpresas = ref([]);
const dropdownStatus = ref([
    { value: STATUS_INACTIVE, label: 'Inativo' },
    { value: STATUS_WAITING, label: 'Aguardando' },
    { value: STATUS_SUSPENDED_BY_TKN, label: 'Suspenso por token' },
    { value: STATUS_SUSPENDED, label: 'Suspenso' },
    { value: STATUS_ACTIVE, label: 'Ativo' },
    { value: STATUS_PASS_EXPIRED, label: 'Senha expirada' },
    { value: STATUS_DELETE, label: 'Excluído' }
]);

const dropdownAgentesV = ref([{ value: '0', label: 'Não' }]);
const getAgentesV = async () => {
    const url = `${baseApiUrl}/comis-agentes/f-a/gag?agente_representante=2`;
    await axios.get(url).then((res) => {
        const body = res.data;
        body.forEach(element => {
            dropdownAgentesV.value.push({ value: String(element.id), label: `${element.nome || element.apelido}(${element.ordem})` });
        });
    });
};
const dropdownSN = ref([
    { value: '0', label: 'Não' },
    { value: '1', label: 'Sim' }
]);
const dropdownMulticliente = ref([
    { value: '0', label: 'Não' },
    { value: '1', label: 'Sim' },
]);
const dropdownAlcadas = ref([
    { value: '0', label: 'Negado' },
    { value: '1', label: 'Pesquisa' },
    { value: '2', label: 'Inclusão' },
    { value: '3', label: 'Edição' },
    { value: '4', label: 'Administração/Exclusão' }
]);
// Troca de senha
const changePassword = async () => {
    const urlRequestRequestPassReset = `${baseApiUrl}/request-password-reset/`;

    try {
        const response = await axios.post(urlRequestRequestPassReset, { cpf: itemData.value.cpf });
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
    router.push({ path: `/${uProf.value.schema_description}/password-reset`, query: { q: passwordResetId } });
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
// validar nome obrigatório
const validateNome = () => {
    errorMessages.value.name = null;
    if (!itemData.value.name || itemData.value.name.trim().length == 0) {
        errorMessages.value.name = 'Nome é obrigatório';
        return false;
    }
    return true;
};
// Validar telefone
const validateTelefone = () => {
    errorMessages.value.telefone = null;
    if (!itemData.value.telefone || itemData.value.telefone.trim().length == 0) {
        errorMessages.value.telefone = 'Telefone não informado';
        return false;
    }
    if (itemData.value.telefone && itemData.value.telefone.trim().length > 0 && ![10, 11].includes(masks.value.telefone.unmasked(itemData.value.telefone).length)) {
        errorMessages.value.telefone = 'Formato de telefone inválido';
        return false;
    }
    return true;
};
// Validar email
const validateEmail = () => {
    errorMessages.value.email = null;
    if (!itemData.value.email || itemData.value.email.trim().length == 0) {
        errorMessages.value.email = 'E-mail não informado';
        return false;
    }
    if (itemData.value.email && itemData.value.email.trim().length > 0 && !isValidEmail(itemData.value.email)) {
        errorMessages.value.email = 'Formato de email inválido';
        return false;
    }
    return true;
};
// Validar formulário
const formIsValid = () => {
    return validateNome() && validateCPF() && validateEmail() && validateTelefone();
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
    errorMessages.value = {};
    loadData();
    emit('cancel');
};
// Carregar dados do formulário
onBeforeMount(() => { });
onMounted(async () => {
    getAgentesV();
    getEmpresas();
    loadData();
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
    else {
        if (itemData.value.id) mode.value = 'view';
        else mode.value = 'new';
    }
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[
        { label: 'Usuários', to: `/${uProf.schema_description}/usuarios` },
        { label: itemData.name + (uProf.admin >= 1 ? `: (${itemData.id})` : ''), to: route.fullPath }
    ]" />
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
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.name"
                                id="name" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.name">{{ errorMessages.name
                                }}</small>
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="cpf">CPF/CNPJ</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else-if="uProf.admin || uProf.gestor" autocomplete="no"
                                :disabled="mode == 'view'" v-model="itemData.cpf" id="cpf" type="text"
                                @input="validateCPF()" v-maska data-maska="['##.###.###/####-##','###.###.###-##']" />
                            <p v-else class="p-inputtext p-component p-filled p-variant-filled"
                                style="line-height: inherit">{{
                                    itemData.cpf }}</p>
                            <small id="text-error" class="p-error" v-if="errorMessages.cpf">{{ errorMessages.cpf
                                }}</small>
                        </div>
                        <div v-if="!itemData.id && mode == 'new'" class="col-12 md:col-3">
                            <label for="email">E-mail</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email"
                                id="email" type="text" @input="validateEmail()" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email">{{ errorMessages.email
                                }}</small>
                        </div>
                        <div v-else class="col-12 md:col-3">
                            <label for="email">E-mail</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <p v-else class="p-inputtext p-component p-filled p-variant-filled"
                                style="line-height: inherit">{{ itemData.email }}</p>
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="telefone">Telefone</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska
                                data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.telefone"
                                id="telefone" type="text" @input="validateTelefone()" />
                            <small id="text-error" class="p-error" v-if="errorMessages.telefone">{{
                                errorMessages.telefone }}</small>
                        </div>
                        <div class="grid" v-if="uProf.admin + uProf.gestor >= 1">
                            <div class="col-12 md:col-12">
                                <label id="secaopermissao">Permissões de gestão / Alçadas</label>
                            </div>
                            <div class="col-12 md:col-2">
                                <label for="gestor">Gestor</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="gestor" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.gestor" :options="dropdownSN"
                                    placeholder="Selecione..." />
                            </div>
                            <div class="col-12 md:col-2">
                                <label for="cadastros">Cadastros</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="cadastros" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.cadastros" :options="dropdownAlcadas"
                                    placeholder="Selecione..." />
                            </div>
                            <div class="col-12 md:col-2">
                                <label for="pipeline">Pipeline</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="pipeline" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.pipeline" :options="dropdownAlcadas"
                                    placeholder="Selecione..." />
                            </div>
                            <div class="col-12 md:col-2">
                                <label for="pipeline_params">Parâmetros do pipeline</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="pipeline_params" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.pipeline_params" :options="dropdownAlcadas"
                                    placeholder="Selecione..." />
                            </div>
                            <div class="col-12 md:col-2">
                                <label for="pv">Pós-venda</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="pv" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.pv" :options="dropdownAlcadas"
                                    placeholder="Selecione..." />
                            </div>
                            <div class="col-12 md:col-2">
                                <label for="at">Assistência técnica</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="at" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.at" :options="dropdownAlcadas"
                                    placeholder="Selecione..." />
                            </div>
                            <div class="col-12 md:col-2">
                                <label for="comercial">Comercial</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="comercial" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.comercial" :options="dropdownAlcadas"
                                    placeholder="Selecione..." />
                            </div>
                            <div class="col-12 md:col-2">
                                <label for="prospeccoes">Prospecções</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="prospeccoes" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.prospeccoes" :options="dropdownAlcadas"
                                    placeholder="Selecione..." />
                            </div>
                            <div class="col-12 md:col-2">
                                <label for="fiscal">Fiscal</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="fiscal" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.fiscal" :options="dropdownAlcadas"
                                    placeholder="Selecione..." />
                            </div>
                            <div class="col-12 md:col-2">
                                <label for="financeiro">Financeira</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="financeiro" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.financeiro" :options="dropdownAlcadas"
                                    placeholder="Selecione..." />
                            </div>
                            <div class="col-12 md:col-2">
                                <label for="protocolo">Protocolo</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="protocolo" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.protocolo" :options="dropdownAlcadas"
                                    placeholder="Selecione..." />
                            </div>
                            <div class="col-12 md:col-2">
                                <label for="comissoes">Comissões</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="comissoes" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.comissoes" :options="dropdownAlcadas"
                                    placeholder="Selecione..." />
                            </div>
                            <div class="col-12 md:col-6">
                                <label for="agente_v">Usuário vendedor (Agente de vendas)</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="agente_v" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.agente_v" :options="dropdownAgentesV"
                                    placeholder="Selecione..." />
                            </div>
                            <div class="col-12 md:col-2">
                                <label for="agente_arq">Usuário arquiteto</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="agente_arq" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.agente_arq" :options="dropdownSN"
                                    placeholder="Selecione..." />
                            </div>
                            <div class="col-12 md:col-2">
                                <label for="agente_at">Usuário de AT</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="agente_at" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.agente_at" :options="dropdownSN"
                                    placeholder="Selecione..." />
                            </div>
                            <div class="col-12 md:col-2">
                                <label for="status">Status</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="status" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.status" :options="dropdownStatus"
                                    placeholder="Selecione..." />
                            </div>
                            <!-- <div class="col-12 md:col-2">
                                <label for="schema_description">Domínio de dados do usuário</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <p v-else class="p-inputtext p-component p-filled" style="line-height: inherit">{{ itemData.schema_description }}</p>
                            </div> -->
                            <div class="col-12 md:col-12" v-if="dropdownEmpresas.length > 1">
                                <label id="secaopermissaofinanceiro">Relacionado às consultas ao Financeiro e Fiscal</label>
                            </div>
                            <div class="col-12 md:col-4" v-if="dropdownEmpresas.length > 1">
                                <label for="multiCliente">Multi Cliente</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="multiCliente" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.multiCliente" :options="dropdownMulticliente"
                                    placeholder="Selecione..." />
                            </div>
                            <div class="col-12 md:col-8"
                                v-if="dropdownEmpresas.length > 1 && Number(itemData.multiCliente)">
                                <label for="id_empresa">Empresa Atual do usuário</label>
                                <Skeleton v-if="loading" height="2rem"></Skeleton>
                                <Dropdown v-else id="id_empresa" :disabled="mode == 'view'" optionLabel="label"
                                    optionValue="value" v-model="itemData.id_empresa" :options="dropdownEmpresas"
                                    placeholder="Selecione..." />
                            </div>
                        </div>
                        <!-- Botão trocar senha -->
                        <div v-if="itemData.id" id="divTS" class="col-12 md:col-2 m-0 font-normal">
                            <Button id="btnTS" class="shadow-none text-left font-normal custom-font-weight"
                                @click="changePassword" label="Trocar Senha" icon="fa-solid fa-external-link" raised
                                :disabled="mode === 'view'" />
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar"
                            icon="fa-regular fa-pen-to-square fa-beat" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk"
                            severity="success" text raised />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="fa-solid fa-ban"
                            severity="danger" text raised @click="reload" />
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
            </div>
        </form>
        <div class="col-12" v-if="uProf.admin >= 2">
            <div class="card bg-green-200 mt-3">
                <p>Mode: {{ mode }}</p>
                <p>itemData: {{ itemData }}</p>
                <p>empresas: {{ dropdownEmpresas }}</p>
            </div>
        </div>
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

#btnTS {
    color: #495057;
    background-color: rgba(240, 248, 255, 0);
    height: 3.4rem;
    border: 1px solid grey;
}

#btnTS:hover {
    border-color: black;
    background-color: #e9eef1;
}
</style>
