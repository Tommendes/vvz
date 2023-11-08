<script setup>
import { onBeforeMount, ref, onMounted, inject } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn, defaultError } from '@/toast';
import { useRouter } from 'vue-router';
const router = useRouter();
// Máscaras dos campos
import { Mask } from 'maska';
const masks = ref({
    valor: new Mask({
        mask: '0,99'
    })
});
// Cookies de usuário
import { userKey } from '@/global';
import moment from 'moment';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
// Campos de formulário
const itemData = ref({});
const dataAceite = ref(null);
// Modo do formulário
const mode = ref('view');
const errorMessages = ref({});
// Dropdowns
const dropdownEnderecos = ref([]);
const dropdownTecnicos = ref([]);
const dropdownIntExt = ref([
    { value: '0', label: 'Interno' },
    { value: '1', label: 'Externo' }
]);
const dropdownGarantia = ref([
    { value: '0', label: 'Não' },
    { value: '1', label: 'Sim' }
]);
// Loadings
const loading = ref(true);
// Props do template
const dialogRef = inject('dialogRef');
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/pv-oat/${dialogRef.value.data.idPv}`);
// Carragamento de dados do form
const loadData = async () => {
    loading.value = true;
    if (dialogRef.value.data.idCadastro) {
        loadEnderecos();
    }
    if (dialogRef.value.data.idPvOat) {
        const url = `${urlBase.value}/${dialogRef.value.data.idPvOat}`;
        await axios.get(url).then((res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);
                body.int_ext = String(body.int_ext);
                body.garantia = String(body.garantia);
                body.id_cadastro_endereco = String(body.id_cadastro_endereco);
                if (body.id_tecnico) body.id_tecnico = String(body.id_tecnico);
                if (body.aceite_do_cliente) dataAceite.value = moment(body.aceite_do_cliente).format('DD/MM/YYYY');
                // Se body.valor_total então formate o valor com duas casas decimais em português
                if (body.valor_total) body.valor_total = Number(body.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                itemData.value = body;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${userData.cliente}/${userData.dominio}/pos-venda` });
            }
        });
    } else {
        itemData.value = {
            id_pv: dialogRef.value.data.idPv,
            id_cadastro_endereco: null,
            id_tecnico: null,
            nr_oat: null,
            int_ext: null,
            garantia: null,
            nf_garantia: null,
            pessoa_contato: null,
            telefone_contato: null,
            email_contato: null,
            valor_total: null,
            aceite_do_cliente: null,
            descricao: null
        };
    }
    loading.value = false;
    if (!dialogRef.value.data.idPvOat) mode.value = 'new';
};
const loadEnderecos = async () => {
    const url = `${baseApiUrl}/cad-enderecos/${dialogRef.value.data.idCadastro}`;
    await axios.get(url).then((res) => {
        res.data.data.map((item) => {
            const label = `${item.logradouro}${item.nr ? ', ' + item.nr : ''}${item.complnr ? ' ' + item.complnr : ''}${item.bairro ? ' - ' + item.bairro : ''}${userData.admin >= 2 ? ` (${item.id})` : ''}`;
            dropdownEnderecos.value.push({ value: String(item.id), label: label });
        });
    });
};
const loadTecnicos = async () => {
    const url = `${baseApiUrl}/pv-tecnicos`;
    await axios.get(url).then((res) => {
        res.data.data.map((item) => {
            dropdownTecnicos.value.push({ value: String(item.id), label: item.tecnico });
        });
    });
};
// Salvar dados do formulário
const saveData = async () => {
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    // Se body.valor_total então antes de salvar formate o valor com duas casas decimais em inglês
    if (itemData.value.valor_total) itemData.value.valor_total = Number(itemData.value.valor_total.replace(',', '.')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    axios[method](url, itemData.value)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                itemData.value = body;
                if (itemData.value.valor_total) itemData.value.valor_total = Number(itemData.value.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
// Carregar dados do formulário
onBeforeMount(() => {
    loadTecnicos();
});
onMounted(() => {
    setTimeout(() => {
        loadData();
    }, Math.random() * 1000 + 250);
});
</script>

<template>
    <div class="grid">
        <form @submit.prevent="saveData">
            <div class="col-12">
                <h5 v-if="itemData.id && userData.admin >= 2">Registro: {{ `${itemData.id}` }} (apenas suporte)</h5>
                <div class="p-fluid grid">
                    <div class="col-12 md:col-5">
                        <label for="id_cadastro_endereco">Endereço do atendimento</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <!-- <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_cadastro_endereco" id="id_cadastro_endereco" type="text" /> -->
                        <Dropdown v-else id="id_cadastro_endereco" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.id_cadastro_endereco" :options="dropdownEnderecos" />
                    </div>
                    <div class="col-12 md:col-3">
                        <label for="id_tecnico">Técnico responsável</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <Dropdown v-else id="id_tecnico" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.id_tecnico" :options="dropdownTecnicos" />
                    </div>
                    <div class="col-12 md:col-2">
                        <label for="int_ext">Interno/Externo</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <Dropdown v-else id="int_ext" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.int_ext" :options="dropdownIntExt" />
                    </div>
                    <div class="col-12 md:col-2">
                        <label for="garantia">Garantia</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <Dropdown v-else id="garantia" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.garantia" :options="dropdownGarantia" />
                    </div>
                    <div class="col-12 md:col-2">
                        <label for="nf_garantia">Nota fiscal do produto</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" :required="itemData.garantia == 1" v-model="itemData.nf_garantia" id="nf_garantia" type="text" />
                    </div>
                    <div class="col-12 md:col-3">
                        <label for="pessoa_contato">Contato no cliente</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.pessoa_contato" id="pessoa_contato" type="text" />
                    </div>
                    <div class="col-12 md:col-2">
                        <label for="telefone_contato">Telefone do contato</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-maska data-maska="['(##) ####-####', '(##) #####-####']" v-model="itemData.telefone_contato" id="telefone_contato" type="text" />
                        <small id="text-error" class="p-error" v-if="errorMessages.telefone_contato">{{ errorMessages.telefone_contato || '&nbsp;' }}</small>
                    </div>
                    <div class="col-12 md:col-3">
                        <label for="email_contato">Email do contato</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email_contato" id="email_contato" type="text" />
                        <small id="text-error" class="p-error" v-if="errorMessages.email_contato">{{ errorMessages.email_contato || '&nbsp;' }}</small>
                    </div>
                    <div class="col-12 md:col-2">
                        <label for="valor_total">Valor dos serviços</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                            <span class="p-inputgroup-addon">R$</span>
                            <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_total" id="valor_total" type="text" v-maska data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                        </div>
                    </div>
                    <div class="col-12 md:col-12" v-if="itemData.aceite_do_cliente">
                        <h3>Este serviço foi autorizado na data de {{ dataAceite }}</h3>
                    </div>
                    <div class="col-12 md:col-12">
                        <label for="descricao">Descrição dos serviços</label>
                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                        <Editor v-else-if="mode != 'view'" v-model="itemData.descricao" id="descricao" editorStyle="height: 160px" aria-describedby="editor-error" />
                        <p v-else v-html="itemData.descricao" class="p-inputtext p-component p-filled"></p>
                    </div>
                </div>
                <div class="card flex justify-content-center flex-wrap gap-3">
                    <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                    <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!formIsValid()" />
                    <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="mode = 'view'" />
                </div>
            </div>
        </form>
        <div class="col-12" v-if="userData.admin >= 2">
            <div class="card bg-green-200 mt-3">
                <p>Mode: {{ mode }}</p>
                <p>itemData: {{ itemData }}</p>
                <p>dialogRef.data: {{ dialogRef.data }}</p>
            </div>
        </div>
    </div>
</template>
<style>
.p-input-filled .p-inputtext {
    background-color: #ffffff00;
}
.p-input-filled .p-dropdown {
    background-color: #ffffff00;
}
</style>
