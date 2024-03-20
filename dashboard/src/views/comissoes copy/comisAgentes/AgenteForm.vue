<script setup>
import { onBeforeMount, ref, inject } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { useRouter } from 'vue-router';
const router = useRouter();
// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
// Campos de formulário
const itemData = inject('itemData');
// Modo do formulário
const mode = inject('mode');
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
// Validar formulário
const formIsValid = () => {
    return true;
};
// Mensages de erro
const errorMessages = ref({});

// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/comis-agentes/${props.itemDataRoot.id}`);
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
                    router.push({ path: `/${userData.schema_description}/comissoes` });
                }
            });
        }
    }, Math.random() * 1000);
};
// Salvar dados do formulário
const saveData = async () => {
    // Se o formulário não for válido, não salva
    if (!formIsValid()) {
        defaultWarn('Verifique os campos obrigatórios');
        return;
    }
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
// Carregar opções do formulário
onBeforeMount(() => {
    loadData();
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
                        <label for="observacao">Observação</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.observacao" id="observacao" type="text" />
                    </div>
                </div>
                <div class="card flex justify-content-center flex-wrap gap-3">
                    <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                    <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                    <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="fa-solid fa-ban" severity="danger" text raised @click="mode = 'view'" />
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
