<script setup>
import { onBeforeMount, onMounted, ref, watch, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';

// Cookies de usuário
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import Breadcrumb from '@/components/Breadcrumb.vue';

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();

// Cookies de usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();

import { useConfirm } from 'primevue/useconfirm';
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
                    itemDataComparision.value = { ...itemData.value };
                    loading.value = false;
                } else {
                    defaultWarn('Registro não localizado');
                    router.push({ path: `/${store.userStore.cliente}/${store.userStore.dominio}/produtos` });
                }
            });
        } else loading.value = false;
    }, Math.random() * 1000 + 250);
};
// Salvar dados do formulário
const saveData = async () => {
    if (formIsValid()) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`;
        // Se o tipo for serviço, limpa os campos ncm e cean
        if (itemData.value.produto == 0) {
            delete itemData.value.ncm;
            delete itemData.value.cean;
        }
        axios[method](url, itemData.value)
            .then(async (res) => {
                const body = res.data;
                if (body && body.id) {
                    defaultSuccess('Registro salvo com sucesso');
                    itemData.value = body;
                    itemDataComparision.value = { ...itemData.value };
                    emit('changed');
                    mode.value = 'view';
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
    }
};
// Verifica se houve alteração nos dados do formulário
const isItemDataChanged = () => {
    const ret = JSON.stringify(itemData.value) !== JSON.stringify(itemDataComparision.value);
    if (!ret) {
        accept.value = false;
        // errorMessages.value = {};
    }
    return ret;
};
// Validar formulário
const formIsValid = () => {
    return true;
};
// Recarregar dados do formulário
const reload = () => {
    mode.value = 'view';
    accept.value = false;
    errorMessages.value = {};
    loadData();
    emit('cancel');
};
const menu = ref();
const preview = ref(false);
const itemRemoverImagem = ref({
    label: 'Remover a imagem',
    icon: 'pi pi-fw pi-trash',
    command: () => {
        // Declarar "delete_imagem" para que a API saiba que deve remover a imagem e não faça validações
        // Excluir esta propriedade do objeto na API antes de salvar
        itemData.value.delete_imagem = true;
        removeImage();
    }
});

const removeImage = () => {
    confirm.require({
        group: 'templating',
        header: 'Confirmar exclusão',
        message: 'Você tem certeza que deseja excluir esta imagem?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'pi pi-check',
        rejectIcon: 'pi pi-times',
        acceptClass: 'p-button-danger',
        accept: () => {
            const url = `${urlBase.value}/${itemData.value.id}`;
            axios
                .put(url, itemData.value)
                .then(() => {
                    reload();
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
const items = ref([
    {
        label: 'Alterar a imagem do produto',
        icon: 'pi pi-fw pi-cloud-upload',
        command: () => {
            showUploadForm();
        }
    }
]);
import { useDialog } from 'primevue/usedialog';
const dialog = useDialog();
import Uploads from '@/components/Uploads.vue';

const showUploadForm = () => {
    dialog.open(Uploads, {
        data: {
            tabela: 'com_produtos',
            registro_id: itemData.value.id,
            schema: userData.cliente + '_' + userData.dominio,
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
        onClose: (options) => {
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
    }, Math.random() * 1000 + 250);
};

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
    isItemDataChanged();
    // Se o label de DropdownProduto for selecionado == 0, DropdownUnidades deve ser mapeado com find e recebe o valor do label 'Mão de Obra'
    if (itemData.value.produto == 0) {
        itemData.value.id_params_unidade = dropdownUnidades.value.find((item) => item.label == 'Mão de Obra').value;
    }
});
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os produtos', to: `/${userData.cliente}/${userData.dominio}/produtos` }, { label: itemData.nome_comum + (store.userStore.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card" style="min-width: 100rem">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-3 mx-auto text-center" :class="itemData.url_logo ? ' image-on' : ''">
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Image v-else :src="`${itemData.url_logo ? itemData.url_logo : '/assets/images/AddressBook.jpg'}`" width="200" alt="Logomarca" :preview="preview" id="url_logo" @contextmenu="onImageRightClick" />
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
                                    <Skeleton v-if="loading" height="2rem"></Skeleton>
                                    <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_fornecedor" id="id_fornecedor" type="text" />
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
                                    <p v-else v-html="itemData.ncm" class="p-inputtext p-component p-filled disabled"></p>
                                </div>
                                <div class="col-12 md:col-3">
                                    <label for="cean">CEAN</label>
                                    <Skeleton v-if="loading" height="2rem"></Skeleton>
                                    <InputText v-else-if="itemData.produto == 1" autocomplete="no" :disabled="mode == 'view'" v-model="itemData.cean" id="cean" type="text" />
                                    <p v-else v-html="itemData.cean || '&nbsp;'" class="p-inputtext p-component p-filled disabled"></p>
                                </div>
                            </div>
                        </div>
                        <div class="col-12 md:col-12" v-if="itemData.descricao || mode != 'view'">
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
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!isItemDataChanged() || !formIsValid()" />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
                <div class="col-12">
                    <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
                        <p>route.name {{ route.name }}</p>
                        <p>mode: {{ mode }}</p>
                        <p>itemData: {{ itemData }}</p>
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
