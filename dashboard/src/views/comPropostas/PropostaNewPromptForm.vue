<script setup>
import { inject, onBeforeMount, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
// Url base do form action
const urlBase = ref(`${baseApiUrl}/com-propostas`);
import { defaultSuccess, defaultWarn } from '@/toast';
import { isValidEmail } from '@/global';
import EditorComponent from '@/components/EditorComponent.vue';

const dialogRef = inject('dialogRef');
const itemData = ref({});
onBeforeMount(() => {
    itemData.value = dialogRef.value.data.message;
});
const close = async (itemData) => {
    // Devolve o itemData para o componente que chamou o dialog
    dialogRef.value.close(itemData);
};

// Mensages de erro
const errorMessages = ref({});

import { Mask } from 'maska';
const masks = ref({
    telefone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    })
});
// Validar contato
const validateContato = () => {
    errorMessages.value.pessoa_contato = null;
    if (!itemData.value.pessoa_contato) {
        errorMessages.value.pessoa_contato = 'Informe um nome de contato';
        return false;
    }
    return true;
};
// Validar telefone
const validateTelefone = () => {
    errorMessages.value.telefone_contato = null;
    if (itemData.value.telefone_contato && itemData.value.telefone_contato.trim().length > 0 && ![10, 11].includes(masks.value.telefone.unmasked(itemData.value.telefone_contato).length)) {
        errorMessages.value.telefone_contato = 'Formato de telefone inválido';
        return false;
    }
    return true;
};
// Validar email
const validateEmail = () => {
    errorMessages.value.email_contato = null;
    if (itemData.value.email_contato && itemData.value.email_contato.trim().length > 0 && !isValidEmail(itemData.value.email_contato)) {
        errorMessages.value.email_contato = 'Formato de email inválido';
        return false;
    }
    return true;
};

// Cookies do usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

const saveData = async () => {
    const isFormValid = validateContato() && itemData.value.pessoa_contato.trim().length && validateTelefone() && validateEmail();
    if (!isFormValid) {
        defaultWarn('Por favor, invorme um nome de contato, um telefone e um email válidos');
        return;
    }
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    const obj = { ...itemData.value };
    if (obj.telefone_contato) obj.telefone_contato = masks.value.telefone.unmasked(obj.telefone_contato);
    await axios[method](url, obj)
        .then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                close(body);
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((error) => {
            if (typeof error.response.data == 'string') defaultWarn(error.response.data);
            else if (typeof error.response == 'string') defaultWarn(error.response);
            else if (typeof error == 'string') defaultWarn(error);
            else defaultWarn('Erro ao carregar dados!');
        });
};
</script>

<template>
    <form @submit.prevent="saveData">
        <div class="grid">
            <div class="col-12">
                <div class="p-fluid grid">
                    <div class="col-12 md:col-3">
                        <label for="pessoa_contato">Contato</label>
                        <InputText autocomplete="no" v-model="itemData.pessoa_contato" id="pessoa_contato" type="text" @blur="validateContato" />
                        <small id="text-error" class="p-error" v-if="errorMessages.pessoa_contato">{{ errorMessages.pessoa_contato }}</small>
                    </div>
                    <div class="col-12 md:col-3">
                        <label for="telefone_contato">Telefone</label>
                        <InputText autocomplete="no" v-maska data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.telefone_contato" id="telefone_contato" type="text" @blur="validateTelefone" />
                        <small id="text-error" class="p-error" v-if="errorMessages.telefone_contato">{{ errorMessages.telefone_contato }}</small>
                    </div>
                    <div class="col-12 md:col-4">
                        <label for="email_contato">Email</label>
                        <InputText autocomplete="no" v-model="itemData.email_contato" id="email_contato" type="text" class="lowercase" @blur="validateEmail" />
                        <small id="text-error" class="p-error" v-if="errorMessages.email_contato">{{ errorMessages.email_contato }}</small>
                    </div>
                    <div class="col-12 md:col-12">
                        <label for="saudacao_inicial">Saudação Inicial</label>
                        <EditorComponent v-model="itemData.saudacao_inicial" id="saudacao_inicial" editorStyle="height: 160px" aria-describedby="editor-error" />
                    </div>
                    <div class="col-12 md:col-12">
                        <label for="observacoes_finais">Observacoes Finais</label>
                        <EditorComponent v-model="itemData.observacoes_finais" id="observacoes_finais" editorStyle="height: 160px" aria-describedby="editor-error" />
                    </div>
                    <div class="col-12 md:col-12">
                        <label for="garantia">Garantia</label>
                        <EditorComponent v-model="itemData.garantia" id="garantia" editorStyle="height: 160px" aria-describedby="editor-error" />
                    </div>
                    <div class="col-12 md:col-12">
                        <label for="conclusao">Conclusão</label>
                        <EditorComponent v-model="itemData.conclusao" id="conclusao" editorStyle="height: 160px" aria-describedby="editor-error" />
                    </div>
                    <div class="col-12 md:col-12">
                        <label for="assinatura">Assinatura</label>
                        <EditorComponent v-model="itemData.assinatura" id="assinatura" editorStyle="height: 160px" aria-describedby="editor-error" />
                    </div>
                </div>
            </div>
            <div class="col-12">
                <div class="card flex justify-content-center flex-wrap gap-3">
                    <Button type="submit" label="Salvar" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                    <Button type="button" label="Cancelar" icon="fa-solid fa-ban" severity="danger" text raised @click="close" />
                </div>
            </div>
            <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
                <h5>FormData</h5>
                <p>itemData: {{ itemData }}</p>
            </div>
        </div>
    </form>
</template>
