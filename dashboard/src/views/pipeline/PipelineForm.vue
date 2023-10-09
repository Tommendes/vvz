<script setup>
import { onBeforeMount, onMounted, ref, watch, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { userKey } from '@/global';
import Breadcrumb from '../../components/Breadcrumb.vue';
import { useRoute } from 'vue-router';
const route = useRoute();

import { useRouter } from 'vue-router';
const router = useRouter();

// Cookies de usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();

import { Mask } from 'maska';
const masks = ref({
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    })
});

import { useConfirm } from 'primevue/useconfirm';
import moment from 'moment';
const confirm = useConfirm();

// Campos de formulário
const itemData = ref({});
// Modelo de dados usado para comparação
const itemDataComparision = ref({});
// Modo do formulário
const mode = ref('view');
// Aceite do formulário
const accept = ref(false);
// Mensages de erro
const errorMessages = ref({});
// Loadings
const loading = ref({
    form: true,
    accepted: null,
    email: null,
    telefone: null
});
// Editar cadastro no autocomplete
const editCadastro = ref(false);
// Itens do dropdown de Unidades de Negócio do grid
const dropdownUnidades = ref([]);
const dropdownAgentes = ref([]);
// Props do template
const props = defineProps({
    mode: String
});
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/pipeline`);
// Carragamento de dados do form
const loadData = async () => {
    if (route.params.id || itemData.value.id) {
        if (route.params.id) itemData.value.id = route.params.id;
        const url = `${urlBase.value}/${itemData.value.id}`;
        await axios.get(url).then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                body.id = String(body.id);

                itemData.value = body;
                itemDataComparision.value = { ...itemData.value };
                selectedCadastro.value = {
                    code: itemData.value.id_cadastros,
                    name: itemData.value.nome + ' - ' + itemData.value.cpf_cnpj
                };
                await getNomeCliente();
                loading.value.form = false;
            } else {
                defaultWarn('Registro não localizado');
                router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/pipeline` });
            }
        });
    } else loading.value.form = false;
};
// Salvar dados do formulário
const saveData = async () => {
    if (formIsValid()) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`;
        // console.log(url);
        // console.log(JSON.stringify(itemData.value))
        axios[method](url, itemData.value)
            .then((res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    itemDataComparision.value = { ...itemData.value };
                    emit('changed');
                    // if (mode.value != 'new') reload();
                    // else router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/cadastro/${itemData.value.id}` });
                    if (mode.value == 'new') router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/pipeline/${itemData.value.id}` });
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
// Verifica se houve alteração nos dados do formulário
const isItemDataChanged = () => {
    const ret = JSON.stringify(itemData.value) !== JSON.stringify(itemDataComparision.value);
    if (!ret) {
        accept.value = false;
        errorMessages.value = {};
    }
    return ret;
};
// Validar formulário
const formIsValid = () => {
    return true;
    // && validateCPF() && validateEmail() && validateTelefone();
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
    accept.value = false;
    errorMessages.value = {};
    loadData();
    emit('cancel');
};
// Listar unidades de negócio
const listUnidadesDescricao = async () => {
    loading.value.form = true;
    const query = { func: 'ubt', tipoDoc: undefined, unidade: undefined };
    const url = `${baseApiUrl}/pipeline-params/f-a/${query.func}?doc_venda=${query.tipoDoc ? query.tipoDoc : ''}&gera_baixa=&descricao=${query.unidade ? query.unidade : ''}`;
    await axios.get(url).then((res) => {
        dropdownUnidades.value = [];
        res.data.data.map((item) => {
            const label = item.descricao.toString().replaceAll(/_/g, ' ');
            const itemList = { value: item.id, label: label };
            dropdownUnidades.value.push(itemList);
        });
        loading.value.form = false;
    });
};
// Listar unidades de negócio
const listAgentesNegocio = async () => {
    loading.value.form = true;
    const url = `${baseApiUrl}/users/f-a/gbf?fld=agente_v&vl=1&slct=id,name`;
    await axios.get(url).then((res) => {
        dropdownAgentes.value = [];
        res.data.data.map((item) => {
            dropdownAgentes.value.push({ value: item.id, label: item.name });
        });
        loading.value.form = false;
    });
};

const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
/**
 * Autocomplete de cadastros
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
            nomeCliente.value = response.data.data[0].nome + ' - ' + masks.value.cpf_cnpj.masked(response.data.data[0].cpf_cnpj);
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
                try {
                    const url = `${baseApiUrl}/cadastros/f-a/glf?fld=1&vl=1&slct=id,nome,cpf_cnpj`;
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
            }
            // Filtrar os cadastros com base na consulta do usuário
            filteredCadastros.value = cadastros.value.filter((cadastro) => {
                return cadastro.name.toLowerCase().includes(event.query.toLowerCase());
            });
        }
    }, 250);
};
const confirmEditCadastro = () => {
    confirm.require({
        group: 'templating',
        header: 'Corfirma que deseja editar o cadastro?',
        message: 'Você tem certeza que deseja editar este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'pi pi-check',
        rejectIcon: 'pi pi-times',
        acceptClass: 'p-button-danger',
        accept: () => {
            selectedCadastro.value = undefined;
            editCadastro.value = true;
        },
        reject: () => {
            return false;
        }
    });
};
/**
 * Fim de autocomplete de cadastros
 */
/**
 * Status do registro
 */
// Preload de status do registro
const itemDataStatus = ref([]);
const itemDataStatusPreload = ref([
    { status: '0', label: 'Criado', icon: 'pi pi-plus', color: '#3b82f6' },
    { status: '10', label: 'Convertido para pedido', icon: 'pi pi-shopping-cart', color: '#4cd07d' },
    { status: '20', label: 'Pedido criado', icon: 'pi pi-shopping-cart', color: '#4cd07d' },
    { status: '21', label: 'Pedido reativado', icon: 'pi pi-shopping-cart', color: '#f97316' },
    { status: '80', label: 'Liquidado', icon: 'pi pi-check', color: '#607D8B' },
    { status: '99', label: 'Cancelado', icon: 'pi pi-times', color: '#8c221c' }
]);
// Listar status do registro
const listStatusRegistro = async () => {
    loading.value.form = true;
    const url = `${baseApiUrl}/pipeline-status/?id_pipeline=${itemData.value.id}`;
    await axios.get(url).then((res) => {
        itemDataStatus.value = [];
        res.data.data.forEach((element) => {
            // Filtrar element.status_params e retornar o objeto correspondente em itemDataStatusPreload
            const status = itemDataStatusPreload.value.filter((item) => {
                return item.status == element.status_params;
            });
            itemDataStatus.value.push({
                // date recebe 2022-10-31 15:09:38 e deve converter para 31/10/2022 15:09:38
                date: moment(element.created_at).format('DD/MM/YYYY HH:mm:ss').replaceAll(':00', '').replaceAll(' 00', ''),
                status: status[0].label,
                icon: status[0].icon,
                color: status[0].color
            });
        });
        loading.value.form = false;
    });
};
/**
 * Fim de status do registro
 */
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
});
onMounted(async () => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
    // Unidades de negócio
    listUnidadesDescricao();
    // Agentes de negócio
    listAgentesNegocio();
    // Lista o andamento do registro
    listStatusRegistro();
});
// Observar alterações nos dados do formulário
watchEffect(() => {
    isItemDataChanged();
});
// Observar alterações na propriedade selectedCadastro
watch(selectedCadastro, (value) => {
    if (value) {
        itemData.value.id_cadastros = value.code;
    }
});
</script>

<template>
    <Breadcrumb :items="[{ label: 'Todo o Pipeline', to: `/${userData.cliente}/${userData.dominio}/pipeline` }, { label: itemData.documento }]" />
    <div class="card">
        <div class="grid">
            <form @submit.prevent="saveData">
                <div class="col-12">
                    <div class="p-fluid formgrid grid">
                        <div class="field col-12 md:col-4">
                            <label for="id_pipeline_params">Tipo</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown
                                v-else
                                filter
                                placeholder="Filtrar por Unidade..."
                                :showClear="!!itemData.id_pipeline_params"
                                id="unidade_tipos"
                                optionLabel="label"
                                optionValue="value"
                                v-model="itemData.id_pipeline_params"
                                :options="dropdownUnidades"
                                :disabled="mode == 'view'"
                            />
                        </div>
                        <div class="field col-12 md:col-8">
                            <label for="id_cadastros">Cadastro</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <AutoComplete v-else-if="editCadastro" v-model="selectedCadastro" optionLabel="name" :suggestions="filteredCadastros" @complete="searchCadastros" forceSelection />
                            <div class="p-inputgroup flex-1" v-else>
                                <InputText disabled v-model="nomeCliente" />
                                <Button icon="pi pi-pencil" severity="primary" @click="confirmEditCadastro()" :disabled="mode == 'view'" />
                            </div>
                        </div>
                        <div class="field col-12 md:col-4">
                            <label for="id_com_agentes">Agente</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Dropdown
                                v-else
                                filter
                                placeholder="Filtrar por Unidade..."
                                :showClear="!!itemData.id_com_agentes"
                                id="unidade_tipos"
                                optionLabel="label"
                                optionValue="value"
                                v-model="itemData.id_com_agentes"
                                :options="dropdownAgentes"
                                :disabled="mode == 'view'"
                            />
                        </div>
                        <div class="field col-12 md:col-12">
                            <label for="status_params">Status</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <Timeline v-else :value="itemDataStatus" layout="horizontal" align="bottom">
                                <template #marker="slotProps">
                                    <span class="flex w-2rem h-2rem align-items-center justify-content-center text-white border-circle z-1 shadow-1" :style="{ backgroundColor: slotProps.item.color }">
                                        <i :class="slotProps.item.icon"></i>
                                    </span>
                                </template>
                                <template #opposite="slotProps">
                                    <small class="p-text-secondary">{{ slotProps.item.date }}</small>
                                </template>
                                <template #content="slotProps">
                                    {{ slotProps.item.status }}
                                </template>
                            </Timeline>
                        </div>
                        <div class="field col-12 md:col-3">
                            <label for="id_pai">Pai</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_pai" id="id_pai" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.id_pai">{{ errorMessages.id_pai || '&nbsp;' }}</small>
                        </div>
                        <div class="field col-12 md:col-3">
                            <label for="id_filho">Filho</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_filho" id="id_filho" type="text" />
                            <small id="text-error" class="p-error" v-if="errorMessages.id_filho">{{ errorMessages.id_filho || '&nbsp;' }}</small>
                        </div>
                        <div class="field col-12 md:col-3">
                            <label for="valor_bruto">Valor bruto</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                <span class="p-inputgroup-addon">R$</span>
                                <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.valor_bruto" id="valor_bruto" type="text" />
                            </div>
                            <small id="text-error" class="p-error" v-if="errorMessages.valor_bruto">{{ errorMessages.valor_bruto || '&nbsp;' }}</small>
                        </div>
                        <div class="field col-12 md:col-3">
                            <label for="documento">Documento</label>
                            <Skeleton v-if="loading.form" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.documento" id="documento" type="text" @input="validateDocumento()" />
                            <small id="text-error" class="p-error" v-if="errorMessages.documento">{{ errorMessages.documento || '&nbsp;' }}</small>
                        </div>
                        <div class="field col-12 md:col12">
                            <label for="descricao">Descrição</label>
                            <Skeleton v-if="loading.form" height="2rem"></Skeleton>
                            <Editor v-else-if="!loading.form && mode != 'view'" v-model="itemData.descricao" id="descricao" editorStyle="height: 160px" aria-describedby="editor-error" />
                            <p v-else v-html="itemData.descricao || ''" class="p-inputtext p-component p-filled"></p>
                        </div>
                    </div>
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-beat" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!isItemDataChanged() || !formIsValid()" />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
            </form>
        </div>
    </div>
</template>
