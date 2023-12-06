<script setup>
import { onBeforeMount, ref, inject } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { useRouter } from 'vue-router';
import { isValidEmail } from '@/global';
const router = useRouter();
// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
// Campos de formulário
const itemData = inject('itemData');
// Modo do formulário
const mode = inject('mode');
// Dropdowns
const dropdownTipo = ref([]);
// Props do template
const props = defineProps({
    itemDataRoot: Object // O próprio cadastro
});

import { Mask } from 'maska';
const masks = ref({
    telefone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    })
});
// Validar e-mail
const validateEmail = () => {
    if (itemData.value.meio && !isValidEmail(itemData.value.meio)) {
        errorMessages.value.meio = 'Formato de e-mail inválido';
    } else errorMessages.value.meio = null;
    return !errorMessages.value.meio;
};
// Validar telefone
const validateTelefone = () => {
    if (itemData.value.meio && itemData.value.meio.length > 0 && ![10, 11].includes(itemData.value.meio.replace(/([^\d])+/gim, '').length)) {
        errorMessages.value.meio = `Formato de ${getDropdownLabel(itemData.value.id_params_tipo)} inválido`;
    } else errorMessages.value.meio = null;
    return !errorMessages.value.meio;
};
// Validar formulário
const formIsValid = () => {
    // Se o valor do dropdown dropdownTipo que contém o itemData.id_params_tipo for do tipo 'celular' ou 'telefone', então o campo itemData.meio deve ser validado pelo maska telefone
    // Mas se o valor do dropdown dropdownTipo que contém o itemData.id_params_tipo for do tipo 'e-mail', então o campo itemData.meio deve ser validado pelo isValidEmail
    let label = getDropdownLabel(itemData.value.id_params_tipo);
    if (label) label = label.toString().toLowerCase();
    if (label == 'e-mail') return validateEmail();
    else if (label == 'telefone' || label == 'celular') return validateTelefone();
    else return true;
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
        if (itemData && itemData.id) {
        const url = `${urlBase.value}/${itemData.value.id}`;
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
    }, Math.random() * 1000 + 250);
};
// const loadData = async () => {
//     if (itemData && itemData.id) {
//         const url = `${urlBase.value}/${itemData.value.id}`;
//         await axios.get(url).then((res) => {
//             const body = res.data;
//             if (body && body.id) {
//                 body.id = String(body.id);
//                 itemData.value = body;
//             } else {
//                 defaultWarn('Registro não localizado');
//                 router.push({ path: `/${userData.schema_description}/cadastros` });
//             }
//         });
//     }
// };
// Salvar dados do formulário
const saveData = async () => {
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    axios[method](url, itemData.value)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                itemData.value = body;
                mode.value = 'view';
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
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
    loadOptions();
});
</script>

<template>
    <form @submit.prevent="saveData">
        <div class="grid">
            <div class="col-12">
                <h5 v-if="itemData.id">{{ itemData.id && userData.admin >= 1 ? `Registro: (${itemData.id})` : '' }} (apenas suporte)</h5>
                <div class="p-fluid formgrid grid">
                    <div class="field col-12 md:col-2">
                        <label for="id_params_tipo">Tipo de Contato</label>
                        <Dropdown id="id_params_tipo" optionLabel="label" optionValue="value" :disabled="mode == 'view'" v-model="itemData.id_params_tipo" :options="dropdownTipo" placeholder="Selecione..."> </Dropdown>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="pessoa">Pessoa</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.pessoa" id="pessoa" type="text" />
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="departamento">Departamento</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.departamento" id="departamento" type="text" />
                    </div>
                    <div class="field col-12 md:col-6" v-if="getDropdownLabel(itemData.id_params_tipo) && getDropdownLabel(itemData.id_params_tipo).toLowerCase() == 'e-mail'">
                        <label for="meio">{{ getDropdownLabel(itemData.id_params_tipo) }} de contato</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.meio" id="meio" type="text" @input="validateEmail()" />
                        <small id="text-error" class="p-error" v-if="errorMessages.meio">{{ errorMessages.meio }}</small>
                    </div>
                    <div class="field col-12 md:col-6" v-else-if="getDropdownLabel(itemData.id_params_tipo) && ['telefone', 'celular'].includes(getDropdownLabel(itemData.id_params_tipo).toLowerCase())">
                        <label for="meio">{{ getDropdownLabel(itemData.id_params_tipo) }} de contato</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.meio" id="meio" type="text" @input="validateTelefone()" />
                        <small id="text-error" class="p-error" v-if="errorMessages.meio">{{ errorMessages.meio }}</small>
                    </div>
                    <div class="field col-12 md:col-6" v-else>
                        <label for="meio">{{ getDropdownLabel(itemData.id_params_tipo) || 'Meio' }} de contato</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.meio" id="meio" type="text" />
                    </div>
                    <div class="field col-12 md:col-12">
                        <label for="obs">Observação</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.obs" id="obs" type="text" />
                    </div>
                </div>
                <div class="card flex justify-content-center flex-wrap gap-3">
                    <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                    <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!formIsValid()" />
                    <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="mode = 'view'" />
                </div>
                <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
                    <p>mode: {{ mode }}</p>
                    <p>itemData: {{ itemData }}</p>
                    <p v-if="props.itemDataRoot">itemDataRoot: {{ props.itemDataRoot }}</p>
                </div>
            </div>
        </div>
    </form>
</template>
