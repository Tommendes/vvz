<script setup>
import { onMounted, ref, watch, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { removeHtmlTags, capitalizeFirst } from '@/global';
import moment from 'moment';
import { guide } from '@/guides/cadastroFormGuide.js';

import { Mask } from 'maska';
const masks = ref({
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    }),
    datePt: new Mask({
        mask: '##/##/####'
    }),
    phone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    }),
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
    uProf.value = await store.getProfile()
});

// Validar o cpf_cnpj
import { cpf, cnpj } from 'cpf-cnpj-validator';

// Campos de formulário
const itemData = ref({});
const minDate = ref(new Date());
const datetime24h = ref(new Date());
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
    if (route.params.id || itemData.value.id) {
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
                router.push({ path: `/${uProf.value.schema_description}/azul-chat` });

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
    if (obj.schedule) obj.schedule = moment(obj.schedule, 'DD/MM/YYYY').format('YYYY-MM-DD');
    if (obj.phone) obj.phone = obj.phone.replace(/([^\d])+/gim, '');
    if (obj.cep) obj.cep = obj.cep.replace(/([^\d])+/gim, '');
    await axios[method](url, obj)
        .then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Mensagem enviada com sucesso');
                itemData.value = body;
                emit('sended', itemData.value);
            } else {
                defaultWarn('Erro ao enviar mensagem');
            }
        })
        .catch((error) => {
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
        });
    loading.value = false;
};
const goToChat = () => {
    window.open(`#/${uProf.value.schema_description}/azul-chat`, '_blank');
};
// Validar telefone
const validatePhone = () => {
    errorMessages.value.telefone = null;
    if (itemData.value.telefone && itemData.value.telefone.length > 0 && ![10, 11].includes(itemData.value.telefone.replace(/([^\d])+/gim, '').length)) {
        errorMessages.value.telefone = 'Formato de telefone inválido';
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
    errorMessages.value = {};
    await loadData();
};
// Carregar dados do formulário
onMounted(async () => {
    await loadData();
    itemData.value = {
        id: null,
        message: 'Teste de mensagem',
        phone: '(82) 98149-9024',
        schedule: moment().format('YYYY-MM-DD HH:mm:00'),
    };
});
// Observar alterações nos dados do formulário
watch(route, (value) => {
    if (value.params.id !== itemData.value.id) {
        window.location.reload();
    }
});
watchEffect(() => {
    // if (itemData.value.message) itemData.value.messageClear = removeHtmlTags(itemData.value.message);
    // Se datetime24h for alterado, atualiza o itemData.schedule no formato YYYY-MM-DD HH:mm:ss
    if (datetime24h.value) itemData.value.schedule = moment(datetime24h.value).format('YYYY-MM-DD HH:mm:00');
});
</script>

<template>

    <div class="flex flex-column w-full">
        <!-- <div class="flex align-items-center justify-content-center h-4rem font-bold border-round m-2"> -->
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <label for="message" class="font-bold block mb-2 flex justify-content-end"> Mensagem </label>
                    <Editor id="message" v-model="itemData.message" editorStyle="height: 160px" class="text-lg">
                        <template v-slot:toolbar>
                            <span class="ql-formats">
                                <button v-tooltip.bottom="'Bold'" class="ql-bold"></button>
                                <button v-tooltip.bottom="'Italic'" class="ql-italic"></button>
                                <button v-tooltip.bottom="'Underline'" class="ql-underline"></button>
                            </span>
                        </template>
                    </Editor>
                </div>
                <div class="col-12 md:col-6">
                    <label for="phone" class="font-bold block mb-2 flex justify-content-end"> Enviar para </label>
                    <InputText class="flex w-full uppercase" autocomplete="no" :disabled="loading"
                        v-model="itemData.phone" id="phone" type="text" @input="validatePhone()" v-maska
                        data-maska="['(##) ####-####', '(##) #####-####']" />
                </div>
                <div class="col-12 md:col-6">
                    <label for="datetime24h" class="font-bold block mb-2 flex justify-content-end"> Enviar em </label>
                    <Calendar class="flex w-full" id="datetime24h" v-model="datetime24h" showIcon iconDisplay="input" inputId="datetime24h" showTime hourFormat="24"
                        :disabled="loading" dateFormat="dd/mm/yy" :minDate="minDate">
                        <template #inputicon="{ clickCallback }">
                            <InputIcon class="pi pi-clock cursor-pointer" @click="clickCallback" />
                        </template>
                    </Calendar>
                </div>
            </div>
        </form>
        <!-- </div> -->
    </div>
    <!-- <div class="col-12" v-if="uProf.admin >= 2">
        <div class="card bg-green-200 mt-3">
            <p>Mode: {{ mode }}</p>
            <p>itemData: {{ itemData }}</p>
            <p>dadosPublicos: {{ dadosPublicos }}</p>
        </div>
    </div> -->
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
