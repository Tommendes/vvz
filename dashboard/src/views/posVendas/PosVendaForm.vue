<script setup>
import { onMounted, ref, watch } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { guide } from '@/guides/pvFormGuide.js';

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

import Breadcrumb from '@/components/Breadcrumb.vue';

import { useRoute } from 'vue-router';
const route = useRoute();

import { useRouter } from 'vue-router';
const router = useRouter();

import moment from 'moment';

import { Mask } from 'maska';
const masks = ref({
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    }),
    valor: new Mask({
        mask: '0,99'
    })
});

// import EnderecosGrid from '../cadastros/enderecos/EnderecosGrid.vue';
import OatsGrid from './oat/OatsGrid.vue';
import OatForm from './oat/OatForm.vue';

// Andamento do registro
import { andamentoRegistroPv } from '@/global';

// Campos de formulário
const itemData = ref({});
// Modo do formulário
const mode = ref('view');
// Loadings
const loading = ref(true);
// Editar cadastro no autocomplete
const editCadastro = ref(false);
// Props do template
const props = defineProps(['mode', 'idPv', 'idCadastro']);
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/pv`);
// Dropdown de tipos de pós-venda
const dropdownPipelineByCadastro = ref([]);
const dropdownTiposPv = ref([
    // Suporte:0; Montagem:1; Vendas:2
    { value: '0', label: 'Suporte' },
    { value: '1', label: 'Montagem' },
    { value: '2', label: 'Vendas' }
]);
// Carragamento de dados do form
const loadData = async () => {
    // mode.value = 'view';
    loading.value = true;
    const id = props.idPv || route.params.id;
    const url = `${urlBase.value}/${id}`;
    if (mode.value != 'new') {
        setTimeout(async () => {
            if (id) {
                await axios.get(url).then(async (res) => {
                    const body = res.data;
                    if (body && body.id) {
                        body.id = String(body.id);
                        body.tipo = String(body.tipo);
                        itemData.value = body;
                        await getNomeCliente();
                        await listPipeline();
                        editCadastro.value = false;
                        // Lista o andamento do registro
                        await listStatusRegistro();
                    } else {
                        defaultWarn('Registro não localizado');
                        router.push({ path: `/${userData.cliente}/${userData.dominio}/pos-vendas` });
                    }
                });
            }
        }, Math.random() * 1000 + 250);
    } else if (props.idCadastro) {
        itemData.value.id_cadastros = props.idCadastro;
        selectedCadastro.value = {
            code: itemData.value.id_cadastros,
            name: itemData.value.nome + ' - ' + itemData.value.cpf_cnpj
        };
        await getNomeCliente();
    }
    loading.value = false;
};
// Salvar dados do formulário
const saveData = async () => {
    if (formIsValid()) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`;
        const preparedBody = {
            ...itemData.value,
            status_pv_force: andamentoRegistroPv.STATUS_PENDENTE
        };
        axios[method](url, preparedBody)
            .then(async (res) => {
                const body = res.data;
                defaultSuccess('Registro salvo com sucesso');
                if (mode.value == 'new') window.location.href = `/${userData.cliente}/${userData.dominio}/pos-venda/${body.id}`;
                else reload();
            })
            .catch((error) => {
                console.log(error);
                defaultWarn('Erro ao carregar dados!');
            });
    }
};
/**
 * Autocomplete de cadastros e pipeline
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
            nomeCliente.value = response.data.data[0].nome + ' - ' + masks.value.cpf_cnpj.masked(response.data.data[0].cpf_cnpj) + (itemData.value.pv_nr ? ' - PV: ' + itemData.value.pv_nr : '');
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
                getCadastroBySearchedId();
            }
            // Filtrar os cadastros com base na consulta do usuário
            filteredCadastros.value = cadastros.value.filter((registro) => {
                return registro.name.toLowerCase().includes(event.query.toLowerCase());
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
const confirmEditAutoSuggest = (tipo) => {
    confirm.require({
        group: 'templating',
        header: `Corfirmar edição`,
        message: `Corfirma que deseja editar o ${tipo}?`,
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'pi pi-check',
        rejectIcon: 'pi pi-times',
        acceptClass: 'p-button-danger',
        accept: () => {
            if (tipo == 'cadastro') {
                selectedCadastro.value = undefined;
                editCadastro.value = true;
            }
        },
        reject: () => {
            return false;
        }
    });
};
/**
 * Fim de autocomplete de cadastros
 */
// Listar pipelines do cadastro
const listPipeline = async () => {
    try {
        const url = `${baseApiUrl}/pipeline/f-a/glf?doc_venda=2&fld=tbl1.id_cadastros&vl=${itemData.value.id_cadastros}&slct=tbl1.id,tbl1.documento,pp.descricao,pp.id idPipelineParams`;
        await axios.get(url).then((res) => {
            dropdownPipelineByCadastro.value = [];
            res.data.data.map((item) => {
                const label = `${item.descricao.toString().replaceAll(/_/g, ' ')} - ${item.documento}${userData.admin >= 1 ? ` (${item.idPipelineParams})` : ''}`;
                dropdownPipelineByCadastro.value.push({ value: item.id, label: label });
            });
        });
    } catch (error) {
        console.error('Erro ao buscar pipeline:', error);
    }
};
// Validar formulário
const formIsValid = () => {
    return itemData.value.tipo && String(itemData.value.tipo) && itemData.value.id_cadastros;
};

// Recarregar dados do formulário
const reload = async () => {
    mode.value = 'view';
    editCadastro.value = false;
    await loadData();
    emit('cancel');
};

/**
 * Status do registro
 */
// Preload de status do registro
const itemDataStatus = ref([]);
const itemDataLastStatus = ref({});

/*
STATUS_PENDENTE = 0;
STATUS_REATIVADO = 1;
STATUS_EM_ANDAMENTO = 60;
STATUS_FINALIZADO = 80;
STATUS_CANCELADO = 89;
STATUS_EXCLUIDO = 99;
*/

const itemDataStatusPreload = ref([
    {
        status: '0',
        action: 'Criação',
        label: 'Criado',
        icon: 'pi pi-plus',
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
        status: '60',
        action: 'Em andamento',
        label: 'Registro em andamento',
        icon: 'fa-solid fa-ellipsis',
        color: '#4cd07d'
    },
    {
        status: '80',
        action: 'Finalização',
        label: 'Finalizado',
        icon: 'pi pi-check',
        color: '#607D8B'
    },
    {
        status: '89',
        action: 'Cancelamento',
        label: 'Cancelado',
        icon: 'pi pi-times',
        color: '#8c221c'
    },
    {
        status: '99',
        action: 'Exclusão',
        label: 'Excluído',
        icon: 'pi pi-ban',
        color: '#8c221c'
    }
]);
// Listar status do registro
const listStatusRegistro = async () => {
    const url = `${baseApiUrl}/pv-status/${itemData.value.id}`;
    await axios.get(url).then((res) => {
        if (res.data && res.data.data.length > 0) {
            itemDataLastStatus.value = res.data.data[res.data.data.length - 1];
            itemData.value.status_pv = itemDataLastStatus.value.status_pv;
            itemDataStatus.value = [];
            res.data.data.forEach((element) => {
                const status = itemDataStatusPreload.value.filter((item) => {
                    return item.status == element.status_pv;
                });
                if (status && status[0])
                    itemDataStatus.value.push({
                        // date recebe 2022-10-31 15:09:38 e deve converter para 31/10/2022 15:09:38
                        date: moment(element.created_at).format('DD/MM/YYYY HH:mm:ss').replaceAll(':00', '').replaceAll(' 00', ''),
                        status: status[0].label + (userData.admin >= 2 ? ' ' + status[0].status : ''),
                        icon: status[0].icon,
                        color: status[0].color
                    });
            });
        }
    });
};
// Ferramentas do registro
const statusRecord = async (status) => {
    if (route.params.id) itemData.value.id = route.params.id;
    const url = `${urlBase.value}/${itemData.value.id}?st=${status}`;
    const optionsConfirmation = {
        group: 'templating',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'pi pi-check',
        rejectIcon: 'pi pi-times',
        acceptClass: 'p-button-danger'
    };
    if ([andamentoRegistroPv.STATUS_CANCELADO, andamentoRegistroPv.STATUS_EXCLUIDO, andamentoRegistroPv.STATUS_FINALIZADO].includes(status)) {
        let startMessage = '';
        if (andamentoRegistroPv.STATUS_EXCLUIDO == status) startMessage = 'Essa operação não poderá ser revertida. ';
        confirm.require({
            ...optionsConfirmation,
            header: 'Confirmar',
            message: `${startMessage}Confirma a ${itemDataStatusPreload.value.filter((item) => item.status == status)[0].action.toLowerCase()}?`,
            accept: async () => {
                await axios.delete(url, itemData.value).then(() => {
                    const msgDone = `Registro ${itemDataStatusPreload.value.filter((item) => item.status == status)[0].label.toLowerCase()} com sucesso`;
                    if (status == andamentoRegistroPv.STATUS_EXCLUIDO) {
                        toGrid();
                    } // Se for excluído, redireciona para o grid
                    else if ([andamentoRegistroPv.STATUS_CANCELADO, andamentoRegistroPv.STATUS_FINALIZADO].includes(status)) {
                        reload();
                    } // Se for cancelado ou liquidado, recarrega o registro
                    defaultSuccess(msgDone);
                });
            },
            reject: () => {
                return false;
            }
        });
    } else
        await axios.delete(url, itemData.value).then(() => {
            // Definir a mensagem baseado nos status e de acordo com itemDataStatusPreload
            defaultSuccess(`Registro ${itemDataStatusPreload.value.filter((item) => item.status == status)[0].label.toLowerCase()} com sucesso`);
            reload();
        });
};
/**
 * Fim de status do registro
 */
const toGrid = () => {
    mode.value = 'grid';
    emit('cancel');
    router.push({ path: `/${userData.cliente}/${userData.dominio}/pos-vendas` });
};

const oatsGrid = ref(null);

import { useDialog } from 'primevue/usedialog';
const dialog = useDialog();
const showPvOatForm = () => {
    dialog.open(OatForm, {
        data: {
            idPv: itemData.value.id,
            idPvOat: undefined,
            idCadastro: itemData.value.id_cadastros,
            lastStatus: itemDataLastStatus.value.status_pv
        },
        props: {
            header: `Registrar OAT`,
            style: {
                width: '100rem'
            },
            breakpoints: {
                '1199px': '75vw',
                '575px': '90vw'
            },
            modal: true
        },
        // templates: {
        //     footer: markRaw(FooterDemo)
        // },
        onClose: (options) => {
            const data = options.data;
            if (data) console.log(data);
            oatsGrid.value.loadData();
        }
    });
};

// Carregar dados do formulário
onMounted(async () => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
    if (props.idCadastro) itemData.value.id_cadastros = props.idCadastro;
    // Carrega os dados do formulário
    await loadData();
});
// Observar alterações na propriedade selectedCadastro
watch(selectedCadastro, (value) => {
    if (value) {
        itemData.value.id_cadastros = value.code;
        listPipeline();
    }
});
</script>

<template>
    <Breadcrumb v-if="!['expandedFormMode', 'new'].includes(mode) && !props.idCadastro" :items="[{ label: 'Pós-venda', to: `/${userData.cliente}/${userData.dominio}/pos-vendas` }, { label: nomeCliente }]" />
    <div class="card" :style="route.name == 'pos-venda' ? 'min-width: 100rem' : ''">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div :class="`col-12 md:col-${mode == 'new' ? '12' : '9'}`">
                    <div class="p-fluid grid">
                        <div class="col-12" v-if="itemData.pv_nr" style="margin: 0">
                            <h3>Número do Pós-venda: {{ itemData.pv_nr }}{{ userData.admin >= 2 ? ` (${itemData.id})` : '' }}</h3>
                        </div>
                        <div class="col-12 md:col-9">
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
                                <Button v-if="route.name != 'cadastro'" icon="pi pi-pencil" severity="primary" @click="confirmEditAutoSuggest('cadastro')" :disabled="mode == 'view'" />
                            </div>
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="tipo">Tipo do Pós-venda</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else placeholder="Selecione..." :showClear="!!itemData.tipo" id="tipo" optionLabel="label" optionValue="value" v-model="itemData.tipo" :options="dropdownTiposPv" :disabled="mode == 'view'" />
                        </div>
                        <div class="col-12" v-if="dropdownPipelineByCadastro.length && (itemData.id_pipeline || mode != 'view')">
                            <label for="id_pipeline">Pipeline</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <div class="p-inputgroup flex-1" v-else>
                                <Dropdown
                                    filter
                                    placeholder="Selecione..."
                                    :showClear="!!itemData.id_pipeline"
                                    id="id_pipeline"
                                    optionLabel="label"
                                    optionValue="value"
                                    v-model="itemData.id_pipeline"
                                    :options="dropdownPipelineByCadastro"
                                    :disabled="mode == 'view'"
                                />
                            </div>
                        </div>
                        <div class="col-12 md:col-12" v-if="itemData.observacao || mode != 'view'">
                            <label for="observacao">Observação</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Editor v-else-if="!(loading.form || ['view', 'expandedFormMode'].includes(mode))" v-model="itemData.observacao" id="observacao" editorStyle="height: 160px" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.observacao || ''" class="p-inputtext p-component p-filled p-disabled" />
                        </div>
                    </div>
                    <OatsGrid ref="oatsGrid" v-if="itemData.id && mode == 'view' && !props.idCadastro" :itemDataRoot="{ ...itemData, last_status: itemDataLastStatus.status_pv }" />
                </div>
                <div class="col-12 md:col-3" v-if="!['new', 'expandedFormMode'].includes(mode)">
                    <Fieldset :toggleable="true" class="mb-3">
                        <template #legend>
                            <div class="flex align-items-center text-primary">
                                <span class="pi pi-bolt mr-2"></span>
                                <span class="font-bold text-lg">Ações do Registro</span>
                            </div>
                        </template>
                        <div v-if="mode != 'new' && itemDataLastStatus.status_pv < andamentoRegistroPv.STATUS_FINALIZADO">
                            <Button label="Editar" outlined class="w-full" type="button" v-if="mode == 'view'" icon="fa-regular fa-pen-to-square fa-shake" @click="mode = 'edit'" />
                            <Button label="Salvar" outlined class="w-full mb-3" type="submit" v-if="mode != 'view'" icon="pi pi-save" severity="success" :disabled="!formIsValid()" />
                            <Button label="Cancelar" outlined class="w-full" type="button" v-if="mode != 'view'" icon="pi pi-ban" severity="danger" @click="mode == 'edit' ? reload() : toGrid()" />
                        </div>
                        <div v-if="mode != 'edit'">
                            <hr />
                            <Button
                                v-if="route.name == 'pos-venda'"
                                label="Ir para o Cadastro"
                                type="button"
                                class="w-full mb-3"
                                :icon="`fa-regular fa-address-card fa-shake`"
                                style="color: #a97328"
                                text
                                raised
                                @click="router.push(`/${userData.cliente}/${userData.dominio}/cadastro/${itemData.id_cadastros}`)"
                            />
                            <Button
                                label="Criar OAT"
                                v-if="itemDataLastStatus.status_pv < andamentoRegistroPv.STATUS_FINALIZADO"
                                type="button"
                                class="w-full mb-3"
                                :icon="`fa-solid fa-screwdriver-wrench fa-shake`"
                                style="color: #a97328"
                                text
                                raised
                                @click="showPvOatForm"
                            />
                            <Button
                                label="Finalizar Atendimento"
                                type="button"
                                class="w-full mb-3"
                                :icon="`fa-solid fa-check fa-shake'`"
                                severity="success"
                                :disabled="itemDataLastStatus.status_pv >= andamentoRegistroPv.STATUS_FINALIZADO"
                                text
                                raised
                                @click="statusRecord(andamentoRegistroPv.STATUS_FINALIZADO)"
                            />
                            <Button
                                label="Cancelar Atendimento"
                                v-tooltip.top="'Cancela o atendimento, mas não o exclui!'"
                                v-if="itemDataLastStatus.status_pv < andamentoRegistroPv.STATUS_CANCELADO"
                                type="button"
                                :disabled="!(userData.pv >= 3 && itemData.status == 10)"
                                class="w-full mb-3"
                                :icon="`fa-solid fa-ban`"
                                severity="warning"
                                text
                                raised
                                @click="statusRecord(andamentoRegistroPv.STATUS_CANCELADO)"
                            />
                            <Button
                                label="Reativar Atendimento"
                                v-else-if="itemDataLastStatus.status_pv >= andamentoRegistroPv.STATUS_CANCELADO"
                                type="button"
                                class="w-full mb-3"
                                :icon="`fa-solid fa-file-invoice fa-shake'`"
                                severity="warning"
                                text
                                raised
                                @click="statusRecord(andamentoRegistroPv.STATUS_REATIVADO)"
                            />
                            <Button
                                label="Excluir Atendimento"
                                v-tooltip.top="'Não pode ser desfeito!' + (itemData.id_filho ? ` Se excluir, excluirá o documento relacionado e suas comissões, caso haja!` : '')"
                                type="button"
                                :disabled="!(userData.pv >= 4 && itemData.status != andamentoRegistroPv.STATUS_EXCLUIDO)"
                                class="w-full mb-3"
                                :icon="`fa-solid fa-fire`"
                                severity="danger"
                                text
                                raised
                                @click="statusRecord(andamentoRegistroPv.STATUS_EXCLUIDO)"
                            />
                        </div>
                    </Fieldset>
                    <Fieldset :toggleable="true">
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
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3" v-if="mode == 'new'">
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!formIsValid()" />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="mode == 'edit' ? reload() : toGrid()" />
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
                        <p>mode: {{ mode }}</p>
                        <p>itemData: {{ itemData }}</p>
                        <p v-if="props.idCadastro">idCadastro: {{ props.idCadastro }}</p>
                        <p v-if="props.idPipeline">idPipeline: {{ props.idPipeline }}</p>
                        <p>itemDataLastStatus: {{ itemDataLastStatus }}</p>
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
