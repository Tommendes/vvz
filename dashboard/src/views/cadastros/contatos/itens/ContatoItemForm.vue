<script setup>
import { onBeforeMount, ref, inject } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { isValidEmail } from '@/global';
// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
// Campos de formulário
const itemData = inject('itemData');
// Emit do template
const emit = defineEmits(['newItem']);
// Dropdowns
const dropdownTipo = ref([]);
// Props do template
const props = defineProps({
    itemDataRoot: Object // O próprio cadastro
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
// Validar formulário
const formIsValid = () => {
    // Se o valor do dropdown dropdownTipo que contém o itemData.id_params_tipo for do tipo 'celular' ou 'telefone', então o campo itemData.meio deve ser validado pelo maska telefone
    // Mas se o valor do dropdown dropdownTipo que contém o itemData.id_params_tipo for do tipo 'e-mail', então o campo itemData.meio deve ser validado pelo isValidEmail
    let label = getDropdownLabel(itemData.value.id_params_tipo);
    if (label) label = label.toString().toLowerCase();
    if (label == 'e-mail') return validateEmail();
    if (label == 'telefone' || label == 'celular') return validateTelefone();
    return true;
};
const getDropdownLabel = (value) => {
    if (!value) return undefined;
    const selectedOption = dropdownTipo.value.find((option) => option.value === value);
    return selectedOption.label || undefined;
};
// Mensages de erro
const errorMessages = ref({});
// Url base do form action
const urlBase = ref(`${baseApiUrl}/cad-contatos-itens/${props.itemDataRoot.id}`);
// Salvar dados do formulário
const saveData = async () => {
    // Se o formulário não for válido, não salva
    if (!formIsValid()) {
        defaultWarn('Verifique os campos obrigatórios');
        return;
    }
    const url = `${urlBase.value}`;
    const obj = { ...itemData.value };
    console.log('url', url);
    axios
        .post(url, obj)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                itemData.value = body;
                emit('newItem');
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
// Carregar dados do formulário
onBeforeMount(() => {
    loadOptions();
    itemData.value = {
        id_cad_contatos: props.itemDataRoot.id
    };
});
</script>

<template>
    <form @submit.prevent="saveData" @keydow.enter.prevent>
        <div class="grid">
            <div class="col-12">
                <h5 v-if="itemData.id">{{ itemData.id && userData.admin >= 1 ? `Registro: (${itemData.id})` : '' }} (apenas suporte)</h5>
                <div class="p-fluid formgrid grid">
                    <div class="field col-12 md:col-5">
                        <label for="id_params_tipo">Tipo de Contato</label>
                        <Dropdown id="id_params_tipo" optionLabel="label" optionValue="value" v-model="itemData.id_params_tipo" :options="dropdownTipo" placeholder="Selecione..."> </Dropdown>
                    </div>
                    <div class="field col-12 md:col-7" v-if="getDropdownLabel(itemData.id_params_tipo) && getDropdownLabel(itemData.id_params_tipo).toLowerCase() == 'e-mail'">
                        <label for="meio">{{ getDropdownLabel(itemData.id_params_tipo) }} de contato</label>
                        <div class="p-inputgroup flex-1">
                            <InputText autocomplete="no" v-model="itemData.meio" id="meio" type="text" @input="validateEmail()" />
                            <Button icon="fa-solid fa-floppy-disk" severity="success" v-tooltip.top="'Clique para salvar o contato'" @click="saveData()" />
                        </div>
                        <small id="text-error" class="p-error" v-if="errorMessages.meio">{{ errorMessages.meio }}</small>
                    </div>
                    <div class="field col-12 md:col-7" v-else-if="getDropdownLabel(itemData.id_params_tipo) && ['telefone', 'celular'].includes(getDropdownLabel(itemData.id_params_tipo).toLowerCase())">
                        <label for="meio">{{ getDropdownLabel(itemData.id_params_tipo) }} de contato</label>
                        <div class="p-inputgroup flex-1">
                            <InputText autocomplete="no" v-maska data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.meio" id="meio" type="text" @input="validateTelefone()" />
                            <Button icon="fa-solid fa-floppy-disk" severity="success" v-tooltip.top="'Clique para salvar o contato'" @click="saveData()" />
                        </div>
                        <small id="text-error" class="p-error" v-if="errorMessages.meio">{{ errorMessages.meio }}</small>
                    </div>
                    <div class="field col-12 md:col-7" v-else>
                        <label for="meio">{{ getDropdownLabel(itemData.id_params_tipo) || 'Meio' }} de contato</label>
                        <div class="p-inputgroup flex-1">
                            <InputText autocomplete="no" v-model="itemData.meio" id="meio" type="text" />
                            <Button icon="fa-solid fa-floppy-disk" severity="success" v-tooltip.top="'Clique para salvar o contato'" @click="saveData()" />
                        </div>
                    </div>
                </div>
                <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
                    <p>itemData: {{ itemData }}</p>
                    <p v-if="props.itemDataRoot">itemDataRoot: {{ props.itemDataRoot }}</p>
                </div>
            </div>
        </div>
    </form>
</template>
