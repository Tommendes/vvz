<script setup>
import { ref, onMounted, inject } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import EditorComponent from '@/components/EditorComponent.vue';

import { andamentoRegistroPv, andamentoRegistroPvOat, formatValor } from '@/global';
import { useRouter } from 'vue-router';
const router = useRouter();
import moment from 'moment';

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile();
});

// Campos de formulário
const itemData = ref({});
// Dados do Cadastro
const itemDataCadastro = ref({});
const dataAceite = ref(null);
// Modo do formulário
const mode = ref('view');
const errorMessages = ref({});
// Dropdowns
const dropdownEnderecos = ref([]);
const dropdownTecnicos = ref([]);
const dropdownIntExt = ref([
    { value: '0', label: 'Interno' },
    { value: '1', label: 'Externo' }
]);
const dropdownGarantia = ref([
    { value: '0', label: 'Não' },
    { value: '1', label: 'Sim' }
]);
// Loadings
const loading = ref(true);
// Props do template
const dialogRef = inject('dialogRef');
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/pv-oat/${dialogRef.value.data.idPv}`);
// Carragamento de dados do form
const loadData = async () => {
    loading.value = true;
    if (dialogRef.value.data.idCadastro) {
        loadEnderecos();
    }
    if (dialogRef.value.data.idPvOat) {
        const url = `${urlBase.value}/${dialogRef.value.data.idPvOat}`;
        await axios.get(url).then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);
                body.int_ext = String(body.int_ext);
                body.garantia = String(body.garantia);
                body.id_cadastro_endereco = String(body.id_cadastro_endereco);
                if (body.id_tecnico) body.id_tecnico = String(body.id_tecnico);
                if (body.aceite_do_cliente) dataAceite.value = moment(body.aceite_do_cliente).format('DD/MM/YYYY');
                // Se body.valor_total então formate o valor com duas casas decimais em português
                if (body.valor_total) body.valor_total = formatValor(body.valor_total);
                itemData.value = body;
                itemData.value.id_cadastros = dialogRef.value.data.idCadastro;
                // Lista o andamento do registro
                await listStatusRegistro();
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${uProf.value.schema_description}/pos-venda` });
            }
        });
    } else {
        itemData.value = {
            id_pv: dialogRef.value.data.idPv,
            id_cadastros: dialogRef.value.data.idCadastro,
            id_cadastro_endereco: undefined,
            id_tecnico: undefined,
            nr_oat: undefined,
            int_ext: undefined,
            garantia: undefined,
            nf_garantia: undefined,
            pessoa_contato: undefined,
            telefone_contato: undefined,
            email_contato: undefined,
            valor_total: undefined,
            aceite_do_cliente: undefined,
            descricao: undefined
        };
    }
    await loadEnderecoBasico();
    loading.value = false;
    if (!dialogRef.value.data.idPvOat) mode.value = 'new';
};
// Recarregar dados do formulário
const reload = async () => {
    mode.value = 'view';
    await loadData();
    emit('cancel');
};
const loadEnderecos = async () => {
    const url = `${baseApiUrl}/cad-enderecos/${dialogRef.value.data.idCadastro}`;
    await axios.get(url).then((res) => {
        res.data.data.map((item) => {
            const label = `${item.logradouro}${item.nr ? ', ' + item.nr : ''}${item.complnr ? ' ' + item.complnr : ''}${item.bairro ? ' - ' + item.bairro : ''}${uProf.value.admin >= 2 ? ` (${item.id})` : ''}`;
            dropdownEnderecos.value.push({ value: String(item.id), label: label });
        });
    });
};
const loadTecnicos = async () => {
    const url = `${baseApiUrl}/pv-tecnicos`;
    await axios.get(url).then((res) => {
        res.data.data.map((item) => {
            dropdownTecnicos.value.push({ value: String(item.id), label: item.tecnico });
        });
    });
};
const loadEnderecoBasico = async () => {
    const url = `${baseApiUrl}/cadastros/${dialogRef.value.data.idCadastro}`;
    await axios.get(url).then((res) => {
        const body = res.data;
        if (body && body.id) {
            body.id = String(body.id);
            itemDataCadastro.value = body;
            const endereco = itemDataCadastro.value.logradouro + (itemDataCadastro.value.nr ? ', ' + itemDataCadastro.value.nr : '') + ' - (Cadastro Principal)';
            dropdownEnderecos.value.push({ value: String(0), label: endereco });
        }
    });
};
const clone = async () => {
    const url = `${urlBase.value}`;
    const obj = { ...itemData.value };
    // delete obj.id;
    delete obj.nr_oat;
    delete obj.evento;
    delete obj.created_at;
    delete obj.updated_at;
    obj.status = andamentoRegistroPvOat.STATUS_OS;
    // Se body.valor_total então antes de salvar formate o valor com duas casas decimais em inglês
    if (obj.valor_total) obj.valor_total = formatValor(obj.valor_total, 'en');
    await axios
        .post(url, obj)
        .then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro clonado com sucesso');
                closeDialog();
            } else {
                defaultWarn('Erro ao clonar registro');
            }
        })
        .catch((error) => {
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
        });
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
    // Se body.valor_total então antes de salvar formate o valor com duas casas decimais em inglês
    if (obj.valor_total) obj.valor_total = formatValor(obj.valor_total, 'en');
    obj.int_ext = obj.int_ext ? 1 : 0;
    obj.garantia = obj.garantia ? 1 : 0;
    axios[method](url, obj)
        .then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                body.id = String(body.id);
                body.int_ext = String(body.int_ext);
                body.garantia = String(body.garantia);
                itemData.value = body;
                itemData.value.id_cadastros = dialogRef.value.data.idCadastro;
                if (itemData.value.valor_total) itemData.value.valor_total = formatValor(itemData.value.valor_total);
                mode.value = 'view';
                emit('changed');
                await listStatusRegistro();
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((error) => {
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
        });
};

/**
 * Status do registro
 */
// Preload de status do registro
const itemDataStatus = ref([]);
const itemDataLastStatus = ref({
    status_pv_oat: andamentoRegistroPvOat.STATUS_OS
});

/*
STATUS_OS = 10;
STATUS_PROPOSTA = 30;
STATUS_PEDIDO = 40;
STATUS_EXECUTANDO = 60;
STATUS_FATURADO = 80;
STATUS_FINALIZADO = 90;
STATUS_REATIVADO = 97;
STATUS_CANCELADO = 98;
STATUS_EXCLUIDO = 99;

INTERNO = 0;
EXTERNO = 1;

GARANTIA_INDEFINIDO = -1;
GARANTIA_NAO = 0;
GARANTIA_SIM = 1;
*/

const itemDataStatusPreload = ref([
    {
        status: andamentoRegistroPvOat.STATUS_OS,
        action: 'Registrar OAT',
        label: 'OAT Criada',
        icon: 'fa-solid fa-plus',
        color: '#3b82f6'
    },
    {
        status: andamentoRegistroPvOat.STATUS_PROPOSTA,
        action: 'Registrar Proposta',
        label: 'Proposta Criada',
        icon: 'fa-solid fa-plus',
        color: '#3b82f6'
    },
    {
        status: andamentoRegistroPvOat.STATUS_PEDIDO,
        action: 'Aguardar peças', //Registrar Pedido
        label: 'Aguardando de peças',
        icon: 'fa-solid fa-retweet',
        color: '#195825'
    },
    {
        status: andamentoRegistroPvOat.STATUS_EXECUTANDO,
        action: 'Iniciar execução',
        label: 'Serviço em andamento',
        icon: 'fa-solid fa-ellipsis',
        color: '#4cd07d'
    },
    {
        status: andamentoRegistroPvOat.STATUS_FATURADO,
        action: 'Faturar',
        label: 'Em faturamento',
        icon: 'fa-solid fa-ellipsis',
        color: '#4cd07d'
    },
    {
        status: andamentoRegistroPvOat.STATUS_FINALIZADO,
        action: 'Finalizar',
        label: 'Finalizado',
        icon: 'fa-solid fa-check',
        color: '#607D8B'
    },
    {
        status: andamentoRegistroPvOat.STATUS_REATIVADO,
        action: 'Reativar',
        label: 'Reativado',
        icon: 'fa-solid fa-retweet',
        color: '#195825'
    },
    {
        status: andamentoRegistroPvOat.STATUS_CANCELADO,
        action: 'Cancelar',
        label: 'Cancelado',
        icon: 'fa-solid fa-xmark',
        color: '#8c221c'
    },
    {
        status: andamentoRegistroPvOat.STATUS_EXCLUIDO,
        action: 'Excluir',
        label: 'Excluído',
        icon: 'fa-solid fa-ban',
        color: '#8c221c'
    }
]);
// Listar status do registro
const listStatusRegistro = async () => {
    const url = `${baseApiUrl}/pv-oat-status/${itemData.value.id}`;
    await axios.get(url).then((res) => {
        if (res.data && res.data.data.length > 0) {
            itemDataLastStatus.value = res.data.data[res.data.data.length - 1];
            itemData.value.status_pv_oat = itemDataLastStatus.value.status_pv_oat;
            itemDataStatus.value = [];
            res.data.data.forEach((element) => {
                const status = itemDataStatusPreload.value.filter((item) => {
                    return item.status == element.status_pv_oat;
                });
                if (status && status[0])
                    itemDataStatus.value.push({
                        // date recebe 2022-10-31 15:09:38 e deve converter para 31/10/2022 15:09:38
                        date: moment(element.created_at).format('DD/MM/YYYY HH:mm:ss').replaceAll(':00', '').replaceAll(' 00', ''),
                        status: status[0].label + (uProf.value.admin >= 2 ? ' ' + status[0].status : ''),
                        icon: status[0].icon,
                        color: status[0].color
                    });
            });
        }
    });
};
// Ferramentas do registro
const statusRecord = async (status) => {
    const url = `${urlBase.value}/${itemData.value.id}?st=${status}`;
    const optionsConfirmation = {
        group: 'templating',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger'
    };
    if ([andamentoRegistroPvOat.STATUS_CANCELADO, andamentoRegistroPvOat.STATUS_EXCLUIDO, andamentoRegistroPvOat.STATUS_FINALIZADO].includes(status)) {
        let startMessage = '';
        if (andamentoRegistroPvOat.STATUS_EXCLUIDO == status) startMessage = 'Essa operação não poderá ser revertida. ';
        confirm.require({
            ...optionsConfirmation,
            header: 'Confirmar',
            message: `${startMessage}Confirma que deseja ${itemDataStatusPreload.value.filter((item) => item.status == status)[0].action.toLowerCase()}?`,
            accept: async () => {
                await axios.delete(url, itemData.value).then(async () => {
                    const msgDone = `Registro ${itemDataStatusPreload.value.filter((item) => item.status == status)[0].label.toLowerCase()} com sucesso`;
                    if ([andamentoRegistroPvOat.STATUS_FINALIZADO, andamentoRegistroPvOat.STATUS_EXCLUIDO].includes(status)) {
                        // Fecha o formulário
                        closeDialog();
                    } else if ([andamentoRegistroPvOat.STATUS_CANCELADO].includes(status)) {
                        // Recarrega o registro
                        reload();
                    }
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
const imprimirOat = async () => {
    defaultSuccess('Por favor aguarde...');
    const url = `${baseApiUrl}/printing/oat/`;
    await axios
        .post(url, { idOat: itemData.value.id, encoding: 'base64', exportType: 'pdf' })
        .then((res) => {
            const body = res.data;
            let pdfWindow = window.open('');
            pdfWindow.document.write(`<iframe width='100%' height='100%' src='data:application/pdf;base64, ${encodeURI(body)} '></iframe>`);
        })
        .catch((error) => {
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
        });
};
// Fchar formulário
const closeDialog = () => {
    dialogRef.value.close();
};

const formIsValid = () => {
    return true;
};
const openInNewTab = (url) => {
    window.open(url, '_blank');
};
// Carregar dados do formulário
onMounted(async () => {
    await loadTecnicos();
    await loadData();
});
</script>

<template>
    <form @submit.prevent="saveData">
        <div class="grid">
            <div :class="`col-12 md:col-${mode == 'new' ? '12' : '9'}`">
                <div class="p-fluid formgrid grid">
                    <div class="col-12 md:col-5">
                        <label for="id_cadastro_endereco">Endereço do atendimento</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <Dropdown v-else id="id_cadastro_endereco" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.id_cadastro_endereco" :options="dropdownEnderecos" />
                    </div>
                    <div class="col-12 md:col-3">
                        <label for="id_tecnico">Técnico responsável</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <Dropdown v-else id="id_tecnico" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.id_tecnico" :options="dropdownTecnicos" />
                    </div>
                    <div class="col-12 md:col-2">
                        <label for="int_ext">Interno/Externo</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <Dropdown v-else id="int_ext" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.int_ext" :options="dropdownIntExt" />
                    </div>
                    <div class="col-12 md:col-2">
                        <label for="garantia">Garantia</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <Dropdown v-else id="garantia" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.garantia" :options="dropdownGarantia" />
                    </div>
                    <div class="col-12 md:col-2">
                        <label for="nf_garantia">NF do produto</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" :required="itemData.garantia == 1" v-model="itemData.nf_garantia" id="nf_garantia" type="text" />
                    </div>
                    <div class="col-12 md:col-3">
                        <label for="pessoa_contato">Contato no cliente</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.pessoa_contato" id="pessoa_contato" type="text" />
                    </div>
                    <div class="col-12 md:col-2">
                        <label for="telefone_contato">Telefone do contato</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.telefone_contato" id="telefone_contato" type="text" />
                        <small id="text-error" class="p-error" v-if="errorMessages.telefone_contato">{{ errorMessages.telefone_contato }}</small>
                    </div>
                    <div class="col-12 md:col-3">
                        <label for="email_contato">Email do contato</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email_contato" id="email_contato" type="text" />
                        <small id="text-error" class="p-error" v-if="errorMessages.email_contato">{{ errorMessages.email_contato }}</small>
                    </div>
                    <div class="col-12 md:col-2">
                        <label for="valor_total">Valor dos serviços</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                            <span class="p-inputgroup-addon">R$</span>
                            <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_total" id="valor_total" type="text" v-maska data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                        </div>
                    </div>
                    <div class="col-12 md:col-12" v-if="itemData.aceite_do_cliente">
                        <h3>Este serviço foi autorizado na data de {{ dataAceite }}</h3>
                    </div>
                    <div class="col-12 md:col-12">
                        <label for="descricao">Descrição dos serviços</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <EditorComponent v-else :readonly="loading || ['view', 'expandedFormMode'].includes(mode)" v-model="itemData.descricao" id="descricao" :editorStyle="{ height: '320px' }" aria-describedby="editor-error" />
                    </div>
                </div>
            </div>
            <div class="col-12" v-if="mode == 'new'">
                <div class="col-12 card flex justify-content-center flex-wrap gap-3">
                    <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                    <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="fa-solid fa-ban" severity="danger" text raised @click="mode == 'new' ? closeDialog() : (mode = 'view')" />
                </div>
            </div>
            <div class="col-12 md:col-3" v-if="!['new', 'expandedFormMode'].includes(mode)">
                <Fieldset :toggleable="true" class="mb-3">
                    <template #legend>
                        <div class="flex align-items-center text-primary">
                            <span class="fa-solid fa-bolt mr-2"></span>
                            <span class="font-bold text-lg">Ações do Registro</span>
                        </div>
                    </template>
                    <div v-if="dialogRef.data.lastStatus < andamentoRegistroPv.STATUS_FINALIZADO && itemDataLastStatus.status_pv_oat < andamentoRegistroPvOat.STATUS_FINALIZADO">
                        <Button label="Editar" outlined class="w-full" type="button" v-if="mode == 'view'" icon="fa-regular fa-pen-to-square fa-shake" @click="mode = 'edit'" />
                        <Button label="Salvar" outlined class="w-full mb-3" type="submit" v-if="mode != 'view'" icon="fa-solid fa-floppy-disk" severity="success" />
                        <Button label="Cancelar" outlined class="w-full" type="button" v-if="mode != 'view'" icon="fa-solid fa-ban" severity="danger" @click="mode == 'edit' ? reload() : closeDialog()" />
                    </div>
                    <div v-if="mode != 'edit'">
                        <hr />
                        <Button
                            label="Ir ao Cadastro"
                            type="button"
                            class="w-full mb-3"
                            :icon="`fa-regular fa-address-card fa-shake`"
                            style="color: #a97328"
                            text
                            raised
                            @click="openInNewTab(`#/${uProf.schema_description}/cadastro/${dialogRef.data.idCadastro}`)"
                        />
                        <Button
                            label="Finalizar Oat"
                            type="button"
                            class="w-full mb-3"
                            :icon="`fa-solid fa-check fa-shake'`"
                            severity="success"
                            :disabled="itemDataLastStatus.status_pv_oat >= andamentoRegistroPvOat.STATUS_FINALIZADO"
                            text
                            raised
                            @click="statusRecord(andamentoRegistroPvOat.STATUS_FINALIZADO)"
                        />
                        <Button
                            label="Clonar Oat"
                            type="button"
                            class="w-full mb-3"
                            :icon="`fa-solid fa-clone fa-shake'`"
                            severity="success"
                            :disabled="dialogRef.data.lastStatus >= andamentoRegistroPv.STATUS_FINALIZADO"
                            text
                            raised
                            @click="clone()"
                        />
                        <Button
                            label="Imprimir Oat"
                            type="button"
                            class="w-full mb-3"
                            :icon="`fa-solid fa-print fa-shake'`"
                            style="color: #1d067a"
                            :disabled="itemDataLastStatus.status_pv_oat >= andamentoRegistroPvOat.STATUS_EXCLUIDO"
                            text
                            raised
                            @click="imprimirOat()"
                        />
                        <Button
                            label="Cancelar Oat"
                            v-tooltip.top="'Cancela o Oat, mas não o exclui!'"
                            v-if="itemDataLastStatus.status_pv_oat < andamentoRegistroPvOat.STATUS_CANCELADO"
                            type="button"
                            :disabled="!(uProf.pv >= 3 && itemData.status == 10)"
                            class="w-full mb-3"
                            :icon="`fa-solid fa-ban`"
                            severity="warning"
                            text
                            raised
                            @click="statusRecord(andamentoRegistroPvOat.STATUS_CANCELADO)"
                        />
                        <Button
                            label="Reativar Oat"
                            v-else-if="itemDataLastStatus.status_pv_oat >= andamentoRegistroPvOat.STATUS_CANCELADO"
                            type="button"
                            class="w-full mb-3"
                            :icon="`fa-solid fa-file-invoice fa-shake'`"
                            severity="warning"
                            text
                            raised
                            @click="statusRecord(andamentoRegistroPvOat.STATUS_REATIVADO)"
                        />
                        <Button
                            label="Excluir Oat"
                            v-tooltip.top="'Não pode ser desfeito!' + (itemData.id_filho ? ` Se excluir, excluirá o documento relacionado e suas comissões, caso haja!` : '')"
                            type="button"
                            :disabled="!(uProf.pv >= 4 && itemData.status != andamentoRegistroPvOat.STATUS_EXCLUIDO)"
                            class="w-full mb-3"
                            :icon="`fa-solid fa-fire`"
                            severity="danger"
                            text
                            raised
                            @click="statusRecord(andamentoRegistroPvOat.STATUS_EXCLUIDO)"
                        />
                    </div>
                </Fieldset>
                <Fieldset :toggleable="true">
                    <template #legend>
                        <div class="flex align-items-center text-primary">
                            <span class="fa-solid fa-clock mr-2"></span>
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
        </div>
    </form>
    <div class="col-12" v-if="uProf.admin >= 2">
        <div class="card bg-green-200 mt-3">
            <p>Mode: {{ mode }}</p>
            <p>itemData: {{ itemData }}</p>
            <p>itemDataCadastro: {{ itemDataCadastro }}</p>
            <p>PV last status (dialogRef.data): {{ dialogRef.data }}</p>
            <p>itemDataLastStatus: {{ itemDataLastStatus }}</p>
        </div>
    </div>
</template>
<style>
.p-input-filled .p-inputtext {
    background-color: #ffffff00;
}

.p-input-filled .p-dropdown {
    background-color: #ffffff00;
}
</style>
