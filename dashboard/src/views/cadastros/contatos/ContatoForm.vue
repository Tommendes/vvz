<script setup>
import { onBeforeMount, onMounted, ref, inject } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { UFS, isValidEmail } from '@/global';

import { Mask, MaskInput } from 'maska';
const masks = ref({
    telefone: new Mask({
        mask: ['(##) ####-####', '(##) #####-####']
    })
});

import { useRoute } from 'vue-router';
const route = useRoute();

import { useRouter } from 'vue-router';
const router = useRouter();

// Cookies de usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();

// Campos de formulário
const itemData = inject('itemData');
// Modo do formulário
const mode = inject('mode');
// Mensages de erro
const errorMessages = ref({});
// Dropdowns
const dropdownTipo = ref([]);
// Loadings
const loading = ref({
    accepted: null,
    email: null,
    telefone: null
});
// Props do template
const props = defineProps({
    itemDataRoot: Object // O próprio cadastro
})
// Emit do template
const emit = defineEmits(['changed', 'cancel'])
// Url base do form action
const urlBase = ref(`${baseApiUrl}/cad-contatos/${props.itemDataRoot.id}`);
// Carragamento de dados do form
const loadData = async () => {
    if ((itemData && itemData.id)) {
        loading.value.form = true;
        const url = `${urlBase.value}/${itemData.value.id}`;
        console.log(url);
        await axios.get(url).then((res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);
                itemData.value = body;
                loading.value.form = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/cadastros` });
            }
        });
    } 
};
// Salvar dados do formulário
const saveData = async () => {
    if (formIsValid()) {
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
    }
};
// Validar email
const validateEmail = () => {
    if (itemData.value.email && !isValidEmail(itemData.value.email)) {
        errorMessages.value.email = 'Formato de email inválido';
    } else errorMessages.value.email = null;
    return !errorMessages.value.email;
};
// Validar telefone
const validateTelefone = () => {
    if (itemData.value.telefone && itemData.value.telefone.length > 0 && ![10, 11].includes(itemData.value.telefone.replace(/([^\d])+/gim, "").length)) {
        errorMessages.value.telefone = 'Formato de telefone inválido';
    } else errorMessages.value.telefone = null;
    return !errorMessages.value.telefone;
};
// Validar formulário
const formIsValid = () => {
    return true;// validateEmail(), validateTelefone();
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
    errorMessages.value = {};
};
// Obter parâmetros do BD
const optionLocalParams = async (query) => {
    itemData.value.id = route.params.id;
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
    <div class="grid">
        <form @submit.prevent="saveData">
            {{ itemData }}
            {{ mode }}
            <div class="col-12">
                <h5>{{ props.itemDataRoot.nome + (store.userStore.admin >= 1 ? `: (${props.itemDataRoot.id})` : '') }}</h5>
                <div class="p-fluid formgrid grid">
                    <div class="field col-12 md:col-2">
                        <label for="id_params_tipo">Tipo de Contato</label>
                        <Dropdown id="id_params_tipo" optionLabel="label" optionValue="value" :disabled="mode == 'view'"
                            v-model="itemData.id_params_tipo" :options="dropdownTipo" placeholder="Selecione...">
                        </Dropdown>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="pessoa">Pessoa</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.pessoa" id="pessoa"
                            type="text" />
                        <small id="text-error" class="p-error">{{ errorMessages.pessoa || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="departamento">Departamento</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.departamento"
                            id="departamento" type="text" />
                        <small id="text-error" class="p-error">{{ errorMessages.departamento || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-6">
                        <label for="meio">Meio de Contato</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.meio" id="meio"
                            type="text" />
                        <small id="text-error" class="p-error">{{ errorMessages.meio || '&nbsp;' }}</small>
                    </div>
                    <div class="field col-12 md:col-12">
                        <label for="obs">Observação</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.obs" id="obs"
                            type="text" />
                        <small id="text-error" class="p-error">{{ errorMessages.obs || '&nbsp;' }}</small>
                    </div>
                </div>
                <div class="card flex justify-content-center flex-wrap gap-3">
                    <Button type="button" v-if="mode == 'view'" label="Editar" icon="pi pi-pencil" text raised
                        @click="mode = 'edit'" />
                    <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text
                        raised :disabled="!formIsValid()" />
                    <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text
                        raised @click="reload(); emit('cancel')" />
                </div>
            </div>
        </form>
    </div>
</template>
