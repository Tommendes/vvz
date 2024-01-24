<script setup>
import { onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { isValidEmail, capitalizeFirst } from '@/global';
import moment from 'moment';
import { guide } from '@/guides/cadastroFormGuide.js';

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
    }),
    cep: new Mask({
        mask: '##.###-###'
    }),
    rg: new Mask({
        mask: '##.###.###-#'
    }),
    ie: new Mask({
        mask: '##.###.###-###'
    })
});

import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();

// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

// Validar o cpf_cnpj
import { cpf, cnpj } from 'cpf-cnpj-validator';

// Campos de formulário
const itemData = ref({
    id_params_p_nascto: 4
});
const dadosPublicos = ref({});
const labels = ref({
    pfpj: 'pf',
    nome: 'Nome',
    aniversario: 'Nascimento',
    rg_ie: 'RG'
});
// Modo do formulário
const mode = ref('view');
const searched = ref(false);
// Mensages de erro
const errorMessages = ref({});
// Dropdowns
const dropdownSexo = ref([]);
const dropdownPaisNascim = ref([]);
const dropdownTipo = ref([]);
const dropdownTipoEndereco = ref([]);
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
    loading.value.form = true;
    setTimeout(async () => {
        if (route.params.id || itemData.value.id) {
            if (route.params.id) itemData.value.id = route.params.id;
            const url = `${urlBase.value}/${itemData.value.id}`;
            await axios.get(url).then((res) => {
                const body = res.data;
                if (body && body.id) {
                    body.id = String(body.id);
                    body.prospecto = isTrue(body.prospecto);

                    itemData.value = body;
                    if (itemData.value.cpf_cnpj) itemData.value.cpf_cnpj = masks.value.cpf_cnpj.masked(itemData.value.cpf_cnpj);
                    if (itemData.value.aniversario) itemData.value.aniversario = masks.value.aniversario.masked(moment(itemData.value.aniversario).format('DD/MM/YYYY'));
                    if (itemData.value.telefone) itemData.value.telefone = masks.value.telefone.masked(itemData.value.telefone);
                    loading.value.form = false;
                } else {
                    defaultWarn('Registro não localizado');
                    router.push({ path: `/${userData.schema_description}/cadastros` });
                }
            });
        } else loading.value.form = false;
    }, Math.random() * 1000);
};
// Salvar dados do formulário
const saveData = async () => {
    if (!formIsValid()) {
        defaultWarn('Verifique os campos obrigatórios');
        return;
    }
    loading.value.form = true;
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    const obj = { ...itemData.value };

    if (obj.cpf_cnpj) obj.cpf_cnpj = masks.value.cpf_cnpj.unmasked(obj.cpf_cnpj);
    if (obj.aniversario) obj.aniversario = moment(obj.aniversario, 'DD/MM/YYYY').format('YYYY-MM-DD');
    if (obj.telefone) obj.telefone = masks.value.telefone.unmasked(obj.telefone);
    if (obj.cep) obj.cep = obj.cep.replace(/([^\d])+/gim, '');
    await axios[method](url, obj)
        .then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                itemData.value = body;

                try {
                    await axios.post(`${baseApiUrl}/cad-dados-publicos/${itemData.value.id}`, { dados: formatarDadosParaHTML(dadosPublicos.value) });
                    emit('dadosPublicos', dadosPublicos.value);
                    // searched.value = true;
                    // atualizarDados();
                } catch (error) {
                    console.error('Erro ao salvar dados públicos', error);
                    defaultWarn('Erro ao salvar dados públicos');
                }

                if (itemData.value.aniversario) itemData.value.aniversario = moment(itemData.value.aniversario).format('DD/MM/YYYY');
                emit('changed');
                // if (mode.value != 'new') reload();
                // else router.push({ path: `/${userData.schema_description}/cadastro/${itemData.value.id}` });
                if (mode.value == 'new') router.push({ path: `/${userData.schema_description}/cadastro/${itemData.value.id}` });
                mode.value = 'view';
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((err) => {
            defaultWarn(err.response.data);
        });
    loading.value.form = false;
};
// Converte 1 ou 0 para boolean
const isTrue = (value) => value === 1;
// Preencher campos de endereço com base no CEP

const buscarCEP = async () => {
    if (!validateCep()) return;
    const cep = itemData.value.cep.replace(/[^0-9]/g, '');

    if (cep !== '') {
        try {
            // Limpar os campos enquanto aguarda a resposta
            itemData.value.logradouro = '...';
            itemData.value.bairro = '...';
            itemData.value.cidade = '...';
            itemData.value.uf = '...';
            itemData.value.ibge = '...';

            // Consultar API externa
            const url = `${baseApiUrl}/cad-enderecos/f-a/gvc`;
            const response = await axios.post(url, { cep: cep });

            if (response.data.cep) {
                // Atualizar os campos com os valores da consulta.
                itemData.value.logradouro = response.data.logradouro;
                itemData.value.bairro = response.data.bairro;
                itemData.value.cidade = response.data.localidade;
                itemData.value.uf = response.data.uf;
                itemData.value.ibge = response.data.ibge;
            } else {
                // CEP pesquisado não foi encontrado.
                limparFormularioCEP();
                defaultWarn(response.data);
            }
        } catch (error) {
            console.error('Erro ao buscar informações do CEP', error);
            limparFormularioCEP();
            defaultWarn('Erro ao buscar informações do CEP');
        }
    } else {
        // CEP sem valor, limpar formulário.
        limparFormularioCEP();
    }
};
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
const buscarCNPJ = async () => {
    if (!validateCPF()) return;
    const cnpj = itemData.value.cpf_cnpj.replace(/[^0-9]/g, '');
    if (cnpj.length != 14) return;

    confirm.require({
        group: 'templating',
        header: 'Dados públicos',
        message: 'Gostaria de baixar os dados públicos do CNPJ?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                // Consultar API externa
                const url = `${baseApiUrl}/cad-dados-publicos/f-a/gCnpj`;
                const response = await axios.post(url, { cnpj: cnpj });
                if (response.data.cnpj) {
                    delete response.data.qsa;
                    delete response.data.extra;
                    delete response.data.billing;
                    dadosPublicos.value = response.data;
                    try {
                        // await axios.post(`${baseApiUrl}/cad-dados-publicos/${itemData.value.id}`, { dados: formatarDadosParaHTML(response.data) });
                        emit('dadosPublicos', dadosPublicos.value);
                        searched.value = true;
                        atualizarDados();
                    } catch (error) {
                        console.error('Erro ao salvar dados públicos', error);
                        defaultWarn('Erro ao salvar dados públicos');
                    }
                } else {
                    // CNPJ pesquisado não foi encontrado.
                    defaultWarn(response.data);
                }
            } catch (error) {
                console.error('Erro ao buscar informações do CNPJ', error);
                defaultWarn('Erro ao buscar informações do CNPJ');
            }
        },
        reject: () => {
            return;
        }
    });
};

const animationDocNr = ref('');
const atualizarDados = async () => {
    confirm.require({
        group: 'templating',
        header: 'Dados públicos',
        message: 'Deseja atualizar os valores de acordo com os dados coletados?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: async () => {
            animationDocNr.value = 'animation-color animation-fill-forwards';
            if (dadosPublicos.value.nome) itemData.value.nome = dadosPublicos.value.nome;
            if (dadosPublicos.value.abertura) itemData.value.aniversario = dadosPublicos.value.abertura;
            if (dadosPublicos.value.cep) itemData.value.cep = dadosPublicos.value.cep;
            if (dadosPublicos.value.uf) itemData.value.uf = dadosPublicos.value.uf;
            if (dadosPublicos.value.municipio) itemData.value.cidade = dadosPublicos.value.municipio;
            if (dadosPublicos.value.logradouro) itemData.value.logradouro = dadosPublicos.value.logradouro;
            if (dadosPublicos.value.numero) itemData.value.nr = dadosPublicos.value.numero;
            if (dadosPublicos.value.bairro) itemData.value.bairro = dadosPublicos.value.bairro;
            if (dadosPublicos.value.email) itemData.value.email = dadosPublicos.value.email;
            defaultSuccess('Dados atualizados com sucesso');
            setTimeout(() => {
                animationDocNr.value = '';
            }, 5000);
        },
        reject: () => {
            return;
        }
    });
};
function formatarDadosParaHTML(dados) {
    let htmlString = '<p>';

    for (const key in dados) {
        if (Object.prototype.hasOwnProperty.call(dados, key)) {
            const value = dados[key];

            if (Array.isArray(value)) {
                htmlString += `<strong>${capitalizeFirst(key.replaceAll('_', ' '))}:</strong>`;
                htmlString += '<ul>';
                value.forEach((item) => {
                    htmlString += `<li>${item.text}</li>`;
                });
                htmlString += '</ul>';
            } else {
                htmlString += `<strong>${capitalizeFirst(key.replaceAll('_', ' '))}:</strong> ${value}<br />`;
            }
        }
    }

    htmlString += '</p>';
    return htmlString;
}

const limparFormularioCEP = () => {
    itemData.value.logradouro = '';
    itemData.value.bairro = '';
    itemData.value.cidade = '';
    itemData.value.uf = '';
};
// Validar CPF
const validateCPF = () => {
    const inputValue = itemData.value.cpf_cnpj || '';

    if (inputValue.trim().length > 0) {
        const toValidate = masks.value.cpf_cnpj.unmasked(inputValue);
        if (cpf.isValid(toValidate) || cnpj.isValid(toValidate)) {
            errorMessages.value.cpf_cnpj = null;
        } else {
            errorMessages.value.cpf_cnpj = 'CPF/CNPJ informado é inválido';
        }
    } else {
        errorMessages.value.cpf_cnpj = 'CPF/CNPJ não pode estar vazio';
    }

    return !errorMessages.value.cpf_cnpj;
};
// Validar email
const validateEmail = () => {
    errorMessages.value.email = null;
    if (itemData.value.email && !isValidEmail(itemData.value.email)) {
        errorMessages.value.email = 'Formato de email inválido';
        return false;
    }
    return true;
};
// Validar telefone
const validateTelefone = () => {
    errorMessages.value.telefone = null;
    if (itemData.value.telefone && itemData.value.telefone.length > 0 && ![10, 11].includes(itemData.value.telefone.replace(/([^\d])+/gim, '').length)) {
        errorMessages.value.telefone = 'Formato de telefone inválido';
        return false;
    }
    return true;
};
// Validar data cep
const validateCep = () => {
    errorMessages.value.cep = null;
    const inputValue = itemData.value.cep || '';

    // Testa o formato do cep
    if (inputValue.trim().length > 0) {
        const unmaskedCep = masks.value.cep.unmasked(inputValue);
        // Verifica se o CEP desmascarado possui o comprimento esperado
        if (unmaskedCep.length !== 8) {
            errorMessages.value.cep = 'Formato de cep inválido';
            return false;
        }
    } else {
        errorMessages.value.cep = 'CEP não pode estar vazio';
        return false;
    }

    return true;
};

// Validar formulário
const formIsValid = () => {
    return validateCPF() && validateEmail() && validateTelefone();
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
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
    let dados = {};
    setTimeout(async () => {
        itemData.value.id = route.params.id;
        const selects = query.select ? `&slct=${query.select}` : undefined;
        const url = `${baseApiUrl}/local-params/f-a/gbf?fld=${query.field}&vl=${query.value}${selects}`;
        dados = await axios.get(url);
    }, 500);
    return dados;
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
    // Tipo Endereço
    await optionLocalParams({ field: 'grupo', value: 'tipo_endereco', select: 'id,label' }).then((res) => {
        res.data.data.map((item) => {
            dropdownTipoEndereco.value.push({ value: item.id, label: item.label });
        });
    });
};
// Carregar dados do formulário
onMounted(async () => {
    await loadData();
    await loadOptions();
});
onMounted(() => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
});
// Observar alterações nos dados do formulário
watchEffect(() => {
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
                        <label for="id_params_tipo">Tipo de Registro<small id="text-error" class="p-error"> *</small></label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <Dropdown v-else id="id_params_tipo" optionLabel="label" optionValue="value" :disabled="mode == 'view'" v-model="itemData.id_params_tipo" :options="dropdownTipo" placeholder="Selecione..."> </Dropdown>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="cpf_cnpj">CPF/CNPJ<small id="text-error" class="p-error"> *</small></label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                            <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.cpf_cnpj" id="cpf_cnpj" type="text" @input="validateCPF()" v-maska data-maska="['##.###.###/####-##','###.###.###-##']" />
                            <Button
                                v-if="labels.pfpj == 'pj'"
                                :disabled="mode == 'view'"
                                :icon="`fa-solid fa-arrows-rotate${!(mode == 'view' || searched) ? ' fa-spin' : ''}`"
                                v-tooltip.top="'Clique para buscar os dados públicos'"
                                class="bg-blue-500"
                                @click="buscarCNPJ()"
                            />
                        </div>
                        <small id="text-error" class="p-error" v-if="errorMessages.cpf_cnpj">{{ errorMessages.cpf_cnpj }}</small>
                    </div>
                    <div class="field col-12 md:col-6">
                        <label for="nome">{{ labels.nome }}<small id="text-error" class="p-error"> *</small></label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="!validateCPF() || mode == 'view'" v-model="itemData.nome" id="nome" type="text" :class="`${animationDocNr}`" />
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="rg_ie">{{ labels.rg_ie }}</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.rg_ie" id="rg_ie" type="text" />
                    </div>
                    <div class="field col-12 md:col-2" v-if="labels.pfpj == 'pf'">
                        <label for="id_params_sexo">Sexo<small id="text-error" v-if="!itemData.prospecto" class="p-error"> *</small></label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <Dropdown
                            v-else
                            id="id_params_sexo"
                            :required="!itemData.prospecto"
                            optionLabel="label"
                            optionValue="value"
                            :disabled="mode == 'view'"
                            v-model="itemData.id_params_sexo"
                            :options="dropdownSexo"
                            placeholder="Selecione..."
                        ></Dropdown>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="aniversario">{{ labels.aniversario }}<small id="text-error" v-if="!itemData.prospecto" class="p-error"> *</small></label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :required="!itemData.prospecto" :disabled="mode == 'view'" v-maska data-maska="##/##/####" v-model="itemData.aniversario" id="aniversario" type="text" :class="`${animationDocNr}`" />
                    </div>
                    <div class="field col-12 md:col-3">
                        <label for="id_params_p_nascto">País de Origem<small id="text-error" v-if="!itemData.prospecto" class="p-error"> *</small></label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <Dropdown
                            v-else
                            id="id_params_p_nascto"
                            :required="!itemData.prospecto"
                            optionLabel="label"
                            optionValue="value"
                            :disabled="mode == 'view'"
                            v-model="itemData.id_params_p_nascto"
                            :options="dropdownPaisNascim"
                            placeholder="Selecione..."
                        >
                        </Dropdown>
                    </div>
                    <div class="field col-12 md:col-5">
                        <label for="id_params_atuacao">Área de Atuação<small id="text-error" v-if="!itemData.prospecto" class="p-error"> *</small></label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <Dropdown
                            v-else
                            id="id_params_atuacao"
                            :required="!itemData.prospecto"
                            optionLabel="label"
                            optionValue="value"
                            :disabled="mode == 'view'"
                            v-model="itemData.id_params_atuacao"
                            :options="dropdownAtuacao"
                            placeholder="Selecione..."
                        >
                        </Dropdown>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="telefone">Telefone<small id="text-error" v-if="!itemData.prospecto" class="p-error"> *</small></label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText
                            v-else
                            autocomplete="no"
                            :required="!itemData.prospecto"
                            :disabled="mode == 'view'"
                            v-maska
                            data-maska="['(##) ####-####', '(##) #####-####']"
                            v-model="itemData.telefone"
                            id="telefone"
                            type="text"
                            @input="validateTelefone()"
                        />
                        <small id="text-error" class="p-error" v-if="errorMessages.telefone">{{ errorMessages.telefone }}</small>
                    </div>
                    <div class="field col-12 md:col-4">
                        <label for="email">E-mail<small id="text-error" v-if="!itemData.prospecto" class="p-error"> *</small></label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else :required="!itemData.prospecto" autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email" id="email" type="text" @input="validateEmail()" />
                        <small id="text-error" class="p-error" v-if="errorMessages.email">{{ errorMessages.email }}</small>
                    </div>
                    <div class="field col-12 md:col-2" v-if="labels.pfpj == 'pj'">
                        <label for="cim">CIM</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.cim" id="cim" type="text" />
                    </div>
                    <div class="field col-12 md:col-5">
                        <label for="doc_esp">Outro Documento(Qual?)</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.doc_esp" id="doc_esp" type="text" />
                    </div>
                    <div class="field col-12 md:col-1">
                        <label for="prospecto">Prospecto</label>
                        <br />
                        <Skeleton v-if="loading.form" borderRadius="16px" height="2rem"></Skeleton>
                        <InputSwitch v-else id="prospecto" :disabled="mode == 'view'" v-model="itemData.prospecto" />
                    </div>
                    <div class="field col-12 md:col-12">
                        <label for="observacao">Observação</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <Editor v-else-if="!loading.form && mode != 'view'" v-model="itemData.observacao" id="observacao" editorStyle="height: 80px" aria-describedby="editor-error" />
                        <p v-else v-html="itemData.observacao" class="p-inputtext p-component p-filled"></p>
                    </div>

                    <hr />
                    <div class="field col-12 md:col-2">
                        <label for="id_params_tipo_end">Tipo de Endereço<small id="text-error" v-if="!itemData.prospecto" class="p-error"> *</small></label>
                        <Dropdown id="id_params_tipo_end" optionLabel="label" optionValue="value" :disabled="mode == 'view'" v-model="itemData.id_params_tipo_end" :options="dropdownTipoEndereco" placeholder="Selecione..."> </Dropdown>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="cep">CEP<small id="text-error" v-if="!itemData.prospecto" class="p-error"> *</small></label>
                        <InputText
                            autocomplete="no"
                            :required="!itemData.prospecto"
                            :disabled="mode == 'view'"
                            v-maska
                            data-maska="##.###-###"
                            v-model="itemData.cep"
                            id="cep"
                            type="text"
                            @input="validateCep()"
                            @blur="buscarCEP"
                            :class="`${animationDocNr}`"
                        />
                        <small id="text-error" class="p-error" v-if="errorMessages.cep">{{ errorMessages.cep }}</small>
                    </div>
                    <div class="field col-12 md:col-7">
                        <label for="logradouro">Logradouro<small id="text-error" v-if="!itemData.prospecto" class="p-error"> *</small></label>
                        <InputText autocomplete="no" :required="!itemData.prospecto" :disabled="mode == 'view'" v-model="itemData.logradouro" id="logradouro" type="text" :class="`${animationDocNr}`" />
                    </div>
                    <div class="field col-12 md:col-1">
                        <label for="nr">Número<small id="text-error" v-if="!itemData.prospecto" class="p-error"> *</small></label>
                        <InputText autocomplete="no" :required="!itemData.prospecto" :disabled="mode == 'view'" v-model="itemData.nr" id="nr" type="text" :class="`${animationDocNr}`" />
                    </div>
                    <div class="field col-12 md:col-3">
                        <label for="complnr">Complemento</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.complnr" id="complnr" type="text" />
                    </div>
                    <div class="field col-12 md:col-4">
                        <label for="cidade">Cidade<small id="text-error" v-if="!itemData.prospecto" class="p-error"> *</small></label>
                        <InputText autocomplete="no" :required="!itemData.prospecto" :disabled="mode == 'view'" v-model="itemData.cidade" id="cidade" type="text" :class="`${animationDocNr}`" />
                    </div>
                    <div class="field col-12 md:col-4">
                        <label for="bairro">Bairro<small id="text-error" v-if="!itemData.prospecto" class="p-error"> *</small></label>
                        <InputText autocomplete="no" :required="!itemData.prospecto" :disabled="mode == 'view'" v-model="itemData.bairro" id="bairro" type="text" :class="`${animationDocNr}`" />
                    </div>
                    <div class="field col-12 md:col-1">
                        <label for="uf">UF<small id="text-error" v-if="!itemData.prospecto" class="p-error"> *</small></label>
                        <InputText autocomplete="no" :required="!itemData.prospecto" :disabled="mode == 'view'" v-model="itemData.uf" maxlength="2" id="uf" type="text" :class="`${animationDocNr}`" />
                    </div>
                    <div class="field col-12 md:col-12">
                        <label for="observacao_endereco">Observação do Endereço</label>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <InputText v-else-if="!loading.form && mode != 'view'" autocomplete="no" v-model="itemData.observacao_endereco" maxlength="255" id="observacao_endereco" type="text" />
                        <p v-else v-html="itemData.observacao_endereco" class="p-inputtext p-component p-filled"></p>
                    </div>
                </div>
                <div class="card flex justify-content-center flex-wrap gap-3">
                    <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                    <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                    <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="fa-solid fa-ban" severity="danger" text raised @click="reload" />
                </div>
            </div>
            <div class="col-12" v-if="userData.admin >= 2">
                <div class="card bg-green-200 mt-3">
                    <p>Mode: {{ mode }}</p>
                    <p>itemData: {{ itemData }}</p>
                    <p>dadosPublicos: {{ dadosPublicos }}</p>
                </div>
            </div>
        </form>

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
</template>

<style scoped>
@keyframes animation-color {
    0% {
        background-color: var(--blue-500);
        color: var(--gray-50);
    }
    50% {
        background-color: var(--yellow-500);
        color: var(--gray-900);
    }
    100% {
        background-color: var(--surface-200);
        color: var(--gray-900);
    }
}

.animation-color {
    animation: animation-color 5s linear;
}
</style>
