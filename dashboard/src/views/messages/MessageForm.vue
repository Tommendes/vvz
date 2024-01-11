<script setup>
import { onBeforeMount, onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import Breadcrumb from '@/components/Breadcrumb.vue';
import moment from 'moment';

import { useRoute } from 'vue-router';
const route = useRoute();

import { useRouter } from 'vue-router';
const router = useRouter();

import { Mask } from 'maska';
const masks = ref({
    date: new Mask({
        mask: '##/##/####'
    })
});

// Cookies do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

// Campos de formulário
const itemData = ref({});
// Modelo de dados usado para comparação
const itemDataComparision = ref({});
// Modo do formulário
const mode = ref('view');
// Aceite do formulário
const accept = ref(false);
// Mensages de erro
const errorMessages = ref({});
// Loadings
const loading = ref(false);
// Props do template
const props = defineProps({
    mode: String
});
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/sis-messages`);
// Carragamento de dados do form
const loadData = async () => {
    loading.value = true;
    if (route.params.id || itemData.value.id) {
        if (route.params.id) itemData.value.id = route.params.id;
        const url = `${urlBase.value}/${itemData.value.id}`;
        setTimeout(async () => {
            await axios.get(url).then((res) => {
                const body = res.data;
                if (body && body.id) {
                    body.id = String(body.id);                
                    itemData.value = body;
                    if (itemData.value.valid_from) itemData.value.valid_from = masks.value.date.masked(moment(itemData.value.valid_from).format('DD/MM/YYYY'));
                    if (itemData.value.valid_to) itemData.value.valid_to = masks.value.date.masked(moment(itemData.value.valid_to).format('DD/MM/YYYY'));
                    loading.value = false;                
                } else {
                    defaultWarn('Registro não localizado');
                    router.push({ path: `/${userData.schema_description}/messages` });
                }
            });
        }, Math.random() * 1000 + 250);
    } else loading.value = false;
};
// Salvar dados do formulário
const saveData = async () => {
    if (formIsValid()) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`; 
        if (itemData.value.valid_from) itemData.value.valid_from = moment(itemData.value.valid_from, 'DD/MM/YYYY').format('YYYY-MM-DD');
        if (itemData.value.valid_to) itemData.value.valid_to = moment(itemData.value.valid_to, 'DD/MM/YYYY').format('YYYY-MM-DD');
        await axios[method](url, itemData.value)
            .then((res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    itemDataComparision.value = { ...itemData.value };
                    if (mode.value == 'new') router.push({ path: `/${userData.schema_description}/message/${itemData.value.id}` });
                    mode.value = 'view';
                } else {
                    defaultWarn('Erro ao salvar registro');
                }
            })
            .catch((err) => {
                defaultWarn(err.response.data);
            });
    }
};
// Verifica se houve alteração nos dados do formulário
const isItemDataChanged = () => {
    const ret = JSON.stringify(itemData.value) !== JSON.stringify(itemDataComparision.value);
    if (!ret) {
        accept.value = false;
        // errorMessages.value = {};
    }
    return ret;
};
// DropDowns
const dropdownStatusUser = ref([
    { value: 0, label: 'Inativo' },
    { value: 10, label: 'Ativo' },
    { value: 99, label: 'Excluído' }
]);
// O dropdown abaixo está com valores literais para não causar possíveis problemas de integração
const dropdownCorDaMensagem = ref([
    { value: 'success', label: 'Success'},
    { value: 'info', label: 'Info'},
    { value: 'warning', label: 'Warning'},
    { value: 'danger', label: 'Danger' }
]);
const dropdownSeveridade = ref([
    { value: 0, label: 'Sucesso' },
    { value: 1, label: 'Informativa' },
    { value: 2, label: 'Aviso' },
    { value: 3, label: 'Perigo' }
]);
// Validar datas
const validateDateFrom = () => {
    errorMessages.value.valid_from = null;
    // Verifica se o campo está preenchido
    if (itemData.value.valid_from && itemData.value.valid_from.length > 0) {
        // Testa o formato da data
        if (!masks.value.date.completed(itemData.value.valid_from)) {
            errorMessages.value.valid_from = 'Formato de data inválido';
        } else {
            // Verifica se a data é válida
            const momentDate = moment(itemData.value.valid_from, 'DD/MM/YYYY', true);
            if (!momentDate.isValid()) {
                errorMessages.value.valid_from = 'Data inválida';
            }
        }
    } else {
        // Se o campo estiver vazio, a data será inválida
        errorMessages.value.valid_from = 'Campo obrigatório';
    }

    // Atualiza o estado do botão "Salvar"
    accept.value = !errorMessages.value.valid_from;

    return !errorMessages.value.valid_from;
};
const validateDateTo = () => {
    errorMessages.value.valid_to = null;
    // Verifica se o campo está preenchido
    if (itemData.value.valid_to && itemData.value.valid_to.length > 0) {
        // Testa o formato da data
        if (!masks.value.date.completed(itemData.value.valid_to)) {
            errorMessages.value.valid_to = 'Formato de data inválido';
        } else {
            // Verifica se a data é válida
            const momentDate = moment(itemData.value.valid_to, 'DD/MM/YYYY', true);
            if (!momentDate.isValid()) {
                errorMessages.value.valid_to = 'Data inválida';
            }
        }
    }
    // Atualiza o estado do botão "Salvar"
    accept.value = !errorMessages.value.valid_to;
    return !errorMessages.value.valid_to;
};
// Validar formulário
const formIsValid = () => {
    return validateDateFrom() && validateDateTo();
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
    accept.value = false;
    errorMessages.value = {};
    loadData();
    emit('cancel');
};
// Obter parâmetros do BD
const optionLocalParams = async (query) => {
    const selects = query.select ? `&slct=${query.select}` : undefined;
    const url = `${baseApiUrl}/users/f-a/glf?fld=${query.field}&vl=${query.value}${selects}`;
    return await axios.get(url);
};
// Carregar opções do formulário
const dropdownUsers = ref([]);
const loadOptions = async () => {
    // Forma de pagamento da proposta
    await optionLocalParams({ field: 'status', value: '10', select: 'id,name' }).then((res) => {
        res.data.data.map((item) => {
            dropdownUsers.value.push({ value: item.id, label: item.name });
        });
    });
};
// Carregar dados do formulário
onBeforeMount(() => {});
onBeforeMount(async () => {
    await loadOptions();
    loadData();
});
onMounted(() => {
    loadData();
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
    else {
        if (itemData.value.id) mode.value = 'view';
        else mode.value = 'new';
    }
});
// Observar alterações nos dados do formulário
var title_color;
watchEffect(() => {
    isItemDataChanged();
    // Adiciona um watcher para o campo 'body_variant'
    if (itemData.value.body_variant) {
    switch (itemData.value.body_variant) {
        case 'success':
            title_color = '#22C55E';
            break;
            case 'info':
                title_color = '#0EA5E9';
                break;
            case 'warning':
                title_color = '#F97316';
                break;
            case 'danger':
                title_color = '#EF4444';
                break;
            default:
                break;
        }
    }
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Mensagens', to: `/${userData.schema_description}/messages` }, { label: itemData.title + (userData.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-5">
                            <label for="id_user">Usuário</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else id="id_user" optionLabel="label" optionValue="value" :disabled="mode == 'view'" v-model="itemData.id_user" :options="dropdownUsers" placeholder="Selecione..."> </Dropdown>
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="status_user">Status do Usuário</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else id="status_user" :disabled="mode == 'view'" placeholder="Selecione o status" optionLabel="label" optionValue="value" v-model="itemData.status_user" :options="dropdownStatusUser" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="valid_from">Válido de</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="##/##/####" v-model="itemData.valid_from" id="valid_from" type="text" @input="validateDateFrom()" />
                            <small id="text-error" class="p-error" v-if="errorMessages.valid_from">{{errorMessages.valid_from }}</small>
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="valid_to">Válido até</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText
                                v-else
                                autocomplete="no"
                                :disabled="mode == 'view'"
                                v-maska data-maska="##/##/####"
                                v-model="itemData.valid_to"
                                id="valid_to"
                                type="text"
                                @input="validateDateTo()"
                            />
                            <small id="text-error" class="p-error" v-if="errorMessages.valid_to">{{errorMessages.valid_to }}</small>
                        </div>
                        <div class="col-12 md:col-5">
                            <label for="title">Título da Mensagem</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText
                                v-else
                                autocomplete="no"
                                :disabled="mode == 'view'"
                                v-model="itemData.title"
                                :style="{ color: title_color }"
                                id="title" type="text"
                            />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="body_variant">Cor da Mensagem</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else id="body_variant" :disabled="mode == 'view'" placeholder="Selecione uma opção" optionLabel="label" optionValue="value" v-model="itemData.body_variant" :options="dropdownCorDaMensagem" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="severity">Severidade da Mensagem</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else id="severity" :disabled="mode == 'view'" placeholder="Selecione uma opção" optionLabel="label" optionValue="value" v-model="itemData.severity" :options="dropdownSeveridade" />
                        </div>
                        <div class="col-12 md:col-12" v-if="itemData.msg || ['edit', 'new'].includes(mode)">
                            <label for="msg">Mensagem</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Editor v-else-if="!loading && mode != 'view'" v-model="itemData.msg" id="msg" editorStyle="height: 160px" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.msg" class="p-inputtext p-component p-filled"></p>
                        </div>
                        <div class="col-12 md:col-5" v-if="itemData.valid_to && !errorMessages.valid_to">
                            <label for="title_future">Título Futuro</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.title_future" id="title_future" type="text" />
                        </div>
                        <div class="col-12 md:col-12" v-if="itemData.valid_to && !errorMessages.valid_to">
                            <label for="msg_future">Mensagem Futura</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Editor v-else-if="!loading && mode != 'view'" v-model="itemData.msg_future" id="msg_future" editorStyle="height: 160px" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.msg_future" class="p-inputtext p-component p-filled"></p>
                        </div>
                        <div class="col-12">
                            <div class="card flex justify-content-center flex-wrap gap-3">
                                <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-beat" text raised @click="mode = 'edit'" />
                                <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!isItemDataChanged() || !formIsValid()" />
                                <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12" v-if="userData.admin >= 2">
                    <div class="card bg-green-200 mt-3">
                        <p>Mode: {{ mode }}</p>
                        <p>itemData: {{ itemData }}</p>
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
<style scoped>
.p-fluid .p-button {
    width: auto;
}
</style>