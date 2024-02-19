<script setup>
import { ref, computed, onMounted, onBeforeUnmount, onBeforeMount } from 'vue';
import { useLayout } from '@/layout/composables/layout';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useToast } from 'primevue/usetoast';
import { appName } from '@/global';
import Prompts from '@/components/Prompts.vue';
import { useDialog } from 'primevue/usedialog';
const dialog = useDialog();

const toast = useToast();

const { onMenuToggle } = useLayout();

const outsideClickListener = ref(null);
const topbarMenuActive = ref(false);
const router = useRouter();

import axios from '@/axios-interceptor';
import { defaultSuccess, defaultError, defaultWarn } from '@/toast';

import { userKey } from '@/global';
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);

const jsonLayer = localStorage.getItem('__layoutCfg');
const userLayer = JSON.parse(jsonLayer);

import { baseApiUrl } from '@/env';
const urlRequestRequestPassReset = ref(`${baseApiUrl}/request-password-reset/`);
const itemsMessages = ref([]);
const items = ref([
    {
        label: 'Ver perfil',
        icon: 'fa-solid fa-rotate-right',
        command: () => {
            toast.add({ severity: 'info', summary: 'Success', detail: 'Ver perfil', life: 3000 });
        }
    },
    {
        label: 'Sair do sistema',
        icon: 'fa-solid fa-x',
        command: () => {
            logout();
        }
    },
    {
        label: 'Trocar senha',
        icon: 'fa-solid fa-arrow-up-right-from-square',
        command: async () => {
            await axios
                .post(urlRequestRequestPassReset.value, { cpf: userData.cpf })
                .then((body) => {
                    if (body.data.id) {
                        router.push({ path: `/${userData.schema_description}/password-reset`, query: { q: body.data.id } });
                        defaultSuccess(body.data.msg);
                    } else defaultWarn('Ops! Parece que houve um erro ao executar sua solicitação. Por favor tente de novo');
                })
                .catch((error) => {
                    defaultError(error);
                });
        }
    }
]);

const logout = () => {
    useUserStore().logout();
    location.reload();
};

onMounted(() => {
    bindOutsideClickListener();
});

onBeforeUnmount(() => {
    unbindOutsideClickListener();
});

const logoUrl = computed(() => {
    return `/assets/images/logo-app.png`;
});

const onTopBarMenuButton = () => {
    topbarMenuActive.value = !topbarMenuActive.value;
};

const topbarMenuClasses = computed(() => {
    return {
        'layout-topbar-menu-mobile-active': topbarMenuActive.value
    };
});

const bindOutsideClickListener = () => {
    if (!outsideClickListener.value) {
        outsideClickListener.value = (event) => {
            if (isOutsideClicked(event)) {
                topbarMenuActive.value = false;
            }
        };
        document.addEventListener('click', outsideClickListener.value);
    }
};
const unbindOutsideClickListener = () => {
    if (outsideClickListener.value) {
        document.removeEventListener('click', outsideClickListener);
        outsideClickListener.value = null;
    }
};
const isOutsideClicked = (event) => {
    if (!topbarMenuActive.value) return;

    const sidebarEl = document.querySelector('.layout-topbar-menu');
    const topbarEl = document.querySelector('.layout-topbar-menu-button');

    return !(sidebarEl.isSameNode(event.target) || sidebarEl.contains(event.target) || topbarEl.isSameNode(event.target) || topbarEl.contains(event.target));
};
const menuMessages = ref();
const toggleMenuMessages = (event) => {
    menuMessages.value.toggle(event);
};
const menu = ref();
const toggle = (event) => {
    menu.value.toggle(event);
};
const toggleAppConfig = () => {
    const btn = document.getElementById('btnTglAppConfig');
    if (btn) {
        btn.click();
    }
};
const newMessages = ref(0);
const getUserMessages = async () => {
    setTimeout(async () => {
        const url = `${baseApiUrl}/sis-messages/f-a/gbf?fld=id_user&vl=${userData.id}&slct=id,title,msg,status`;
        await axios.get(url).then((res) => {
            const body = res.data.data;
            itemsMessages.value = [];
            newMessages.value = 0;
            if (body && body.length) {
                body.forEach((element) => {
                    if (element.status == 10) ++newMessages.value;
                    // element.msg = element.msg.replaceAll('[userName]', userData.name.split(' ')[0]);
                    // Substitua [userName] pelos dois primeiros nomes do usuário com o cuidade de que o usuário pode ter apenas um nome registrado
                    element.msg = element.msg.replace('[userName]', userData.name.split(' ').slice(0, 2).join(' '));
                    itemsMessages.value.push({
                        icon: element.status == 10 ? 'fa-solid fa-asterisk fa-fade' : 'fa-solid fa-check',
                        status: element.status,
                        label: element.title,
                        message: element.msg,
                        command: () => {
                            messagesButtoms.value.forEach((elementButton) => {
                                // Adicionar ao elementButton o id da mensagem
                                elementButton.id = element.id;
                                elementButton.message = element.msg;
                                elementButton.title = element.title;
                            });
                            showMessage({
                                label: element.title,
                                message: element.msg,
                                buttons: messagesButtoms.value
                            });
                        }
                    });
                });
            }
        });
    }, Math.floor(Math.random() * 1000) + 250);
};
const dialogRef = ref(null);
const messagesButtoms = ref([
    {
        label: 'Ok',
        icon: 'fa-solid fa-check',
        severity: 'success'
    },
    {
        label: 'Não mostrar novamente',
        icon: 'fa-regular fa-trash-can',
        severity: 'danger'
    }
]);
const showMessage = (body) => {
    dialogRef.value = dialog.open(Prompts, {
        data: {
            body: body
        },
        props: {
            header: body.label,
            style: {
                width: '50vw'
            },
            breakpoints: {
                '960px': '75vw',
                '640px': '90vw'
            },
            modal: true
        },
        onClose: async (options) => {
            if (options.data.label == messagesButtoms.value[0].label) {
                console.log(options.data);
                const bodyTo = {
                    title: options.data.title,
                    msg: options.data.message,
                    status: 11
                };
                await axios
                    .put(`${baseApiUrl}/sis-messages/${options.data.id}`, bodyTo)
                    .then(async () => await getUserMessages())
                    .catch((error) => {
                        defaultError(error);
                    });
            } else if (options.data.label == messagesButtoms.value[1].label) {
                await axios
                    .delete(`${baseApiUrl}/sis-messages/${options.data.id}`)
                    .then(async () => {
                        await getUserMessages();
                        defaultSuccess('Mensagem excluída com sucesso!');
                    })
                    .catch((error) => {
                        defaultError(error);
                    });
            }
        }
    });
};

onBeforeMount(() => {
    getUserMessages();
});
</script>

<template>
    <div class="layout-topbar">
        <router-link to="/" class="layout-topbar-logo">
            <img :src="logoUrl" alt="logo" />
            <span>{{ appName }}</span>
        </router-link>

        <button class="p-link layout-menu-button layout-topbar-button" @click="onMenuToggle()">
            <i class="fa-solid fa-bars fa-lg"></i>
        </button>

        <button class="p-link layout-topbar-menu-button layout-topbar-button" @click="onTopBarMenuButton()">
            <i class="fa-solid fa-ellipsis-vertical"></i>
        </button>

        <div class="layout-topbar-menu" :class="topbarMenuClasses">
            <Button
                v-if="newMessages > 0"
                type="button"
                :icon="`fa-regular fa-bell fa-2xl ${newMessages ? 'fa-shake' : ''}`"
                :severity="`${newMessages > 0 ? 'info' : ''}`"
                rounded
                size="large"
                :badge="String(newMessages) || '0'"
                aria-haspopup="true"
                @click="toggleMenuMessages"
            />
            <Button v-else-if="newMessages == 0 && itemsMessages.length > 0" type="button" label="Toggle" @click="toggleMenuMessages" aria-haspopup="true" aria-controls="overlay_menumessages" class="p-link layout-topbar-button p-button-transparent">
                <i class="fa-regular fa-bell"></i>
            </Button>
            <Menu ref="menuMessages" id="overlay_messages" :model="itemsMessages" :popup="true" v-if="itemsMessages.length" />
            <Button type="button" label="Toggle" @click="toggle" aria-haspopup="true" aria-controls="overlay_menu" class="p-link layout-topbar-button p-button-transparent">
                <i class="fa-regular fa-user"></i>
                <span>Perfil</span>
            </Button>
            <Menu ref="menu" id="overlay_menu" :model="items" :popup="true" />
            <button @click="toggleAppConfig()" class="p-link layout-topbar-button">
                <i :class="`fa-solid fa-user-gear ${userLayer ? '' : 'fa-shake'}`"></i>
                <span>Configurações</span>
            </button>
        </div>

        <Toast />
    </div>
</template>

<style scoped>
.fa-regular .fa-bell .fa-shake {
    font-size: 1.5rem;
}
.p-button-transparent {
    background-color: transparent;
}
</style>
