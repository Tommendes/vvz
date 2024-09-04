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
        <p v-if="uProf.admin >= 2">itemDataEventos: {{ itemDataEventos }}</p>
    </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { baseApiUrl } from '@/env';
import { useRoute } from 'vue-router';
import axios from '@/axios-interceptor';
import moment from 'moment';

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile()
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
    },
});
// Eventos do registro
const itemDataEventos = ref({});
// field:tabela_bd=contains:pipeline&field:id_registro=contains:68585&
const getEventos = async () => {
    const url = `${baseApiUrl}/sis-events/${props.idRegistro}/${props.tabelaBd}/get-events`;
    
    await axios.get(url).then((res) => {
        if (res.data && res.data.length > 0) {
            itemDataEventos.value = res.data;
            itemDataEventos.value.forEach((element) => {      
                const classevento = element.classevento.toLowerCase();          
                switch (classevento) {
                    case 'insert': element.evento = 'Criação do registro';
                        break;
                    case 'update': element.evento =
                        `Edição do registro` +
                        (uProf.value.gestor >= 1
                            ? `. Para mais detalhes <a href="#/${uProf.value.schema_description}/eventos?tabela_bd=${props.tabelaBd}&id_registro=${props.idRegistro}" target="_blank">acesse o log de eventos</a> e pesquise: Tabela = ${props.tabelaBd}; Registro = ${props.idRegistro}. Número deste evento: ${element.id}`
                            : '');
                        break;
                    case 'remove': element.evento = 'Exclusão ou cancelamento do registro';
                        break;
                    case 'conversion': element.evento = 'Registro convertido para pedido';
                        break;
                    case 'mkfolder': element.evento = 'Pasta criada para o registro';
                        break;
                    case 'commissioning': element.evento =
                        `Lançamento de comissão` +
                        (uProf.value.comissoes >= 1
                            ? `. Para mais detalhes <a href="#/${uProf.value.schema_description}/eventos?tabela_bd=${props.tabelaBd}&id_registro=${props.idRegistro}" target="_blank">acesse o log de eventos</a> e pesquise: Tabela = ${props.tabelaBd}; Registro = ${props.idRegistro}. Número deste evento: ${element.id}`
                            : '');
                            break;
                    default: element.evento = `Registro de evento: ${classevento}`;
                        break;
                }
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
};


defineExpose({ getEventos }); // Expondo a função para o componente pai
onMounted(async () => {
});
</script>

<style lang="scss" scoped></style>