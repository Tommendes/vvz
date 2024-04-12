<script setup>
import { onBeforeMount, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
import moment from 'moment';
import { useRoute } from 'vue-router';
const route = useRoute();

// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);

import { Mask } from 'maska';
import { watchEffect } from 'vue';
const masks = ref({
    data: new Mask({
        mask: '##/##/####'
    })
});
// Função de emitir eventos
const emit = defineEmits(['newItem', 'cancel', 'refreshPipeline']);
// Andamento do registro
const STATUS_NAO_PROGRAMADO = 10;
const STATUS_EM_PROGRAMACAO_LIQUIDACAO = 20;
const STATUS_LIQUIDADO = 30;

// Url base do form action
const userData = JSON.parse(json);
const loading = ref(false);
// Campos de formulário
const itemData = ref({});
const showTimeLine = ref(false);
// Eventos do registro
const itemDataEventos = ref({});
const canAddCommission = ref(false);
const props = defineProps({
    itemDataRoot: Object // O próprio registro
});
const urlBase = ref(`${baseApiUrl}/comissoes`);
// Dropdowns
const dropdownAgentes = ref([]);
const mode = ref('new');

// Carrega os dados do form
const loadData = async () => {
    loading.value = true;
    const id = props.itemDataRoot.id || itemData.value.id;
    if (id) {
        mode.value = 'view';
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
    } else itemData.value.id_pipeline = route.params.id;
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
            emit('refreshPipeline');
            if (method == 'post') {
                emit('newItem');
                return;
            }
            emit('cancel');
            itemData.value = res.data;
            if (itemData.value && itemData.value.id) {
                if (itemData.value.liquidar_em) itemData.value.liquidar_em = masks.value.data.masked(moment(itemData.value.liquidar_em).format('DD/MM/YYYY'));
                if (itemData.value.valor_base) itemData.value.valor_base = itemData.value.valor_base.replace('.', ',');
                if (itemData.value.percentual) itemData.value.percentual = itemData.value.percentual.replace('.', ',');
                if (itemData.value.valor) itemData.value.valor = itemData.value.valor.replace('.', ',');
                defaultSuccess('Registro salvo com sucesso');
                mode.value = 'view';
                await listStatusRegistro();
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
                emit('cancel');
                emit('refreshPipeline');
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
        group: `comisLiquidateConfirm-${itemData.value.id}`,
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
                await loadData();
            } else {
                await axios.post(`${baseApiUrl}/comis-status/f-a/set`, bodyStatus).then(async () => {
                    await loadData();
                    emit('cancel');
                });
            }
        },
        reject: () => {
            return false;
        }
    });
};
const programateItem = () => {
    const bodyStatus = {
        id_comissoes: itemData.value.id,
        status_comis: STATUS_EM_PROGRAMACAO_LIQUIDACAO
    };
    confirm.require({
        group: `comisLiquidateConfirm-${itemData.value.id}`,
        header: 'Confirmar liberação',
        message: 'Você tem certeza que deseja LIBERAR este registro para liquidação?',
        message2: '<strong>Esta operação ainda poderá ser desfeita cancelando a programação</strong>',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: async () => {
            if (!itemData.value.liquidar_em) {
                itemData.value.liquidar_em = moment().format('DD/MM/YYYY');
                itemData.value.bodyStatus = bodyStatus;
                await saveData();
                await loadData();
            } else {
                await axios.post(`${baseApiUrl}/comis-status/f-a/set`, bodyStatus).then(async () => {
                    await loadData();
                    emit('cancel');
                });
            }
        },
        reject: () => {
            return false;
        }
    });
};
const unprogramateItem = () => {
    const bodyStatus = {
        id_comissoes: itemData.value.id,
        status_comis: STATUS_NAO_PROGRAMADO
    };
    confirm.require({
        group: `comisLiquidateConfirm-${itemData.value.id}`,
        header: 'Confirmar',
        message: 'Você tem certeza que deseja RETIRAR este registro da programação?',
        message2: '<strong>Você poderá liberar novamente a liquidação a qualquer momento</strong>',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: async () => {
            itemData.value.liquidar_em = null;
            itemData.value.bodyStatus = bodyStatus;
            await saveData();
            await loadData();
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
// Recarregar dados do formulário
const cancel = async () => {
    if (itemData.value.id) await loadData();
    else emit('cancel');
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
        action: 'Programação',
        label: 'Programado para liquidação',
        icon: 'fa-solid fa-shopping-cart',
        color: '#4cd07d'
    },
    {
        status: '30',
        action: 'Liquidação',
        label: 'Liquidado',
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
    setTimeout(async () => {
        await loadData();
        await listAgentesComissionamento();
    }, Math.random() * 1000 + 250);
});
// calcule o valor da comissão ao alterar o valor base ou o percentual. Lembrando que valor_base e percentual estão no formato 0,99 e precisam ser convertidos para o calculo. E depois de feito o calculo, o valor da comissão deve ser formatado para 0,99
// Como sugestão, podesse armazenar os valores em duas variáveis separadas, uma para o valor base e outra para o percentual, e depois fazer o calculo e armazenar o valor da comissão em uma terceira variável
// Por fim o valor da comissão deve ser formatado para 0,99 em itemData.value.valor
watchEffect(() => {
    if (itemData.value.valor_base && itemData.value.percentual) {
        const valorBase = parseFloat(itemData.value.valor_base.replace(',', '.'));
        const percentual = parseFloat(itemData.value.percentual.replace(',', '.'));
        const valor = valorBase * (percentual / 100);
        itemData.value.valor = valor.toFixed(2).replace('.', ',');
    } else {
        itemData.value.valor = '';
    }
});
</script>

<template>
    <ConfirmDialog :group="`comisLiquidateConfirm-${itemData.id}`">
        <template #container="{ message, acceptCallback, rejectCallback }">
            <div class="flex flex-column align-items-center p-5 surface-overlay border-round">
                <div class="border-circle bg-primary inline-flex justify-content-center align-items-center h-6rem w-6rem -mt-8">
                    <i class="pi pi-question text-5xl"></i>
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
    <Dialog v-model:visible="showTimeLine" modal header="Timeline do registro" :style="{ width: '25rem' }">
        <Timeline :value="itemDataStatus">
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
        <div class="flex justify-content-center gap-2 mt-3">
            <Button type="button" label="Fechar" severity="" @click="showTimeLine = false"></Button>
        </div>
    </Dialog>
    <form @submit.prevent="saveData">
        <div class="flex gap-1 mb-2">
            <div class="flex-grow-1 flex align-items-center justify-content-center">
                <div class="p-inputgroup" data-pc-name="inputgroup" data-pc-section="root">
                    <div class="p-inputgroup-addon" data-pc-name="inputgroupaddon" data-pc-section="root"><i class="fa-regular fa-user"></i></div>
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
                    />
                </div>
            </div>
            <div class="flex-none flex">
                <div class="p-inputgroup" data-pc-name="inputgroup" data-pc-section="root">
                    <div class="p-inputgroup-addon" data-pc-name="inputgroupaddon" data-pc-section="root">R$</div>
                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                    <InputText
                        v-else
                        autocomplete="no"
                        :disabled="mode == 'view'"
                        v-model="itemData.valor_base"
                        id="valor_base"
                        type="text"
                        v-maska
                        data-maska="0,99"
                        data-maska-tokens="0:\d:multiple|9:\d:optional"
                        placeholder="Valor base"
                        @keydown.enter.prevent
                    />
                </div>
            </div>
            <div class="flex-none flex">
                <div class="p-inputgroup" data-pc-name="inputgroup" data-pc-section="root">
                    <div class="p-inputgroup-addon" data-pc-name="inputgroupaddon" data-pc-section="root">%</div>
                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                    <InputText
                        v-else
                        autocomplete="no"
                        :disabled="mode == 'view'"
                        v-model="itemData.percentual"
                        id="percentual"
                        type="text"
                        v-maska
                        data-maska="0,99"
                        data-maska-tokens="0:\d:multiple|9:\d:optional"
                        placeholder="Percentual"
                        @keydown.enter.prevent
                    />
                </div>
            </div>
            <div class="flex-none flex">
                <div class="p-inputgroup" data-pc-name="inputgroup" data-pc-section="root">
                    <div class="p-inputgroup-addon" data-pc-name="inputgroupaddon" data-pc-section="root">R$</div>
                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                    <spam class="p-inputtext p-component p-filled p-variant-filled" v-else>{{ itemData.valor }}</spam>
                </div>
            </div>
            <div class="flex-none flex">
                <div class="p-inputgroup" data-pc-name="inputgroup" data-pc-section="root">
                    <div class="p-inputgroup-addon" data-pc-name="inputgroupaddon" data-pc-section="root"><i class="fa-regular fa-calendar-check"></i></div>
                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                    <Calendar v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.liquidar_em" :showOnFocus="true" showButtonBar dateFormat="dd/mm/yy" />
                </div>
            </div>
            <div class="flex-none flex">
                <div class="p-inputgroup" data-pc-name="inputgroup" data-pc-section="root">
                    <Button type="submit" v-if="['edit', 'new'].includes(mode) || (mode == 'new' && canAddCommission)" v-tooltip.top="'Salvar registro'" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                    <Button type="button" v-if="itemDataLastStatus.status_comis < 30 && mode == 'view'" v-tooltip.top="'Editar registro'" icon="fa-regular fa-pen-to-square" text raised @click="mode = 'edit'" />
                    <Button type="button" v-if="itemDataLastStatus.status_comis < 20 && ['view'].includes(mode)" v-tooltip.top="'Liberar pagamento'" icon="fa-regular fa-calendar-check" severity="warning" text raised @click="programateItem" />
                    <Button
                        type="button"
                        v-else-if="itemDataLastStatus.status_comis == 20 && ['view'].includes(mode)"
                        v-tooltip.top="'Excluir liberação de pagamento'"
                        icon="fa-regular fa-calendar-xmark"
                        severity="warning"
                        text
                        raised
                        @click="unprogramateItem"
                    />
                    <Button type="button" v-if="itemDataLastStatus.status_comis < 30 && ['view'].includes(mode)" v-tooltip.top="'Liquidar comissão'" icon="fa-solid fa-bolt" severity="success" text raised @click="liquidateItem" />
                    <Button type="button" v-if="['new', 'edit'].includes(mode)" v-tooltip.top="'Cancelar edição'" icon="fa-solid fa-ban" severity="danger" text raised @click="cancel" />
                    <Button type="button" v-if="itemData.id" v-tooltip.top="'Mostrar o timeline do registro'" icon="fa-solid fa-timeline" severity="info" text raised @click="showTimeLine = !showTimeLine" />
                    <Button type="button" v-if="itemDataLastStatus.status_comis < 30 && ['view'].includes(mode)" v-tooltip.top="'Excluir registro'" icon="fa-solid fa-trash" severity="danger" text raised @click="deleteItem" />
                </div>
            </div>
        </div>
        <Fieldset class="bg-green-200 mb-1" toggleable :collapsed="true" v-if="userData.admin >= 3">
            <template #legend>
                <div class="flex align-items-center text-primary">
                    <span class="fa-solid fa-circle-info mr-2"></span>
                    <span class="font-bold text-lg">FormData</span>
                </div>
            </template>
            <p>mode: {{ mode }}</p>
            <p>itemData: {{ itemData }}</p>
            <p>itemDataEventos: {{ itemDataEventos }}</p>
            <p>props.itemDataRoot: {{ props.itemDataRoot }}</p>
            <p>canAddCommission: {{ canAddCommission }}</p>
            <p>itemDataLastStatus: {{ itemDataLastStatus }}</p>
        </Fieldset>
    </form>
</template>
