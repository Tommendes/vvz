<script setup>
import { onBeforeMount, ref, inject } from 'vue';
import { baseApiUrl } from '@/env';
import { getViaCep } from '@/getCep';
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
    }, Math.random() * 1000);
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
const formIsValid = () => {
    if (!validateCep()) return false;
    return true;
};
// Salvar dados do formulário
const saveData = async () => {
    if (!formIsValid()) {
        defaultWarn('Verifique os campos obrigatórios');
        return;
    }
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    const obj = { ...itemData.value };
    if (obj.cep) obj.cep = masks.value.cep.unmasked(obj.cep);
    await axios[method](url, obj)
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
            if (typeof error == 'string') defaultWarn(error);
            else if (typeof error.response && typeof error.response == 'string') defaultWarn(error.response);
            else if (error.response && error.response.data && typeof error.response.data == 'string') defaultWarn(error.response.data);
            else defaultWarn('Erro ao carregar dados!');
        });
};
// Validar data cep
const validateCep = () => {
    errorMessages.value.cep = null;
    // Testa o formato do cep
    if (itemData.value.cep && itemData.value.cep.length > 0 && !masks.value.cep.completed(itemData.value.cep)) {
        errorMessages.value.cep = 'Formato de cep inválido';
        return false;
    }
    return true;
};
const buscarCEP = async () => {
    if (!validateCep()) return;
    const cep = itemData.value.cep.replace(/[^0-9]/g, '');

    if (cep !== '') {
        try {
            // Limpar os campos enquanto aguarda a resposta
            itemData.value.logradouro = '...';
            itemData.value.bairro = '...';
            itemData.value.cidade = '...';
            itemData.value.uf = '...';
            itemData.value.ibge = '...';

            // Consultar API externa
            const url = `${baseApiUrl}/cad-enderecos/f-a/gvc`;
            const response = await axios.post(url, { cep: cep });

            if (response.data.cep) {
                // Atualizar os campos com os valores da consulta.
                itemData.value.logradouro = response.data.logradouro;
                itemData.value.bairro = response.data.bairro;
                itemData.value.cidade = response.data.localidade;
                itemData.value.uf = response.data.uf;
                itemData.value.ibge = response.data.ibge;
            } else {
                // CEP pesquisado não foi encontrado.
                limparFormularioCEP();
                defaultWarn(response.data);
            }
        } catch (error) {
            console.error('Erro ao buscar informações do CEP', error);
            limparFormularioCEP();
            defaultWarn('Erro ao buscar informações do CEP');
        }
    } else {
        // CEP sem valor, limpar formulário.
        limparFormularioCEP();
    }
};

const limparFormularioCEP = () => {
    itemData.value.logradouro = '';
    itemData.value.bairro = '';
    itemData.value.cidade = '';
    itemData.value.uf = '';
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
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="##.###-###" v-model="itemData.cep" id="cep" type="text" @input="validateCep()" @blur="buscarCEP" />
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
        </form>
    </div>
</template>
