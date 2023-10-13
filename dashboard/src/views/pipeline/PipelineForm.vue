<script setup>
import { onBeforeMount, onMounted, ref, watch } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn, defaultError } from '@/toast';
import Breadcrumb from '../../components/Breadcrumb.vue';
import { useRoute } from 'vue-router';
const route = useRoute();
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { useRouter } from 'vue-router';
const router = useRouter();

// Cookies de usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();

import { Mask } from 'maska';
const masks = ref({
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    }),
    valor: new Mask({
        mask: '0,99'
    })
});

import { useConfirm } from 'primevue/useconfirm';
import moment from 'moment';
const confirm = useConfirm();

const animationDocNr = ref('animation-color animation-fill-forwards ');
// Campos de formulário
const itemData = ref({});
// Modelo de dados usado para comparação
const itemDataComparision = ref({});
// Modo do formulário
const mode = ref('view');
// Loadings
const loading = ref(true);
// Editar cadastro no autocomplete
const editCadastro = ref(false);
// Itens do dropdown de Unidades de Negócio do grid
const dropdownUnidades = ref([]);
const unidadeLabel = ref(undefined);
const dropdownAgentes = ref([]);
// Props do template
const props = defineProps({
    mode: String
});
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/pipeline`);
const calcTypeRepres = ref('R$');
const calcTypeAgente = ref('R$');

// Andamento do registro
const andamentoRegistro = ref({
    STATUS_PENDENTE: 0,
    STATUS_CONVERTIDO: 10,
    STATUS_PEDIDO: 20,
    STATUS_PEDIDO_REATIVADO: 21,
    STATUS_LIQUIDADO: 80,
    STATUS_CANCELADO: 89,
    STATUS_EXCLUIDO: 99 // Apenas para informação. Se o registro tem esse status então não deve mais ser exibido
});

const convertFloatFields = (result = 'pt') => {
    itemData.value.valor_bruto = formatValor(itemData.value.valor_bruto, result);
    itemData.value.valor_liq = formatValor(itemData.value.valor_liq, result);
    itemData.value.valor_representacao = formatValor(itemData.value.valor_representacao, result);
    itemData.value.valor_agente = formatValor(itemData.value.valor_agente, result);
    itemData.value.perc_represent = formatValor(itemData.value.perc_represent, result);
};

// Carragamento de dados do form
const loadData = async () => {
    loading.value = true;
    if (route.params.id || itemData.value.id) {
        if (route.params.id) itemData.value.id = route.params.id;
        const url = `${urlBase.value}/${itemData.value.id}`;
        await axios.get(url).then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);

                itemData.value = body;
                convertFloatFields();
                itemDataComparision.value = { ...itemData.value };
                selectedCadastro.value = {
                    code: itemData.value.id_cadastros,
                    name: itemData.value.nome + ' - ' + itemData.value.cpf_cnpj
                };
                await getNomeCliente();
                loading.value = false;
            } else {
                defaultWarn('Registro não localizado');
                toGrid();
            }
        });
    } else loading.value = false;
    // Retorna os parâmetros do registro
    await getPipelineParam();
    // Unidades de negócio
    await listUnidadesDescricao();
    // Agentes de negócio
    await listAgentesNegocio();
    // Lista o andamento do registro
    await listStatusRegistro();
};
// Formatar valor 0.00 para 0,00
const formatValor = (value, result = 'pt') => {
    if (result == 'pt') {
        if (value && result == 'pt') return value.toString().replace('.', ',');
        else return '0,00';
    } else {
        if (value && result == 'en') return value.toString().replace(',', '.');
        else return '0.00';
    }
};
// Salvar dados do formulário
const saveData = async () => {
    if (formIsValid()) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`;

        convertFloatFields('en');
        const preparedBody = { ...itemData.value, status_params_force: andamentoRegistro.value.STATUS_PENDENTE, pipeline_params_force: itemDataParam.value };
        console.log('preparedBody', preparedBody);
        axios[method](url, preparedBody)
            .then(async (res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    convertFloatFields();
                    itemDataComparision.value = { ...itemData.value };
                    emit('changed');
                    if (mode.value == 'new') router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/pipeline/${itemData.value.id}` });
                    if (id != itemData.value.id) {
                        router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/pipeline/${itemData.value.id}` });
                        // Lista o andamento do registro
                        await listStatusRegistro();
                        const animation = animationDocNr.value;
                        animationDocNr.value = '';
                        setTimeout(() => {
                            animationDocNr.value = animation;
                        }, 100);
                    } else reload();
                    mode.value = 'view';
                } else {
                    defaultWarn('Erro ao salvar registro');
                }
            })
            .catch((error) => {
                if (typeof error.response.data == 'string') defaultError(error.response.data);
                else if (typeof error.response == 'string') defaultError(error.response);
                else if (typeof error == 'string') defaultError(error);
                else defaultError('Erro ao carregar dados!');
            });
    }
};
// Validar formulário
const formIsValid = () => {
    return true;
};
// Recarregar dados do formulário
const reload = async () => {
    mode.value = 'view';
    await loadData();
    emit('cancel');
};
// Listar unidades de negócio
const listUnidadesDescricao = async () => {
    const query = { func: 'ubt', tipoDoc: undefined, unidade: undefined };
    const url = `${baseApiUrl}/pipeline-params/f-a/${query.func}?doc_venda=${query.tipoDoc ? query.tipoDoc : ''}&gera_baixa=&descricao=${query.unidade ? query.unidade : ''}`;
    await axios.get(url).then((res) => {
        dropdownUnidades.value = [];
        res.data.data.map((item) => {
            const label = item.descricao.toString().replaceAll(/_/g, ' ') + (userData.admin >= 1 ? ` (${item.id})` : '');
            const itemList = { value: item.id, label: label };
            if (item.id == itemData.value.id_pipeline_params) unidadeLabel.value = label;
            dropdownUnidades.value.push(itemList);
        });
    });
};
// Listar unidades de negócio
const listAgentesNegocio = async () => {
    const url = `${baseApiUrl}/users/f-a/gbf?fld=agente_v&vl=1&slct=id,name`;
    await axios.get(url).then((res) => {
        dropdownAgentes.value = [];
        res.data.data.map((item) => {
            dropdownAgentes.value.push({ value: item.id, label: item.name });
        });
    });
};
/**
 * Autocomplete de cadastros
 */
const cadastros = ref([]);
const filteredCadastros = ref([]);
const selectedCadastro = ref();
const nomeCliente = ref();
const getNomeCliente = async () => {
    try {
        const url = `${baseApiUrl}/cadastros/f-a/glf?fld=id&vl=${itemData.value.id_cadastros}&slct=nome,cpf_cnpj`;
        const response = await axios.get(url);
        if (response.data.data.length > 0) {
            nomeCliente.value = response.data.data[0].nome + ' - ' + masks.value.cpf_cnpj.masked(response.data.data[0].cpf_cnpj);
        }
    } catch (error) {
        console.error('Erro ao buscar cadastros:', error);
    }
};
const searchCadastros = (event) => {
    setTimeout(async () => {
        // Verifique se o campo de pesquisa não está vazio
        if (!event.query.trim().length) {
            // Se estiver vazio, exiba todas as sugestões
            filteredCadastros.value = [...cadastros.value];
        } else {
            // Se não estiver vazio, faça uma solicitação à API (ou use dados em cache)
            if (cadastros.value.length === 0) {
                // Carregue os cadastros da API (ou de onde quer que você os obtenha)
                try {
                    const url = `${baseApiUrl}/cadastros/f-a/glf?fld=1&vl=1&slct=id,nome,cpf_cnpj`;
                    const response = await axios.get(url);
                    cadastros.value = response.data.data.map((element) => {
                        return {
                            code: element.id,
                            name: element.nome + ' - ' + element.cpf_cnpj
                        };
                    });
                } catch (error) {
                    console.error('Erro ao buscar cadastros:', error);
                }
            }
            // Filtrar os cadastros com base na consulta do usuário
            filteredCadastros.value = cadastros.value.filter((cadastro) => {
                return cadastro.name.toLowerCase().includes(event.query.toLowerCase());
            });
        }
    }, 250);
};
const confirmEditCadastro = () => {
    confirm.require({
        group: 'templating',
        header: 'Corfirma que deseja editar o cadastro?',
        message: 'Você tem certeza que deseja editar este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'pi pi-check',
        rejectIcon: 'pi pi-times',
        acceptClass: 'p-button-danger',
        accept: () => {
            selectedCadastro.value = undefined;
            editCadastro.value = true;
        },
        reject: () => {
            return false;
        }
    });
};
/**
 * Fim de autocomplete de cadastros
 */
/**
 * Status do registro
 */
// Preload de status do registro
const itemDataStatus = ref([]);
const itemDataLastStatus = ref({});
const itemDataParam = ref({});
const itemDataStatusPreload = ref([
    { status: '0', label: 'Criado', icon: 'pi pi-plus', color: '#3b82f6' },
    { status: '10', label: 'Convertido para pedido', icon: 'pi pi-shopping-cart', color: '#4cd07d' },
    { status: '20', label: 'Pedido criado', icon: 'pi pi-shopping-cart', color: '#4cd07d' },
    { status: '21', label: 'Reativado', icon: 'fa-solid fa-retweet', color: '#195825' },
    { status: '80', label: 'Liquidado', icon: 'pi pi-check', color: '#607D8B' },
    { status: '89', label: 'Cancelado', icon: 'pi pi-times', color: '#8c221c' }
]);
// Listar status do registro
const listStatusRegistro = async () => {
    const url = `${baseApiUrl}/pipeline-status/${itemData.value.id}`;
    await axios.get(url).then((res) => {
        if (res.data && res.data.data.length > 0) {
            itemDataLastStatus.value = res.data.data[res.data.data.length - 1];
            itemData.value.status_params = itemDataLastStatus.value.status_params;
            itemDataStatus.value = [];
            res.data.data.forEach((element) => {
                const status = itemDataStatusPreload.value.filter((item) => {
                    return item.status == element.status_params;
                });
                itemDataStatus.value.push({
                    // date recebe 2022-10-31 15:09:38 e deve converter para 31/10/2022 15:09:38
                    date: moment(element.created_at).format('DD/MM/YYYY HH:mm:ss').replaceAll(':00', '').replaceAll(' 00', ''),
                    status: status[0].label,
                    icon: status[0].icon,
                    color: status[0].color
                });
            });
        }
    });
};
/**
 * Fim de status do registro
 */
const getPipelineParam = async () => {
    const url = `${baseApiUrl}/pipeline-params/${itemData.value.id_pipeline_params}`;
    await axios.get(url).then((res) => {
        if (res.data && res.data.id) itemDataParam.value = res.data;
    });
};
const itemNovo = [
    {
        label: 'Outro Tipo ou Cliente',
        icon: 'pi pi-user',
        command: async () => {
            itemData.value = {
                id_pipeline_params: itemData.value.id_pipeline_params,
                id_com_agentes: itemData.value.id_com_agentes,
                valor_bruto: itemData.value.valor_bruto,
                valor_liq: itemData.value.valor_liq,
                valor_representacao: itemData.value.valor_representacao,
                valor_agente: itemData.value.valor_agente,
                perc_represent: itemData.value.perc_represent,
                descricao: itemData.value.descricao
            };
            selectedCadastro.value = undefined;
            itemDataLastStatus.value = {};
            editCadastro.value = true;
            mode.value = 'new';
        }
    },
    {
        label: 'Mesmo Tipo e Cliente',
        icon: 'pi pi-user-plus',
        command: () => {
            delete itemData.value.id;
            itemDataParam.value.obrig_valor = 0;
            saveData();
        }
    }
];
const itemsComiss = [
    {
        label: 'Agente interno',
        icon: 'pi pi-user',
        command: () => {
            defaultSuccess('Agente interno');
        }
    },
    {
        label: 'Terceiros',
        icon: 'pi pi-users',
        command: () => {
            defaultSuccess('Terceiros');
        }
    }
];
const toPai = () => {
    location.href = `/${store.userStore.cliente}/${store.userStore.dominio}/pipeline/${itemData.value.id_pai}`;
    // router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/pipeline/${itemData.value.id_pai}` });
};
const toFilho = () => {
    location.href = `/${store.userStore.cliente}/${store.userStore.dominio}/pipeline/${itemData.value.id_filho}`;
    // router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/pipeline/${itemData.value.id_filho}` });
};
/**
 * Ferramentas do registro
 */
const statusRecord = async (status) => {
    if (route.params.id) itemData.value.id = route.params.id;
    const url = `${urlBase.value}/${itemData.value.id}?st=${status}`;
    if (status == 99)
        confirm.require({
            group: 'templating',
            header: 'Corfirmar exclusão',
            message: 'Você tem certeza que deseja excluir este registro?',
            icon: 'fa-solid fa-question fa-beat',
            acceptIcon: 'pi pi-check',
            rejectIcon: 'pi pi-times',
            acceptClass: 'p-button-danger',
            accept: async () => {
                await axios.delete(url, itemData.value).then(() => {
                    defaultError(`Registro excluído com sucesso`);
                    toGrid();
                });
            },
            reject: () => {
                return false;
            }
        });
    else
        await axios.delete(url, itemData.value).then(() => {
            // Definir a mensagem baseado nos status e de acordo com itemDataStatusPreload
            defaultWarn(`Registro ${itemDataStatusPreload.value.filter((item) => item.status == status)[0].label.toLowerCase()} com sucesso`);
            reload();
        });
};
/**
 * Fim de ferramentas do registro
 */
const toGrid = () => {
    router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/pipeline` });
};
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
});
onMounted(async () => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
});
// Observar alterações na propriedade selectedCadastro
watch(selectedCadastro, (value) => {
    if (value) {
        itemData.value.id_cadastros = value.code;
    }
});
</script>

<template>
    <Breadcrumb :items="[{ label: 'Todo o Pipeline', to: `/${userData.cliente}/${userData.dominio}/pipeline` }, { label: itemData.documento }]" />
    <div class="card">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div :class="`${mode == 'new' ? 'col-12' : 'col-12 lg:col-9'}`">
                    <div class="p-fluid grid">
                        <div class="col-12">
                            <label for="id_cadastros">Cadastro</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <AutoComplete v-else-if="editCadastro || mode == 'new'" v-model="selectedCadastro" optionLabel="name" :suggestions="filteredCadastros" @complete="searchCadastros" forceSelection />
                            <div class="p-inputgroup flex-1" v-else>
                                <InputText disabled v-model="nomeCliente" />
                                <Button v-if="!itemDataLastStatus.status_params >= 80" icon="pi pi-pencil" severity="primary" @click="confirmEditCadastro()" :disabled="mode == 'view'" />
                            </div>
                        </div>
                        <div :class="`col-12 lg:col-${mode == 'new' ? 6 : 5}`">
                            <label for="id_pipeline_params">Tipo</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <p v-else-if="mode != 'new' && unidadeLabel" :class="`${animationDocNr}disabled p-inputtext p-component p-filled`" v-tooltip.top="'Não é possível alterar o tipo de registro depois de criado'">{{ unidadeLabel }}</p>
                            <Dropdown
                                v-else
                                filter
                                placeholder="Selecione..."
                                :showClear="!!itemData.id_pipeline_params"
                                id="unidade_tipos"
                                optionLabel="label"
                                optionValue="value"
                                v-model="itemData.id_pipeline_params"
                                :options="dropdownUnidades"
                                :disabled="mode != 'new'"
                                @change="getPipelineParam()"
                            />
                        </div>
                        <div :class="`col-12 lg:col-${mode == 'new' ? 6 : 5}`">
                            <label for="id_com_agentes">Agente</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown
                                v-else
                                filter
                                placeholder="Selecione..."
                                :showClear="!!itemData.id_com_agentes"
                                id="unidade_tipos"
                                optionLabel="label"
                                optionValue="value"
                                v-model="itemData.id_com_agentes"
                                :options="dropdownAgentes"
                                :disabled="mode == 'view'"
                            />
                        </div>
                        <div class="col-12 lg:col-2" v-if="itemData.documento">
                            <label for="documento">Documento</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <p v-else-if="itemDataParam.autom_nr" :class="`${animationDocNr}disabled p-inputtext p-component p-filled`">{{ itemData.documento }}</p>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.documento" id="documento" type="text" />
                        </div>
                        <div class="col-12 lg:col-1" v-if="itemData.versao">
                            <label for="versao">Versão</label>
                            <p class="p-inputtext p-component p-filled">{{ itemData.versao }}</p>
                        </div>
                        <div class="col-12 lg:col-2" v-if="itemData.id_pai">
                            <label for="id_pai">Convertido por</label>
                            <Button severity="success" text raised @click="toPai">
                                <span>Proposta&nbsp;<i class="fa-solid fa-angles-right fa-fade"></i></span>
                            </Button>
                        </div>
                        <div class="col-12 lg:col-2" v-if="itemData.id_filho">
                            <label for="id_filho">Convertido para</label>
                            <Button severity="success" text raised @click="toFilho">
                                <span>Pedido&nbsp;<i class="fa-solid fa-angles-right fa-fade"></i></span>
                            </Button>
                        </div>
                        <div class="col-12" v-if="itemDataParam.doc_venda >= 1">
                            <div class="grid">
                                <div class="col-12" style="text-align: center">
                                    <div class="flex align-items-end flex-wrap card-container purple-container">
                                        <span class="p-inputtext p-component p-filled surface-100"> <i class="fa-solid fa-angles-down fa-fade"></i> Valores referência para comissão <i class="fa-solid fa-angles-down fa-fade" /> </span>
                                    </div>
                                </div>
                                <div class="col-12 lg:col-6">
                                    <label for="valor_bruto">Bruto</label>
                                    <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                                    <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                        <span class="p-inputgroup-addon">R$</span>
                                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_bruto" id="valor_bruto" type="text" v-maska data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                                    </div>
                                </div>
                                <div class="col-12 lg:col-6">
                                    <label for="valor_liq">Líquido</label>
                                    <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                                    <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                        <span class="p-inputgroup-addon">R$</span>
                                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_liq" id="valor_liq" type="text" v-maska data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                                        <Button v-tooltip.top="'Clique para repetir o valor bruto aqui'" class="bg-blue-500" label="VB" @click="itemData.valor_liq = itemData.valor_bruto" />
                                    </div>
                                </div>
                                <div class="col-12 lg:col-6">
                                    <label for="valor_representacao">Representação</label>
                                    <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                                    <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                        <SelectButton v-model="calcTypeRepres" :options="['R$', '%']" aria-labelledby="basic" />
                                        <InputText
                                            v-if="calcTypeRepres == 'R$'"
                                            autocomplete="no"
                                            :disabled="mode == 'view'"
                                            v-model="itemData.valor_representacao"
                                            id="valor_representacao"
                                            type="text"
                                            v-maska
                                            data-maska="0,99"
                                            data-maska-tokens="0:\d:multiple|9:\d:optional"
                                        />
                                        <InputText
                                            v-else-if="calcTypeRepres == '%'"
                                            autocomplete="no"
                                            :disabled="mode == 'view'"
                                            v-model="itemData.perc_represent"
                                            id="perc_represent"
                                            type="text"
                                            v-maska
                                            data-maska="0,99"
                                            data-maska-tokens="0:\d:multiple|9:\d:optional"
                                        />
                                        <Button v-if="calcTypeRepres == 'R$'" v-tooltip.top="'Clique para repetir o valor líquido aqui'" class="bg-blue-500" label="VL" @click="itemData.valor_representacao = itemData.valor_liq" />
                                        <Button v-if="calcTypeRepres == 'R$'" v-tooltip.top="'Clique para repetir o valor bruto aqui'" class="bg-blue-500" label="VB" @click="itemData.valor_representacao = itemData.valor_bruto" />
                                    </div>
                                </div>
                                <div class="col-12 lg:col-6">
                                    <label for="valor_agente">Agente</label>
                                    <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                                    <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                        <SelectButton v-model="calcTypeAgente" :options="['R$', '%']" aria-labelledby="basic" />
                                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_agente" id="valor_agente" type="text" v-maska data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                                        <Button v-tooltip.top="'Clique para repetir o valor líquido aqui'" class="bg-blue-500" label="VL" @click="itemData.valor_agente = itemData.valor_liq" />
                                        <Button v-tooltip.top="'Clique para repetir o valor bruto aqui'" class="bg-blue-500" label="VB" @click="itemData.valor_agente = itemData.valor_bruto" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-12 lg:col12">
                            <label for="descricao">Descrição</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <Editor v-else-if="!loading.form && mode != 'view'" v-model="itemData.descricao" id="descricao" editorStyle="height: 160px" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.descricao || ''" class="p-inputtext p-component p-filled"></p>
                        </div>
                    </div>
                    <div class="card flex justify-content-center flex-wrap gap-3" v-if="mode == 'new' || itemDataLastStatus.status_params < 80">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-beat" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!formIsValid()" />
                        <Button
                            type="button"
                            v-if="mode != 'view'"
                            label="Cancelar"
                            icon="pi pi-ban"
                            severity="danger"
                            text
                            raised
                            @click="
                                mode = 'grid';
                                emit('cancel');
                                toGrid();
                            "
                        />
                    </div>
                    <div class="card bg-green-200" v-if="userData.admin >= 2">
                        <p>itemData: {{ itemData }}</p>
                        <p>itemDataParam: {{ itemDataParam }}</p>
                        <p>itemDataLastStatus: {{ itemDataLastStatus }}</p>
                    </div>
                </div>
                <div class="col-12 lg:col-3" v-if="mode != 'new'">
                    <Fieldset :toggleable="true" class="mb-2">
                        <template #legend>
                            <div class="flex align-items-center text-primary">
                                <span class="pi pi-clock mr-2"></span>
                                <span class="font-bold text-lg">Andamento do Registro</span>
                            </div>
                        </template>
                        <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                        <Timeline v-else :value="itemDataStatus">
                            <template #marker="slotProps">
                                <span class="flex w-2rem h-2rem align-items-center justify-content-center text-white border-circle z-1 shadow-1" :style="{ backgroundColor: slotProps.item.color }">
                                    <i :class="slotProps.item.icon"></i>
                                </span>
                            </template>
                            <template #opposite="slotProps">
                                <small class="p-text-secondary">{{ slotProps.item.date }}</small>
                            </template>
                            <template #content="slotProps">
                                {{ slotProps.item.status }}
                            </template>
                        </Timeline>
                    </Fieldset>
                    <Fieldset :toggleable="true">
                        <template #legend>
                            <div class="flex align-items-center text-primary">
                                <span class="pi pi-bolt mr-2"></span>
                                <span class="font-bold text-lg">Ações do Registro</span>
                            </div>
                        </template>
                        <SplitButton label="Novo Registro Idêntico" class="w-full mb-3" icon="fa-solid fa-plus fa-fade" severity="primary" text raised :model="itemNovo" />
                        <Button
                            label="Converter para Pedido"
                            v-if="itemDataParam.gera_baixa == 1 && itemData.status_params == 0"
                            type="button"
                            class="w-full mb-3"
                            :icon="`fa-solid fa-cart-shopping ${itemDataParam.gera_baixa == 1 && itemData.status_params == 0 ? 'fa-shake' : ''}`"
                            severity="danger"
                            text
                            raised
                        />
                        <!-- @click="convertToPedido" -->
                        <SplitButton
                            label="Comissionar"
                            v-if="itemDataParam.doc_venda >= 2 && (itemData.status_params == 0 || itemData.status == 10)"
                            class="w-full mb-3"
                            :icon="`fa-solid fa-money-bill-transfer ${itemDataParam.doc_venda >= 2 && (itemData.status_params == 0 || itemData.status == 10) ? 'fa-fade' : ''}`"
                            severity="success"
                            text
                            raised
                            :model="itemsComiss"
                        />
                        <Button
                            label="Criar OAT"
                            v-if="itemDataParam.doc_venda >= 2 && (itemData.status_params == 0 || itemData.status == 10)"
                            type="button"
                            class="w-full mb-3"
                            :icon="`fa-solid fa-screwdriver-wrench ${itemDataParam.doc_venda >= 2 && (itemData.status_params == 0 || itemData.status == 10) ? 'fa-fade' : ''}`"
                            style="color: #a97328"
                            text
                            raised
                        />
                        <!-- @click="newOAT" -->
                        <Button
                            label="Cancelar Registro"
                            v-if="itemData.status_params < 89"
                            type="button"
                            :disabled="!(userData.pipeline >= 3 && (itemData.status_params == 0 || itemData.status == 10))"
                            class="w-full mb-3"
                            :icon="`fa-solid fa-ban`"
                            severity="warning"
                            text
                            raised
                            @click="statusRecord(89)"
                        />
                        <Button
                            label="Reativar Registro"
                            v-else-if="userData.gestor >= 1 && itemData.status_params == 89"
                            type="button"
                            class="w-full mb-3"
                            :icon="`fa-solid fa-file-invoice ${itemData.status_params == 0 ? 'fa-fade' : ''}`"
                            severity="warning"
                            text
                            raised
                            @click="statusRecord(21)"
                        />
                        <Button
                            label="Excluir Registro"
                            v-tooltip.top="'Não pode ser desfeito!'"
                            type="button"
                            :disabled="!(userData.pipeline >= 4 && itemData.status == 10)"
                            class="w-full mb-3"
                            :icon="`fa-solid fa-fire`"
                            severity="danger"
                            text
                            raised
                            @click="statusRecord(99)"
                        />
                    </Fieldset>
                </div>
            </div>
        </form>
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
