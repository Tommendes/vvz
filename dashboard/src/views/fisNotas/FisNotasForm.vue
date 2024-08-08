<script setup>
import { onMounted, ref, watch, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import EditorComponent from '@/components/EditorComponent.vue';
import Breadcrumb from '../../components/Breadcrumb.vue';

// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile()
});

import { guide } from '@/guides/notasFiscaisFormGuide.js';

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();

import { Mask } from 'maska';
const masks = ref({
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    }),
    valor: new Mask({
        mask: '0,99'
    })
});

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
import moment from 'moment';

const animationDocNr = ref('animation-color animation-fill-forwards ');
// Campos de formulário
const itemData = ref({});
// Eventos do registro
const itemDataEventos = ref({});
// Listagem de arquivos na pasta do registro
const listFolder = ref(null);
// O registro tem pasta?
const hasFolder = ref(false);
// O servidor está acessível?
const hostAccessible = ref(false);
// Modo do formulário
const mode = ref('view');
// Loadings
const loading = ref(true);
// Editar cadastro no autocomplete
const editFornecedor = ref(false);
const dropdownES = ref([
    { value: 'E', label: 'Entrada' },
    { value: 'S', label: 'Saída' }
]); // Itens do dropdown de Empresas
import tiposNotas from './tiposNotas.js';
const dropdownModelosNF = ref(); // Itens do dropdown de Empresas
// Receber e ordenar os dados do array tiposNotas por label e value e adicionar ao label o valor. Por fim, adcione a variável dropdownModelosNF
const setModelosNfList = async () => {
    const newTiposNotas = tiposNotas.sort((a, b) => {
        if (a.label < b.label) {
            return -1;
        }
        if (a.label > b.label) {
            return 1;
        }
        return 0;
    });
    dropdownModelosNF.value = newTiposNotas.map((item) => {
        const newItem = {
            value: item.value,
            label: `(${item.value}) ${item.label}`
        }
        return newItem;
    });
};
setModelosNfList();
const dropdownEmpresas = ref([]); // Itens do dropdown de Empresas
// Props do template
const props = defineProps(['mode', 'idFisNotas', 'idFornecedor']);
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/fiscal-notas`);
// Itens do breadcrumb
const breadItems = ref([{ label: 'Todas as Notas', to: `/${uProf.value.schema_description}/notas-fiscais` }]);
// Liste de inputs de registros financeiros
const itemsInputsList = ref([
    { field: "valor_total", label: "Bruto", type: "double", minValue: 0.0, defaultValue: 0.0, required: true },
    { field: "valor_liquido", label: "Líquido", type: "double", minValue: 0.0, defaultValue: 0.0, required: true },
    { field: "valor_desconto", label: "Desconto", type: "double", minValue: 0.0, defaultValue: 0.0, required: false },
    { field: "valor_icms", label: "ICMS", type: "double", minValue: 0.0, defaultValue: 0.0, required: false },
    { field: "valor_ipi", label: "IPI", type: "double", minValue: 0.0, defaultValue: 0.0, required: false },
    { field: "valor_pis", label: "PIS", type: "double", minValue: 0.0, defaultValue: 0.0, required: false },
    { field: "valor_cofins", label: "COFINS", type: "double", minValue: 0.0, defaultValue: 0.0, required: false },
    { field: "valor_iss", label: "ISS", type: "double", minValue: 0.0, defaultValue: 0.0, required: false },
    { field: "valor_ir", label: "IR", type: "double", minValue: 0.0, defaultValue: 0.0, required: false },
    { field: "valor_csll", label: "CSLL", type: "double", minValue: 0.0, defaultValue: 0.0, required: false },
    { field: "valor_inss", label: "INSS", type: "double", minValue: 0.0, defaultValue: 0.0, required: false },
    { field: "valor_outros", label: "Outros", type: "double", minValue: 0.0, defaultValue: 0.0, required: false },
    { field: "valor_servicos", label: "Serviços", type: "double", minValue: 0.0, defaultValue: 0.0, required: false },
    { field: "valor_produtos", label: "Produtos", type: "double", minValue: 0.0, defaultValue: 0.0, required: false },
    { field: "valor_frete", label: "Frete", type: "double", minValue: 0.0, defaultValue: 0.0, required: false },
    { field: "valor_seguro", label: "Seguro(s)", type: "double", minValue: 0.0, defaultValue: 0.0, required: false },
    { field: "valor_despesas", label: "Despesas", type: "double", minValue: 0.0, defaultValue: 0.0, required: false }
]);

// Importação de componentes
import { useDialog } from 'primevue/usedialog';
const dialog = useDialog();

// Carragamento de dados do form
const loadData = async () => {
    loading.value = true;
    const id = props.idFisNotas || route.params.id;
    const url = `${urlBase.value}/${id}`;
    if (mode.value != 'new')
        await axios
            .get(url)
            .then(async (res) => {
                const body = res.data;
                body.id = String(body.id);

                itemData.value = body;
                selectedFornecedor.value = {
                    code: itemData.value.id_fornecedor,
                    name: itemData.value.fornecedor + ' - ' + itemData.value.cpf_cnpj_fornecedor
                };

                nomeFornecedor.value = itemData.value.fornecedor + ' - ' + masks.value.cpf_cnpj.masked(itemData.value.cpf_cnpj_fornecedor);
                // Atualiza a lista de empresas
                await getEmpresas();
                // Atualiza a lista de fornecedores
                await getFornecedores();
                // Eventos do registro
                await getEventos();
                breadItems.value = [{ label: 'Todas as Notas', to: `/${uProf.value.schema_description}/notas-fiscais` }];
                if (itemData.value.id_fornecedor) breadItems.value.push({ label: 'Ir ao Fornecedor', to: `/${uProf.value.schema_description}/cadastro/${itemData.value.id_fornecedor}` });
            })
            .catch((error) => {
                defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
                if (error.response && error.response.status == 401) router.push('/');
                toGrid();
            });
    else if (props.idFornecedor) {
        itemData.value.id_fornecedor = props.idFornecedor;
        selectedFornecedor.value = {
            code: itemData.value.id_fornecedor,
            name: itemData.value.fornecedor + ' - ' + itemData.value.cpf_cnpj_fornecedor
        };
        await getNomeFornecedor();
    }
    loading.value = false;
};

defineExpose({ loadData }); // Expondo a função para o componente pai
// Salvar dados do formulário
const saveData = async () => {
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;

    itemData.value.numero = String(itemData.value.numero);
    let preparedBody = {
        ...itemData.value
    };

    axios[method](url, preparedBody)
        .then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                itemData.value = body;
                emit('changed');
                if (route.name != 'cadastro' && mode.value == 'new') {
                    router.push({
                        path: `/${uProf.value.schema_description}/notas-fiscais/${itemData.value.id}`
                    });
                    loadData();
                } else if (route.name != 'cadastro' && id != itemData.value.id) {
                    router.push({
                        path: `/${uProf.value.schema_description}/notas-fiscais/${itemData.value.id}`
                    });
                    const animation = animationDocNr.value;
                    animationDocNr.value = '';
                    loadData();
                    animationDocNr.value = animation;
                } else reload();
                mode.value = 'view';
                const folterRoot = itemData.value.fornecedor.replaceAll(' ', '_');
                const bodyTo = { id_fis_notas: itemData.value.id, path: `${folterRoot}/${itemData.value.numero}` };
                setTimeout(async () => {
                    await mkFolder(bodyTo);
                }, Math.random() * 2000 + 250);
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((error) => {
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
        });
};
// Recarregar dados do formulário
const reload = async () => {
    mode.value = 'view';
    editFornecedor.value = false;
    loadData();
    emit('cancel');
};
/**
 * Autocomplete de fornecedores
 */
const fornecedores = ref([]);
const filteredFornecedores = ref();
const selectedFornecedor = ref();
const nomeFornecedor = ref();
const getNomeFornecedor = async () => {
    if (itemData.value.id_fornecedor) {
        try {
            const url = `${baseApiUrl}/cadastros/f-a/glf?fld=id&vl=${itemData.value.id_fornecedor}&literal=1&slct=nome,cpf_cnpj`;
            setTimeout(async () => {
                const response = await axios.get(url);
                if (response.data.data.length > 0) {
                    nomeFornecedor.value = response.data.data[0].nome + ' - ' + masks.value.cpf_cnpj.masked(response.data.data[0].cpf_cnpj);
                }
            }, Math.random() * 1000 + 250);
        } catch (error) {
            console.error('Erro ao buscar cadastros:', error);
        }
    }
};
const searchFornecedores = (event) => {
    filteredFornecedores.value = []; // Limpa a lista antes de cada busca
    if (!event.query.trim().length) {
        // Se estiver vazio, exiba todas as sugestões
        filteredFornecedores.value = [...fornecedores.value];
    } else {
        // Se não estiver vazio, filtre dentre as opções em fornecedores.value
        // Filtrar os cadastros com base na consulta do usuário
        filteredFornecedores.value = fornecedores.value.filter((cadastro) => {
            return cadastro.name.toLowerCase().includes(event.query.toLowerCase());
        });
        // Se não houver resultados, carregue os cadastros da API
        // if (filteredFornecedores.value.length === 0) {
        //     getFornecedorBySearchedId(event.query.toLowerCase());
        // }
    }
};
const getFornecedorBySearchedId = async (idFornecedor) => {
    const qry = idFornecedor ? `fld=nome&vl=${idFornecedor}` : 'fld=1&vl=1';
    try {
        const url = `${baseApiUrl}/cadastros/f-a/glf?${qry}&slct=id,nome,cpf_cnpj`;

        const response = await axios.get(url);
        // Limpe a lista de fornecedores para evitar duplicatas
        fornecedores.value = [];
        fornecedores.value = response.data.data.map((element) => {
            return {
                code: element.id,
                name: element.nome + ' - ' + element.cpf_cnpj
            };
        });
        // Atualize a lista filtrada
        filteredFornecedores.value = [...fornecedores.value];
    } catch (error) {
        console.error('Erro ao buscar cadastros:', error);
    }
};
const confirmEditFornecedor = () => {
    confirm.require({
        group: 'templating',
        header: 'Corfirma que deseja editar o cadastro?',
        message: 'Você tem certeza que deseja editar este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            selectedFornecedor.value = undefined;
            editFornecedor.value = true;
        },
        reject: () => {
            return false;
        }
    });
};
/**
 * Fim de autocomplete de cadastros
 */

const registroIdentico = async () => {
    itemData.value = {
        id_fornecedor: itemData.value.id_fornecedor
    };
    mode.value = 'clone';
};

const lstFolder = async () => {
    const id = props.idFisNotas || route.params.id;
    const url = `${baseApiUrl}/fiscal-notas/f-a/lfd`;
    await axios
        .post(url, { id_fis_notas: id })
        .then((res) => {
            if (res.data && res.data.length) {
                const itensToNotList = ['.', '..', '.DS_Store', 'Thumbs.db'];
                listFolder.value = res.data;
                // remover de listFolder os itensToNotList
                if (typeof listFolder.value == 'object' && listFolder.value.length > 0) {
                    listFolder.value = listFolder.value.filter((item) => {
                        return !itensToNotList.includes(item.name);
                    });
                    hasFolder.value = true;
                }
            }
            if (listFolder.value && typeof listFolder.value == 'object' && listFolder.value.length == 0) hasFolder.value = true;
            hostAccessible.value = true;
        })
        .catch((error) => {
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
            hostAccessible.value = false;
        });
};

const mkFolder = async (body) => {
    const url = `${baseApiUrl}/fiscal-notas/f-a/mfd`;
    defaultWarn('Tentando entrar em contato com o servidor de pastas. Por favor aguarde...');

    const folterRoot = body.data.fornecedor.replaceAll(' ', '_');
    const bodyTo = body || { id_fis_notas: itemData.value.id, path: `${folterRoot}/${itemData.value.numero}` };
    await axios
        .post(url, bodyTo)
        .then(async (res) => {
            // const msgDone = `Pasta criada com sucesso`;
            defaultSuccess(res.data);
            await lstFolder();
        })
        .catch((error) => {
            defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
            if (error.response && error.response.status == 401) router.push('/');
        });
};
/**
 * Fim de ferramentas do registro
 */
const toGrid = () => {
    mode.value = 'grid';
    emit('cancel');
    router.push({ path: `/${uProf.value.schema_description}/fiscal-notas` });
};

const getEventos = async () => {
    const id = props.idFisNotas || route.params.id;
    const url = `${baseApiUrl}/sis-events/${id}/fis_notas/get-events`;
    await axios.get(url).then((res) => {
        if (res.data && res.data.length > 0) {
            itemDataEventos.value = res.data;
            itemDataEventos.value.forEach((element) => {
                if (element.classevento.toLowerCase() == 'insert') element.evento = 'Criação do registro';
                else if (element.classevento.toLowerCase() == 'update')
                    element.evento =
                        `Edição do registro` +
                        (uProf.value.gestor >= 1
                            ? `. Para mais detalhes <a href="#/${uProf.value.schema_description}/eventos?tabela_bd=fis_notas&id_registro=${element.id_registro}" target="_blank">acesse o log de eventos</a> e pesquise: Tabela = fis_notas; Registro = ${element.id_registro}. Número deste evento: ${element.id}`
                            : '');
                else if (element.classevento.toLowerCase() == 'remove') element.evento = 'Exclusão ou cancelamento do registro';
                else if (element.classevento.toLowerCase() == 'conversion') element.evento = 'Registro convertido para pedido';
                else if (element.classevento.toLowerCase() == 'commissioning')
                    element.evento =
                        `Lançamento de comissão` +
                        (uProf.value.comissoes >= 1
                            ? `. Para mais detalhes <a href="#/${uProf.value.schema_description}/eventos?tabela_bd=fis_notas&id_registro=${element.id_registro}" target="_blank">acesse o log de eventos</a> e pesquise: Tabela = fis_notas; Registro = ${element.id_registro}. Número deste evento: ${element.id}`
                            : '');
                element.data = moment(element.created_at).format('DD/MM/YYYY HH:mm:ss').replaceAll(':00', '').replaceAll(' 00', '');
            });
        } else {
            itemDataEventos.value = [
                {
                    evento: 'Não há registro de log eventos para este registro'
                }
            ];
        }
    });
};

// Obter Empresas
const getEmpresas = async () => {
    const url = `${baseApiUrl}/empresas`;
    dropdownEmpresas.value = [];
    await axios.get(url).then((res) => {
        res.data.data.map((item) => {
            dropdownEmpresas.value.push({
                value: item.id,
                label: item.razaosocial
            });
        });
    });
};
// Obter Fornecedores
const getFornecedores = async () => {
    const url = `${baseApiUrl}/cadastros/f-a/glf?fld=id_params_tipo&vl=5&literal=1&slct=id,nome,cpf_cnpj`;
    fornecedores.value = []; // Limpa a lista antes de popular
    await axios.get(url).then((res) => {
        res.data.data.map((item) => {
            fornecedores.value.push({
                code: item.id,
                name: item.nome + ' - ' + item.cpf_cnpj
            });
        });
    });
};
import { computed } from 'vue';

const uniqueFilteredFornecedores = computed(() => {
    return [...new Set(filteredFornecedores.value)];
}); 

// Carregar dados do formulário
onMounted(async () => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
    if (props.idFornecedor) itemData.value.id_fornecedor = props.idFornecedor;
    // Carrega os dados do formulário
    await loadData();
    // Carrega o conteúdo da pasta
    await lstFolder();
    // Unidades de negócio
    await getEmpresas();
    // Agentes de negócio
    await getFornecedores();
});
// Observar alterações na propriedade selectedFornecedor
watch(selectedFornecedor, (value) => {
    if (value) {
        itemData.value.id_fornecedor = value.code;
    }
});
watch(route, (value) => {
    if (value !== itemData.value.id) {
        reload();
    }
});
</script>

<template>
    <Breadcrumb :items="breadItems" v-if="!(props.idFornecedor || mode == 'expandedFormMode')" />
    <div>
        <form @submit.prevent="saveData">
            <div class="grid">
                <div :class="`${['new'].includes(mode) ? 'col-12' : 'col-12 lg:col-9'}`">
                    <div class="p-fluid grid">
                        <div :class="`col-12`">
                            <label for="id_empresa">Empresa</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else filter placeholder="Selecione..." :showClear="!!itemData.id_empresa"
                                id="id_empresa" optionLabel="label" optionValue="value" v-model="itemData.id_empresa"
                                :options="dropdownEmpresas" :disabled="['view'].includes(mode)" />
                        </div>
                        <div :class="`col-12`">
                            <label for="id_fornecedor">Fornecedor</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <AutoComplete v-else-if="route.name != 'cadastro' && (editFornecedor || mode == 'new')"
                                v-model="selectedFornecedor" optionLabel="name" :suggestions="filteredFornecedores"
                                @complete="searchFornecedores" forceSelection />
                            <div class="p-inputgroup flex-1" v-else>
                                <InputText disabled v-model="nomeFornecedor" />
                                <Button
                                    v-if="(route.name != 'cadastro' && (!itemData.status || itemData.status < 80) && uProf.fiscal >= 4) || mode == 'clone'"
                                    icon="fa-solid fa-pencil" severity="primary" @click="confirmEditFornecedor()"
                                    :disabled="mode == 'view'" />
                            </div>
                        </div>
                        <div class="col-12 lg:col-2">
                            <label for="mov_e_s">Movimento <span class="text-base" style="color: red">*</span></label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else placeholder="Selecione..." id="mov_e_s" optionLabel="label"
                                optionValue="value" v-model="itemData.mov_e_s" :options="dropdownES"
                                :disabled="['view'].includes(mode)" />
                        </div>
                        <div class="col-12 lg:col-6">
                            <label for="modelo_nf">Tipo Nota <span class="text-base" style="color: red">*</span></label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Dropdown v-else placeholder="Selecione..." id="modelo_nf" optionLabel="label"
                                optionValue="value" v-model="itemData.modelo_nf" filter :options="dropdownModelosNF"
                                :disabled="['view'].includes(mode)" />
                        </div>
                        <div class="col-12 lg:col-2">
                            <label for="numero">Documento</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="['view'].includes(mode)"
                                v-model="itemData.numero" id="numero" type="text" maxlength="20" />
                        </div>
                        <div class="col-12 lg:col-2">
                            <label for="serie">Série</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <InputText v-else autocomplete="no" :disabled="['view'].includes(mode)"
                                v-model="itemData.serie" id="serie" type="text" maxlength="10" />
                        </div>
                        <div class="col-12 lg:col-12">
                            <label for="chave">Chave NF-e</label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <div class="p-inputgroup flex-1" v-else>
                                <InputText autocomplete="no" :disabled="['view'].includes(mode)"
                                    v-model="itemData.chave" id="chave" type="text" maxlength="44" />
                                <Button icon="fa-solid fa-file-arrow-down" severity="primary"
                                    @click="defaultSuccess('Em breve será possível baixar os dados direto do SPED')"
                                    :disabled="mode == 'view'" />
                            </div>
                        </div>
                        <div class="col-12 lg:col12" v-if="['new', 'edit'].includes(mode) || itemData.descricao">
                            <label for="descricao">Descrição do registro</label>
                            <Skeleton v-if="loading" height="2rem"></Skeleton>
                            <EditorComponent v-else-if="!(loading.form || ['view'].includes(mode))"
                                v-model="itemData.descricao" id="descricao" :editorStyle="{ height: '160px' }"
                                aria-describedby="editor-error" />
                            <p v-else v-html="itemData.descricao || ''" class="p-inputtext p-component p-filled"></p>
                        </div>
                    </div>
                    <div class="card flex justify-content-center flex-wrap gap-3"
                        v-if="['new', 'clone'].includes(mode)">
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk"
                            severity="success" text raised />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="fa-solid fa-ban"
                            severity="danger" text raised
                            @click="mode == 'edit' || route.params.id ? reload() : toGrid()" />
                    </div>
                </div>
                <div class="col-12 md:col-3" v-if="!['new'].includes(mode)">
                    <Fieldset :toggleable="true" class="mb-3">
                        <template #legend>
                            <div class="flex align-items-center text-primary">
                                <span class="fa-solid fa-bolt mr-2"></span>
                                <span class="font-bold text-lg">Ações do Registro</span>
                            </div>
                        </template>

                        <div
                            v-if="(['new', 'clone'].includes(mode) || (!itemData.status || itemData.status < 80)) && !itemData.id_filho">
                            <Button label="Editar" outlined class="w-full" type="button" v-if="mode == 'view'"
                                icon="fa-regular fa-pen-to-square fa-shake" @click="mode = 'edit'" />
                            <Button label="Salvar" outlined class="w-full mb-3" type="submit" v-if="mode != 'view'"
                                icon="fa-solid fa-floppy-disk" severity="success" />
                            <Button label="Cancelar" outlined class="w-full" type="button" v-if="mode != 'view'"
                                icon="fa-solid fa-ban" severity="danger"
                                @click="mode == 'edit' ? reload() : toGrid()" />
                        </div>
                        <div v-if="mode != 'edit'">
                            <hr class="w-full mb-3" v-if="!itemData.id_filho" />
                            <Button v-if="route.name == 'pipeline-one'" label="Ir ao Fornecedor" type="button"
                                class="w-full mb-3" :icon="`fa-regular fa-address-card fa-shake`" style="color: #a97328"
                                text raised
                                @click="router.push(`/${uProf.schema_description}/cadastro/${itemData.id_fornecedor}`)" />
                            <Button label="Novo Registro para o Fornecedor" v-if="itemData.id && !itemData.id_pai"
                                type="button" class="w-full mb-3" icon="fa-solid fa-plus fa-shake" severity="primary"
                                text raised @click="registroIdentico" />
                            <Button label="Cancelar Registro" v-tooltip.top="`Cancelar não exclui o registro`"
                                v-if="(!itemData.status || itemData.status < 80)" type="button"
                                :disabled="!(uProf.fiscal >= 3 && (itemData.status == 0 || itemData.status == 10))"
                                class="w-full mb-3" :icon="`fa-solid fa-ban`" severity="warning" text raised
                                @click="defaultWarn('Cancelar registro')" />
                            <Button label="Reativar Registro" v-tooltip.top="`Reative o registro cancelado`"
                                v-else-if="uProf.fiscal >= 4 && itemData.status >= 89" type="button" class="w-full mb-3"
                                :icon="`fa-solid fa-file-invoice ${itemData.status == 0 ? 'fa-shake' : ''}`"
                                severity="warning" text raised @click="defaultWarn('Reativar registro')" />
                            <Button v-if="uProf.fiscal >= 4 && itemData.status == 10" label="Excluir Registro"
                                v-tooltip.top="`Não pode ser desfeito! Se excluir, excluirá o documento relacionado e os registros financeiros ficarão órfãos, caso haja algum!`"
                                type="button" :disabled="!(uProf.fiscal >= 4 && itemData.status == 10)"
                                class="w-full mb-3" :icon="`fa-solid fa-fire`" severity="danger" text raised
                                @click="defaultWarn('Excluir registro')" />
                            <Button :disabled="!hostAccessible || hasFolder" label="Criar Pasta" type="button"
                                class="w-full mt-3 mb-3"
                                :icon="`fa-solid fa-folder ${hostAccessible && !hasFolder ? 'fa-shake' : ''}`"
                                severity="success" text raised @click="mkFolder()" />
                        </div>
                    </Fieldset>
                    <Fieldset :toggleable="true" :collapsed="true" v-if="itemData.id">
                        <template #legend>
                            <div class="flex align-items-center text-primary">
                                <span class="fa-solid fa-clock mr-2"></span>
                                <span class="font-bold text-lg">Conteúdo da Pasta</span>
                            </div>
                        </template>
                        <ul class="list-decimal"
                            v-if="listFolder && typeof listFolder == 'object' && listFolder.length">
                            <li v-for="item in listFolder" :key="item.id">{{ item.name }}</li>
                        </ul>
                        <p v-else-if="!hostAccessible">O servidor de pastas/arquivos está inacessível no momento</p>
                        <p v-else>Não há conteúdo na pasta</p>
                    </Fieldset>
                </div>
                <div class="col-12">
                    <div class="grid">
                        <div class="col-12" style="text-align: center">
                            <div
                                class="flex-grow-1 flex align-items-center justify-content-center font-bold m-2 px-5 py-3 surface-200 border-round">
                                <i class="fa-solid fa-angles-down fa-shake"></i>&nbsp;&nbsp;Valores financeiros do
                                documento&nbsp;&nbsp;<i class="fa-solid fa-angles-down fa-shake" />
                            </div>
                        </div>
                        <div :class="`col-12 lg:col-2`" v-for="item in itemsInputsList" :key="item">
                            <label :for="item.field">{{ item.label }}<span v-if="item.required" class="text-base"
                                    style="color: red">
                                    *</span></label>
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <div v-else-if="!['view'].includes(mode)" class="p-inputgroup flex-1"
                                style="font-size: 1rem">
                                <span class="p-inputgroup-addon">R$</span>
                                <InputText autocomplete="no" :disabled="['view'].includes(mode)"
                                    v-model="itemData[item.field]" :id="item.field" type="text" v-maska
                                    data-maska="0,99" data-maska-tokens="0:\d:multiple|9:\d:optional" />
                            </div>
                            <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                <span class="p-inputgroup-addon">R$</span>
                                <span disabled v-html="itemData[item.field]" :id="item.field"
                                    class="p-inputtext p-component" />
                            </div>
                        </div>
                    </div>

                    <Fieldset class="bg-orange-200 mb-3" toggleable :collapsed="true" v-if="mode != 'expandedFormMode'">
                        <template #legend>
                            <div class="flex align-items-center text-primary">
                                <span class="fa-solid fa-circle-info mr-2"></span>
                                <span class="font-bold text-lg">Eventos do registro</span>
                            </div>
                        </template>
                        <div class="m-0" v-for="item in itemDataEventos" :key="item.id">
                            <h4 v-if="item.data">Em {{ item.data }}: {{ item.user }}</h4>
                            <p v-html="item.evento" class="mb-3" />
                        </div>
                    </Fieldset>
                    <Fieldset class="bg-green-200" toggleable :collapsed="true" v-if="mode != 'expandedFormMode'">
                        <template #legend>
                            <div class="flex align-items-center text-primary">
                                <span class="fa-solid fa-circle-info mr-2"></span>
                                <span class="font-bold text-lg">Instruções</span>
                            </div>
                        </template>
                        <p class="mb-3" v-if="itemData.old_id">
                            <span>Para acessar o registro no lynkos.com.br acesse <a
                                    :href="`https://lynkos.com.br/ged/${itemData.old_id}`" target="_blank">aqui</a>.
                                Edições e inclusões não são mais permitidas no LynkOs</span>
                            <span style="font-size: 20px">&#128521;</span>
                        </p>
                        <p class="m-0">
                            <span v-html="guide" />
                        </p>
                    </Fieldset>
                    <Fieldset class="bg-green-200 mt-3" toggleable :collapsed="false" v-if="uProf.admin >= 2">
                        <template #legend>
                            <div class="flex align-items-center text-primary">
                                <span class="fa-solid fa-circle-info mr-2"></span>
                                <span class="font-bold text-lg">FormData</span>
                            </div>
                        </template>
                        <p>route: {{ route.name }}</p>
                        <p>breadItems: {{ breadItems }}</p>
                        <p>mode: {{ mode }}</p>
                        <p>itemData: {{ itemData }}</p>
                        <p>itemDataEventos: {{ itemDataEventos }}</p>
                        <p v-if="props.idFornecedor">idFornecedor: {{ props.idFornecedor }}</p>
                        <p v-if="props.idFisNotas">idPipeline: {{ props.idFisNotas }}</p>
                        <p>hasFolder {{ hasFolder }}</p>
                        <p>editFornecedor {{ editFornecedor }}</p>
                        <p>listFolder: {{ typeof listFolder == 'object' ? listFolder : '' }}</p>
                    </Fieldset>
                </div>
            </div>
        </form>
    </div>
</template>

<style scoped>
@keyframes animation-color {
    0% {
        background-color: var(--blue-500);
        color: var(--gray-50);
    }

    50% {
        background-color: var(--yellow-500);
        color: var(--gray-900);
    }

    100% {
        background-color: var(--surface-200);
        color: var(--gray-900);
    }
}

.animation-color {
    animation: animation-color 5s linear;
}
</style>
