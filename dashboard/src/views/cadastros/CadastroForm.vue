<script setup>
import { onBeforeMount, onMounted, ref, watch, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { isValidEmail } from '@/global';
import moment from 'moment';

import { Mask } from 'maska';
const masks = ref({
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    }),
    aniversario: new Mask({
        mask: '##/##/####'
    }),
    telefone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    })
});

import { useRoute } from 'vue-router';
const route = useRoute();

import { useRouter } from 'vue-router';
const router = useRouter();

// Cookies de usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();

// Validar o cpf_cnpj
import { cpf, cnpj } from 'cpf-cnpj-validator';

// Campos de formulário
const itemData = ref({});
const labels = ref({
    pfpj: 'pf',
    nome: 'Nome',
    aniversario: 'Nascimento',
    cpf_cnpj: 'CPF',
    rg_ie: 'RG'
});
// Modelo de dados usado para comparação
const itemDataComparision = ref({});
// Modo do formulário
const mode = ref('view');
// Aceite do formulário
const accept = ref(false);
// Mensages de erro
const errorMessages = ref({});
// Dropdowns
const dropdownSexo = ref([]);
const dropdownPaisNascim = ref([]);
const dropdownTipo = ref([]);
const dropdownAtuacao = ref([]);
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
const urlBase = ref(`${baseApiUrl}/cadastros`);
// Carragamento de dados do form
const loadData = async () => {
    if (route.params.id || itemData.value.id) {
        if (route.params.id) itemData.value.id = route.params.id;
        const url = `${urlBase.value}/${itemData.value.id}`;
        await axios.get(url).then((res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);
                body.prospect = isTrue(body.prospect);

                itemData.value = body;
                if (itemData.value.cpf_cnpj) itemData.value.cpf_cnpj = masks.value.cpf_cnpj.masked(itemData.value.cpf_cnpj);
                if (itemData.value.aniversario) itemData.value.aniversario = masks.value.aniversario.masked(moment(itemData.value.aniversario).format('DD/MM/YYYY'));
                if (itemData.value.telefone) itemData.value.telefone = masks.value.telefone.masked(itemData.value.telefone);
                itemDataComparision.value = { ...itemData.value };

                loading.value.form = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/cadastros` });
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

        if (itemData.value.cpf_cnpj) itemData.value.cpf_cnpj = masks.value.cpf_cnpj.unmasked(itemData.value.cpf_cnpj);
        if (itemData.value.aniversario) itemData.value.aniversario = moment(itemData.value.aniversario, 'DD/MM/YYYY').format('YYYY-MM-DD');
        if (itemData.value.telefone) itemData.value.telefone = masks.value.telefone.unmasked(itemData.value.telefone);
        axios[method](url, itemData.value)
            .then((res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    if (itemData.value.aniversario) itemData.value.aniversario = moment(itemData.value.aniversario).format('DD/MM/YYYY');
                    itemDataComparision.value = { ...itemData.value };
                    emit('changed');
                    // if (mode.value != 'new') reload();
                    // else router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/cadastro/${itemData.value.id}` });
                    if (mode.value == 'new') router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/cadastro/${itemData.value.id}` });
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
// Converte 1 ou 0 para boolean
const isTrue = (value) => value === 1;
// Verifica se houve alteração nos dados do formulário
const isItemDataChanged = () => {
    const ret = JSON.stringify(itemData.value) !== JSON.stringify(itemDataComparision.value);
    if (!ret) {
        accept.value = false;
        errorMessages.value = {};
    }
    return ret;
};
// Validar CPF
const validateCPF = () => {
    if (cpf.isValid(itemData.value.cpf_cnpj) || cnpj.isValid(itemData.value.cpf_cnpj)) errorMessages.value.cpf_cnpj = null;
    else errorMessages.value.cpf_cnpj = 'CPF/CNPJ informado é inválido';
    return !errorMessages.value.cpf_cnpj;
};
// Validar data de nascimento
const validateDtNascto = () => {
    errorMessages.value.aniversario = null;
    // Testa o formato da data
    if (itemData.value.aniversario && itemData.value.aniversario.length > 0 && !masks.value.aniversario.completed(itemData.value.aniversario)) errorMessages.value.aniversario = 'Formato de data inválido';
    if (!(moment(itemData.value.aniversario, 'DD/MM/YYYY').isValid() || moment(itemData.value.aniversario).isValid())) errorMessages.value.aniversario = 'Data inválida';
    return !errorMessages.value.aniversario;
};
// Validar email
const validateEmail = () => {
    if (itemData.value.email && !isValidEmail(itemData.value.email)) {
        errorMessages.value.email = 'Formato de email inválido';
    } else errorMessages.value.email = null;
    return !errorMessages.value.email;
};
// Validar telefone
const validateTelefone = () => {
    if (itemData.value.telefone && itemData.value.telefone.length > 0 && ![10, 11].includes(itemData.value.telefone.replace(/([^\d])+/gim, '').length)) {
        errorMessages.value.telefone = 'Formato de telefone inválido';
    } else errorMessages.value.telefone = null;
    return !errorMessages.value.telefone;
};
// Validar formulário
const formIsValid = () => {
    return validateDtNascto() && validateCPF() && validateEmail() && validateTelefone();
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
    accept.value = false;
    errorMessages.value = {};
    loadData();
    emit('cancel');
};
// Obter parâmetros do BD
const optionParams = async (query) => {
    itemData.value.id = route.params.id;
    const selects = query.select ? `&slct=${query.select}` : undefined;
    const url = `${baseApiUrl}/params/f-a/gbf?fld=${query.field}&vl=${query.value}${selects}`;
    return await axios.get(url);
};
// Obter parâmetros do BD
const optionLocalParams = async (query) => {
    itemData.value.id = route.params.id;
    const selects = query.select ? `&slct=${query.select}` : undefined;
    const url = `${baseApiUrl}/local-params/f-a/gbf?fld=${query.field}&vl=${query.value}${selects}`;
    return await axios.get(url);
};
// Carregar opções do formulário
const loadOptions = async () => {
    // Sexo
    await optionParams({ field: 'meta', value: 'sexo', select: 'id,label' }).then((res) => {
        res.data.data.map((item) => {
            dropdownSexo.value.push({ value: item.id, label: item.label });
        });
    });
    // Pais nascimento
    await optionParams({ field: 'meta', value: 'pais', select: 'id,label' }).then((res) => {
        res.data.data.map((item) => {
            dropdownPaisNascim.value.push({ value: item.id, label: item.label });
        });
    });
    // Tipo Cadastro
    await optionLocalParams({ field: 'grupo', value: 'tipo_cadastro', select: 'id,label' }).then((res) => {
        res.data.data.map((item) => {
            dropdownTipo.value.push({ value: item.id, label: item.label });
        });
    });
    // Área Atuação
    await optionLocalParams({ field: 'grupo', value: 'id_atuacao', select: 'id,label' }).then((res) => {
        res.data.data.map((item) => {
            dropdownAtuacao.value.push({ value: item.id, label: item.label });
        });
    });
};
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
    loadOptions();
});
onMounted(() => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
});
// Observar alterações nos dados do formulário
watchEffect(() => {
    isItemDataChanged();
    validateCPF();
    if (itemData.value.cpf_cnpj && itemData.value.cpf_cnpj.replace(/([^\d])+/gim, '').length == 14) {
        labels.value.pfpj = 'pj';
        labels.value.nome = 'Razão Social';
        labels.value.aniversario = 'Fundação';
        labels.value.rg_ie = 'I.E.';
        labels.value.cpf_cnpj = 'CNPJ';
    } else {
        labels.value.pfpj = 'pf';
        labels.value.nome = 'Nome';
        labels.value.aniversario = 'Nascimento';
        labels.value.rg_ie = 'RG';
        labels.value.cpf_cnpj = 'CPF';
    }
});
</script>

<template>
    <div class="grid">
        <form @submit.prevent="saveData">
            <div class="col-12">
                <div class="p-fluid formgrid grid">
                    <div class="field col-12 md:col-2">
                        <label for="id_params_tipo">Tipo de Registro</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <Dropdown v-else id="id_params_tipo" optionLabel="label" optionValue="value" :disabled="mode == 'view'" v-model="itemData.id_params_tipo" :options="dropdownTipo" placeholder="Selecione..."> </Dropdown>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="cpf_cnpj">{{ labels.cpf_cnpj }}</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.cpf_cnpj" id="cpf_cnpj" type="text" @input="validateCPF()" v-maska data-maska="['##.###.###/####-##','###.###.###-##']" />
                        <small id="text-error" class="p-error" if>{{ errorMessages.cpf_cnpj || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-6">
                        <label for="nome">{{ labels.nome }}</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="!validateCPF() || mode == 'view'" v-model="itemData.nome" id="nome" type="text" />
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="rg_ie">{{ labels.rg_ie }}</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.rg_ie" id="rg_ie" type="text" />
                    </div>
                    <div class="field col-12 md:col-2" v-if="labels.pfpj == 'pf'">
                        <label for="id_params_sexo">Sexo</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <Dropdown v-else id="id_params_sexo" optionLabel="label" optionValue="value" :disabled="mode == 'view'" v-model="itemData.id_params_sexo" :options="dropdownSexo" placeholder="Selecione..."></Dropdown>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="aniversario">{{ labels.aniversario }}</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="##/##/####" v-model="itemData.aniversario" id="aniversario" type="text" @input="validateDtNascto()" />
                        <small id="text-error" class="p-error" if>{{ errorMessages.aniversario || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-3">
                        <label for="id_params_p_nascto">País de Origem</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <Dropdown v-else id="id_params_p_nascto" optionLabel="label" optionValue="value" :disabled="mode == 'view'" v-model="itemData.id_params_p_nascto" :options="dropdownPaisNascim" placeholder="Selecione..."> </Dropdown>
                    </div>
                    <div class="field col-12 md:col-5">
                        <label for="id_params_atuacao">Área de Atuação</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <Dropdown v-else id="id_params_atuacao" optionLabel="label" optionValue="value" :disabled="mode == 'view'" v-model="itemData.id_params_atuacao" :options="dropdownAtuacao" placeholder="Selecione..."> </Dropdown>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="telefone">Telefone</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.telefone" id="telefone" type="text" @input="validateTelefone()" />
                        <small id="text-error" class="p-error" if>{{ errorMessages.telefone || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-3">
                        <label for="email">E-mail</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email" id="email" type="text" @input="validateEmail()" />
                        <small id="text-error" class="p-error" if>{{ errorMessages.email || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="prospect">Prospecto</label>
                        <br />
                        <Skeleton v-if="loading.form" borderRadius="16px" height="2rem"></Skeleton>
                        <InputSwitch v-else id="prospect" :disabled="mode == 'view'" v-model="itemData.prospect" />
                    </div>
                </div>
                <div class="card flex justify-content-center flex-wrap gap-3">
                    <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-beat" text raised @click="mode = 'edit'" />
                    <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!isItemDataChanged() || !formIsValid()" />
                    <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                </div>
            </div>
        </form>
    </div>
</template>
