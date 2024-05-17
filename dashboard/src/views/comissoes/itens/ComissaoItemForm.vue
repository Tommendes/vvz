<script setup>
import { onBeforeMount, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
import moment from 'moment';
import { useRoute } from 'vue-router';
const route = useRoute();
import { userKey, formatCurrency } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { Mask } from 'maska';
const masks = ref({
    data: new Mask({
        mask: '##/##/####'
    })
});
// Função de emitir eventos
const emit = defineEmits(['newItem', 'cancel', 'refreshPipeline']);
// Andamento do registro
const STATUS_ABERTO = 10;
const STATUS_LIQUIDADO = 20;
const STATUS_ENCERRADO = 30;
const STATUS_FATURADO = 40;

// Url base do form action
const loading = ref(false);
// Campos de formulário
const itemData = ref({});
const itemDataUnmuted = ref({});
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
// Até 10 parcelas
const dropdownParcelas = ref([
    { value: 'U', label: `Unica` },
    { value: '1', label: `1` },
    { value: '2', label: `2` },
    { value: '3', label: `3` },
    { value: '4', label: `4` },
    { value: '5', label: `5` },
    { value: '6', label: `6` },
    { value: '7', label: `7` },
    { value: '8', label: `8` },
    { value: '9', label: `9` },
    { value: '10', label: `10` },
    { value: '11', label: `11` },
    { value: '12', label: `12` }
]);
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
                itemDataUnmuted.value = { ...axiosRes.data };
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
    return true;
};

// Salvar dados do formulário
const saveData = async () => {
    if (!formIsValid()) return;
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    const obj = { ...itemData.value };
    axios[method](url, obj)
        .then(async (res) => {
            emit('refreshPipeline');
            if (method == 'post') {
                emit('newItem');
                return;
            }
            emit('cancel');
            itemData.value = res.data;
            itemDataUnmuted.value = { ...res.data };
            if (itemData.value && itemData.value.id) {
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
        message: 'Confirma que deseja EXCLUIR este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            axios
                .delete(`${urlBase.value}/${itemData.value.id}`)
                .then(async () => {
                    defaultSuccess('Registro excluído com sucesso!');
                    emit('cancel');
                    emit('refreshPipeline');
                })
                .catch((err) => {
                    defaultWarn(err.response.data);
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
        status_comis: STATUS_ENCERRADO
    };
    confirm.require({
        group: `comisLiquidateConfirm-${itemData.value.id}`,
        header: 'Confirmar liquidação',
        message: 'Confirma que deseja LIQUIDAR este registro?',
        message2: '<strong>Esta operação não poderá ser desfeita e a comissão será liberada para pagamento</strong>',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: async () => {
            await axios.post(`${baseApiUrl}/comis-status/f-a/set`, bodyStatus).then(async () => {
                await loadData();
                emit('cancel');
            });
        },
        reject: () => {
            return false;
        }
    });
};
const programateItem = () => {
    const bodyStatus = {
        id_comissoes: itemData.value.id,
        status_comis: STATUS_LIQUIDADO
    };
    confirm.require({
        group: `comisLiquidateConfirm-${itemData.value.id}`,
        header: 'Confirmar liquidação',
        message: 'Confirma que deseja LIQUIDAR este registro?',
        message2: '<strong>Esta operação ainda poderá ser desfeita cancelando a liquidação</strong>',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: async () => {
            await axios.post(`${baseApiUrl}/comis-status/f-a/set`, bodyStatus).then(async () => {
                await loadData();
                emit('refreshPipeline');
            });
        },
        reject: () => {
            return false;
        }
    });
};
const unprogramateItem = () => {
    const bodyStatus = {
        id_comissoes: itemData.value.id,
        status_comis: STATUS_LIQUIDADO,
        remove_status: true
    };
    confirm.require({
        group: `comisLiquidateConfirm-${itemData.value.id}`,
        header: 'Confirmar',
        message: 'Confirma que deseja CANCELAR esta liquidação?',
        message2: '<strong>Você poderá liquidar novamente a qualquer momento</strong>',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: async () => {
            await axios.post(`${baseApiUrl}/comis-status/f-a/set`, bodyStatus).then(async () => {
                await loadData();
                emit('refreshPipeline');
            });
        },
        reject: () => {
            return false;
        }
    });
};
const setFiscalDone = () => {
    const bodyStatus = {
        id_comissoes: itemData.value.id,
        status_comis: STATUS_FATURADO
    };
    confirm.require({
        group: `setFiscalDoneConfirm-${itemData.value.id}`,
        header: 'Confirmar faturamento',
        message: 'Confirma que este registro foi FATURADO?',
        message2: '<strong>Esta operação ainda poderá ser desfeita cancelando a informação</strong>',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: async () => {
            await axios.post(`${baseApiUrl}/comis-status/f-a/set`, bodyStatus).then(async () => {
                await loadData();
                emit('refreshPipeline');
            });
        },
        reject: () => {
            return false;
        }
    });
};
const setFiscalUnDone = () => {
    const bodyStatus = {
        id_comissoes: itemData.value.id,
        status_comis: STATUS_FATURADO,
        remove_status: true
    };
    confirm.require({
        group: `setFiscalDoneConfirm-${itemData.value.id}`,
        header: 'Exlcuir faturamento',
        message: 'Confirma que este registro foi NÃO FOI FATURADO ou o faturamento foi CANCELADO?',
        message2: '<strong>Você ainda poderá confirmar o faturamento posteriormente</strong>',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: async () => {
            await axios.post(`${baseApiUrl}/comis-status/f-a/set`, bodyStatus).then(async () => {
                await loadData();
                emit('refreshPipeline');
            });
        },
        reject: () => {
            return false;
        }
    });
};
const bodyMultiplicate = ref({
    status_comis: STATUS_ABERTO,
    parcelas: 1,
    valor_base_um: itemData.value.valor_base,
    valor_base_demais: 0
});
const multiplicateItem = (event) => {
    bodyMultiplicate.value.parcelas = 1;
    bodyMultiplicate.value.id_comissoes = itemData.value.id;
    confirm.require({
        group: `comisMultiplicateConfirm-${itemData.value.id}`,
        target: event.currentTarget,
        message: `Selecione abaixo a quantidade de parcelas.<br />O valor deste lançamento será dividido entre elas`,
        icon: 'fa-solid fa-circle-exclamation',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptLabel: 'Confirmar',
        rejectLabel: 'Ainda não',
        rejectClass: 'p-button-outlined p-button-sm',
        acceptClass: 'p-button-sm',
        accept: async () => {
            itemData.value.bodyMultiplicate = bodyMultiplicate.value;
            await saveData();
        },
        reject: () => {
            return false;
        }
    });
};
// Listar agentes de negócio
const listAgentesComissionamento = async () => {
    let url = `${baseApiUrl}/comis-agentes/f-a/gag`;
    await axios.get(url).then((res) => {
        dropdownAgentes.value = [];
        res.data.map((item) => {
            // Preciso retornar apenas o primeir e segundo nome. Mas tem que ter cuidado pois o nome pode ser composto por apenas um nome
            if (item.nome) {
                const nome = item.nome.split(' ');
                if (nome.length > 1) {
                    ['de', 'da', 'do', 'dos', 'das'].includes(nome[1].toLowerCase()) ? nome.splice(1, 1) : [];
                    item.nome = `${nome[0]} ${nome[1]} - ${item.cpf_cnpj}`;
                } else item.nome = nome[0];
            }
            dropdownAgentes.value.push({ value: item.id, label: `${item.apelido || item.nome} (${item.ordem})`, ar: item.agente_representante });
            // Ordene os itens em dropdownAgentes por ordem crescente e baseado em label
            dropdownAgentes.value.sort((a, b) => {
                return a.label.localeCompare(b.label);
            });
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
const STATUS_ABERTO = 10
const STATUS_LIQUIDADO = 20
const STATUS_ENCERRADO = 30
*/
const itemDataStatusPreload = ref([
    {
        status: STATUS_ABERTO,
        action: 'Criação',
        label: 'Criado',
        icon: 'fa-solid fa-plus',
        color: '#3b82f6'
    },
    {
        status: STATUS_LIQUIDADO,
        action: 'Liquidação',
        label: 'Liquidado',
        icon: 'fa-solid fa-shopping-cart',
        color: '#4cd07d'
    },
    {
        status: STATUS_ENCERRADO,
        action: 'Encerramento',
        label: 'Encerrado',
        icon: 'fa-solid fa-check',
        color: '#607D8B'
    },
    {
        status: STATUS_FATURADO,
        action: 'Faturamento',
        label: 'Faturamento informado',
        icon: 'fa-solid fa-cash-register',
        color: '#45590d'
    }
]);
// Listar status do registro
const listStatusRegistro = async () => {
    setTimeout(async () => {
        const url = `${baseApiUrl}/comis-status/${props.itemDataRoot.id || itemData.value.id}`;
        await axios.get(url).then((res) => {
            if (res.data && res.data.data.length > 0) {
                // Status_faturado não entra como status de comissionamento do registro
                itemDataLastStatus.value = res.data.data[res.data.data.length - 1 - (res.data.data[res.data.data.length - 1].status_comis == STATUS_FATURADO)];
                itemData.value.status_comis = itemDataLastStatus.value.status_comis;
                itemDataStatus.value = [];
                res.data.data.forEach((element) => {
                    const status = itemDataStatusPreload.value.filter((item) => {
                        return item.status == element.status_comis;
                    });
                    // Se encontrato uma ocorrência de status_faturado, então o registro está faturado
                    if (!itemDataLastStatus.value.faturado && element.status_comis == STATUS_FATURADO) itemDataLastStatus.value.faturado = true;
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
// Calcule o valor da comissão ao alterar o valor base ou o percentual. Lembrando que valor_base e percentual estão no formato 0,99 e precisam ser convertidos para o calculo. E depois de feito o calculo, o valor da comissão deve ser formatado para 0,99
// Como sugestão, pode-se armazenar os valores em duas variáveis separadas, uma para o valor base e outra para o percentual, e depois fazer o calculo e armazenar o valor da comissão em uma terceira variável
// Por fim o valor da comissão deve ser formatado para 0,99 em itemData.value.valor.
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
// Calcule bodyMultiplicate.valor_base_um e bodyMultiplicate.valor_base_demais considerando que o resultado não pode ser uma dízima. Considere que o usuári opode digitar uma quantidade em bodyMultiplicate.parcelas
// que faça com que o valor da primeir aparcela possa ser alguns centavos a mais ou a menos do que o valor base dividido pela quantidade de parcelas. Daí, calcule o valor das demais parcelas
watchEffect(() => {
    if (bodyMultiplicate.value.parcelas > 1) {
        const valorBase = parseFloat(itemData.value.valor_base.replace(',', '.'));
        const parcelas = parseInt(bodyMultiplicate.value.parcelas);

        // Calcular valor da primeira parcela
        let valorBaseUm = Math.floor((valorBase / parcelas) * 100) / 100; // Arredonda para baixo
        if (valorBaseUm * parcelas < valorBase) {
            valorBaseUm = Math.ceil((valorBase / parcelas) * 100) / 100; // Arredonda para cima
        }

        // Calcular valor das demais parcelas
        const valorBaseDemais = ((valorBase - valorBaseUm) / (parcelas - 1)).toFixed(2);

        bodyMultiplicate.value.valor_base_um = valorBaseUm.toFixed(2).replace('.', ',');
        bodyMultiplicate.value.valor_base_demais = valorBaseDemais.replace('.', ',');
    }
});
</script>

<template>
    <ConfirmPopup :group="`comisMultiplicateConfirm-${itemData.id}`">
        <template #message="slotProps">
            <div class="flex flex-column align-items-center w-full gap-3 border-bottom-1 surface-border p-3 mb-3 pb-0">
                <i :class="slotProps.message.icon" class="text-6xl text-primary-500"></i>
                <div class="text-center text-xl" v-html="slotProps.message.message" />
                <InputText
                    :class="`mb-${bodyMultiplicate.parcelas > 1 ? '0' : '3'}`"
                    autocomplete="no"
                    v-model="bodyMultiplicate.parcelas"
                    id="parcelas"
                    type="number"
                    v-maska
                    data-maska="##"
                    placeholder="Parcelas"
                    min="1"
                    max="10"
                    @keydown.enter.prevent
                />
                <div class="text-center mb-3 text-xl" v-if="bodyMultiplicate.parcelas > 1">
                    O valor da parcela 1 será atualizado para {{ formatCurrency(bodyMultiplicate.valor_base_um) }}<br />e {{ bodyMultiplicate.parcelas > 2 ? `as seguintes` : 'a próxima' }} para
                    {{ formatCurrency(bodyMultiplicate.valor_base_demais) }}.<br />Se estiver de acordo, clique em confirmar, abaixo
                </div>
            </div>
        </template>
    </ConfirmPopup>
    <ConfirmDialog :group="`comisLiquidateConfirm-${itemData.id}`">
        <template #container="{ message, acceptCallback, rejectCallback }">
            <div class="flex flex-column align-items-center p-5 surface-overlay border-round">
                <div class="border-circle bg-primary inline-flex justify-content-center align-items-center h-6rem w-6rem -mt-8">
                    <i class="fa-solid fa-question text-5xl"></i>
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
    <ConfirmDialog :group="`setFiscalDoneConfirm-${itemData.id}`">
        <template #container="{ message, acceptCallback, rejectCallback }">
            <div class="flex flex-column align-items-center p-5 surface-overlay border-round">
                <div class="border-circle bg-primary inline-flex justify-content-center align-items-center h-6rem w-6rem -mt-8">
                    <i class="fa-solid fa-question text-5xl"></i>
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
        <div class="flex overflow-x-auto gap-1 mb-2">
            <div class="flex-grow-1 flex align-items-center justify-content-center">
                <div class="p-inputgroup" data-pc-name="inputgroup" data-pc-section="root">
                    <div class="p-inputgroup-addon" data-pc-name="inputgroupaddon" data-pc-section="root"><i class="fa-regular fa-user"></i></div>
                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                    <Dropdown
                        v-else
                        filter
                        placeholder="Selecione o agente"
                        :showClear="!!itemData.id_comis_agentes"
                        id="unidade_tipos"
                        optionLabel="label"
                        optionValue="value"
                        v-model="itemData.id_comis_agentes"
                        :options="dropdownAgentes"
                        :disabled="['view'].includes(mode)"
                    >
                        <template #option="slotProps">
                            <div class="p-dropdown-item">{{ slotProps.option.label }}</div>
                        </template>
                    </Dropdown>
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
                    <span class="p-inputtext p-component p-filled p-variant-filled" v-else>{{ itemData.valor }}</span>
                </div>
            </div>
            <div class="flex-none flex">
                <div class="p-inputgroup" data-pc-name="inputgroup" data-pc-section="root">
                    <div class="p-inputgroup-addon" data-pc-name="inputgroupaddon" data-pc-section="root"><i class="fa-solid fa-list-ol"></i></div>
                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                    <Dropdown v-else filter placeholder="Parcela" id="parcela" optionLabel="label" optionValue="value" v-model="itemData.parcela" :options="dropdownParcelas" :disabled="['view'].includes(mode)" />
                </div>
            </div>
            <div class="flex-none flex">
                <div class="p-inputgroup" data-pc-name="inputgroup" data-pc-section="root">
                    <Button
                        type="submit"
                        :disabled="!(userData.comissoes >= 2)"
                        v-if="['edit', 'new'].includes(mode) || (mode == 'new' && canAddCommission)"
                        v-tooltip.top="'Salvar comissão'"
                        icon="fa-solid fa-floppy-disk"
                        severity="success"
                        text
                        raised
                    />
                    <Button
                        type="button"
                        :disabled="!(userData.comissoes >= 3)"
                        v-if="itemDataLastStatus.status_comis < STATUS_ENCERRADO && mode == 'view'"
                        v-tooltip.top="'Editar comissão'"
                        icon="fa-regular fa-pen-to-square"
                        text
                        raised
                        @click="mode = 'edit'"
                    />
                    <Button
                        type="button"
                        :disabled="!(userData.financeiro >= 3 || userData.comissoes >= 3)"
                        v-if="itemDataLastStatus.status_comis != STATUS_LIQUIDADO && ['view'].includes(mode)"
                        v-tooltip.top="'Liquidar comissão'"
                        icon="fa-regular fa-calendar-check"
                        severity="success"
                        text
                        raised
                        @click="programateItem"
                    />
                    <Button
                        :disabled="!(userData.financeiro >= 3 || userData.comissoes >= 3)"
                        type="button"
                        v-else-if="itemDataLastStatus.status_comis == STATUS_LIQUIDADO && ['view'].includes(mode)"
                        v-tooltip.top="'Cancelar liquidação'"
                        icon="fa-regular fa-calendar-xmark"
                        severity="warning"
                        text
                        raised
                        @click="unprogramateItem"
                    />
                    <!-- <Button type="button" v-if="itemDataLastStatus.status_comis < 30 && ['view'].includes(mode)" v-tooltip.top="'Liquidar comissão'" icon="fa-solid fa-bolt" severity="success" text raised @click="liquidateItem" /> -->
                    <Button
                        type="button"
                        :disabled="!(userData.comissoes >= 2)"
                        v-if="itemDataLastStatus.status_comis == STATUS_ABERTO && itemDataUnmuted.parcela == 'U' && ['view'].includes(mode)"
                        v-tooltip.top="[0, 1].includes(props.itemDataRoot.agente_representante) ? 'Parcelar recebimento' : 'Parcelar pagamento'"
                        icon="fa-solid fa-ellipsis-vertical"
                        severity="success"
                        text
                        raised
                        @click="multiplicateItem"
                    />
                    <Button
                        type="button"
                        :disabled="!(userData.fiscal >= 3)"
                        v-if="!itemDataLastStatus.faturado && props.itemDataRoot.agente_representante == '0' && ['view'].includes(mode)"
                        v-tooltip.top="'Confirmar faturamento'"
                        icon="fa-solid fa-cash-register"
                        style="color: #45590d"
                        text
                        raised
                        @click="setFiscalDone"
                    />
                    <Button
                        type="button"
                        :disabled="!(userData.fiscal >= 3)"
                        v-if="itemDataLastStatus.faturado && props.itemDataRoot.agente_representante == '0' && ['view'].includes(mode)"
                        v-tooltip.top="'Remover faturamento'"
                        icon="fa-solid fa-cash-register"
                        severity="warning"
                        text
                        raised
                        @click="setFiscalUnDone"
                    />
                    <Button type="button" v-if="['new', 'edit'].includes(mode)" v-tooltip.top="'Cancelar edição'" icon="fa-solid fa-ban" severity="danger" text raised @click="cancel" />
                    <Button type="button" v-if="itemData.id" v-tooltip.top="'Mostrar o timeline da comissão'" icon="fa-solid fa-timeline" severity="info" text raised @click="showTimeLine = !showTimeLine" />
                    <Button
                        type="button"
                        :disabled="!(userData.comissoes >= 4)"
                        v-if="itemDataLastStatus.status_comis < STATUS_ENCERRADO && ['view'].includes(mode)"
                        v-tooltip.top="'Excluir comissão'"
                        icon="fa-solid fa-trash"
                        severity="danger"
                        text
                        raised
                        @click="deleteItem"
                    />
                </div>
            </div>
        </div>
        <Fieldset class="bg-green-200 mb-1" toggleable :collapsed="true" v-if="userData.admin >= 2">
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
            <p>faturado: {{ itemDataLastStatus.faturado }}</p>
        </Fieldset>
    </form>
</template>

<style scoped>
.p-dropdown-item {
    font-weight: 500;
    padding: 0.25rem 0.25rem;
}
</style>
