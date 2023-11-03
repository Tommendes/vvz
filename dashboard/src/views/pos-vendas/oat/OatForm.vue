<script setup>
import { onBeforeMount, ref, inject } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn, defaultError } from '@/toast';
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
import { useUserStore } from '@/stores/user';
const store = useUserStore();
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
const urlBase = ref(`${baseApiUrl}/pv-oat/${props.itemDataRoot.id}`);
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
                router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/pos-venda` });
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
const formIsValid = () => {
    return true;
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
                <h5>{{ itemData.id && store.userStore.admin >= 1 ? `Registro: (${itemData.id})` : '' }} (apenas suporte)</h5>
                <div class="p-fluid formgrid grid">
                        <div class="col-12 md:col-3">
                            <label for="id_pv">ID do PV</label>
                            <InputText  autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_pv" id="id_pv" type="text" />
                        </div>
                        <div class="col-12 md:col-5">
                            <label for="id_cadastro_endereco">Endereço do atendimento</label>
                            <InputText  autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_cadastro_endereco" id="id_cadastro_endereco" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="id_tecnico">Técnico responsável</label>
                            <InputText  autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_tecnico" id="id_tecnico" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="nr_oat">OAT</label>
                            <InputText  autocomplete="no" :disabled="mode == 'view'" v-model="itemData.nr_oat" id="nr_oat" type="text" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="int_ext">Interno/Externo</label>
                            <!-- <InputText  autocomplete="no" :disabled="mode == 'view'" v-model="itemData.int_ext" id="int_ext" type="text" /> -->
                            <Dropdown  id="int_ext" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.int_ext" :options="dropdownIntExt" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="garantia">Garantia</label>
                            <InputText  autocomplete="no" :disabled="mode == 'view'" v-model="itemData.garantia" id="garantia" type="text" />
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="nf_garantia">Nota fiscal do produto</label>
                            <InputText  autocomplete="no" :disabled="mode == 'view'" v-model="itemData.nf_garantia" id="nf_garantia" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="pessoa_contato">Contato no cliente</label>
                            <InputText  autocomplete="no" :disabled="mode == 'view'" v-model="itemData.pessoa_contato" id="pessoa_contato" type="text" />
                        </div>
                        <div class="col-12 md:col-2">
                            <label for="telefone_contato">Telefone do contato</label>
                            <InputText  autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="['(##) ####-####', '(##) #####-####']"  v-model="itemData.telefone_contato" id="telefone_contato" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.telefone_contato">{{ errorMessages.telefone_contato || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-4">
                            <label for="email_contato">Email do contato</label>
                            <InputText  autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email_contato" id="email_contato" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email_contato">{{ errorMessages.email_contato || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="valor_total">Valor dos serviços</label>
                            <InputText  autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_total" id="valor_total" type="text" />
                        </div>
                        <div class="col-12 md:col-3">
                            <label for="aceite_do_cliente">Data do aceite</label>
                            <Calendar  autocomplete="no" :disabled="mode == 'view'" v-model="itemData.aceite_do_cliente" id="aceite_do_cliente" :numberOfMonths="2" showIcon />
                        </div>
                        <div class="col-12 md:col-12">
                            <label for="descricao">Descrição dos serviços</label>
                            <Editor v-if="mode != 'view'" v-model="itemData.descricao" id="descricao" editorStyle="height: 160px" aria-describedby="editor-error" />
                            <p v-html="itemData.descricao" class="p-inputtext p-component p-filled"></p>
                        </div>
                </div>
                <div class="card flex justify-content-center flex-wrap gap-3">
                    <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                    <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!formIsValid()" />
                    <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="mode = 'view'" />
                </div>
            </div>
        </form>
    </div>
</template>
