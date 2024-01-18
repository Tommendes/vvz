<script setup>
import { onMounted, ref, watch } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import Breadcrumb from '../../components/Breadcrumb.vue';
import PropostaNewPromptForm from '../comPropostas/PropostaNewPromptForm.vue';
import { userKey, formatValor } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { guide } from '@/guides/pipelineFormGuide.js';

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();

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
const confirm = useConfirm();
import moment from 'moment';

const animationDocNr = ref('animation-color animation-fill-forwards ');
// Campos de formulário
const itemData = ref({});
// Listagem de arquivos na pasta do registro
const listFolder = ref(null);
// O registro tem pasta?
const hasFolder = ref(false);
// O servidor está acessível?
const hostAccessible = ref(false);
// Modo do formulário
const mode = ref('view');
// Loadings
const loading = ref(true);
// Editar cadastro no autocomplete
const editCadastro = ref(false);
// Itens do dropdown de Unidades de Negócio do grid
const dropdownUnidades = ref([]);
// Itens do dropdown de Agentes de Negócio do grid
const dropdownAgentes = ref([]);
const unidadeLabel = ref(undefined);
// Props do template
const props = defineProps(['mode', 'idPipeline', 'idCadastro']);
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/pipeline`);
// Itens do breadcrumb
const breadItems = ref([{ label: 'Todo o Pipeline', to: `/${userData.schema_description}/pipeline` }]);
const calcTypeRepres = ref('R$');
const calcTypeAgente = ref('R$');

// Andamento do registro
import { andamentoRegistroPipeline } from '@/global';

// Importação de componentes
import { useDialog } from 'primevue/usedialog';
const dialog = useDialog();

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
    setTimeout(async () => {
        const id = props.idPipeline || route.params.id;
        const url = `${urlBase.value}/${id}`;
        if (mode.value != 'new')
            await axios.get(url).then(async (res) => {
                const body = res.data;
                if (body && body.id) {
                    body.id = String(body.id);

                    itemData.value = body;
                    convertFloatFields();
                    selectedCadastro.value = {
                        code: itemData.value.id_cadastros,
                        name: itemData.value.nome + ' - ' + itemData.value.cpf_cnpj
                    };
                    // Retorna os parâmetros do registro
                    await getPipelineParam();
                    await lstFolder();
                    await getNomeCliente();
                    // Lista o andamento do registro
                    await listStatusRegistro();
                    // Unidades de negócio
                    await listUnidadesDescricao();
                    breadItems.value = [{ label: 'Todo o Pipeline', to: `/${userData.schema_description}/pipeline` }];
                    if (unidadeLabel.value) breadItems.value.push({ label: unidadeLabel.value + ' ' + itemData.value.documento + (userData.admin >= 2 ? `: (${itemData.value.id})` : '') });
                    if (itemData.value.id_cadastros) breadItems.value.push({ label: 'Ir ao Cadastro', to: `/${userData.schema_description}/cadastro/${itemData.value.id_cadastros}` });
                } else {
                    defaultWarn('Registro não localizado');
                    toGrid();
                }
            });
        else if (props.idCadastro) {
            itemData.value.id_cadastros = props.idCadastro;
            itemData.value.valor_bruto = 0;
            itemData.value.valor_liq = 0;
            itemData.value.valor_representacao = 0;
            itemData.value.valor_agente = 0;
            itemData.value.perc_represent = 0;
            selectedCadastro.value = {
                code: itemData.value.id_cadastros,
                name: itemData.value.nome + ' - ' + itemData.value.cpf_cnpj
            };
            await getNomeCliente();
        }
    }, Math.random() * 1000);
    await listAgentesNegocio();

    if (!itemData.value.valor_bruto) itemData.value.valor_bruto = 0;
    if (!itemData.value.valor_liq) itemData.value.valor_liq = 0;
    if (!itemData.value.valor_representacao) itemData.value.valor_representacao = 0;
    if (!itemData.value.valor_agente) itemData.value.valor_agente = 0;
    if (!itemData.value.perc_represent) itemData.value.perc_represent = 0;
    loading.value = false;
};
// Salvar dados do formulário
const saveData = async () => {
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;

    itemData.value.documento = String(itemData.value.documento);
    convertFloatFields('en');
    const preparedBody = {
        ...itemData.value,
        status_params_force: andamentoRegistroPipeline.STATUS_PENDENTE,
        pipeline_params_force: itemDataParam.value
    };

    axios[method](url, preparedBody)
        .then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                itemData.value = body;
                convertFloatFields();
                emit('changed');
                if (route.name != 'cadastro' && mode.value == 'new') {
                    router.push({
                        path: `/${userData.schema_description}/pipeline/${itemData.value.id}`
                    });
                    loadData();
                } else if (route.name != 'cadastro' && id != itemData.value.id) {
                    router.push({
                        path: `/${userData.schema_description}/pipeline/${itemData.value.id}`
                    });
                    const animation = animationDocNr.value;
                    animationDocNr.value = '';
                    loadData();
                    animationDocNr.value = animation;
                } else reload();
                mode.value = 'view';
                await mkFolder();
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((error) => {
            if (typeof error == 'string') defaultWarn(error);
            else if (typeof error.response && typeof error.response == 'string') defaultWarn(error.response);
            else if (error.response && error.response.data && typeof error.response.data == 'string') defaultWarn(error.response.data);
            else {
                console.log(error);
                defaultWarn('Erro ao carregar dados!');
            }
        });
};
// Recarregar dados do formulário
const reload = async () => {
    mode.value = 'view';
    editCadastro.value = false;
    loadData();
    emit('cancel');
};
// Listar unidades de negócio
const listUnidadesDescricao = async () => {
    const query = { func: 'ubt', tipoDoc: undefined, unidade: undefined };
    let url = `${baseApiUrl}/pipeline-params/f-a/${query.func}?doc_venda=${query.tipoDoc ? query.tipoDoc : ''}&gera_baixa=&descricao=${query.unidade ? query.unidade : ''}`;
    if (mode.value == 'new') url += '&status=10';
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
    let url = `${baseApiUrl}/users/f-a/gbf?fld=agente_v&vl=1&slct=id,name&order=name`;
    if (mode.value == 'new') url += '&status=10';
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
    if (itemData.value.id_cadastros) {
        try {
            const url = `${baseApiUrl}/cadastros/f-a/glf?fld=id&vl=${itemData.value.id_cadastros}&slct=nome,cpf_cnpj`;
            const response = await axios.get(url);
            if (response.data.data.length > 0) {
                nomeCliente.value = response.data.data[0].nome + ' - ' + masks.value.cpf_cnpj.masked(response.data.data[0].cpf_cnpj);
            }
        } catch (error) {
            console.error('Erro ao buscar cadastros:', error);
        }
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
                getCadastroBySearchedId();
            }
            // Filtrar os cadastros com base na consulta do usuário
            filteredCadastros.value = cadastros.value.filter((cadastro) => {
                return cadastro.name.toLowerCase().includes(event.query.toLowerCase());
            });
        }
    }, 250);
};
const getCadastroBySearchedId = async (idCadastro) => {
    const qry = idCadastro ? `fld=id&vl=${idCadastro}` : 'fld=1&vl=1';
    try {
        const url = `${baseApiUrl}/cadastros/f-a/glf?${qry}&slct=id,nome,cpf_cnpj`;
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
};
const confirmEditCadastro = () => {
    confirm.require({
        group: 'templating',
        header: 'Corfirma que deseja editar o cadastro?',
        message: 'Você tem certeza que deseja editar este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
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
const itemDataParam = ref({});
const itemDataStatus = ref([]);
const itemDataLastStatus = ref({});
const itemDataStatusPreload = ref([
    {
        status: '0',
        action: 'Criação',
        label: 'Criado',
        icon: 'fa-solid fa-plus',
        color: '#3b82f6'
    },
    {
        status: '1',
        action: 'Reativação',
        label: 'Reativado',
        icon: 'fa-solid fa-retweet',
        color: '#195825'
    },
    {
        status: '10',
        action: 'Conversão',
        label: 'Convertido para pedido',
        icon: 'pi pi-shopping-cart',
        color: '#4cd07d'
    },
    {
        status: '20',
        action: 'Criação',
        label: 'Pedido criado',
        icon: 'pi pi-shopping-cart',
        color: '#4cd07d'
    },
    {
        status: '80',
        action: 'Liquidação',
        label: 'Liquidado',
        icon: 'fa-solid fa-check',
        color: '#607D8B'
    },
    {
        status: '89',
        action: 'Cancelamento',
        label: 'Cancelado',
        icon: 'fa-solid fa-xmark',
        color: '#8c221c'
    },
    {
        status: '99',
        action: 'Exclusão',
        label: 'Excluído',
        icon: 'fa-solid fa-xmark',
        color: '#8c221c'
    }
]);
// Listar status do registro
const listStatusRegistro = async () => {
    const url = `${baseApiUrl}/pipeline-status/${route.params.id}`;
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
    if (itemData.value.id_pipeline_params) {
        const url = `${baseApiUrl}/pipeline-params/${itemData.value.id_pipeline_params}`;
        await axios.get(url).then((res) => {
            if (res.data && res.data.id) itemDataParam.value = res.data;
        });
    }
};
const itemNovo = [
    {
        label: 'Outro Cliente ou Tipo',
        icon: 'fa-solid fa-plus',
        command: async () => {
            delete itemData.value.id;
            delete itemData.value.id_filho;
            delete itemData.value.id_pai;
            delete itemData.value.documento;
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
            // Unidades de negócio
            await listUnidadesDescricao();
            await listAgentesNegocio();
        }
    },
    {
        label: 'Mesmo Cliente e Outro Tipo',
        icon: 'fa-regular fa-copy',
        command: async () => {
            delete itemData.value.id;
            delete itemData.value.id_filho;
            delete itemData.value.id_pai;
            delete itemData.value.documento;
            delete itemData.value.updated_at;
            itemData.value = {
                id_cadastros: itemData.value.id_cadastros,
                id_pipeline_params: itemData.value.id_pipeline_params,
                id_com_agentes: itemData.value.id_com_agentes,
                valor_bruto: itemData.value.valor_bruto,
                valor_liq: itemData.value.valor_liq,
                valor_representacao: itemData.value.valor_representacao,
                valor_agente: itemData.value.valor_agente,
                perc_represent: itemData.value.perc_represent,
                descricao: itemData.value.descricao
            };
            if (itemDataParam.value.doc_venda == 0) {
                delete itemData.value.valor_bruto;
                delete itemData.value.valor_liq;
                delete itemData.value.valor_representacao;
                delete itemData.value.valor_agente;
                delete itemData.value.perc_represent;
            }
            itemDataLastStatus.value = {};
            mode.value = 'new';
            // Unidades de negócio
            await listUnidadesDescricao();
            await listAgentesNegocio();
        }
    },
    {
        label: 'Mesmo Cliente e Tipo (Clonar)',
        icon: 'fa-solid fa-copy',
        command: async () => {
            delete itemData.value.id;
            delete itemData.value.id_filho;
            delete itemData.value.id_pai;
            itemDataParam.value.obrig_valor = 0;
            itemData.value.documento = String(itemData.value.documento);
            await saveData();
            await listAgentesNegocio();
            defaultWarn('Verifique se o número do documento deve ser editado');
        }
    }
];
const itemsComiss = [
    {
        label: 'Agente interno',
        icon: 'fa-regular fa-user',
        command: () => {
            defaultSuccess('Agente interno');
        }
    },
    {
        label: 'Terceiros',
        icon: 'fa-regular fa-users',
        command: () => {
            defaultSuccess('Terceiros');
        }
    }
];
const toPai = async () => {
    window.location.href = `#/${userData.schema_description}/pipeline/${itemData.value.id_pai}`;
};
const toFilho = async (idFilho) => {
    window.location.href = `#/${userData.schema_description}/pipeline/${idFilho || itemData.value.id_filho}`;
};
const toProposal = async () => {
    const propostaInterna = await axios.get(`${baseApiUrl}/com-propostas/f-a/gbf?fld=id_pipeline&vl=${itemData.value.id}&slct=id`);
    if (propostaInterna && propostaInterna.data && propostaInterna.data.data[0]) window.location.href = `#/${userData.schema_description}/proposta/${propostaInterna.data.data[0].id}`;
    else {
        // Criar um objeto para representar o registro de uma nova proposta interna com os seguintes fields preenchidos: id_pipeline
        const newPropostaInterna = {
            id_pipeline: itemData.value.id
        };
        // buscar em BD.long_params os termos grupo.[com_pr01,com_pr02,com_pr03,com_pr04 e com_pr09]
        const com_pr01 = await optionLongParams({ field: 'grupo', value: 'com_pr01', select: 'id,parametro,label' });
        const com_pr02 = await optionLongParams({ field: 'grupo', value: 'com_pr02', select: 'id,parametro,label' });
        const com_pr03 = await optionLongParams({ field: 'grupo', value: 'com_pr03', select: 'id,parametro,label' });
        const com_pr04 = await optionLongParams({ field: 'grupo', value: 'com_pr04', select: 'id,parametro,label' });
        const com_pr09 = await optionLongParams({ field: 'grupo', value: 'com_pr09', select: 'id,parametro,label' });
        newPropostaInterna.saudacao_inicial = com_pr01.data.data[0].parametro;
        newPropostaInterna.conclusao = com_pr02.data.data[0].parametro;
        newPropostaInterna.garantia = com_pr03.data.data[0].parametro;
        newPropostaInterna.observacoes_finais = com_pr04.data.data[0].parametro;
        newPropostaInterna.assinatura = com_pr09.data.data[0].parametro;
        showPrompt(newPropostaInterna);
    }
};
// Obter parâmetros do BD
const optionLongParams = async (query) => {
    const selects = query.select ? `&slct=${query.select}` : undefined;
    const url = `${baseApiUrl}/long-params/f-a/gbf?fld=${query.field}&vl=${query.value}${selects}`;
    const response = await axios.get(url);
    return response;
};

/**
 * Ferramentas do registro
 */
const statusRecord = async (status) => {
    if (route.params.id) itemData.value.id = route.params.id;
    const url = `${urlBase.value}/${itemData.value.id}?st=${status}`;
    const optionsConfirmation = {
        group: 'templating',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger'
    };
    if ([andamentoRegistroPipeline.STATUS_CANCELADO, andamentoRegistroPipeline.STATUS_EXCLUIDO, andamentoRegistroPipeline.STATUS_LIQUIDADO].includes(status)) {
        let startMessage = '';
        if (andamentoRegistroPipeline.STATUS_EXCLUIDO == status) startMessage = 'Essa operação não poderá ser revertida. ';
        confirm.require({
            ...optionsConfirmation,
            header: 'Confirmar',
            message: `${startMessage}Confirma a ${itemDataStatusPreload.value.filter((item) => item.status == status)[0].action.toLowerCase()}?`,
            accept: async () => {
                await axios.delete(url, itemData.value).then(() => {
                    const msgDone = `Registro ${itemDataStatusPreload.value.filter((item) => item.status == status)[0].label.toLowerCase()} com sucesso`;
                    if (status == andamentoRegistroPipeline.STATUS_EXCLUIDO) {
                        toGrid();
                    } // Se for excluído, redireciona para o grid
                    else if ([andamentoRegistroPipeline.STATUS_CANCELADO, andamentoRegistroPipeline.STATUS_LIQUIDADO].includes(status)) {
                        reload();
                    } // Se for cancelado ou liquidado, recarrega o registro
                    defaultSuccess(msgDone);
                });
            },
            reject: () => {
                return false;
            }
        });
    } else if ([andamentoRegistroPipeline.STATUS_CONVERTIDO].includes(status))
        confirm.require({
            ...optionsConfirmation,
            header: 'Confirmar',
            message: `Confirma a ${itemDataStatusPreload.value.filter((item) => item.status == status)[0].action.toLowerCase()}?`,
            accept: async () => {
                const preparedBody = {
                    ...itemData.value,
                    status_params_force: andamentoRegistroPipeline.STATUS_CONVERTIDO,
                    pipeline_params_force: itemDataParam.value
                };
                await axios
                    .put(url, preparedBody)
                    .then(async (body) => {
                        defaultSuccess(`Registro convertido com sucesso`);
                        // itemData.value = body.data;
                        // console.log('body', body);
                        // window.location.href = `#/${userData.schema_description}/pipeline/${body.data.id}`;
                        // loading.value = true;
                        // await loadData();
                        await toFilho(body.data.id);
                    })
                    .catch((error) => {
                        console.log(error);
                        defaultWarn(error.response.data);
                    });
            },
            reject: () => {
                return false;
            }
        });
    else
        await axios.delete(url, itemData.value).then(() => {
            // Definir a mensagem baseado nos status e de acordo com itemDataStatusPreload
            defaultSuccess(`Registro ${itemDataStatusPreload.value.filter((item) => item.status == status)[0].label.toLowerCase()} com sucesso`);
            reload();
        });
};

const lstFolder = async () => {
    if (itemDataParam.value.gera_pasta == 1)
        setTimeout(async () => {
            const id = props.idPipeline || route.params.id;
            const url = `${baseApiUrl}/pipeline/f-a/lfd`;
            await axios
                .post(url, { id_pipeline: id })
                .then((res) => {
                    if (res.data && res.data.length) {
                        const itensToNotList = ['.', '..', '.DS_Store', 'Thumbs.db'];
                        listFolder.value = res.data;
                        // remover de listFolder os itensToNotList
                        if (typeof listFolder.value == 'object' && listFolder.value.length > 0) {
                            listFolder.value = listFolder.value.filter((item) => {
                                return !itensToNotList.includes(item.name);
                            });
                            hasFolder.value = true;
                        }
                    }
                    if (listFolder.value && typeof listFolder.value == 'object' && listFolder.value.length == 0) hasFolder.value = true;
                    hostAccessible.value = true;
                })
                .catch((error) => {
                    if (typeof error == 'string') defaultWarn(error);
                    else if (typeof error.response && typeof error.response == 'string') defaultWarn(error.response);
                    else if (error.response && error.response.data && typeof error.response.data == 'string') defaultWarn(error.response.data);
                    else {
                        console.log(error);
                        defaultWarn('Erro ao carregar dados!');
                    }
                    hostAccessible.value = false;
                });
        }, Math.random() * 1000);
};

const mkFolder = async () => {
    const url = `${baseApiUrl}/pipeline/f-a/mfd`;
    defaultWarn('Tentando entrar em contato com o servidor de pastas. Por favor aguarde...');
    await axios
        .post(url, { id_pipeline: itemData.value.id })
        .then(async (res) => {
            // const msgDone = `Pasta criada com sucesso`;
            defaultSuccess(res.data);
            await lstFolder();
        })
        .catch((error) => {
            console.log('Erro mkFolder', error);
            if (typeof error == 'string') defaultWarn(error);
            else if (typeof error.response && typeof error.response == 'string') defaultWarn(error.response);
            else if (error.response && error.response.data && typeof error.response.data == 'string') defaultWarn(error.response.data);
            else {
                defaultWarn('Erro ao criar pasta!');
            }
        });
};
/**
 * Fim de ferramentas do registro
 */
const toGrid = () => {
    mode.value = 'grid';
    emit('cancel');
    router.push({ path: `/${userData.schema_description}/pipeline` });
};

const promptMessage = ref('');
const showPrompt = (body) => {
    if (body) promptMessage.value = body;
    else promptMessage.value = 'Você tem certeza?';
    dialog.open(PropostaNewPromptForm, {
        data: {
            message: promptMessage
        },
        props: {
            header: `Por favor, informe alguns detalhes da nova proposta. Estes dados poderão ser ajustados posteriormente`,
            style: {
                width: Math.floor(window.innerWidth * 0.5) + 'px'
            },
            breakpoints: {
                '1199px': '75vw',
                '575px': '90vw'
            },
            modal: true
        },
        onClose: (options) => {
            if (options.data && options.data.id) onPromptConfirm(options.data.id);
            else onPromptCancel();
        }
    });
};

const onPromptConfirm = (idProposta) => {
    window.location.href = `#/${userData.schema_description}/proposta/${idProposta}`;
};

const onPromptCancel = () => {
    defaultWarn('Você não pode prosseguir sem informar os dados solicitados');
};

// Carregar dados do formulário
onMounted(async () => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
    if (props.idCadastro) itemData.value.id_cadastros = props.idCadastro;
    setTimeout(async () => {
        // Carrega os dados do formulário
        await loadData();
        // Unidades de negócio
        await listUnidadesDescricao();
        // Agentes de negócio
        await listAgentesNegocio();
    }, Math.random() * 1000);
});
// Observar alterações na propriedade selectedCadastro
watch(selectedCadastro, (value) => {
    if (value) {
        itemData.value.id_cadastros = value.code;
    }
});
watch(route, (value) => {
    if (value !== itemData.value.id) {
        reload();
    }
});
</script>

<template>
    <Breadcrumb :items="breadItems" v-if="!(props.idCadastro || mode == 'expandedFormMode')" />
    <div class="card">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div :class="`${['new', 'expandedFormMode'].includes(mode) ? 'col-12' : 'col-12 lg:col-9'}`">
                    <div class="p-fluid grid">
                        <div class="col-12">
                            <label for="id_cadastros">Cliente</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <AutoComplete
                                v-else-if="route.name != 'cadastro' && mode != 'expandedFormMode' && (editCadastro || mode == 'new')"
                                v-model="selectedCadastro"
                                optionLabel="name"
                                :suggestions="filteredCadastros"
                                @complete="searchCadastros"
                                forceSelection
                            />
                            <div class="p-inputgroup flex-1" v-else>
                                <InputText disabled v-model="nomeCliente" />
                                <Button v-if="route.name != 'cadastro' && !itemDataLastStatus.status_params >= 80" icon="pi pi-pencil" severity="primary" @click="confirmEditCadastro()" :disabled="mode == 'view'" />
                            </div>
                        </div>
                        <div :class="`col-12 lg:col-${mode == 'new' && !(itemData.documento || (mode == 'new' && itemDataParam.autom_nr == 0)) ? 6 : 5}`">
                            <label for="id_pipeline_params">Tipo</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <p v-else-if="['view', 'expandedFormMode'].includes(mode) && unidadeLabel" :class="`${animationDocNr}disabled p-inputtext p-component p-filled`" v-tooltip.top="'Não é possível alterar o tipo de registro depois de criado'">
                                {{ unidadeLabel }}
                            </p>
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
                        <div :class="`col-12 lg:col-${mode == 'new' && !(itemData.documento || (mode == 'new' && itemDataParam.autom_nr == 0)) ? 6 : 5}`">
                            <label for="id_com_agentes">Agente</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
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
                                :disabled="['view', 'expandedFormMode'].includes(mode)"
                            />
                        </div>
                        <div class="col-12 lg:col-2" v-if="itemData.documento || (['new', 'edit'].includes(mode) && itemDataParam.autom_nr == 0)">
                            <label for="documento">Documento</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <p v-else-if="itemDataParam.autom_nr || mode == 'expandedFormMode'" :class="`${animationDocNr}disabled p-inputtext p-component p-filled`">
                                {{ itemData.documento }}
                            </p>
                            <InputText v-else autocomplete="no" :disabled="['view', 'expandedFormMode'].includes(mode)" v-model="itemData.documento" id="documento" type="text" maxlength="10" />
                        </div>
                        <div class="col-12 lg:col-1" v-if="itemData.versao">
                            <label for="versao">Versão</label>
                            <p class="p-inputtext p-component p-filled">
                                {{ itemData.versao }}
                            </p>
                        </div>
                        <div class="col-12" v-if="itemDataParam.doc_venda >= 1">
                            <div class="grid">
                                <div class="col-12" style="text-align: center">
                                    <div class="flex align-items-end flex-wrap card-container purple-container">
                                        <span class="p-inputtext p-component p-filled surface-100">
                                            <i class="fa-solid fa-angles-down fa-shake"></i> Valores referência para comissão
                                            <i class="fa-solid fa-angles-down fa-shake" />
                                        </span>
                                    </div>
                                </div>
                                <div :class="`col-12 lg:col-${['view', 'expandedFormMode'].includes(mode) ? '3' : '6'}`">
                                    <label for="valor_bruto">Bruto</label>
                                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                                    <div v-else-if="!['view', 'expandedFormMode'].includes(mode)" class="p-inputgroup flex-1" style="font-size: 1rem">
                                        <span class="p-inputgroup-addon">R$</span>
                                        <InputText
                                            autocomplete="no"
                                            :disabled="['view', 'expandedFormMode'].includes(mode)"
                                            v-model="itemData.valor_bruto"
                                            id="valor_bruto"
                                            type="text"
                                            v-maska
                                            data-maska="0,99"
                                            data-maska-tokens="0:\d:multiple|9:\d:optional"
                                        />
                                    </div>
                                    <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                        <span class="p-inputgroup-addon">R$</span>
                                        <span disabled v-html="itemData.valor_bruto" id="valor_bruto" class="p-inputtext p-component" />
                                    </div>
                                </div>
                                <div :class="`col-12 lg:col-${['view', 'expandedFormMode'].includes(mode) ? '3' : '6'}`">
                                    <label for="valor_liq">Líquido</label>
                                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                                    <div v-else-if="!['view', 'expandedFormMode'].includes(mode)" class="p-inputgroup flex-1" style="font-size: 1rem">
                                        <span class="p-inputgroup-addon">R$</span>
                                        <InputText
                                            autocomplete="no"
                                            :disabled="['view', 'expandedFormMode'].includes(mode)"
                                            v-model="itemData.valor_liq"
                                            id="valor_liq"
                                            type="text"
                                            v-maska
                                            data-maska="0,99"
                                            data-maska-tokens="0:\d:multiple|9:\d:optional"
                                        />
                                        <Button :disabled="mode == 'view'" v-tooltip.top="'Clique para repetir o valor bruto aqui'" class="bg-blue-500" label="VB" @click="itemData.valor_liq = itemData.valor_bruto" />
                                    </div>
                                    <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                        <span class="p-inputgroup-addon">R$</span>
                                        <span disabled v-html="itemData.valor_liq" id="valor_liq" class="p-inputtext p-component" />
                                    </div>
                                </div>
                                <div :class="`col-12 lg:col-${['view', 'expandedFormMode'].includes(mode) ? '3' : '6'}`">
                                    <label for="valor_representacao">Representação</label>
                                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                                    <div v-else-if="!['view', 'expandedFormMode'].includes(mode)" class="p-inputgroup flex-1" style="font-size: 1rem">
                                        <SelectButton :disabled="mode == 'view'" v-model="calcTypeRepres" :options="['R$', '%']" aria-labelledby="basic" />
                                        <InputText
                                            v-if="calcTypeRepres == 'R$'"
                                            autocomplete="no"
                                            :disabled="['view', 'expandedFormMode'].includes(mode)"
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
                                            :disabled="['view', 'expandedFormMode'].includes(mode)"
                                            v-model="itemData.perc_represent"
                                            id="perc_represent"
                                            type="text"
                                            v-maska
                                            data-maska="0,99"
                                            data-maska-tokens="0:\d:multiple|9:\d:optional"
                                        />
                                        <Button
                                            :disabled="mode == 'view'"
                                            v-if="calcTypeRepres == 'R$'"
                                            v-tooltip.top="'Clique para repetir o valor líquido aqui'"
                                            class="bg-blue-500"
                                            label="VL"
                                            @click="itemData.valor_representacao = itemData.valor_liq"
                                        />
                                        <Button
                                            :disabled="mode == 'view'"
                                            v-if="calcTypeRepres == 'R$'"
                                            v-tooltip.top="'Clique para repetir o valor bruto aqui'"
                                            class="bg-blue-500"
                                            label="VB"
                                            @click="itemData.valor_representacao = itemData.valor_bruto"
                                        />
                                    </div>
                                    <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                        <span class="p-inputgroup-addon">R$</span>
                                        <span v-if="calcTypeRepres == '%'" disabled v-html="itemData.perc_represent" id="perc_represent" class="p-inputtext p-component" />
                                        <span v-else disabled v-html="itemData.valor_representacao" id="valor_representacao" class="p-inputtext p-component" />
                                    </div>
                                </div>
                                <div :class="`col-12 lg:col-${['view', 'expandedFormMode'].includes(mode) ? '3' : '6'}`">
                                    <label for="valor_agente">Agente</label>
                                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                                    <div v-else-if="!['view', 'expandedFormMode'].includes(mode)" class="p-inputgroup flex-1" style="font-size: 1rem">
                                        <SelectButton v-model="calcTypeAgente" :options="['R$', '%']" aria-labelledby="basic" />
                                        <InputText autocomplete="no" v-model="itemData.valor_agente" id="valor_agente" type="text" v-maska data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                                        <Button v-tooltip.top="'Clique para repetir o valor líquido aqui'" class="bg-blue-500" label="VL" @click="itemData.valor_agente = itemData.valor_liq" />
                                        <Button v-tooltip.top="'Clique para repetir o valor bruto aqui'" class="bg-blue-500" label="VB" @click="itemData.valor_agente = itemData.valor_bruto" />
                                    </div>
                                    <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                        <span class="p-inputgroup-addon">R$</span>
                                        <span disabled v-html="itemData.valor_agente" id="valor_agente" class="p-inputtext p-component" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-12 lg:col12" v-if="['new', 'edit'].includes(mode) || itemData.descricao">
                            <label for="descricao">Descrição</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Editor v-else-if="!(loading.form || ['view', 'expandedFormMode'].includes(mode))" v-model="itemData.descricao" id="descricao" editorStyle="height: 160px" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.descricao || ''" class="p-inputtext p-component p-filled"></p>
                        </div>
                    </div>
                    <div class="card flex justify-content-center flex-wrap gap-3" v-if="mode == 'new'">
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="fa-solid fa-ban" severity="danger" text raised @click="mode == 'edit' || route.params.id ? reload() : toGrid()" />
                    </div>
                    <Fieldset class="bg-green-200" toggleable :collapsed="true" v-if="mode != 'expandedFormMode'">
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
                    <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
                        <p>{{ route.name }}</p>
                        <p>mode: {{ mode }}</p>
                        <p>itemData: {{ itemData }}</p>
                        <p v-if="props.idCadastro">idCadastro: {{ props.idCadastro }}</p>
                        <p v-if="props.idPipeline">idPipeline: {{ props.idPipeline }}</p>
                        <p>itemDataParam: {{ itemDataParam }}</p>
                        <p>itemDataLastStatus: {{ itemDataLastStatus }}</p>
                        <p>{{ unidadeLabel }}</p>
                        <p>hasFolder {{ hasFolder }}</p>
                    </div>
                </div>
                <div class="col-12 md:col-3" v-if="!['new', 'expandedFormMode'].includes(mode)">
                    <Fieldset :toggleable="true" class="mb-3">
                        <template #legend>
                            <div class="flex align-items-center text-primary">
                                <span class="pi pi-bolt mr-2"></span>
                                <span class="font-bold text-lg">Ações do Registro</span>
                            </div>
                        </template>

                        <div v-if="(mode == 'new' || itemDataLastStatus.status_params < 80) && !itemData.id_filho">
                            <Button label="Editar" outlined class="w-full" type="button" v-if="mode == 'view'" icon="fa-regular fa-pen-to-square fa-shake" @click="mode = 'edit'" />
                            <Button label="Salvar" outlined class="w-full mb-3" type="submit" v-if="mode != 'view'" icon="fa-solid fa-floppy-disk" severity="success" />
                            <Button label="Cancelar" outlined class="w-full" type="button" v-if="mode != 'view'" icon="fa-solid fa-ban" severity="danger" @click="mode == 'edit' ? reload() : toGrid()" />
                        </div>
                        <div v-if="mode != 'edit'">
                            <hr class="w-full mb-3" v-if="!itemData.id_filho" />
                            <Button
                                v-if="route.name == 'pipeline-one'"
                                label="Ir ao Cadastro"
                                type="button"
                                class="w-full mb-3"
                                :icon="`fa-regular fa-address-card fa-shake`"
                                style="color: #a97328"
                                text
                                raised
                                @click="router.push(`/${userData.schema_description}/cadastro/${itemData.id_cadastros}`)"
                            />
                            <SplitButton label="Novo Registro Idêntico" v-if="!itemData.id_pai" class="w-full mb-3" icon="fa-solid fa-plus fa-shake" severity="primary" text raised :model="itemNovo" />
                            <Button
                                :label="`Ir para ${itemData.id_filho ? 'Pedido' : 'Proposta'}`"
                                v-if="itemData.id_filho || itemData.id_pai"
                                type="button"
                                class="w-full mb-3"
                                :icon="`fa-solid fa-turn-${itemData.id_filho ? 'down' : 'up'} fa-shake`"
                                severity="success"
                                text
                                raised
                                @click="itemData.id_filho ? toFilho() : toPai()"
                            />
                            <Button
                                label="Converter para Pedido"
                                v-if="itemDataParam.doc_venda == 1"
                                :disabled="![andamentoRegistroPipeline.STATUS_PENDENTE, andamentoRegistroPipeline.STATUS_REATIVADO].includes(itemDataLastStatus.status_params)"
                                type="button"
                                class="w-full mb-3"
                                :icon="`fa-solid fa-cart-shopping ${
                                    itemDataParam.gera_baixa == 1 && [andamentoRegistroPipeline.STATUS_PENDENTE, andamentoRegistroPipeline.STATUS_REATIVADO].includes(itemDataLastStatus.status_params) ? 'fa-shake' : ''
                                }`"
                                severity="danger"
                                text
                                raised
                                @click="statusRecord(andamentoRegistroPipeline.STATUS_CONVERTIDO)"
                            />
                            <Button
                                label="Exibir/Editar Proposta"
                                v-if="itemDataParam.proposta_interna == 1"
                                :disabled="![andamentoRegistroPipeline.STATUS_PENDENTE, andamentoRegistroPipeline.STATUS_REATIVADO].includes(itemDataLastStatus.status_params)"
                                type="button"
                                class="w-full mb-3"
                                :icon="`fa-solid fa-file-pen ${itemDataParam.gera_baixa == 1 && [andamentoRegistroPipeline.STATUS_PENDENTE, andamentoRegistroPipeline.STATUS_REATIVADO].includes(itemDataLastStatus.status_params) ? 'fa-shake' : ''}`"
                                severity="success"
                                text
                                raised
                                @click="toProposal()"
                            />
                            <SplitButton
                                label="Comissionar"
                                v-if="itemDataParam.doc_venda >= 2 && itemDataLastStatus.status_params == 20 && itemData.status == 10"
                                :disabled="itemDataLastStatus.status_params >= 89"
                                class="w-full mb-3"
                                :icon="`fa-solid fa-money-bill-transfer ${itemDataParam.doc_venda >= 2 && itemDataLastStatus.status_params == 20 && itemData.status == 10 ? 'fa-shake' : ''}`"
                                severity="success"
                                text
                                raised
                                :model="itemsComiss"
                            />
                            <!-- <Button
                                label="Criar OAT"
                                v-if="itemDataParam.doc_venda >= 2 && (itemDataLastStatus.status_params == 20 || itemData.status == 10)"
                                :disabled="itemDataLastStatus.status_params >= 89"
                                type="button"
                                class="w-full mb-3"
                                :icon="`fa-solid fa-screwdriver-wrench ${itemDataParam.doc_venda >= 2 && itemDataLastStatus.status_params <= 20 ? 'fa-shake' : ''}`"
                                style="color: #a97328"
                                text
                                raised
                                @click="defaultSuccess('OAT')"
                            /> -->
                            <Button
                                label="Liquidar Registro"
                                v-if="itemDataLastStatus.status_params < 80 && itemDataParam.doc_venda == 0"
                                type="button"
                                :disabled="!(userData.pipeline >= 3 && (itemDataLastStatus.status_params == 0 || itemData.status == 10))"
                                class="w-full mb-3"
                                :icon="`fa-solid fa-check ${itemDataLastStatus.status_params == 0 || itemData.status == 10 ? 'fa-shake' : ''}`"
                                severity="success"
                                text
                                raised
                                @click="statusRecord(andamentoRegistroPipeline.STATUS_LIQUIDADO)"
                            />
                            <Button
                                label="Cancelar Registro"
                                v-tooltip.top="itemData.id_filho ? `Se cancelar, cancelará o documento relacionado e suas comissões, caso haja!` : 'Inutiliza o registro, mas não exclui!'"
                                v-if="itemDataLastStatus.status_params < 80"
                                type="button"
                                :disabled="!(userData.pipeline >= 3 && (itemDataLastStatus.status_params == 0 || itemData.status == 10))"
                                class="w-full mb-3"
                                :icon="`fa-solid fa-ban`"
                                severity="warning"
                                text
                                raised
                                @click="statusRecord(andamentoRegistroPipeline.STATUS_CANCELADO)"
                            />
                            <Button
                                label="Reativar Registro"
                                v-tooltip.top="itemData.id_filho ? `Se reativar, reativará o documento relacionado e suas comissões, caso haja!` : ''"
                                v-else-if="userData.gestor >= 1 && itemDataLastStatus.status_params == 89"
                                type="button"
                                class="w-full mb-3"
                                :icon="`fa-solid fa-file-invoice ${itemDataLastStatus.status_params == 0 ? 'fa-shake' : ''}`"
                                severity="warning"
                                text
                                raised
                                @click="statusRecord(andamentoRegistroPipeline.STATUS_REATIVADO)"
                            />
                            <Button
                                v-if="userData.pipeline >= 4 && itemData.status == 10"
                                label="Excluir Registro"
                                v-tooltip.top="'Não pode ser desfeito!' + (itemData.id_filho ? ` Se excluir, excluirá o documento relacionado e suas comissões, caso haja!` : '')"
                                type="button"
                                :disabled="!(userData.pipeline >= 4 && itemData.status == 10)"
                                class="w-full mb-3"
                                :icon="`fa-solid fa-fire`"
                                severity="danger"
                                text
                                raised
                                @click="statusRecord(andamentoRegistroPipeline.STATUS_EXCLUIDO)"
                            />
                            <Button
                                v-if="itemDataParam.gera_pasta == 1"
                                :disabled="!hostAccessible || hasFolder"
                                label="Criar Pasta"
                                type="button"
                                class="w-full mt-3 mb-3"
                                :icon="`fa-solid fa-folder ${hostAccessible && !hasFolder ? 'fa-shake' : ''}`"
                                severity="success"
                                text
                                raised
                                @click="mkFolder()"
                            />
                        </div>
                    </Fieldset>
                    <Fieldset :toggleable="true" class="mb-3">
                        <template #legend>
                            <div class="flex align-items-center text-primary">
                                <span class="pi pi-clock mr-2"></span>
                                <span class="font-bold text-lg">Andamento do Registro</span>
                            </div>
                        </template>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
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
                                <span class="pi pi-clock mr-2"></span>
                                <span class="font-bold text-lg">Conteúdo da Pasta</span>
                            </div>
                        </template>
                        <ul class="list-decimal" v-if="listFolder && listFolder.length">
                            <li v-for="item in listFolder" :key="item.id">{{ item.name }}</li>
                        </ul>
                        <p v-else-if="!hostAccessible">O servidor de pastas/arquivos está inacessível no momento</p>
                        <p v-else>Não há conteúdo na pasta ou ela não existe</p>
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
