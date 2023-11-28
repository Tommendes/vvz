<script setup>
import { onBeforeMount, onMounted, ref, watch } from 'vue';
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
import moment from 'moment';
const masks = ref({
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    })
});

// Campos de formulário
const itemData = ref({
    e_s: 's'
});
const dataRegistro = ref('');
const gridDatProtoDocs = ref([]);
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
const urlBase = ref(`${baseApiUrl}/protocolos`);
const urlBaseProtoDocs = ref(`${baseApiUrl}/proto-docs`);
// Carragamento de dados do form
const loadData = async () => {
    loading.value = true;
    setTimeout(async () => {
        if (route.params.id || itemData.value.id) {
            if (route.params.id) itemData.value.id = route.params.id;
            const url = `${urlBase.value}/${itemData.value.id}`;
            await axios.get(url).then(async (res) => {
                const body = res.data;
                if (body && body.id) {
                    body.id = String(body.id);
                    itemData.value = body;
                    await getNomeCliente();
                    await loadDataProtoDocs();
                    dataRegistro.value = moment(itemData.value.updated_at || itemData.value.created_at).format('DD/MM/YYYY HH:mm:ss');
                    loading.value = false;
                } else {
                    defaultWarn('Registro não localizado');
                    router.push({ path: `/${userData.cliente}/${userData.dominio}/protocolos` });
                }
            });
        } else loading.value = false;
    }, Math.random() * 1000 + 250);
};
const loadDataProtoDocs = async () => {
    setTimeout(() => {
        loading.value = true;
        axios.get(`${urlBaseProtoDocs.value}/${itemData.value.id}`).then(async (axiosRes) => {
            gridDatProtoDocs.value = axiosRes.data.data;
            if (gridDatProtoDocs.value.descricao) itemDataProtDocs.value.items = gridDatProtoDocs.value.descricao.split(',');
            loading.value = false;
        });
    }, Math.random() * 1000 + 250);
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
                    dataRegistro.value = moment(itemData.value.updated_at || itemData.value.created_at).format('DD/MM/YYYY HH:mm:ss');
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

const itemDataProtDocs = ref({});
const saveDataProtDocs = async () => {
    const method = itemDataProtDocs.value.id ? 'put' : 'post';
    const id = itemDataProtDocs.value.id ? `/${itemDataProtDocs.value.id}` : '';
    const url = `${urlBaseProtoDocs.value}/${itemData.value.id}${id}`;
    // Remover os colchetes do array itemDataProtDocs.value.descricao
    itemDataProtDocs.value.descricao = itemDataProtDocs.value.items.join(',');
    itemDataProtDocs.value.tp_documento = selectedTitulo.value;
    await axios[method](url, itemDataProtDocs.value)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Documentos registrados com sucesso');
                itemDataProtDocs.value = body;
                loadDataProtoDocs();
                itemDataProtDocs.value = { id_protocolos: itemData.value.id };
                selectedTitulo.value = undefined;
                document.getElementById('tp_documento').focus();
            } else {
                defaultWarn('Erro ao salvar documentos');
            }
        })
        .catch((err) => {
            console.log(err);
            defaultWarn(err.response.data);
        });
    if (itemDataProtDocs.value.descricao) itemDataProtDocs.value.descricao = itemDataProtDocs.value.descricao.split(',');
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
    if (tipo == 'cadastro') {
        confirm.require({
            group: 'templating',
            header: `Corfirmar edição`,
            message: `Corfirma que deseja editar o ${tipo}?`,
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
    } else if (tipo == 'titulo') {
        selectedTitulo.value = undefined;
        editTitulo.value = true;
    }
};
/**
 * Fim de autocomplete de cadastros
 */

/**
 * Autocomplete de cadastros e pipeline
 */
const titulos = ref([]);
const filteredTitulos = ref([]);
const selectedTitulo = ref();
const editTitulo = ref(false);
const searchTitulos = (event) => {
    setTimeout(async () => {
        // Verifique se o campo de pesquisa não está vazio
        if (!event.query.trim().length) {
            // Se estiver vazio, exiba todas as sugestões
            filteredTitulos.value = [...titulos.value];
        } else {
            // Se não estiver vazio, faça uma solicitação à API (ou use dados em cache)
            if (titulos.value.length === 0) {
                // Carregue os titulos da API (ou de onde quer que você os obtenha)
                getTitulos();
            }
            // Filtrar os titulos com base na consulta do usuário
            filteredTitulos.value = titulos.value.filter((registro) => {
                return registro.name.toLowerCase().includes(event.query.toString().toLowerCase());
            });
        }
    }, 250);
};
const getTitulos = async () => {
    try {
        const url = `${baseApiUrl}/protocolos/f-a/gtt`;
        const response = await axios.get(url);
        titulos.value = response.data.data.map((element) => {
            return {
                code: element.tp_documento,
                name: element.tp_documento
            };
        });
    } catch (error) {
        console.error('Erro ao buscar titulos:', error);
    }
};
/**
 * Fim de autocomplete de cadastros
 */
// Opções de DropDown de Movimento
const dropdownMovimento = ref([
    { value: 'e', label: 'Entrada' },
    { value: 's', label: 'Saída' }
]);
// Validar email
const validateEmail = () => {
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
// Editar item da lista de documentos
const editItem = (item) => {
    itemDataProtDocs.value = item;
    selectedTitulo.value = { code: itemDataProtDocs.value.tp_documento, name: itemDataProtDocs.value.tp_documento };
    // transform itemDataProtDocs.value.descricao em array
    itemDataProtDocs.value.items = itemDataProtDocs.value.descricao.split(',');
};
// Excluir item da lista de documentos
const deleteItem = (item) => {
    confirm.require({
        group: 'templating',
        header: 'Confirmar exclusão',
        message: 'Você tem certeza que deseja excluir este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'pi pi-check',
        rejectIcon: 'pi pi-times',
        acceptClass: 'p-button-danger',
        accept: () => {
            axios.delete(`${urlBaseProtoDocs.value}/${itemData.value.id}/${item.id}`).then(() => {
                defaultSuccess('Lista de itens excluída com sucesso!');
                loadDataProtoDocs();
            });
        },
        reject: () => {
            return false;
        }
    });
};
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
    // loadOptions();
});
onMounted(() => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
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
                            <hr />
                            <h5>Registrado em: {{ dataRegistro }}</h5>
                        </div>
                        <div class="col-12 md:col-6">
                            <label for="id_cadastros">Destinatário</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <AutoComplete v-else-if="editCadastro || mode == 'new'" v-model="selectedCadastro" optionLabel="name" :suggestions="filteredCadastros" @complete="searchCadastros" forceSelection />
                            <div class="p-inputgroup flex-1" v-else>
                                <InputText disabled v-model="nomeCliente" />
                                <Button icon="pi pi-pencil" severity="primary" @click="confirmEditAutoSuggest('cadastro')" :disabled="mode == 'view'" />
                            </div>
                        </div>
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
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!formIsValid()" />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
            </div>
        </form>
        <form @submit.prevent="saveDataProtDocs" v-if="itemData.id">
            <div class="grid">
                <div class="col-12">
                    <Card class="bg-blue-200">
                        <!-- v-if="['edit'].includes(mode)" -->
                        <template #title> Documentos do protocolo </template>
                        <template #content>
                            <div class="col-12">
                                <div class="p-fluid grid">
                                    <div class="col-6">
                                        <div class="col-12 md:col-12">
                                            <label for="tp_documento">Tipo de Documento</label>
                                            <AutoComplete v-model="selectedTitulo" id="tp_documento" optionLabel="name" :suggestions="filteredTitulos" @complete="searchTitulos" />
                                        </div>
                                        <div class="col-12 md:col-12">
                                            <label for="descricao">Lista de Documentos (pressione Enter ou vírgula para novos itens)</label>
                                            <Chips v-model="itemDataProtDocs.items" separator="," />
                                        </div>
                                        <div class="col-12 md:col-12">
                                            <Button type="button" v-if="(itemDataProtDocs.tp_documento || selectedTitulo) && itemDataProtDocs.items" label="Salvar documentos" severity="success" text raised @click="saveDataProtDocs" />
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <h4>Itens do protocolo</h4>
                                        <ol>
                                            <li v-for="(item, index) in gridDatProtoDocs" :key="item.id">
                                                {{ item.tp_documento }} - {{ item.descricao.replaceAll(',', ', ') }}
                                                <i class="fa-solid fa-pencil fa-shake" style="font-size: 1rem; color: slateblue" @click="editItem(item)" v-tooltip.top="'Clique para alterar'"></i>
                                                <i class="fa-solid fa-trash ml-2" style="color: #fa0000; font-size: 1rem" @click="deleteItem(item)" v-tooltip.top="'Clique para excluir toda a lista'"></i>
                                            </li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>
            </div>
        </form>        
        <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
            <p>{{ route.name }}</p>
            <p>mode: {{ mode }}</p>
            <p>itemData: {{ itemData }}</p>
        </div>
    </div>
</template>
