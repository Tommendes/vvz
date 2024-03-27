<script setup>
import { onBeforeMount, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultWarn } from '@/toast';
import { useRoute } from 'vue-router';
const route = useRoute();
// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
// Campos de formulário
const itemData = ref({});
// Url base do form action
const urlBase = ref(`${baseApiUrl}/comis-pipeline/${route.params.id}`);
const loading = ref(false);
// Carragamento de dados do form
const loadData = async () => {
    loading.value = true;
    setTimeout(async () => {
        const url = `${urlBase.value}`;
        await axios
            .get(url)
            .then(async (res) => {
                const body = res.data;
                body.id = String(body.id);

                itemData.value = body;
            })
            .catch((error) => {
                if (typeof error == 'string') defaultWarn(error);
                else if (typeof error.response && typeof error.response == 'string') defaultWarn(error.response);
                else if (error.response && error.response.data && typeof error.response.data == 'string') defaultWarn(error.response.data);
                else {
                    console.log(error);
                    defaultWarn('Erro ao carregar dados!');
                }
            });
    }, Math.random() * 100 + 250);
    loading.value = false;
};
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
});
</script>

<template>
    <form @submit.prevent="saveData" @keydow.enter.prevent>
        <div class="grid">
            <div class="col-12">
                <h5 v-if="itemData.id">{{ itemData.id && userData.admin >= 1 ? `Registro: (${itemData.id})` : '' }}
                    (apenas suporte)</h5>
                <div class="p-fluid formgrid grid">
                    <div class="field col-12 md:col-5">
                        <label for="id_params_tipo">Tipo de Contato</label>
                        <Dropdown id="id_params_tipo" optionLabel="label" optionValue="value"
                            v-model="itemData.id_params_tipo" :options="dropdownTipo" placeholder="Selecione...">
                        </Dropdown>
                    </div>
                    <div class="field col-12 md:col-7"
                        v-if="getDropdownLabel(itemData.id_params_tipo) && getDropdownLabel(itemData.id_params_tipo).toLowerCase() == 'e-mail'">
                        <label for="meio">{{ getDropdownLabel(itemData.id_params_tipo) }} de contato</label>
                        <div class="p-inputgroup flex-1">
                            <InputText autocomplete="no" v-model="itemData.meio" id="meio" type="text"
                                @input="validateEmail()" />
                            <Button icon="fa-solid fa-floppy-disk" severity="success"
                                v-tooltip.top="'Clique para salvar o contato'" @click="saveData()" />
                        </div>
                        <small id="text-error" class="p-error" v-if="errorMessages.meio">{{ errorMessages.meio
                            }}</small>
                    </div>
                    <div class="field col-12 md:col-7"
                        v-else-if="getDropdownLabel(itemData.id_params_tipo) && ['telefone', 'celular'].includes(getDropdownLabel(itemData.id_params_tipo).toLowerCase())">
                        <label for="meio">{{ getDropdownLabel(itemData.id_params_tipo) }} de contato</label>
                        <div class="p-inputgroup flex-1">
                            <InputText autocomplete="no" v-maska data-maska="['(##) ####-####', '(##) #####-####']"
                                v-model="itemData.meio" id="meio" type="text" @input="validateTelefone()" />
                            <Button icon="fa-solid fa-floppy-disk" severity="success"
                                v-tooltip.top="'Clique para salvar o contato'" @click="saveData()" />
                        </div>
                        <small id="text-error" class="p-error" v-if="errorMessages.meio">{{ errorMessages.meio
                            }}</small>
                    </div>
                    <div class="field col-12 md:col-7" v-else>
                        <label for="meio">{{ getDropdownLabel(itemData.id_params_tipo) || 'Meio' }} de contato</label>
                        <div class="p-inputgroup flex-1">
                            <InputText autocomplete="no" v-model="itemData.meio" id="meio" type="text" />
                            <Button icon="fa-solid fa-floppy-disk" severity="success"
                                v-tooltip.top="'Clique para salvar o contato'" @click="saveData()" />
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
