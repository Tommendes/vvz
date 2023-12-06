<script setup>
import { onBeforeMount, ref, inject } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { useRouter } from 'vue-router';
const router = useRouter();
// Máscaras dos campos
import { Mask } from 'maska';
const masks = ref({
    cep: new Mask({
        mask: '##.###-###'
    })
});
// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
// Campos de formulário
const itemData = inject('itemData');
// Modo do formulário
const mode = inject('mode');
const errorMessages = ref({});
// Dropdowns
const dropdownTipo = ref([]);
// Props do template
const props = defineProps({
    itemDataRoot: Object // O próprio cadastro
});
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/cad-enderecos/${props.itemDataRoot.id}`);
// Carragamento de dados do form
const loadData = async () => {
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
};
// Salvar dados do formulário
const saveData = async () => {
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    if (itemData.value.cep) itemData.value.cep = masks.value.cep.unmasked(itemData.value.cep);
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
        .catch((error) => {
            if (typeof error.response.data == 'string') defaultWarn(error.response.data);
            else if (typeof error.response == 'string') defaultWarn(error.response);
            else if (typeof error == 'string') defaultWarn(error);
            else {
                console.log(error);
                defaultWarn('Erro ao carregar dados!');
            }
        });
};
// Validar data cep
const validateCep = () => {
    errorMessages.value.cep = null;
    // Testa o formato do cep
    if (itemData.value.cep && itemData.value.cep.length > 0 && !masks.value.cep.completed(itemData.value.cep)) errorMessages.value.cep = 'Formato de cep inválido';
    return !errorMessages.value.cep;
};
const formIsValid = () => {
    return validateCep();
};
// Obter parâmetros do BD
const optionLocalParams = async (query) => {
    const selects = query.select ? `&slct=${query.select}` : undefined;
    const url = `${baseApiUrl}/local-params/f-a/gbf?fld=${query.field}&vl=${query.value}${selects}`;
    return await axios.get(url);
};
// Carregar opções do formulário
const loadOptions = async () => {
    // Tipo Endereço
    await optionLocalParams({ field: 'grupo', value: 'tipo_endereco', select: 'id,label' }).then((res) => {
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
            <div class="col-12">
                <h5>{{ itemData.id && userData.admin >= 1 ? `Registro: (${itemData.id})` : '' }} (apenas suporte)</h5>
                <div class="p-fluid formgrid grid">
                    <div class="field col-12 md:col-2">
                        <label for="id_params_tipo">Tipo</label>
                        <Dropdown id="id_params_tipo" optionLabel="label" optionValue="value" :disabled="mode == 'view'" v-model="itemData.id_params_tipo" :options="dropdownTipo" placeholder="Selecione..."> </Dropdown>
                    </div>
                    <div class="field col-12 md:col-2">
                        <label for="cep">CEP</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="##.###-###" v-model="itemData.cep" id="cep" type="text" @input="validateCep()" />
                        <small id="text-error" class="p-error" v-if="errorMessages.cep">{{ errorMessages.cep }}</small>
                    </div>
                    <div class="field col-12 md:col-7">
                        <label for="logradouro">Logradouro</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.logradouro" id="logradouro" type="text" />
                    </div>
                    <div class="field col-12 md:col-1">
                        <label for="nr">Número</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.nr" id="nr" type="text" />
                    </div>
                    <div class="field col-12 md:col-3">
                        <label for="complnr">Complemento</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.complnr" id="complnr" type="text" />
                    </div>
                    <div class="field col-12 md:col-4">
                        <label for="cidade">Cidade</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.cidade" id="cidade" type="text" />
                    </div>
                    <div class="field col-12 md:col-4">
                        <label for="bairro">Bairro</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.bairro" id="bairro" type="text" />
                    </div>
                    <div class="field col-12 md:col-1">
                        <label for="uf">UF</label>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.uf" id="uf" type="text" />
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
        </form>
    </div>
</template>
