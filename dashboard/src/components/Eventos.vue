<template>
    <div>
        <Fieldset class="bg-orange-200 mb-3" toggleable :collapsed="true" v-if="props.mode != 'expandedFormMode'">
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
        <!-- <p v-if="uProf.admin >= 2">itemDataEventos: {{ itemDataEventos }}</p> -->
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import axios from '@/axios-interceptor';
import moment from 'moment';
const baseApiUrl = import.meta.env.VITE_BASE_API_URL;
// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile();
    await getEventos();
});

const route = useRoute();
// Url base do form action
const urlBase = ref(`${baseApiUrl}/fin-lancamentos`);

const props = defineProps({
    tabelaBd: {
        type: String,
        default: null
    },
    idRegistro: {
        type: Number,
        default: ''
    },
    mode: {
        type: String,
        default: ''
    }
});

// Eventos do registro
const itemDataEventos = ref([]);

// Função para obter eventos do registro
const getEventos = async () => {
    const url = `${baseApiUrl}/sis-events/${props.idRegistro}/${props.tabelaBd}/get-events`;

    await axios.get(url).then((res) => {
        if (res.data && res.data.length > 0) {
            itemDataEventos.value = res.data;
            itemDataEventos.value.forEach((element) => {
                processEvent(element);
            });
        } else {
            itemDataEventos.value = [
                {
                    evento: 'Não há registro de log eventos para este registro'
                }
            ];
        }
    });
};

// Função para processar cada evento
const processEvent = (element) => {
    const classevento = element.classevento.toLowerCase();
    const statusComissioning = {
        10: { label: 'Aberto' },
        20: { label: 'Liquidado' },
        30: { label: 'Encerrado' },
        40: { label: 'Faturado' },
        50: { label: 'Confirmado' }
    };

    switch (true) {
        case classevento === 'insert':
            element.evento = 'Criação do registro';
            break;
        case classevento === 'update':
            element.evento = `Edição do registro`;
            break;
        case classevento === 'remove':
            element.evento = 'Mudança de situação(STATUS) do registro';
            break;
        case classevento === 'removecomisliquidat':
            element.evento = 'Cancelamento de liquidação da comissão';
            break;
        case classevento.startsWith('setstatuscomis'):
            const status = classevento.replace('setstatuscomis', '');
            const statusInfo = statusComissioning[status];
            if (statusInfo && statusInfo.label) {
                element.evento = `Novo status de comissão: ${statusInfo.label}`;
            } else {
                element.evento = `Novo status de comissão desconhecido: ${status}`;
            }
            break;
        case classevento === 'conversion':
            element.evento = 'Registro convertido para pedido';
            break;
        case classevento === 'mkfolder':
            element.evento = 'Pasta criada para o registro';
            break;
        case classevento === 'paymentplan':
            element.evento = 'Registro de parcelamento financeiro';
            break;
        case classevento === 'removepaymentplan':
            element.evento = 'Exclusão de parcelamento financeiro';
            break;
        case classevento === 'commissioning':
            element.evento = `Lançamento de comissão`;
            break;
        default:
            element.evento = `Registro de evento: ${classevento}`;
            break;
    }
    element.evento +=
        uProf.value.comissoes >= 1
            ? `. Para mais detalhes <a href="#/${uProf.value.schema_description}/eventos?tabela_bd=${props.tabelaBd}&id_registro=${props.idRegistro}" target="_blank">acesse o log de eventos</a> e pesquise: Tabela = ${props.tabelaBd}; Registro = ${props.idRegistro}. Número deste evento: ${element.id}`
            : '';
    element.data = moment(element.created_at).format('DD/MM/YYYY HH:mm:ss').replaceAll(':00', '').replaceAll(' 00', '');
};

defineExpose({ getEventos }); // Expondo a função para o componente pai
</script>

<style lang="scss" scoped></style>
