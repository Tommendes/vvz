<script setup>
import { onBeforeMount, onMounted, ref, watchEffect } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

import Breadcrumb from '@/components/Breadcrumb.vue';

import { useRoute } from 'vue-router';
const route = useRoute();

import { useRouter } from 'vue-router';
const router = useRouter();

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
const saveData = async () => {
    if (formIsValid()) {
        const method = itemData.value.id ? 'put' : 'post';
        const id = itemData.value.id ? `/${itemData.value.id}` : '';
        const url = `${urlBase.value}${id}`;
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
//DropDown
const dropdownProduto = ref([
    { value: 0, label: 'Produto' },
    { value: 1, label: 'Serviço' }
]);
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
// Carregar dados do formulário
onBeforeMount(() => {
    loadData();
    // loadOptions();
});
onMounted(() => {
    if (props.mode && props.mode != mode.value) mode.value = props.mode;
});
// Observar alterações nos dados do formulário
watchEffect(() => {
    isItemDataChanged();
});
import { useDialog } from 'primevue/usedialog';
const dialog = useDialog();
import Uploads from '@/components/Uploads.vue';

const showUploadForm = () => {
    dialog.open(Uploads, {
        data: {
            tabela: 'pipeline_params',
            registro_id: itemData.value.id,
            schema: userData.cliente + '_' + userData.dominio,
            field: 'id_uploads_image'
        },
        props: {
            header: `Alterar a logomarca da empresa`,
            style: {
                width: '50rem'
            },
            breakpoints: {
                '1199px': '75vw',
                '575px': '90vw'
            },
            modal: true
        },
        // templates: {
        //     footer: markRaw(FooterDemo)
        // },
        onClose: (options) => {
            reload();
        }
    });
};
const onImageRightClick = (event) => {
    menu.value.show(event);
};
const menu = ref();
const preview = ref(false);
const items = ref([
    {
        label: 'Alterar a logomarca',
        icon: 'pi pi-fw pi-cloud-upload',
        command: () => {
            showUploadForm();
        }
    }
]);
</script>

<template>
    <Breadcrumb v-if="mode != 'new'" :items="[{ label: 'Todos os produtos', to: `/${userData.cliente}/${userData.dominio}/produtos` }, { label: itemData.nome_comum + (store.userStore.admin >= 1 ? `: (${itemData.id})` : '') }]" />
    <div class="card" style="min-width: 100rem">
        <form @submit.prevent="saveData">
            <div class="grid">
                <div class="col-12">
                    <div class="p-fluid grid">
                        <div class="col-3">
                            <Skeleton v-if="loading" height="3rem"></Skeleton>
                            <Image v-else :src="`${itemData.id_uploads_image ? itemData.id_uploads_image : '/assets/images/AddressBook.jpg'}`" width="250" alt="Logomarca" :preview="preview" id="id_uploads_image" @contextmenu="onImageRightClick" />
                            <ContextMenu ref="menu" :model="items" />
                        </div>
                        <div class="col-9">
                            <div class="p-fluid grid">
                                <div class="col-12 md:col-3">
                                    <label for="nome_comum">Nome</label>
                                    <Skeleton v-if="loading" height="2rem"></Skeleton>
                                    <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.nome_comum" id="nome_comum" type="text"/>
                                </div>
                                <div class="col-12 md:col-3">
                                    <label for="id_params_unidade">Nome curto</label>
                                    <Skeleton v-if="loading" height="2rem"></Skeleton>
                                    <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_params_unidade" id="id_params_unidade" type="text"/>
                                </div>
                                <div class="col-12 md:col-3">
                                    <label for="produto">Produto</label>
                                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                                    <Dropdown v-else id="produto" :disabled="mode == 'view'" placeholder="Selecione o período" optionLabel="label" optionValue="value" v-model="itemData.produto" :options="dropdownProduto" />
                                </div>
                                <div class="col-12 md:col-3">
                                    <label for="id_fornecedor">Fornecedor</label>
                                    <Skeleton v-if="loading" height="2rem"></Skeleton>
                                    <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.id_fornecedor" id="id_fornecedor" type="text"/>
                                </div>
                                <div class="col-12 md:col-3" v-if="itemData.produto == 1">
                                    <label for="ncm">NCM</label>
                                    <Skeleton v-if="loading" height="2rem"></Skeleton>
                                    <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.ncm" id="ncm" type="text"/>
                                </div>
                                <div class="col-12 md:col-3" v-if="itemData.produto == 1">
                                    <label for="cean">CEAN</label>
                                    <Skeleton v-if="loading" height="2rem"></Skeleton>
                                    <InputText v-else autocomplete="no" :disabled="mode == 'view'" v-model="itemData.cean" id="cean" type="text"/>
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
                    <div class="card bg-green-200 mt-3" v-if="userData.admin >= 2">
                        <p>route.name {{ route.name }}</p>
                        <p>mode: {{ mode }}</p>
                        <p>itemData: {{ itemData }}</p>
                        <p v-if="props.idCadastro">idCadastro: {{ props.idCadastro }}</p>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card flex justify-content-center flex-wrap gap-3">
                        <Button type="button" v-if="mode == 'view'" label="Editar" icon="fa-regular fa-pen-to-square fa-shake" text raised @click="mode = 'edit'" />
                        <Button type="submit" v-if="mode != 'view'" label="Salvar" icon="pi pi-save" severity="success" text raised :disabled="!isItemDataChanged() || !formIsValid()" />
                        <Button type="button" v-if="mode != 'view'" label="Cancelar" icon="pi pi-ban" severity="danger" text raised @click="reload" />
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
