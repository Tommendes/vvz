<script setup>
import { onMounted, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import ComissaoItemForm from './ComissaoItemForm.vue';
import { defaultWarn, defaultSuccess } from '@/toast';

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
const gridData = ref(null);
const itemData = ref({});
const itemDataGroup = ref({});
const urlBase = ref(`${baseApiUrl}/comissoes`);
const mode = ref('grid');

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile()
});

import { guide } from '@/guides/comissoesGrid.js';

// Props do template
const props = defineProps({
    itemDataRoot: Object, // O próprio cadastro,
    modeRoot: String // Modo do formulário
});

// Dropdowns
const dropdownAgentes = ref([]);
// Lista de status

// Andamento do registro
const STATUS_ENCERRADO = 30;
const dropdownStatus = ref([
    { label: 'Criado/Lançado', value: '10', severity: 'danger' },
    { label: 'Liquidado', value: '20', severity: 'warning' },
    { label: 'Encerrado', value: '30', severity: 'success' },
    { label: 'Faturado', value: '40', style: 'color: #45590d' }
]);
// Carrega os dados da grid
const reload = async () => {
    await loadData();
    cancelNewItem();
};
// Carrega os dados da grid
const loadData = async () => {
    const url = `${urlBase.value}?id_pipeline=${props.itemDataRoot.id}`;
    setTimeout(async () => {
        gridData.value = [];
        setTimeout(() => { }, 100);
        await axios
            .get(url)
            .then((axiosRes) => {
                gridData.value = axiosRes.data.data;
                gridData.value.map((item) => {
                    const situacao = item.last_status_comiss;
                    item.situacao = getStatusField(situacao, 'label');
                });
            })
            .catch((error) => {
                defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
                if (error.response && error.response.status == 401) router.push('/');
            });
    }, Math.random() * 1000 + 250);
    cancelNewItem();
};
defineExpose({ loadData }); // Expondo a função para o componente pai
// Adicionar novo item
const newItem = () => {
    mode.value = 'newItem';
    itemData.value = {
        id_pipeline: props.itemDataRoot.id,
        agente_representante: null,
        id_comis_agentes: null,
        valor_base: null,
        percentual: null,
        valor: null
    };
    // scrollToTop();
};
const cancelNewItem = () => {
    mode.value = 'grid';
    itemData.value = {};
};
// Agendar liquidação em grupo
const scheduleGroupSettlement = () => {
    confirm.require({
        group: 'comisGroupLiquidateConfirm',
        header: 'Programar liquidação dos pendentes',
        message: [
            `Confirma a programação de liquidação deste${pendingCommissionsQuantity() > 1 ? 's ' + pendingCommissionsQuantity() : ''} registro${pendingCommissionsQuantity() > 1 ? 's' : ''} pendente${pendingCommissionsQuantity() > 1 ? 's' : ''}?`,
            'Essa operação ainda poderá ser revertida enquanto não houver o encerramento.'
        ],
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            scheduleGroup();
        },
        reject: () => {
            return;
        }
    });
};
// Executar liquidação em grupo
const executeGroupSettlement = () => {
    confirm.require({
        group: 'comisGroupLiquidateConfirm',
        header: 'Liquidação total dos programados',
        message: [`Confirma a liquidação deste${pendingCommissionsQuantity() > 1 ? 's' : ''} ${pendingCommissionsQuantity()} registros?`, 'Essa operação <strong>NÃO PODERÁ SER REVERTIDA</strong>.'],
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            liquidateGroup();
        },
        reject: () => {
            return;
        }
    });
};
// Listar agentes de negócio
const listAgentesComissionamento = async () => {
    let url = `${baseApiUrl}/comis-agentes/f-a/gag?agente_representante`;
    await axios.get(url).then((res) => {
        dropdownAgentes.value = [];
        res.data.map((item) => {
            dropdownAgentes.value.push({ value: item.id, label: `${item.nome} (${item.ordem})` });
        });
    });
};

// Validar formulário
const formIsValid = () => {
    return true;
};

// Liquidar em grupo
const scheduleGroup = () => {
    if (!formIsValid()) return;
    const url = `${urlBase.value}`;
    let obj = [];
    gridData.value.forEach((element) => {
        if (element.last_status_comiss < 30) {
            const newItem = { id: element.id, last_status_comiss: element.last_status_comiss };
            obj.push(newItem);
        }
    });
    axios.patch(url, obj).then(async (res) => {
        defaultSuccess(res.data);
        await loadData();
    });
};
// Liquidar em grupo
const liquidateGroup = async () => {
    if (!formIsValid()) return;
    let shouldLoadData = false;
    for (const element of gridData.value) {
        if (element.last_status_comiss < 30) {
            const bodyStatus = {
                id_comissoes: element.id,
                status_comis: STATUS_ENCERRADO
            };
            await axios.post(`${baseApiUrl}/comis-status/f-a/set`, bodyStatus);
            shouldLoadData = true;
        }
    }
    if (shouldLoadData) {
        await loadData();
        defaultSuccess('Liquidação realizada com sucesso');
    } else {
        defaultWarn('Não há registros programados para liquidação');
    }
};
// Função de emitir eventos
const emit = defineEmits(['refreshPipeline']);
const refreshPipeline = async () => {
    await loadData();
    emit('refreshPipeline');
};
const getStatusField = (value, field = 'label') => {
    const item = dropdownStatus.value.find((item) => item.value == value);
    return item ? item[field] : '';
};
const pendingCommissionsQuantity = () => {
    return gridData.value.filter((item) => item.last_status_comiss < 20).length;
};
const hasPendingCommissions = () => {
    return gridData.value.some((item) => item.last_status_comiss < 20);
};
const infoDialogisVisible = ref(false);
// Carrega as operações básicas do formulário
onMounted(async () => {
    await loadData();
    await listAgentesComissionamento();
});
</script>

<template>
    <Dialog id="InfoDialog" v-model:visible="infoDialogisVisible" modal :pt="{
        root: 'border-none',
        mask: {
            style: 'backdrop-filter: blur(5px)'
        }
    }">
        <template #container="{ closeCallback }">
            <div class="flex flex-column px-5 py-5 gap-4"
                style="border-radius: 12px; background-image: radial-gradient(circle at left top, var(--blue-400), var(--blue-700), var(--blue-400)); color: #fff">
                <div class="block mx-auto text-8xl">
                    <i class="fa-solid fa-circle-info fa-fade"></i>
                </div>
                <div class="block mx-auto text-2xl">
                    <p class="mb-3 text-center text-white">Ainda resta informar a data de liquidação de um ou mais
                        registros</p>
                    <p class="mb-3 text-center text-white">Favor informar primeiro</p>
                    <p class="mb-3 text-center text-white">Se desejar, pode programar em grupo com o botão abaixo<br />e
                        depois executar a liquidação total novamente</p>
                </div>

                <div class="flex justify-content-center align-items-center gap-3">
                    <Button label="Ok" @click="closeCallback" text
                        class="w-10rem p-button-lg text-primary-50 border-1 border-white-alpha-30 hover:bg-white-alpha-10"></Button>
                    <Button type="button" icon="fa-solid fa-file-invoice-dollar fa-fade" label="Liquidar todos"
                        v-on:click="closeCallback" @click="scheduleGroupSettlement()" text
                        v-tooltip.top="'Clique para liquidar todas as comissões pendentes'"
                        class="p-button-lg text-primary-50 border-1 border-white-alpha-30 hover:bg-white-alpha-10" />
                </div>
            </div>
        </template>
    </Dialog>
    <ConfirmDialog group="comisGroupLiquidateConfirm">
        <template #container="{ message, acceptCallback, rejectCallback }">
            <div class="flex flex-column align-items-center p-5 surface-overlay border-round">
                <div
                    class="border-circle bg-primary inline-flex justify-content-center align-items-center h-6rem w-6rem -mt-8">
                    <i class="fa-solid fa-question text-5xl"></i>
                </div>
                <span class="font-bold text-2xl block mb-2 mt-4">{{ message.header }}</span>
                <p class="mb-1" v-for="(item, index) in message.message" :key="index" v-html="item" />
                <div class="flex align-items-center gap-2 mt-4">
                    <Button label="Confirmar" @click="acceptCallback"></Button>
                    <Button label="Ainda não" outlined @click="rejectCallback"></Button>
                </div>
            </div>
        </template>
    </ConfirmDialog>
    <div class="flex justify-content-end gap-3 mb-5">
        <Button type="button" icon="fa-solid fa-plus" label="Nova Comissão" :disabled="!(uProf.comissoes >= 2)" outlined
            @click="newItem()" v-tooltip.top="'Clique para registrar uma nova comissão'" />
        <Button v-if="gridData && gridData.length > 0" type="button" icon="fa-solid fa-file-invoice-dollar"
            label="Liquidar todos" :outlined="hasPendingCommissions()" :disabled="!hasPendingCommissions()"
            @click="scheduleGroupSettlement()"
            v-tooltip.top="'Clique para liberar o pagamento de todas as comissões pendentes'" />
        <!-- <Button
            v-if="gridData && gridData.length > 0"
            type="button"
            icon="fa-solid fa-bolt"
            label="Liquidar os programados"
            :outlined="hasPendingCommissions()"
            :disabled="!hasPendingCommissions()"
            @click="executeGroupSettlement()"
            v-tooltip.top="'Clique para liquidar todas as comissões pendentes'"
        /> -->
    </div>
    <ComissaoItemForm v-if="mode == 'newItem'" @cancel="cancelNewItem()" @newItem="reload()"
        @refreshPipeline="refreshPipeline()" :itemDataRoot="itemData" />
    <div v-if="gridData && gridData.length > 0">
        <ComissaoItemForm v-for="item in gridData" :key="item.id" :itemDataRoot="item" @cancel="reload()"
            @refreshPipeline="refreshPipeline()" />
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
        <Fieldset class="bg-green-200 mt-3" toggleable :collapsed="true" v-if="uProf.admin >= 2">
            <template #legend>
                <div class="flex align-items-center text-primary">
                    <span class="fa-solid fa-circle-info mr-2"></span>
                    <span class="font-bold text-lg">FormData</span>
                </div>
            </template>
            <p>mode: {{ mode }}</p>
            <p>props.itemDataRoot: {{ props.itemDataRoot }}</p>
            <p>gridData: {{ gridData }}</p>
        </Fieldset>
    </div>
</template>
