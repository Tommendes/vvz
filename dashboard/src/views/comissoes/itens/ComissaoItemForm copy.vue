<script setup>
import { onBeforeMount, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';

import { formatCurrency } from '@/global';
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
import moment from 'moment';

import { guide } from '@/guides/comissaoForm.js';

// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);

import { Mask } from 'maska';
const masks = ref({
    data: new Mask({
        mask: '##/##/####'
    })
});

// Andamento do registro
const STATUS_NAO_PROGRAMADO = 10;
const STATUS_EM_PROGRAMACAO_LIQUIDACAO = 20;
const STATUS_LIQUIDADO = 30;

// Url base do form action
const userData = JSON.parse(json);
const loading = ref(false);
// Campos de formulário
const itemData = ref({});
// Eventos do registro
const itemDataEventos = ref({});
const comissionamento = ref({ R: { M: 0, S: 0 }, A: { M: 0, S: 0 } });
const commissioningValues = ref(null);
const canAddCommission = ref(false);
// Emit do template
const emit = defineEmits(['newItem', 'updatedItem', 'reload']);
const props = defineProps({
    itemDataPipeline: Object, // O próprio pipeline
    itemDataRoot: Object, // O próprio registro
    itemDataComissionamento: Object,
    parentMode: String
});
const maxCommission = ref(0);
const urlBase = ref(`${baseApiUrl}/comissoes`);
// Dropdowns
const dropdownAgentes = ref([]);
const mode = ref('view');

// Carrega os dados do form
const loadData = async () => {
    loading.value = true;
    const id = props.itemDataRoot.id || itemData.value.id;
    if (id) {
        const url = `${urlBase.value}/${id}`;
        setTimeout(async () => {
            await axios.get(url).then(async (axiosRes) => {
                itemData.value = axiosRes.data;
                if (itemData.value.liquidar_em) itemData.value.liquidar_em = masks.value.data.masked(moment(itemData.value.liquidar_em).format('DD/MM/YYYY'));
                // Lista o andamento do registro
            });
            // Lista o andamento do registro
            await listStatusRegistro();
            // Eventos do registro
            await getEventos();
        }, Math.random * 1000 + 250);
    } else itemData.value.id_pipeline = props.itemDataComissionamento.id;
    getMaxCommissioningValue();
    loading.value = false;
};

// Lista os eventos do registro
const getEventos = async () => {
    setTimeout(async () => {
        const id = props.itemDataRoot.id || itemData.value.id;
        const url = `${baseApiUrl}/sis-events/${id}/comissoes/get-events`;
        await axios.get(url).then((res) => {
            if (res.data && res.data.length > 0) {
                itemDataEventos.value = res.data;
                itemDataEventos.value.forEach((element) => {
                    if (element.classevento.toLowerCase() == 'insert') element.evento = 'Criação do registro';
                    else if (element.classevento.toLowerCase() == 'update')
                        element.evento =
                            `Edição do registro` +
                            (userData.gestor >= 1
                                ? `. Para mais detalhes <a href="#/${userData.schema_description}/eventos?tabela_bd=pipeline&id_registro=${element.id_registro}" target="_blank">acesse o log de eventos</a> e pesquise: Tabela = pipeline; Registro = ${element.id_registro}. Número deste evento: ${element.id}`
                                : '');
                    else if (element.classevento.toLowerCase() == 'remove') element.evento = 'Exclusão ou cancelamento do registro';
                    else if (element.classevento.toLowerCase() == 'conversion') element.evento = 'Registro convertido para pedido';
                    else if (element.classevento.toLowerCase() == 'commissioning')
                        element.evento =
                            `Lançamento de comissão` +
                            (userData.comissoes >= 1
                                ? `. Para mais detalhes <a href="#/${userData.schema_description}/eventos?tabela_bd=pipeline&id_registro=${element.id_registro}" target="_blank">acesse o log de eventos</a> e pesquise: Tabela = pipeline; Registro = ${element.id_registro}. Número deste evento: ${element.id}`
                                : '');
                    element.data = moment(element.created_at).format('DD/MM/YYYY HH:mm:ss').replaceAll(':00', '').replaceAll(' 00', '');
                });
            } else {
                itemDataEventos.value = [
                    {
                        evento: 'Não há registro de log eventos para este registro'
                    }
                ];
            }
        });
    }, Math.random() * 1000);
};

// Validar formulário
const formIsValid = () => {
    const liquidarEmIsValid = itemData.value.liquidar_em ? moment(itemData.value.liquidar_em, 'DD/MM/YYYY', true).isValid() : true;
    if (!liquidarEmIsValid) {
        defaultWarn('Data de liquidação inválida');
        return false;
    }
    return liquidarEmIsValid;
};

// Salvar dados do formulário
const saveData = async () => {
    if (!formIsValid()) return;
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    const obj = { ...itemData.value };
    if (obj.liquidar_em) obj.liquidar_em = moment(obj.liquidar_em, 'DD/MM/YYYY').format('YYYY-MM-DD');
    else obj.liquidar_em = null;
    axios[method](url, obj)
        .then(async (res) => {
            itemData.value = res.data;
            if (itemData.value && itemData.value.id) {
                if (itemData.value.liquidar_em) itemData.value.liquidar_em = masks.value.data.masked(moment(itemData.value.liquidar_em).format('DD/MM/YYYY'));
                if (itemData.value.valor) itemData.value.valor = itemData.value.valor.replace('.', ',');
                defaultSuccess('Registro salvo com sucesso');
                if (mode.value == 'new') emit('newItem');
                else emit('updatedItem');
                mode.value = 'view';
                await listStatusRegistro();
                getMaxCommissioningValue();
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((err) => {
            defaultWarn(err.response.data);
        });
};
// Exclui o registro
const deleteItem = () => {
    confirm.require({
        group: 'templating',
        header: 'Confirmar exclusão',
        message: 'Você tem certeza que deseja EXCLUIR este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            axios.delete(`${urlBase.value}/${itemData.value.id}`).then(async () => {
                defaultSuccess('Registro excluído com sucesso!');
                emit('reload');
            });
        },
        reject: () => {
            return false;
        }
    });
};
// Liquida o registro
const liquidateItem = () => {
    const bodyStatus = {
        id_comissoes: itemData.value.id,
        status_comis: STATUS_LIQUIDADO
    };
    confirm.require({
        group: 'comisLiquidateConfirm',
        header: 'Confirmar liquidação',
        message: 'Você tem certeza que deseja LIQUIDAR este registro?',
        message2: '<strong>Esta operação não poderá ser desfeita e a comissão será liberada para pagamento</strong>',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: async () => {
            if (!itemData.value.liquidar_em) {
                itemData.value.liquidar_em = moment().format('DD/MM/YYYY');
                itemData.value.bodyStatus = bodyStatus;
                await saveData();
                emit('updatedItem');
                await loadData();
            } else {
                await axios.post(`${baseApiUrl}/comis-status/f-a/set`, bodyStatus).then(async () => {
                    emit('updatedItem');
                    await loadData();
                });
            }
        },
        reject: () => {
            return false;
        }
    });
};
// Listar agentes de negócio
const listAgentesComissionamento = async () => {
    let url = `${baseApiUrl}/comis-agentes/f-a/gag?agente_representante`;
    await axios.get(url).then((res) => {
        dropdownAgentes.value = [];
        res.data.map((item) => {
            dropdownAgentes.value.push({ value: item.id, label: `${item.nome} (${item.ordem})`, ar: item.agente_representante });
        });
    });
};
const getAgentesField = (value, field) => {
    const item = dropdownAgentes.value.find((item) => item.value == value);
    return item ? item[field] : '';
};
const getAR = () => {
    itemData.value.agente_representante = getAgentesField(itemData.value.id_comis_agentes, 'ar');
    getMaxCommissioningValue();
};

const getMaxCommissioningValue = async () => {
    loading.value = true;
    setTimeout(async () => {
        const url = `${urlBase.value}/f-a/gmc?id_pipeline=${props.itemDataPipeline.id}`;
        // resete comissionamento
        comissionamento.value = { R: { M: 0, S: 0 }, A: { M: 0, S: 0 } };
        await axios.get(url).then((axiosRes) => {
            commissioningValues.value = axiosRes.data;
            commissioningValues.value.forEach((element) => {
                switch (element.repres_sum) {
                    case 'repres_sum':
                        comissionamento.value.R = { ...comissionamento.value.R, S: Number(element.valor) };
                        break;
                    case 'repres_max':
                        comissionamento.value.R = { ...comissionamento.value.R, M: Number(element.valor) };
                        break;
                    case 'agentes_sum':
                        comissionamento.value.A = { ...comissionamento.value.A, S: Number(element.valor) };
                        break;
                    case 'agentes_max':
                        comissionamento.value.A = { ...comissionamento.value.A, M: Number(element.valor) };
                        break;
                }
            });
            if (itemData.value.agente_representante == 1 && comissionamento.value.R.M > comissionamento.value.R.S) canAddCommission.value = true;
            else if (itemData.value.agente_representante == 0 && comissionamento.value.A.M > comissionamento.value.A.S) canAddCommission.value = true;
            else canAddCommission.value = false;
        });
        if (itemData.value.agente_representante == 1) maxCommission.value = Number(comissionamento.value.R.M - comissionamento.value.R.S).toFixed(2);
        else if (itemData.value.agente_representante == 0) maxCommission.value = Number(comissionamento.value.A.M - comissionamento.value.A.S).toFixed(2);
        if (mode.value != 'new') maxCommission.value = Number(maxCommission.value) + Number(itemData.value.valor.replace(',', '.'));
        maxCommission.value = maxCommission.value ? maxCommission.value : '0,00';
        maxCommission.value = formatCurrency(maxCommission.value);
    }, Math.random() * 1000 + 250);
    loading.value = false;
};
// Recarregar dados do formulário
const reload = () => {
    emit('reload');
};
const cancel = () => {
    if (mode.value == 'view') emit('reload');
    else if (mode.value == 'edit') mode.value = 'view';
};

/**
 * Status do registro
 */
// Preload de status do registro
const itemDataStatus = ref([]);
const itemDataLastStatus = ref({});
/*
const STATUS_NAO_PROGRAMADO = 10
const STATUS_EM_PROGRAMACAO_LIQUIDACAO = 20
const STATUS_LIQUIDADO = 30
*/
const itemDataStatusPreload = ref([
    {
        status: '10',
        action: 'Criação',
        label: 'Criado',
        icon: 'fa-solid fa-plus',
        color: '#3b82f6'
    },
    {
        status: '20',
        action: 'Liquidação',
        label: 'Liquidado',
        icon: 'fa-solid fa-shopping-cart',
        color: '#4cd07d'
    },
    {
        status: '30',
        action: 'Encerramento',
        label: 'Enderrado',
        icon: 'fa-solid fa-check',
        color: '#607D8B'
    }
]);
// Listar status do registro
const listStatusRegistro = async () => {
    setTimeout(async () => {
        const url = `${baseApiUrl}/comis-status/${props.itemDataRoot.id || itemData.value.id}`;
        await axios.get(url).then((res) => {
            if (res.data && res.data.data.length > 0) {
                itemDataLastStatus.value = res.data.data[res.data.data.length - 1];
                itemData.value.status_comis = itemDataLastStatus.value.status_comis;
                itemDataStatus.value = [];
                res.data.data.forEach((element) => {
                    const status = itemDataStatusPreload.value.filter((item) => {
                        return item.status == element.status_comis;
                    });
                    itemDataStatus.value.push({
                        // date recebe 2022-10-31 15:09:38 e deve converter para 31/10/2022 15:09:38
                        date: moment(element.created_at).format('DD/MM/YYYY HH:mm:ss').replaceAll(':00', '').replaceAll(' 00', ''),
                        user: element.name,
                        status: status[0].label,
                        statusCode: element.status_comis,
                        icon: status[0].icon,
                        color: status[0].color
                    });
                });
            }
        });
    }, Math.random() * 1000 + 250);
};
/**
 * Fim de status do registro
 */

// Carregar dados do formulário
onBeforeMount(() => {
    mode.value = props.parentMode;
    setTimeout(async () => {
        await loadData();
        await listAgentesComissionamento();
    }, Math.random() * 1000 + 250);
});
</script>

<template>
    <ConfirmDialog group="comisLiquidateConfirm">
        <template #container="{ message, acceptCallback, rejectCallback }">
            <div class="flex flex-column align-items-center p-5 surface-overlay border-round">
                <div class="border-circle bg-primary inline-flex justify-content-center align-items-center h-6rem w-6rem -mt-8">
                    <i class="pi pi-question fa-fade text-5xl"></i>
                </div>
                <span class="font-bold text-2xl block mb-2 mt-4">{{ message.header }}</span>
                <p class="mb-0" v-html="message.message" />
                <p class="mb-0" v-html="message.message2" />
                <div class="flex align-items-center gap-2 mt-4">
                    <Button label="Confirmar" @click="acceptCallback"></Button>
                    <Button label="Ainda não" outlined @click="rejectCallback"></Button>
                </div>
            </div>
        </template>
    </ConfirmDialog>
    <form @submit.prevent="saveData" @keydow.enter.prevent>
        <div class="grid">
            <div :class="`col-12 md:col-${itemDataStatus.length > 0 ? '8' : '12'}`">
                <h5 v-if="itemData.id">{{ itemData.id && userData.admin >= 1 ? `Registro: (${itemData.id})` : '' }} (apenas suporte)</h5>
                <div class="p-fluid formgrid grid">
                    <div class="field col-12 md:col-12">
                        <label for="id_comis_agentes">Agente/Representação Comissionado</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <Dropdown
                            v-else
                            filter
                            placeholder="Selecione..."
                            :showClear="!!itemData.id_comis_agentes"
                            id="unidade_tipos"
                            optionLabel="label"
                            optionValue="value"
                            v-model="itemData.id_comis_agentes"
                            :options="dropdownAgentes"
                            :disabled="['view'].includes(mode)"
                            @change="getAR()"
                        />
                    </div>
                    <div class="field col-12 md:col-4">
                        <label for="valor">Valor Máximo da Comissão ({{ maxCommission }})</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor" id="valor" type="text" v-maska data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                    </div>
                    <div class="field col-12 md:col-4">
                        <label for="desconto">Descontar</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.desconto" id="desconto" type="text" v-maska data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                    </div>
                    <div class="field col-12 md:col-4">
                        <label for="liquidar_em">Liquidar em</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <Calendar v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.liquidar_em" showIcon :showOnFocus="false" showButtonBar dateFormat="dd/mm/yy" />
                    </div>
                    <div class="field col-12 md:col-12">
                        <label for="observacao">Observação</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.observacao" id="observacao" type="text" />
                    </div>
                </div>
                <div class="card flex justify-content-center flex-wrap gap-3">
                    <Button type="button" v-if="itemDataLastStatus.status_comis < 30 && mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-beat" text raised @click="mode = 'edit'" />
                    <Button type="submit" v-if="mode == 'edit' || (mode == 'new' && canAddCommission)" label="Salvar" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                    <Button type="button" v-if="itemDataLastStatus.status_comis < 30 && ['view'].includes(mode)" label="Liquidar" icon="fa-solid fa-bolt fa-fade" severity="success" text raised @click="liquidateItem" />
                    <Button type="button" v-if="itemDataLastStatus.status_comis < 30 && ['view'].includes(mode)" label="Excluir" icon="fa-solid fa-trash" severity="danger" text raised @click="deleteItem" />
                    <Button type="button" v-if="['new', 'edit'].includes(mode)" label="Cancelar" icon="fa-solid fa-ban" severity="danger" text raised @click="cancel" />
                    <Button type="button" v-else label="Sair" icon="fa-solid fa-door-open" text raised @click="reload" />
                </div>
            </div>
            <div v-if="itemDataStatus.length > 0" class="col-12 md:col-4">
                <Fieldset :toggleable="true" class="mb-3" v-if="itemData.id">
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
                        <template #content="slotProps"> {{ slotProps.item.status }} por {{ slotProps.item.user }}{{ userData.admin >= 2 ? `(${slotProps.item.statusCode})` : '' }} </template>
                    </Timeline>
                </Fieldset>
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
            <div v-if="itemDataEventos.length > 0" class="col-12 md:col-12">
                <Fieldset class="bg-orange-200 mb-3" toggleable :collapsed="true">
                    <template #legend>
                        <div class="flex align-items-center text-primary">
                            <span class="fa-solid fa-circle-info mr-2"></span>
                            <span class="font-bold text-lg">Eventos do registro</span>
                        </div>
                    </template>
                    <div class="m-0" v-for="item in itemDataEventos" :key="item.id">
                        <h4 v-if="item.data">Em {{ item.data }}: {{ item.user }}</h4>
                        <p v-html="item.evento" class="mb-3" />
                    </div>
                </Fieldset>
            </div>
            <Fieldset class="bg-green-200 mt-3" toggleable :collapsed="false" v-if="userData.admin >= 2">
                <template #legend>
                    <div class="flex align-items-center text-primary">
                        <span class="fa-solid fa-circle-info mr-2"></span>
                        <span class="font-bold text-lg">FormData</span>
                    </div>
                </template>
                <p>parentMode: {{ parentMode }}</p>
                <p>mode: {{ mode }}</p>
                <p>itemDataPipeline: {{ props.itemDataPipeline }}</p>
                <p>itemData: {{ itemData }}</p>
                <p>itemDataEventos: {{ itemDataEventos }}</p>
                <p>props.itemDataRoot: {{ props.itemDataRoot }}</p>
                <p>props.itemDataComissionamento: {{ props.itemDataComissionamento }}</p>
                <p>Comissionamento Representantes: {{ comissionamento.R.M }} > {{ comissionamento.R.S }} = {{ comissionamento.R.M > comissionamento.R.S }}</p>
                <p>Comissionamento Agentes: {{ comissionamento.A.M }} > {{ comissionamento.A.S }} = {{ comissionamento.A.M > comissionamento.A.S }}</p>
                <p>canAddCommission: {{ canAddCommission }}</p>
                <p>maxCommission: {{ maxCommission }}</p>
                <p>itemDataLastStatus: {{ itemDataLastStatus }}</p>
            </Fieldset>
        </div>
    </form>
</template>
