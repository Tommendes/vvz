<script setup>
import { onBeforeMount, ref } from 'vue';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultWarn } from '@/toast';
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
import { isValidEmail } from '@/global';
// Cookies de usuário
import { onMounted } from 'vue';
import { userKey } from '@/global';
import { useRouter } from 'vue-router';
const router = useRouter();
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
// Campos de formulário
const itemData = ref({});
// Emit do template
const emit = defineEmits(['reload', 'cancel']);
const mode = ref('view');

// Dropdowns
// Props do template
const props = defineProps({
    itemDataRoot: Object // O id e id_cadastros do próprio contato
});
// Mensages de erro
const errorMessages = ref({});
const loading = ref(true);
// Url base do form action
const urlBase = ref(`${baseApiUrl}/cad-contatos-itens/${props.itemDataRoot.id_cadastros}`);
// Carregar dados do formulário
const loadData = async () => {
    loading.value = true;
    if (props.itemDataRoot.id) {
        const url = `${urlBase.value}/${props.itemDataRoot.id}`;
        axios
            .get(url)
            .then((res) => {
                const body = res.data;
                if (body && body.id) {
                    itemData.value = body;
                }
            })
            .catch((error) => {
                defaultWarn(error.response.data || error.response || error);
                if (error.response.status == 401) router.push('/');
            });
    } else {
        itemData.value.id_cadastros = props.itemDataRoot.id_cadastros;
        mode.value = 'new';
    }
    loading.value = false;
};
// Validar e-mail
const validateEmail = () => {
    errorMessages.value.email = null;
    if (itemData.value.email && !isValidEmail(itemData.value.email)) {
        defaultWarn('Formato de e-mail inválido', false);
        errorMessages.value.email = true;
        return false;
    }
    return true;
};
// Validar telefone
const validateTelefone = (field) => {
    errorMessages.value[field] = null;
    if (itemData.value[field] && itemData.value[field].length > 0 && ![10, 11].includes(itemData.value[field].replace(/([^\d])+/gim, '').length)) {
        defaultWarn(`Formato de ${field} inválido`, false);
        errorMessages.value[field] = true;
        return false;
    }
    return true;
};
// Validar formulário
const formIsValid = () => {
    if (itemData.value.email) return validateEmail();
    if (itemData.value.fixo) return validateTelefone('fixo');
    if (itemData.value.celular) return validateTelefone('celular');
    return true;
};
// Salvar dados do formulário
const saveData = async () => {
    // Se o formulário não for válido, não salva
    if (!formIsValid()) {
        defaultWarn('Verifique os campos obrigatórios', false);
        return;
    }
    loading.value = true;
    const method = itemData.value.id ? 'put' : 'post';
    const id = itemData.value.id ? `/${itemData.value.id}` : '';
    const url = `${urlBase.value}${id}`;
    const obj = { ...itemData.value };
    axios[method](url, obj)
        .then((res) => {
            const body = res.data;
            if (body && body.id) {
                defaultSuccess('Registro salvo com sucesso');
                if (method == 'post') {
                    emit('reload');
                }
                mode.value = 'view';
            } else {
                defaultWarn('Erro ao salvar registro');
            }
        })
        .catch((error) => {
            defaultWarn(error.response.data || error.response || error);
            if (error.response.status == 401) router.push('/');
        });
    loading.value = false;
};
// Exclui o registro
const deleteItem = () => {
    confirm.require({
        group: 'templating',
        header: 'Confirmar exclusão',
        message: 'Confirma que deseja EXCLUIR este registro?',
        icon: 'fa-solid fa-question fa-beat',
        acceptIcon: 'fa-solid fa-check',
        rejectIcon: 'fa-solid fa-xmark',
        acceptClass: 'p-button-danger',
        accept: () => {
            axios
                .delete(`${urlBase.value}/${itemData.value.id}`)
                .then(async () => {
                    defaultSuccess('Registro excluído com sucesso!');
                    emit('reload');
                })
                .catch((error) => {
                    defaultWarn(error.response.data || error.response || 'Erro ao carregar dados!');
                    if (error.response.status == 401) router.push('/');
                });
        },
        reject: () => {
            return false;
        }
    });
};
// Recarregar dados do formulário
const cancel = async () => {
    mode.value = 'view';
    if (itemData.value.id) await loadData();
    else emit('cancel');
};
const toEmail = () => {
    if (itemData.value.email) {
        window.open(`mailto:${itemData.value.email}`);
    }
};
const linkClass = ref('p-inputgroup-addon');
const getLinkClass = (moviment) => {
    linkClass.value = itemData.value.email && moviment == 'move' ? 'p-inputgroup-addon email-at' : 'p-inputgroup-addon';
};
// Carregar dados do formulário
onBeforeMount(() => {
    itemData.value = {
        id_cad_contatos: props.itemDataRoot.id
    };
});
onMounted(async () => {
    setTimeout(async () => {
        await loadData();
    }, Math.random() * 1000 + 250);
});
</script>

<template>
    <form @submit.prevent="saveData">
        <div class="flex overflow-x-auto gap-1 mb-2">
            <div class="flex-grow-1 flex align-items-center justify-content-center">
                <div class="p-inputgroup" data-pc-name="inputgroup" data-pc-section="root">
                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                    <div class="p-inputgroup flex-1" v-else>
                        <div class="p-inputgroup-addon" data-pc-name="inputgroupaddon" data-pc-section="root"><i class="fa-solid fa-id-card"></i></div>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.nome" id="nome" type="text" @keydown.enter.prevent :placeholder="`Digite o nome...`" />
                    </div>
                </div>
            </div>
            <div class="flex-grow-0 flex align-items-center justify-content-center">
                <div class="p-inputgroup" data-pc-name="inputgroup" data-pc-section="root">
                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                    <div class="p-inputgroup flex-0" v-else>
                        <div class="p-inputgroup-addon" data-pc-name="inputgroupaddon" data-pc-section="root"><i class="fa-solid fa-arrow-right-to-city"></i></div>
                        <InputText autocomplete="no" :disabled="mode == 'view'" v-model="itemData.departamento" id="departamento" type="text" @keydown.enter.prevent :placeholder="`Digite o departamento...`" />
                    </div>
                </div>
            </div>
            <div class="flex-grow-0 flex align-items-center justify-content-center">
                <div class="p-inputgroup" data-pc-name="inputgroup" data-pc-section="root">
                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                    <div class="p-inputgroup flex-0" v-else>
                        <div class="p-inputgroup-addon" data-pc-name="inputgroupaddon" data-pc-section="root"><i class="fa-solid fa-mobile-screen-button"></i></div>
                        <InputText
                            autocomplete="no"
                            :disabled="mode == 'view'"
                            v-model="itemData.celular"
                            id="celular"
                            type="text"
                            @blur="validateTelefone('celular')"
                            v-maska
                            data-maska="(##) #####-####"
                            @keydown.enter.prevent
                            :placeholder="`Digite o celular...`"
                            :invalid="errorMessages.celular"
                        />
                    </div>
                </div>
            </div>
            <div class="flex-grow-0 flex align-items-center justify-content-center">
                <div class="p-inputgroup" data-pc-name="inputgroup" data-pc-section="root">
                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                    <div class="p-inputgroup flex-0" v-else>
                        <div class="p-inputgroup-addon" data-pc-name="inputgroupaddon" data-pc-section="root"><i class="fa-solid fa-tty"></i></div>
                        <InputText
                            autocomplete="no"
                            :disabled="mode == 'view'"
                            v-model="itemData.fixo"
                            id="fixo"
                            type="text"
                            @blur="validateTelefone('fixo')"
                            v-maska
                            data-maska="(##) ####-####"
                            @keydown.enter.prevent
                            :placeholder="`Digite o fixo...`"
                            :invalid="errorMessages.fixo"
                        />
                    </div>
                </div>
            </div>
            <div class="flex-grow-0 flex align-items-center justify-content-center">
                <div class="p-inputgroup" data-pc-name="inputgroup" data-pc-section="root">
                    <Skeleton v-if="loading" height="3rem"></Skeleton>
                    <div class="p-inputgroup flex-0" v-else>
                        <div
                            id="email"
                            :class="linkClass"
                            data-pc-name="inputgroupaddon"
                            v-tooltip.top="itemData.email ? 'Clique para seguir' : ''"
                            data-pc-section="root"
                            @mousemove="getLinkClass('move')"
                            @mouseleave="getLinkClass('leave')"
                            @click="toEmail"
                            class="lowercase"
                        >
                            <i class="fa-solid fa-at"></i>
                        </div>
                        <InputText
                            autocomplete="no"
                            :disabled="mode == 'view'"
                            class="lowercase"
                            v-model="itemData.email"
                            type="text"
                            id="email"
                            @blur="validateEmail()"
                            @keydown.enter.prevent
                            :placeholder="`Digite o email...`"
                            :invalid="errorMessages.email"
                        />
                    </div>
                </div>
            </div>
            <div class="flex-none flex">
                <div class="p-inputgroup" data-pc-name="inputgroup" data-pc-section="root">
                    <Button type="submit" :disabled="!(userData.cadastros >= 2)" v-if="['edit', 'new'].includes(mode)" v-tooltip.top="'Salvar contato'" icon="fa-solid fa-floppy-disk" severity="success" text raised />
                    <Button type="button" :disabled="!(userData.cadastros >= 3)" v-if="mode == 'view'" v-tooltip.top="'Editar contato'" icon="fa-regular fa-pen-to-square" text raised @click="mode = 'edit'" />
                    <Button type="button" v-if="['new', 'edit'].includes(mode)" v-tooltip.top="'Cancelar edição'" icon="fa-solid fa-ban" severity="danger" text raised @click="cancel" />
                    <Button type="button" :disabled="!(userData.cadastros >= 4)" v-if="['view'].includes(mode)" v-tooltip.top="'Excluir contato'" icon="fa-solid fa-trash" severity="danger" text raised @click="deleteItem" />
                </div>
            </div>
        </div>
        <Fieldset class="bg-green-200 mb-1" toggleable :collapsed="true" v-if="userData.admin >= 32">
            <template #legend>
                <div class="flex align-items-center text-primary">
                    <span class="fa-solid fa-circle-info mr-2"></span>
                    <span class="font-bold text-lg">FormData</span>
                </div>
            </template>
            <p>mode: {{ mode }}</p>
            <p>itemData: {{ itemData }}</p>
            <p>props.itemDataRoot: {{ props.itemDataRoot }}</p>
            <p>errorMessages: {{ errorMessages }}</p>
        </Fieldset>
    </form>
</template>

<style scoped>
.p-dropdown-item {
    font-weight: 500;
    padding: 0.25rem 0.25rem;
}
.email-at {
    cursor: pointer;
    color: #673ab7;
}
</style>
