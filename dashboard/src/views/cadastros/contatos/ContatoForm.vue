<script setup>
import { onBeforeMount, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import ContatosItensGrid from './itens/ContatosItensGrid.vue';
import { useRouter } from 'vue-router';
import { isValidEmail } from '@/global';
const router = useRouter();
// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
const mode = ref('view');
const itemData = ref({});
// Dropdowns
const dropdownTipo = ref([]);
// Props do template
const props = defineProps({
    itemDataRoot: Object, // O próprio cadastro,
    modeRoot: String // Modo do formulário
});
// Validar e-mail
const validateEmail = () => {
    errorMessages.value.meio = null;
    if (itemData.value.meio && !isValidEmail(itemData.value.meio)) {
        errorMessages.value.meio = 'Formato de e-mail inválido';
        return false;
    }
    return true;
};
// Validar telefone
const validateTelefone = () => {
    errorMessages.value.meio = null;
    if (itemData.value.meio && itemData.value.meio.length > 0 && ![10, 11].includes(itemData.value.meio.replace(/([^\d])+/gim, '').length)) {
        errorMessages.value.meio = `Formato de ${getDropdownLabel(itemData.value.id_params_tipo)} inválido`;
        return false;
    }
    return true;
};
const getDropdownLabel = (value) => {
    if (!value) return undefined;
    const selectedOption = dropdownTipo.value.find((option) => option.value === value);
    return selectedOption.label || undefined;
};
// Mensages de erro
const errorMessages = ref({});

// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/cad-contatos/${props.itemDataRoot.id}`);
// Carragamento de dados do form

const loadData = async () => {
    setTimeout(async () => {
        if (props.itemDataRoot && props.itemDataRoot.id) {
            const url = `${urlBase.value}/${props.itemDataRoot.id}`;
            await axios.get(url).then((res) => {
                const body = res.data;
                if (body && body.id) {
                    body.id = String(body.id);
                    itemData.value = body;
                } else {
                    defaultWarn('Registro não localizado');
                    router.push({ path: `/${userData.schema_description}/cadastros` });
                }
            });
        }
    }, Math.random() * 1000);
};
// Salvar dados do formulário
const saveData = async () => {
    // Se o formulário não for válido, não salva
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    const obj = { ...itemData.value };
    axios[method](url, obj)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                itemData.value = body;
                mode.value = 'edit';
                emit('changed');
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((err) => {
            defaultWarn(err.response.data);
        });
};
// Obter parâmetros do BD
const optionLocalParams = async (query) => {
    const selects = query.select ? `&slct=${query.select}` : undefined;
    const url = `${baseApiUrl}/local-params/f-a/gbf?fld=${query.field}&vl=${query.value}${selects}`;
    return await axios.get(url);
};
// Carregar opções do formulário
const loadOptions = async () => {
    // Tipo Contato
    await optionLocalParams({ field: 'grupo', value: 'tipo_contato', select: 'id,label' }).then((res) => {
        res.data.data.map((item) => {
            dropdownTipo.value.push({ value: item.id, label: item.label });
        });
    });
};
const doCancel = () => {
    if (['new', 'view'].includes(mode.value)) {
        emit('cancel');
    } else if (mode.value == 'edit') {
        mode.value = 'view';
    }
};
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
    loadOptions();
    mode.value = props.modeRoot || 'view';
    itemData.value = { ...itemData.value, id_cadastros: props.itemDataRoot.id_cadastros };
});
const setCancelBtnLabel = () => {
    let ret = '';
    switch (mode.value) {
        case 'new':
            ret = 'inclusão';
            break;
        case 'edit':
            ret = 'edição';
            break;
        default:
            ret = 'exibição';
            break;
    }
    return ret;
};
</script>

<template>
    <form @submit.prevent="saveData" @keydown.enter.prevent>
        <div class="grid">
            <div class="col-12">
                <h5 v-if="itemData.id">{{ itemData.id && userData.admin >= 1 ? `Registro: (${itemData.id})` : '' }} (apenas suporte)</h5>
                <div class="p-fluid formgrid grid">
                    <!-- <div class="field col-12 md:col-2">
                        <label for="id_params_tipo">Tipo de Contato</label>
                        <Dropdown id="id_params_tipo" optionLabel="label" optionValue="value" :disabled="mode == 'view'" v-model="itemData.id_params_tipo" :options="dropdownTipo" placeholder="Selecione..."> </Dropdown>
                    </div> -->
                    <div class="field col-12 md:col-2">
                        <label for="pessoa">Pessoa</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.pessoa" id="pessoa" type="text" />
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="departamento">Departamento</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.departamento" id="departamento" type="text" />
                    </div>
                    <!-- <div class="field col-12 md:col-6" v-if="getDropdownLabel(itemData.id_params_tipo) && getDropdownLabel(itemData.id_params_tipo).toLowerCase() == 'e-mail'">
                        <label for="meio">{{ getDropdownLabel(itemData.id_params_tipo) }} de contato</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.meio" id="meio" type="text" @input="validateEmail()" />
                        <small id="text-error" class="p-error" v-if="errorMessages.meio">{{ errorMessages.meio }}</small>
                    </div> -->
                    <!-- <div class="field col-12 md:col-6" v-else-if="getDropdownLabel(itemData.id_params_tipo) && ['telefone', 'celular'].includes(getDropdownLabel(itemData.id_params_tipo).toLowerCase())">
                        <label for="meio">{{ getDropdownLabel(itemData.id_params_tipo) }} de contato</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.meio" id="meio" type="text" @input="validateTelefone()" />
                        <small id="text-error" class="p-error" v-if="errorMessages.meio">{{ errorMessages.meio }}</small>
                    </div> -->
                    <!-- <div class="field col-12 md:col-6" v-else>
                        <label for="meio">{{ getDropdownLabel(itemData.id_params_tipo) || 'Meio' }} de contato</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.meio" id="meio" type="text" />
                    </div> -->
                    <div class="field col-12 md:col-8">
                        <label for="observacao">Observação</label>
                        <div class="p-inputgroup flex-1">
                            <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.observacao" id="observacao" type="text" />
                            <Button type="button" v-if="mode == 'view'" icon="fa-regular fa-pen-to-square fa-shake" @click="mode = 'edit'" v-tooltip.top="'Clique para editar o contato'" />
                            <Button type="submit" v-if="mode != 'view'" icon="fa-solid fa-floppy-disk" severity="success" v-tooltip.top="'Clique para salvar o contato'" />
                            <Button type="button" icon="fa-solid fa-ban" severity="danger" @click="doCancel()" v-tooltip.top="`Clique para cancelar a ${setCancelBtnLabel()} do contato`" />
                        </div>
                    </div>
                </div>
                <ContatosItensGrid v-if="itemData.id" :itemDataRoot="itemData" />
                <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
                    <p>mode: {{ mode }}</p>
                    <p>itemData: {{ itemData }}</p>
                    <p v-if="props.itemDataRoot">itemDataRoot: {{ props.itemDataRoot }}</p>
                </div>
            </div>
        </div>
    </form>
</template>
