<script setup>
import { computed, inject, onMounted, ref, watch, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import moment from 'moment';
import { guide } from '@/guides/cadastroFormGuide.js';

import { Mask } from 'maska';
const masks = ref({
    datePt: new Mask({
        mask: '##/##/####'
    }),
    phone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    })
});

import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile();
    if (!(dialogRef && dialogRef.value.data.destinId) && uProf.value.admin >= 2) {
        itemData.value = {
            destinId: 8094,
            identified: true,
            message:
                '<p>Olá {senderName}!</p><p><br></p><p>Esta mensagem só deverá ser despachada 17:45 x2. Eu sou o assistente virtual da <strong>{clientName}</strong> e passei para te avisar que estamos testando o sistema de mensagens.</p><p><br></p><p>Se preferir continuar esta conversa por e-mail use preferencialmente o {clientEmail}. Ou pode nos chamar pelo {clientTel}. 😘</p><p><br></p><p><em>Atenciosamente</em>,</p><p>{userName}</p>',
            phone: '(82) 98149-9024',
            schedule: moment().format('DD-MM-YYYY HH:mm:00'),
            recurrent: false
        };
    }
});

// Props do template modal
const dialogRef = inject('dialogRef');
const closeDialog = () => {
    dialogRef.value.close();
};

// Campos de formulário
const itemData = ref({
    recurrent: false,
    recurrence: {
        frequency: null,
        interval: 0,
        end_date: null
    }
});
// Dropdowns
const dropdownFrequencia = ref([
    { value: 'minutes', label: 'Minutos' },
    { value: 'hours', label: 'Horas' },
    { value: 'days', label: 'Dias' },
    { value: 'weeks', label: 'Semanas' },
    { value: 'months', label: 'Meses' },
    { value: 'years', label: 'Anos' }
]);
// Datas mínimas
const minDate = ref(new Date());
// Modo do formulário
const mode = ref('new');
const loading = ref(false);
// Props do template
const props = defineProps(['destinId']);
// Emit do template
const emit = defineEmits(['sended', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/whats-msgs`);
// Carragamento de dados do form
const loadData = async () => {
    loading.value = true;
    if (['azul-bot'].includes(route.name) && (route.params.id || itemData.value.id)) {
        if (route.params.id) itemData.value.id = route.params.id;
        const url = `${urlBase.value}/${itemData.value.id}`;
        await axios.get(url).then((res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);
                itemData.value = body;
                loading.value = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${uProf.value.schema_description}/azul-bot` });
            }
        });
    } else loading.value = false;
};
// Salvar dados do formulário
const saveData = async () => {
    if (!formIsValid()) {
        defaultWarn('Verifique os campos obrigatórios');
        return;
    }
    loading.value = true;
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    const obj = { ...itemData.value };

    if (obj.cpf_cnpj) obj.cpf_cnpj = masks.value.cpf_cnpj.unmasked(obj.cpf_cnpj);
    if (obj.schedule) obj.schedule = moment(obj.schedule, 'DD-MM-YYYY HH:mm:00').format('YYYY-MM-DD HH:mm:00');
    if (obj.recurrence.end_date) obj.recurrence.end_date = moment(obj.recurrence.end_date, 'DD-MM-YYYY HH:mm:00').format('YYYY-MM-DD HH:mm:00');
    if (obj.phone) obj.phone = obj.phone.replace(/([^\d])+/gim, '');
    if (obj.cep) obj.cep = obj.cep.replace(/([^\d])+/gim, '');
    await axios[method](url, obj)
        .then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Mensagem programada com sucesso');
                itemData.value = {
                    identified: true,
                    schedule: moment().format('DD-MM-YYYY HH:mm:00'),
                    phone: dialogRef && dialogRef.value.data.phone ? dialogRef.value.data.phone : undefined
                };
                loading.value = false;
            } else {
                defaultWarn('Erro ao programar mensagem');
            }
        })
        .catch((error) => {
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
        });
    loading.value = false;
};
const goToChat = () => {
    window.open(`#/${uProf.value.schema_description}/azul-bot`, '_blank');
};
// Validar telefone
const validatePhone = () => {
    if (itemData.value.phone && itemData.value.phone.length > 0 && ![10, 11].includes(itemData.value.phone.replace(/([^\d])+/gim, '').length)) {
        return false;
    }
    return true;
};
// Validar formulário
const formIsValid = () => {
    return validatePhone();
};
// Recarregar dados do formulário
const reload = async () => {
    mode.value = 'new';
    await loadData();
};
// Carregar dados do formulário
onMounted(async () => {
    await loadData();
    if (dialogRef && dialogRef.value.data.destinId) {
        itemData.value = {
            destinId: dialogRef.value.data.destinId ? dialogRef.value.data.destinId : undefined,
            phone: dialogRef.value.data.phone ? dialogRef.value.data.phone : undefined,
            identified: true,
            schedule: moment().format('DD-MM-YYYY HH:mm:00')
        };
    }
});
// Observar e caso itemData.recurrent seja false, limpar os dados de recorrência ou se for true, setar a data de término
watchEffect(() => {
    if (itemData.value.recurrent) {
        itemData.value.recurrence = {
            frequency: itemData.value.recurrence.frequency || 'days',
            interval: itemData.value.recurrence.interval || 1,
            end_date: moment(itemData.value.schedule, 'DD-MM-YYYY HH:mm:00').add(itemData.value.recurrence.interval, itemData.value.recurrence.frequency).format('DD-MM-YYYY HH:mm:00')
        };
    } else {
        itemData.value.recurrence = {};
    }
});
const setEndRecurrence = () => {
    // itemData.value.recurrence.end_date = moment(itemData.value.schedule, 'DD-MM-YYYY HH:mm:00').add(itemData.value.recurrence.interval, itemData.value.recurrence.frequency).format('DD-MM-YYYY HH:mm:00');
};
// Observar alterações nos dados do formulário
watch(route, (value) => {
    if (value.params.id !== itemData.value.id) {
        window.location.reload();
    }
});
// Copiar o conteúdo de um elemento para a área de transferência
const copyToClipboard = (event) => {
    const textToCopy = event.target.innerText;
    const textArea = document.createElement('textarea');
    textArea.value = textToCopy;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    defaultSuccess('Texto copiado para a área de transferência');
};
</script>

<template>
    <div class="flex flex-column w-full">
        <!-- <div class="flex align-items-center justify-content-center h-4rem font-bold border-round m-2"> -->
        <div class="text-center">
            <h1 class="text-2xl">Você pode enviar imediatamente ou programar o envio</h1>
        </div>
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <label for="message" class="font-bold block mb-2 flex justify-content-end"> Mensagem </label>
                    <Editor id="message" v-model="itemData.message" editorStyle="height: 160px" class="text-lg">
                        <template v-slot:toolbar>
                            <span class="ql-formats">
                                <button v-tooltip.bottom="'Bold'" class="ql-bold"></button>
                                <button v-tooltip.bottom="'Italic'" class="ql-italic"></button>
                            </span>
                        </template>
                    </Editor>
                </div>
                <div class="col-12 md:col-12 w-full text-center">
                    <ToggleButton
                        v-if="!itemData.recurrent"
                        v-model="itemData.recurrent"
                        onLabel="Envio Recorrente"
                        offLabel="Envio Único"
                        class="w-full"
                        v-tooltip.top="itemData.recurrent ? 'Clique para envio único' : 'Clique para envio recorrente'"
                    />
                    <InputGroup v-else>
                        <ToggleButton v-model="itemData.recurrent" onLabel="Envio Recorrente" offLabel="Envio Único" class="w-auto" v-tooltip.top="itemData.recurrent ? 'Clique para envio único' : 'Clique para envio recorrente'" />
                        <Dropdown
                            v-if="itemData.recurrent"
                            id="recurrence-frequency"
                            v-model="itemData.recurrence.frequency"
                            optionLabel="label"
                            optionValue="value"
                            :options="dropdownFrequencia"
                            class="w-auto"
                            title="Frequência de envio"
                            @change="setEndRecurrence()"
                        />
                        <InputText v-if="itemData.recurrent" id="recurrence-interval" type="number" min="1" max="60" v-model="itemData.recurrence.interval" class="w-1" v-tooltip.top="'Intervalo de envio'" @input="setEndRecurrence()" />
                        <Calendar
                            v-if="itemData.recurrent"
                            id="recurrence-end-date"
                            v-model="itemData.recurrence.end_date"
                            showIcon
                            iconDisplay="input"
                            inputId="recurrence.end_date"
                            showTime
                            hourFormat="24"
                            :disabled="loading"
                            dateFormat="dd/mm/yy"
                            :minDate="minDate"
                            showButtonBar
                            class="w-auto"
                            v-tooltip.top="'Data de término'"
                        />
                    </InputGroup>
                </div>
                <div class="col-12 md:col-7">
                    <label for="phone" class="font-bold block mb-2 flex justify-content-center"> Enviar para </label>
                    <InputGroup>
                        <InputText class="flex w-full uppercase text-lg" autocomplete="no" :disabled="loading" v-model="itemData.phone" id="phone" type="text" @input="validatePhone()" v-maska data-maska="['(##) ####-####', '(##) #####-####']" />
                        <ToggleButton v-model="itemData.identified" class="w-8rem" onLabel="Identificado" offLabel="Anônimo" />
                    </InputGroup>
                </div>
                <div class="col-12 md:col-5">
                    <label for="schedule" class="font-bold block mb-2 flex justify-content-center"> Enviar em </label>
                    <InputGroup>
                        <Calendar
                            class="flex w-full text-lg"
                            id="schedule"
                            v-model="itemData.schedule"
                            showIcon
                            iconDisplay="input"
                            inputId="schedule"
                            showTime
                            hourFormat="24"
                            :disabled="loading"
                            dateFormat="dd/mm/yy"
                            :minDate="minDate"
                            showButtonBar
                        >
                            <template #inputicon="{ clickCallback }">
                                <InputIcon class="pi pi-clock cursor-pointer" @click="clickCallback" />
                            </template>
                        </Calendar>
                        <Button type="button" icon="fa-regular fa-paper-plane" severity="success" raised @click="saveData" />
                    </InputGroup>
                </div>
                <div class="col-12 font-light text-xs p-0">
                    <div class="flex flex-wrap align-items-center justify-content-center text-center">
                        <p class="text-sm m-0">Use as tags especiais abaixo para adicionar informações à sua mensagem. Clique para copiar e cole no local desejado.</p>
                        <p class="text-sm m-1">Passe o mouse para ver uma descrição</p>
                    </div>
                    <div class="flex flex-wrap align-items-center justify-content-center">
                        <div class="select-all bg-primary border-round p-2 m-1 flex align-items-center justify-content-center max-w-min" @click="copyToClipboard($event)" v-tooltip.top="'Seu nome de usuário'">{userName}</div>
                        <div class="select-all bg-primary border-round p-2 m-1 flex align-items-center justify-content-center max-w-min" @click="copyToClipboard($event)" v-tooltip.top="'Nome fantasia de sua empresa'">{clientName}</div>
                        <div class="select-all bg-primary border-round p-2 m-1 flex align-items-center justify-content-center max-w-min" @click="copyToClipboard($event)" v-tooltip.top="'CPF ou CNPJ de sua empresa'">{clientCpfCnpj}</div>
                        <div class="select-all bg-primary border-round p-2 m-1 flex align-items-center justify-content-center max-w-min" @click="copyToClipboard($event)" v-tooltip.top="'Email comercial de sua sua empresa'">{clientEmail}</div>
                        <div class="select-all bg-primary border-round p-2 m-1 flex align-items-center justify-content-center max-w-min" @click="copyToClipboard($event)" v-tooltip.top="'Telefone de sua empresa'">{clientTel}</div>
                        <!-- <div class="select-all bg-primary border-round p-2 m-1 flex align-items-center justify-content-center max-w-min"
                            @click="copyToClipboard($event)" v-tooltip.top="'Nome do cliente'">
                            {senderName}</div> -->
                    </div>
                </div>
            </div>
        </form>
        <!-- </div> -->
    </div>
    <div class="col-12" v-if="uProf.admin >= 2">
        <div class="card bg-green-200 mt-3">
            <p>Mode: {{ mode }}</p>
            <p>itemData: {{ itemData }}</p>
            <p>uProf: {{ uProf }}</p>
        </div>
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
