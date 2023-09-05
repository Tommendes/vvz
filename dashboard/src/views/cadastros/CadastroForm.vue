<script setup>
import { onBeforeMount, onMounted, ref, watch, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { UFS, isValidEmail, validarDataPTBR } from '@/global';
import moment from 'moment';

import { Mask, MaskInput } from 'maska';
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
    rg_ie: 'RG',
});
// Modelo de dados usado para comparação
const itemDataComparision = ref({});
// Campos de formulário mascarados
const itemDataMasked = ref({});
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
    accepted: null,
    email: null,
    telefone: null
});
// Props do template
const props = defineProps({
    mode: String
})
// Emit do template
const emit = defineEmits(['changed'])
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
                itemDataComparision.value = { ...body };
                if (itemData.value.cpf_cnpj) itemDataMasked.value.cpf_cnpj = masks.value.cpf_cnpj.masked(itemData.value.cpf_cnpj);
                if (itemData.value.aniversario) itemDataMasked.value.aniversario = masks.value.aniversario.masked(moment(itemData.value.aniversario).format('DD/MM/YYYY'));
                if (itemData.value.telefone) itemDataMasked.value.telefone = masks.value.telefone.masked(itemData.value.telefone);

                loading.value.form = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/cadastros` });
            }
        });
    }
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
                    emit('changed');
                    if (mode.value != 'new') reload();
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
// Verifica se o inputSwitch de edições do formulário foi aceito
const formAccepted = () => {
    if (isItemDataChanged() && !accept.value) errorMessages.value.accepted = 'Você deve concordar para prosseguir';
    else errorMessages.value.accepted = null;
    return !errorMessages.value.accepted;
};
// Validar CPF
const validateCPF = () => {
    if (cpf.isValid(itemDataMasked.value.cpf_cnpj) || cnpj.isValid(itemDataMasked.value.cpf_cnpj)) errorMessages.value.cpf_cnpj = null;
    else errorMessages.value.cpf_cnpj = 'CPF/CNPJ informado é inválido';
    return !errorMessages.value.cpf_cnpj;
};
// Validar data de nascimento
const validateDtNascto = () => {
    if (itemDataMasked.value.aniversario && itemDataMasked.value.aniversario.length > 0 && !(masks.value.aniversario.completed(itemDataMasked.value.aniversario) && moment(itemDataMasked.value.aniversario, 'DD/MM/YYYY').isValid())) {
        errorMessages.value.aniversario = 'Formato de data inválido';
    } else errorMessages.value.aniversario = null;
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
    if (itemDataMasked.value.telefone && itemDataMasked.value.telefone.length > 0 && ![10, 11].includes(itemDataMasked.value.telefone.replace(/([^\d])+/gim, "").length)) {
        errorMessages.value.telefone = 'Formato de telefone inválido';
    } else errorMessages.value.telefone = null;
    return !errorMessages.value.telefone;
};
// Validar formulário
const formIsValid = () => {
    return formAccepted() && validateDtNascto() && validateCPF(), validateEmail(), validateTelefone();
};
// Setar campos não mascarados
const setUnMasked = (field) => {
    switch (field) {
        case 'cpf_cnpj':
            if (validateCPF()) itemData.value.cpf_cnpj = masks.value.cpf_cnpj.unmasked(itemDataMasked.value.cpf_cnpj);
            else {
                itemData.value.cpf_cnpj = itemDataComparision.value.cpf_cnpj;
                itemDataMasked.value.cpf_cnpj = masks.value.cpf_cnpj.masked(itemDataComparision.value.cpf_cnpj);
            }
            break;
        case 'aniversario':
            if (validateDtNascto()) itemData.value.aniversario = moment(itemDataMasked.value.aniversario, 'DD/MM/YYYY').format('YYYY-MM-DD');
            else {
                itemData.value.aniversario = itemDataComparision.value.aniversario;
                itemDataMasked.value.aniversario = moment(itemDataComparision.value.aniversario).format('DD/MM/YYYY');
            }
            break;
        case 'telefone':
            if (validateTelefone()) itemData.value.telefone = itemDataMasked.value.telefone.replace(/([^\d])+/gim, "");
            else {
                itemData.value.telefone = itemDataComparision.value.telefone;
                itemDataMasked.value.telefone = masks.value.telefone.masked(itemDataComparision.value.telefone);
            }
            break;
        default:
            true;
            break;
    }
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
    accept.value = false;
    itemDataMasked.value = {};
    errorMessages.value = {};
    loadData();
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
})
// Observar alterações nos dados do formulário
watchEffect(() => {
    isItemDataChanged();
    validateCPF();
    if (itemData.value.cpf_cnpj && itemData.value.cpf_cnpj.replace(/([^\d])+/gim, "").length == 14) {
        labels.value.pfpj = 'pj';
        labels.value.nome = 'Razão Social';
        labels.value.aniversario = 'Fundação';
        labels.value.rg_ie = 'I.E.';
        labels.value.cpf_cnpj = 'CNPJ';
    }
    else {
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
        <form @submit="saveData">
            <div class="col-12">
                <div class="p-fluid formgrid grid">
                    <div class="field col-12 md:col-2">
                        <label for="id_params_tipo">Tipo de Registro</label>
                        <Dropdown id="id_params_tipo" optionLabel="label" optionValue="value" :disabled="mode == 'view'"
                            v-model="itemData.id_params_tipo" :options="dropdownTipo" placeholder="Selecione...">
                        </Dropdown>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="cpf_cnpj">{{ labels.cpf_cnpj }}</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemDataMasked.cpf_cnpj"
                            id="cpf_cnpj" type="text" @input="validateCPF()" @blur="setUnMasked('cpf_cnpj')" v-maska
                            data-maska="['##.###.###/####-##','###.###.###-##']" />
                        <small id="text-error" class="p-error">{{ errorMessages.cpf_cnpj || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-6">
                        <label for="nome">{{ labels.nome }}</label>
                        <InputText autocomplete="no" :disabled="!validateCPF() || mode == 'view'" v-model="itemData.nome"
                            id="nome" type="text" />
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="rg_ie">{{ labels.rg_ie }}</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.rg_ie" id="rg_ie"
                            type="text" />
                    </div>
                    <div class="field col-12 md:col-2" v-if="labels.pfpj == 'pf'">
                        <label for="id_params_sexo">Sexo</label>
                        <Dropdown id="id_params_sexo" optionLabel="label" optionValue="value" :disabled="mode == 'view'"
                            v-model="itemData.id_params_sexo" :options="dropdownSexo" placeholder="Selecione..."></Dropdown>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="aniversario">{{ labels.aniversario }}</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="##/##/####"
                            v-model="itemDataMasked.aniversario" id="aniversario" type="text" @input="validateDtNascto()"
                            @blur="setUnMasked('aniversario')" />
                        <small id="text-error" class="p-error">{{ errorMessages.aniversario || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-3">
                        <label for="id_params_p_nascto">País de Origem</label>
                        <Dropdown id="id_params_p_nascto" optionLabel="label" optionValue="value" :disabled="mode == 'view'"
                            v-model="itemData.id_params_p_nascto" :options="dropdownPaisNascim" placeholder="Selecione...">
                        </Dropdown>
                    </div>
                    <div class="field col-12 md:col-5">
                        <label for="id_params_atuacao">Área de Atuação</label>
                        <Dropdown id="id_params_atuacao" optionLabel="label" optionValue="value" :disabled="mode == 'view'"
                            v-model="itemData.id_params_atuacao" :options="dropdownAtuacao" placeholder="Selecione...">
                        </Dropdown>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="telefone">Telefone</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-maska
                            data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemDataMasked.telefone"
                            id="telefone" type="text" @input="validateTelefone()" @blur="setUnMasked('telefone')" />
                        <small id="text-error" class="p-error">{{ errorMessages.telefone || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-3">
                        <label for="email">E-mail</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email" id="email"
                            type="text" @input="validateEmail()" />
                        <small id="text-error" class="p-error">{{ errorMessages.email || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="prospect">Prospecto</label>
                        <br>
                        <InputSwitch id="prospect" :disabled="mode == 'view'" v-model="itemData.prospect" />
                    </div>
                    <div class="field col-12 md:col-12">
                        <label for="observacao">Observação</label>
                        <Editor :readonly="mode == 'view'" id="observacao" v-model="itemData.observacao"
                            editorStyle="height: 160px" />
                    </div>
                </div>
                <div class="card flex justify-content-center flex-wrap gap-3">
                    <div v-if="mode != 'view' && isItemDataChanged()">Desejo registrar os dados inseridos.<br />Os dados
                        serão transferidos para o eSocial ao salvar</div>
                    <InputSwitch v-model="accept" @input="formAccepted" v-if="mode != 'view' && isItemDataChanged()"
                        :class="{ 'p-invalid': errorMessages.accepted }" aria-describedby="text-error" />
                    <small id="text-error" class="p-error">{{ errorMessages.accepted || '&nbsp;' }}</small>
                    <Button type="button" v-if="mode == 'view'" label="Editar" icon="pi pi-pencil" text raised
                        @click="mode = 'edit'" />
                    <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text
                        raised :disabled="!isItemDataChanged() || !formIsValid()" />
                    <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text
                        raised @click="reload" />
                </div>
            </div>
        </form>
    </div>
</template>
