<script setup>
import { onBeforeMount, onMounted, ref, watch, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { isValidEmail } from '@/global';
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import Breadcrumb from '@/components/Breadcrumb.vue';

import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

import { Mask } from 'maska';
const masks = ref({
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    })
});

// Campos de formulário
const itemData = ref({
    e_s: 's'
});
// Modo do formulário
const mode = ref('view');
// Mensages de erro
const errorMessages = ref({});
// Loadings
const loading = ref(false);
// Editar cadastro no autocomplete
const editCadastro = ref(false);
// Props do template
const props = defineProps({
    mode: String
});
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/protocolo`);
// Carragamento de dados do form
const loadData = async () => {
    loading.value = true;
    if (route.params.id || itemData.value.id) {
        if (route.params.id) itemData.value.id = route.params.id;
        const url = `${urlBase.value}/${itemData.value.id}`;
        await axios.get(url).then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);
                itemData.value = body;
                await getNomeCliente();
                loading.value = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${userData.cliente}/${userData.dominio}/protocolo` });
            }
        });
    } else loading.value = false;
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
                    if (mode.value == 'new') router.push({ path: `/${userData.cliente}/${userData.dominio}/protocolo/${itemData.value.id}` });
                    mode.value = 'view';
                } else {
                    defaultWarn('Erro ao salvar registro');
                }
            })
            .catch((err) => {
                defaultWarn(err.response.data);
            });
    }
};

/**
 * Autocomplete de cadastros e pipeline
 */
 const cadastros = ref([]);
const filteredCadastros = ref([]);
const selectedCadastro = ref();
const nomeCliente = ref();
const getNomeCliente = async () => {
    try {
        const url = `${baseApiUrl}/cadastros/f-a/glf?fld=id&vl=${itemData.value.id_cadastros}&slct=nome,cpf_cnpj`;
        const response = await axios.get(url);
        if (response.data.data.length > 0) {
            nomeCliente.value = response.data.data[0].nome + ' - ' + masks.value.cpf_cnpj.masked(response.data.data[0].cpf_cnpj) + (itemData.value.pv_nr ? ' - PV: ' + itemData.value.pv_nr : '');
        }
    } catch (error) {
        console.error('Erro ao buscar cadastros:', error);
    }
};
const searchCadastros = (event) => {
    setTimeout(async () => {
        // Verifique se o campo de pesquisa não está vazio
        if (!event.query.trim().length) {
            // Se estiver vazio, exiba todas as sugestões
            filteredCadastros.value = [...cadastros.value];
        } else {
            // Se não estiver vazio, faça uma solicitação à API (ou use dados em cache)
            if (cadastros.value.length === 0) {
                // Carregue os cadastros da API (ou de onde quer que você os obtenha)
                getCadastroBySearchedId();
            }
            // Filtrar os cadastros com base na consulta do usuário
            filteredCadastros.value = cadastros.value.filter((registro) => {
                return registro.name.toLowerCase().includes(event.query.toLowerCase());
            });
        }
    }, 250);
};
const getCadastroBySearchedId = async (idCadastro) => {
    const qry = idCadastro ? `fld=id&vl=${idCadastro}` : 'fld=1&vl=1';
    try {
        const url = `${baseApiUrl}/cadastros/f-a/glf?${qry}&slct=id,nome,cpf_cnpj`;
        const response = await axios.get(url);
        cadastros.value = response.data.data.map((element) => {
            return {
                code: element.id,
                name: element.nome + ' - ' + element.cpf_cnpj
            };
        });
    } catch (error) {
        console.error('Erro ao buscar cadastros:', error);
    }
};
const confirmEditAutoSuggest = (tipo) => {
    confirm.require({
        group: 'templating',
        header: `Corfirmar edição`,
        message: `Corfirma que deseja editar o ${tipo}?`,
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'pi pi-check',
        rejectIcon: 'pi pi-times',
        acceptClass: 'p-button-danger',
        accept: () => {
            if (tipo == 'cadastro') {
                selectedCadastro.value = undefined;
                editCadastro.value = true;
            }
        },
        reject: () => {
            return false;
        }
    });
};
/**
 * Fim de autocomplete de cadastros
 */
// Opções de DropDown de Movimento
const dropdownMovimento = ref([
    { value: 'e', label: 'Entrada' },
    { value: 's', label: 'Saída'}
]);
// Validar email
const validateEmail = (field) => {
    if (itemData.value.email_destinatario && itemData.value.email_destinatario.trim().length > 0 && !isValidEmail(itemData.value.email_destinatario)) {
        errorMessages.value.email_destinatario = 'Formato de email inválido';
    } else errorMessages.value.email_destinatario = null;
    return !errorMessages.value.email_destinatario;
};
// Validar formulário
const formIsValid = () => {
    return validateEmail();
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
    errorMessages.value = {};
    loadData();
    emit('cancel');
};
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
    // loadOptions();
});
onMounted(() => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
    else {
        if (itemData.value.id) mode.value = 'view';
        else mode.value = 'new';
    }
});
// Observar alterações na propriedade selectedCadastro
watch(selectedCadastro, (value) => {
    if (value) {
        itemData.value.id_cadastros = value.code;
    }
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os Protocolos', to: `/${userData.cliente}/${userData.dominio}/protocolos` }, { label: itemData.registro + (userData.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card" style="min-width: 100rem">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-12" v-if="itemData.registro" style="margin: 0">
                            <h3>Número do Registro: {{ itemData.registro }}</h3>
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="id_cadastros">Cliente</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <AutoComplete v-else-if="(editCadastro || mode == 'new')" v-model="selectedCadastro" optionLabel="name" :suggestions="filteredCadastros" @complete="searchCadastros" forceSelection />
                            <div class="p-inputgroup flex-1" v-else>
                                <InputText disabled v-model="nomeCliente" />
                                <Button icon="pi pi-pencil" severity="primary" @click="confirmEditAutoSuggest('cadastro')" :disabled="mode == 'view'" />
                            </div>
                        </div>
                        <!-- primeiro: -->
                        <!-- <div class="col-12 md:col-6">
                            <label for="id_cadastros">Registro do Destinatário no Cadastro</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_cadastros" id="id_cadastros" type="text" />
                        </div> -->
                        <div class="col-12 md:col-6">
                            <label for="titulo">Título do Protocolo</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.titulo" id="titulo" type="text" />
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="email_destinatario">Email do Destinatário</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.email_destinatario" id="email_destinatario" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.email_destinatario">{{ errorMessages.email_destinatario || '&nbsp;' }}</small>
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="e_s">Movimento</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <Dropdown v-else id="e_s" :disabled="mode == 'view'" optionLabel="label" optionValue="value" v-model="itemData.e_s" :options="dropdownMovimento" />
                        </div>
                        <div class="col-12 md:col-12" v-if="itemData.descricao || ['edit', 'new'].includes(mode)">
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
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!formIsValid()" />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
                <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
                    <p>{{ route.name }}</p>
                    <p>mode: {{ mode }}</p>
                    <p>itemData: {{ itemData }}</p>
                </div>
            </div>
        </form>
    </div>
</template>
