<script setup>
import { onBeforeMount, onMounted, ref, watch, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';

// Cookies de usuário
import { userKey, formatValor } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import Breadcrumb from '@/components/Breadcrumb.vue';

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

import { Mask } from 'maska';
const masks = ref({
    cpf_cnpj: new Mask({
        mask: ['###.###.###-##', '##.###.###/####-##']
    }),
    valor: new Mask({
        mask: '0,99'
    }),
    date: new Mask({
        mask: '##/##/####'
    })
});

// Campos de formulário
const itemData = ref({});
const gridDataProdTabelas = ref([]);
// Modo do formulário
const mode = ref('view');
const modeTabelas = ref('view');
// Mensages de erro
const errorMessages = ref({});
// Loadings
const loading = ref(true);
// Props do template
const props = defineProps({
    mode: String
});
// Dropdown de unidades
const dropdownUnidades = ref([]);
//DropDown de produtos
const dropdownProduto = ref([
    { value: 0, label: 'Serviço' },
    { value: 1, label: 'Produto' }
]);
// Emit do template
const emit = defineEmits(['changed', 'cancel']);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/com-produtos`);
const urlBaseProdTabelas = ref(`${baseApiUrl}/com-prod-tabelas`);
// Carragamento de dados do form
const loadData = async () => {
    setTimeout(async () => {
        if (route.params.id || itemData.value.id) {
            if (route.params.id) itemData.value.id = route.params.id;
            const url = `${urlBase.value}/${itemData.value.id}`;

            await axios.get(url).then(async (res) => {
                const body = res.data;
                if (body && body.id) {
                    body.id = String(body.id);
                    itemData.value = body;
                    selectedCadastro.value = {
                        code: itemData.value.id_fornecedor,
                        name: itemData.value.nome + ' - ' + itemData.value.cpf_cnpj
                    };
                    await getNomeCliente();
                    await loadDataProdTabelas();
                    editCadastro.value = false;
                } else {
                    defaultWarn('Registro não localizado');
                    router.push({ path: `/${userData.schema_description}/produtos` });
                }
            });
        }
        loading.value = false;
    }, Math.random() * 1000);
};
const loadDataProdTabelas = async () => {
    setTimeout(() => {
        loading.value = true;
        const url = `${urlBaseProdTabelas.value}/${itemData.value.id}`;
        axios.get(url).then(async (axiosRes) => {
            gridDataProdTabelas.value = axiosRes.data.data;
            gridDataProdTabelas.value.forEach((element) => {
                element.ini_validade = moment(element.ini_validade).format('DD/MM/YYYY');
                element.valor_compra = formatValor(element.valor_compra);
                element.valor_venda = formatValor(element.valor_venda);
            });
            loading.value = false;
        });
    }, Math.random() * 1000);
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
    // Se o tipo for serviço, limpa os campos ncm e cean
    if (itemData.value.produto == 0) {
        itemData.value.ncm = null;
        itemData.value.cean = null;
    }
    axios[method](url, itemData.value)
        .then(async (res) => {
            const body = res.data;
            if (body && body.id) {
                reload();
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
// Validar formulário
const formIsValid = () => {
    return true;
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
    errorMessages.value.produto = {};
    loadData();
    emit('cancel');
};
const reloadDataProdTabelas = () => {
    modeTabelas.value = 'view';
    errorMessages.value.tabelas = {};
    itemDataProdTabelas.value = {};
    loadDataProdTabelas();
};
const menu = ref();
const preview = ref(false);
const itemRemoverImagem = ref({
    label: 'Remover a imagem',
    icon: 'fa-solid fa-trash',
    command: () => {
        // Declarar "delete_imagem" para que a API saiba que deve remover a imagem e não faça validações
        // Excluir esta propriedade do objeto na API antes de salvar
        itemData.value.delete_imagem = true;
        removeImage();
    }
});
// Remover imagem
const removeImage = () => {
    confirm.require({
        group: 'templating',
        header: 'Confirmar exclusão',
        message: 'Você tem certeza que deseja excluir esta imagem?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            const url = `${urlBase.value}/${itemData.value.id}`;
            axios
                .put(url, itemData.value)
                .then(() => {
                    reload();
                    itemData.value.delete_imagem = false;
                    defaultSuccess('Imagem removida com sucesso');
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
        },
        reject: () => {
            return false;
        }
    });
};
// Menu de contexto da imagem
const items = ref([
    {
        label: 'Alterar a imagem do produto',
        icon: 'fa-solid fa-upload',
        command: () => {
            showUploadForm();
        }
    }
]);
import { useDialog } from 'primevue/usedialog';
const dialog = useDialog();
import Uploads from '@/components/Uploads.vue';
import moment from 'moment';
// Abrir formulário de upload
const showUploadForm = () => {
    dialog.open(Uploads, {
        data: {
            tabela: 'com_produtos',
            registro_id: itemData.value.id,
            schema: userData.schema_name,
            field: 'id_uploads_imagem',
            footerMsg: 'O tamanho máximo do arquivo é de 1MB e 250 x 250px.'
        },
        props: {
            header: `Alterar a imagem do produto ${itemData.value.nome_comum}`,
            style: {
                width: '50rem'
            },
            breakpoints: {
                '1199px': '75vw',
                '575px': '90vw'
            },
            modal: true
        },
        onClose: () => {
            reload();
        }
    });
};
// Menu de contexto da imagem
const onImageRightClick = (event) => {
    if (itemData.value.id_uploads_imagem) items.value.push(itemRemoverImagem.value);
    const countItems = itemData.value.id_uploads_imagem ? 2 : 1;
    while (items.value.length > countItems) items.value.pop();
    menu.value.show(event);
};
// Obter parâmetros do BD
const optionParams = async (query) => {
    itemData.value.id = route.params.id;
    const selects = query.select ? `&slct=${query.select}` : undefined;
    const url = `${baseApiUrl}/params/f-a/gbf?fld=${query.field}&vl=${query.value}${selects}`;
    return await axios.get(url);
};
// Carregar opções do formulário
const loadOptions = () => {
    setTimeout(() => {
        // Unidades
        optionParams({ field: 'meta', value: 'com_unidade', select: 'id,label' }).then((res) => {
            res.data.data.map((item) => {
                dropdownUnidades.value.push({ value: item.id, label: item.label });
            });
        });
    }, Math.random() * 1000);
};
/**
 * Autocomplete de cadastros
 */
const cadastros = ref([]);
const filteredCadastros = ref([]);
const selectedCadastro = ref();
const nomeCliente = ref();
// Editar cadastro no autocomplete
const editCadastro = ref(false);
const getNomeCliente = async () => {
    if (itemData.value.id_fornecedor) {
        try {
            const url = `${baseApiUrl}/cadastros/f-a/glf?fld=id&vl=${itemData.value.id_fornecedor}&slct=nome,cpf_cnpj`;
            const response = await axios.get(url);
            if (response.data.data.length > 0) {
                nomeCliente.value = response.data.data[0].nome + ' - ' + masks.value.cpf_cnpj.masked(response.data.data[0].cpf_cnpj);
            }
        } catch (error) {
            console.error('Erro ao buscar cadastros:', error);
        }
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
            filteredCadastros.value = cadastros.value.filter((cadastro) => {
                return cadastro.name.toLowerCase().includes(event.query.toLowerCase());
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
const confirmEditCadastro = () => {
    confirm.require({
        group: 'templating',
        header: 'Corfirma que deseja editar o cadastro?',
        message: 'Você tem certeza que deseja editar este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
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
 * Início de com_prod_tabelas
 */

const itemDataProdTabelas = ref({});
const newDataProdTabelas = () => {
    itemDataProdTabelas.value = {
        id_com_produtos: itemData.value.id,
        valor_compra: 0,
        valor_venda: 0,
        ini_validade: moment().format('DD/MM/YYYY')
    };
    modeTabelas.value = 'new';
    document.getElementById('valor_compra').focus();
};
const validateDataTabela = () => {
    errorMessages.value.tabelas = {
        ini_validade: null
    };
    // Testa o formato da data
    if (itemDataProdTabelas.value.ini_validade && itemDataProdTabelas.value.ini_validade.length > 0 && !masks.value.date.completed(itemDataProdTabelas.value.ini_validade)) {
        errorMessages.value.tabelas.ini_validade = 'Formato de data inválido';
    } else {
        // Verifica se a data é válida
        const momentDate = moment(itemDataProdTabelas.value.ini_validade, 'DD/MM/YYYY', true);
        if (!momentDate.isValid()) {
            errorMessages.value.tabelas.ini_validade = 'Data inválida';
        }
    }
    return !errorMessages.value.tabelas.ini_validade;
};
// Validar formulário
const formTabelasIsValid = () => {
    return validateDataTabela();
};

const convertFloatFields = (result = 'pt') => {
    itemDataProdTabelas.value.valor_compra = formatValor(itemDataProdTabelas.value.valor_compra, result);
    itemDataProdTabelas.value.valor_venda = formatValor(itemDataProdTabelas.value.valor_venda, result);
};
const saveDataProdTabelas = async () => {
    if (!formTabelasIsValid()) return;
    const method = itemDataProdTabelas.value.id ? 'put' : 'post';
    const id = itemDataProdTabelas.value.id ? `/${itemDataProdTabelas.value.id}` : '';
    const url = `${urlBaseProdTabelas.value}/${itemData.value.id}${id}`;
    const oldIniValid = itemDataProdTabelas.value.ini_validade;
    itemDataProdTabelas.value.ini_validade = moment(itemDataProdTabelas.value.ini_validade, 'DD/MM/YYYY').format('YYYY-MM-DD');
    convertFloatFields('en');
    // Remover os colchetes do array itemDataProdTabelas.value.descricao
    await axios[method](url, itemDataProdTabelas.value)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Valores registrados com sucesso');
                reloadDataProdTabelas();
            } else {
                defaultWarn('Erro ao registrar tabela');
            }
        })
        .catch((err) => {
            console.log(err);
            defaultWarn(err.response.data);
            itemDataProdTabelas.value.ini_validade = oldIniValid;
        });
};
// Editar item da lista de documentos
const editItem = (item) => {
    itemDataProdTabelas.value = item;
    modeTabelas.value = 'edit';
};
// Excluir item da lista de documentos
const deleteItem = (item) => {
    confirm.require({
        group: 'templating',
        header: 'Confirmar exclusão',
        message: 'Você tem certeza que deseja excluir este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            axios.delete(`${urlBaseProdTabelas.value}/${itemData.value.id}/${item.id}`).then(() => {
                defaultSuccess('Tabela excluída com sucesso!');
                loadDataProdTabelas();
            });
        },
        reject: () => {
            return false;
        }
    });
};
/**
 * Fim de com_prod_tabelas
 */
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
    loadOptions();
});
onMounted(() => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
});
// Observar alterações nos dados do formulário
watchEffect(() => {
    // Se o label de DropdownProduto for selecionado == 0, DropdownUnidades deve ser mapeado com find e recebe o valor do label 'Mão de Obra'
    if (itemData.value.produto == 0) {
        itemData.value.id_params_unidade = dropdownUnidades.value.find((item) => item.label == 'Mão de Obra').value;
    }
});
// Observar alterações na propriedade selectedCadastro
watch(selectedCadastro, (value) => {
    if (value) {
        itemData.value.id_fornecedor = value.code;
    }
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os produtos', to: `/${userData.schema_description}/produtos` }, { label: itemData.nome_comum + (userData.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-3 mx-auto text-center" :class="itemData.url_logo ? ' image-on' : ''">
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Image v-else :src="`${itemData.url_logo ? itemData.url_logo : '/assets/images/DefaultProduto.png'}`" width="200" alt="Logomarca" :preview="preview" id="url_logo" @contextmenu="onImageRightClick" />
                            <ContextMenu ref="menu" :model="items" />
                        </div>
                        <div class="col-9">
                            <div class="p-fluid grid">
                                <div class="col-12 md:col-3">
                                    <label for="nome_comum">Nome curto</label>
                                    <Skeleton v-if="loading" height="2rem"></Skeleton>
                                    <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.nome_comum" id="nome_comum" type="text" maxlength="25" />
                                </div>
                                <div class="col-12 md:col-9">
                                    <label for="id_fornecedor">Fornecedor</label>
                                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                                    <AutoComplete v-else-if="route.name != 'cadastro' && (editCadastro || mode == 'new')" v-model="selectedCadastro" optionLabel="name" :suggestions="filteredCadastros" @complete="searchCadastros" forceSelection />
                                    <div class="p-inputgroup flex-1" v-else>
                                        <InputText disabled v-model="nomeCliente" />
                                        <Button v-if="route.name != 'cadastro'" icon="pi pi-pencil" severity="primary" @click="confirmEditCadastro()" :disabled="mode == 'view'" />
                                    </div>
                                </div>
                                <div class="col-12 md:col-3">
                                    <label for="produto">Produto/Serviço</label>
                                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                                    <Dropdown v-else id="produto" :disabled="mode == 'view'" placeholder="Selecione o período" optionLabel="label" optionValue="value" v-model="itemData.produto" :options="dropdownProduto" />
                                </div>
                                <div class="col-12 md:col-3">
                                    <label for="id_params_unidade">Unidade</label>
                                    <Skeleton v-if="loading" height="2rem"></Skeleton>
                                    <Dropdown
                                        v-else-if="itemData.produto == 1"
                                        id="id_params_unidade"
                                        :disabled="mode == 'view'"
                                        placeholder="Selecione a unidade"
                                        optionLabel="label"
                                        optionValue="value"
                                        v-model="itemData.id_params_unidade"
                                        :options="dropdownUnidades"
                                    />
                                    <p v-else v-html="'Mão de Obra'" class="p-inputtext p-component p-filled disabled"></p>
                                </div>
                                <div class="col-12 md:col-3">
                                    <label for="ncm">NCM</label>
                                    <Skeleton v-if="loading" height="2rem"></Skeleton>
                                    <InputText v-else-if="itemData.produto == 1" autocomplete="no" :disabled="mode == 'view'" v-model="itemData.ncm" id="ncm" type="text" />
                                    <p v-else v-html="itemData.ncm || '&nbsp;'" class="p-inputtext p-component p-filled disabled"></p>
                                </div>
                                <div class="col-12 md:col-3">
                                    <label for="cean">cEAN</label>
                                    <Skeleton v-if="loading" height="2rem"></Skeleton>
                                    <InputText v-else-if="itemData.produto == 1" autocomplete="no" :disabled="mode == 'view'" v-model="itemData.cean" id="cean" type="text" />
                                    <p v-else v-html="itemData.cean || '&nbsp;'" class="p-inputtext p-component p-filled disabled"></p>
                                </div>
                                <div class="col-12 md:col-12" v-if="itemData.descricao || mode != 'view'">
                                    <label for="descricao">Descrição</label>
                                    <Skeleton v-if="loading" height="2rem"></Skeleton>
                                    <Editor v-else-if="!loading && mode != 'view'" v-model="itemData.descricao" id="descricao" editorStyle="height: 160px" aria-describedby="editor-error" />
                                    <p v-else v-html="itemData.descricao" class="p-inputtext p-component p-filled"></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="fa-solid fa-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
                <div class="col-12">
                    <form @submit.prevent="saveDataProdTabelas" v-if="itemData.id">
                        <div class="grid">
                            <div class="col-12">
                                <Card class="bg-blue-200">
                                    <template #content>
                                        <div class="grid">
                                            <div class="col-6">
                                                <h3>Preços do produto</h3>
                                                <div class="grid">
                                                    <div class="col-4">
                                                        <label for="valor_compra">Valor de Compra</label>
                                                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                                                        <div v-else-if="!['view', 'expandedFormMode'].includes(modeTabelas)" class="p-inputgroup flex-1" style="font-size: 1rem">
                                                            <span class="p-inputgroup-addon">R$</span>
                                                            <InputText
                                                                autocomplete="no"
                                                                :disabled="['view', 'expandedFormMode'].includes(modeTabelas)"
                                                                v-model="itemDataProdTabelas.valor_compra"
                                                                id="valor_compra"
                                                                type="text"
                                                                v-maska
                                                                data-maska="0,99"
                                                                data-maska-tokens="0:\d:multiple|9:\d:optional"
                                                            />
                                                        </div>
                                                        <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                                            <span class="p-inputgroup-addon">R$</span>
                                                            <span disabled v-html="itemDataProdTabelas.valor_compra" class="p-inputtext p-component" />
                                                        </div>
                                                    </div>
                                                    <div class="col-4">
                                                        <label for="valor_venda">Valor de Venda</label>
                                                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                                                        <div v-else-if="!['view', 'expandedFormMode'].includes(modeTabelas)" class="p-inputgroup flex-1" style="font-size: 1rem">
                                                            <span class="p-inputgroup-addon">R$</span>
                                                            <InputText
                                                                autocomplete="no"
                                                                :disabled="['view', 'expandedFormMode'].includes(modeTabelas)"
                                                                v-model="itemDataProdTabelas.valor_venda"
                                                                id="valor_venda"
                                                                type="text"
                                                                v-maska
                                                                data-maska="0,99"
                                                                data-maska-tokens="0:\d:multiple|9:\d:optional"
                                                            />
                                                        </div>
                                                        <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                                            <span class="p-inputgroup-addon">R$</span>
                                                            <span disabled v-html="itemDataProdTabelas.valor_venda" class="p-inputtext p-component" />
                                                        </div>
                                                    </div>
                                                    <div class="col-4">
                                                        <label for="ini_validade">Validade inicial</label>
                                                        <Skeleton v-if="loading" height="3rem"></Skeleton>
                                                        <div v-else-if="!['view', 'expandedFormMode'].includes(modeTabelas)" class="p-inputgroup flex-1" style="font-size: 1rem">
                                                            <InputText autocomplete="no" v-model="itemDataProdTabelas.ini_validade" id="ini_validade" type="text" v-maska data-maska="##/##/####" />
                                                        </div>
                                                        <div v-else class="p-inputgroup flex-1" style="font-size: 1rem">
                                                            <span disabled v-html="itemDataProdTabelas.ini_validade || '&nbsp;'" id="ini_validade" class="p-inputtext p-component" />
                                                        </div>
                                                        <small id="text-error" class="p-error" v-if="errorMessages.tabelas && errorMessages.tabelas.ini_validade">{{ errorMessages.tabelas.ini_validade }}</small>
                                                    </div>
                                                    <div class="col-12" v-if="itemDataProdTabelas.id || modeTabelas == 'new'">
                                                        <div class="flex justify-content-center flex-wrap gap-3">
                                                            <Button type="button" v-if="modeTabelas == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="modeTabelas = 'edit'" />
                                                            <Button type="button" v-if="modeTabelas != 'view'" label="Salvar" icon="fa-solid fa-floppy-disk" severity="success" text raised :disabled="!formTabelasIsValid()" @click="saveDataProdTabelas" />
                                                            <Button type="button" v-if="modeTabelas != 'view'" label="Cancelar" icon="fa-solid fa-ban" severity="danger" text raised @click="reloadDataProdTabelas" />
                                                        </div>
                                                    </div>
                                                    <div class="col-12" v-else>
                                                        <div class="flex justify-content-center flex-wrap gap-3">
                                                            <Button class="w-full" type="button" label="Nova Tabela" severity="success" text raised @click="newDataProdTabelas" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-6">
                                                <h4>Últimos ajustes</h4>
                                                <ol>
                                                    <li v-for="(item, index) in gridDataProdTabelas" :key="item.id">
                                                        Início de validade: {{ item.ini_validade }} - Valor de compra: R$ {{ item.valor_compra }} - Valor de venda: R$ {{ item.valor_venda }}
                                                        <i class="fa-solid fa-pencil fa-shake" style="font-size: 1rem; color: slateblue" @click="editItem(item)" v-tooltip.top="'Clique para alterar'"></i>
                                                        <i class="fa-solid fa-trash ml-2" style="color: #fa0000; font-size: 1rem" @click="deleteItem(item)" v-tooltip.top="'Clique para excluir'"></i>
                                                    </li>
                                                </ol>
                                            </div>
                                        </div>
                                    </template>
                                </Card>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="col-12">
                    <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
                        <p>route.name {{ route.name }}</p>
                        <p>mode: {{ mode }}</p>
                        <p>itemData: {{ itemData }}</p>
                        <p>modeTabelas: {{ modeTabelas }}</p>
                        <p>itemDataProdTabelas: {{ itemDataProdTabelas }}</p>
                        <p v-if="gridDataProdTabelas">gridDataProdTabelas: {{ gridDataProdTabelas }}</p>
                        <p v-if="props.idCadastro">idCadastro: {{ props.idCadastro }}</p>
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
<style scoped>
.image-on {
    border: dashed;
    border-radius: 5%;
}
</style>
