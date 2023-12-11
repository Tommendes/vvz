<script setup>
import { onBeforeMount, onMounted, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();

import moment from 'moment';

// Campos de formulário
const itemData = ref({});
const dataRegistro = ref('');
// Modo do formulário
const mode = ref('view');
// Loadings
const loading = ref(false);
// Props do template
const props = defineProps({
    mode: String,
    idItens: String
});
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/com-prop-itens/${route.params.id}`);
// Carragamento de dados do form
const loadData = async () => {
    if (props.idItens) {
        loading.value = true;
        setTimeout(async () => {
            const url = `${urlBase.value}/${props.idItens}`;
            await axios.get(url).then(async (res) => {
                const body = res.data;
                if (body && body.id) {
                    body.id = String(body.id);
                    itemData.value = body;
                    console.log(itemData.value);
                    itemData.value.status = isTrue(itemData.value.status);
                    itemData.value.compoe_valor = isTrue(itemData.value.compoe_valor);
                    dataRegistro.value = moment(itemData.value.updated_at || itemData.value.created_at).format('DD/MM/YYYY HH:mm:ss');
                    loading.value = false;
                } else {
                    defaultWarn('Registro não localizado');
                    router.push({ path: `/${userData.schema_description}/proposta/${route.params.id}` });
                }
            });
            loading.value = false;
        }, Math.random() * 1000 + 250);
    } else {
        itemData.value = {
            id_com_propostas: route.params.id,
            compoe_valor: true
        };
        mode.value = 'new';
        loading.value = false;
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
                    itemData.value.status = isTrue(itemData.value.status);
                    itemData.value.compoe_valor = isTrue(itemData.value.compoe_valor);
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

// Verifica se o valor é 1
const isTrue = (value) => [1, 10].includes(value);
//DropDown
const dropdownDescAtivo = ref([
    { value: 0, label: 'Não' },
    { value: 1, label: 'Sim' }
]);
// Validar formulário
const formIsValid = () => {
    return true;
};
// Recarregar dados do formulário
const reload = () => {
    emit('cancel');
};
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
});
onMounted(() => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
});
</script>

<template>
    <div class="card">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12 md:col-8">
                            <div class="flex justify-content-start gap-5">
                                <div class="switch-label" v-if="itemData.compos_nr">Número do item: {{ itemData.item }}</div>
                                <div class="switch-label">Composição ativa <InputSwitch id="status" :disabled="mode == 'view'" v-model="itemData.status" /></div>
                                <div class="switch-label">Compõe valor <InputSwitch id="compoe_valor" :disabled="mode == 'view'" v-model="itemData.compoe_valor" /></div>
                            </div>
                        </div>
                        <!-- <div class="col-12 md:col-6">
                            <label for="id_com_propostas">Proposta</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_com_propostas" id="id_com_propostas" type="text" />
                        </div> -->
                        <!-- <div class="col-12 md:col-6">
                            <label for="id_com_prop_compos">Composição</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_com_prop_compos" id="id_com_prop_compos" type="text" />
                        </div> -->
                        <div class="col-12 md:col-6">
                            <label for="item">Item</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.item" id="item" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="quantidade">Quantidade</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.quantidade" id="quantidade" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="valor_unitario">Valor Unitário</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_unitario" id="valor_unitario" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="desconto_ativo">Desconto Ativo</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else id="desconto_ativo" :disabled="mode == 'view'" placeholder="Selecione o período" optionLabel="label" optionValue="value" v-model="itemData.desconto_ativo" :options="dropdownDescAtivo" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="desconto_total">Desconto Total</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.desconto_total" id="desconto_total" type="text" />
                        </div>
                        <div class="col-12 md:col-12">
                            <label for="descricao">Descrição</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Editor v-else-if="!loading && mode != 'view'" v-model="itemData.descricao" id="descricao" editorStyle="height: 160px" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.descricao" class="p-inputtext p-component p-filled"></p>
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                        <Button type="button" label="Fechar" icon="fa-solid fa-xmark" severity="secondary" text raised @click="reload" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!formIsValid()" />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="mode = 'view'" />
                    </div>
                </div>
                <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
                    <p>itemData: {{ itemData }}</p>
                </div>
            </div>
        </form>
    </div>
</template>
<style scoped>
.switch-label {
    font-size: 1.75rem;
    font-family: inherit;
    font-weight: 500;
    line-height: 1.2;
    color: var(--surface-900);
}
</style>

