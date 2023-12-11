<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
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
const itemsMessages = ref([
    {
        label: 'Título da mensagem',
        command: () => {
            router.push({ path: `/${userData.schema_description}/message`, query: { q: '[id_da mensagem aqui]' } });
        }
    }
]);
const items = ref([
    {
        label: 'Ver perfil',
        icon: 'pi pi-refresh',
        command: () => {
            toast.add({ severity: 'info', summary: 'Success', detail: 'Ver perfil', life: 3000 });
        }
    },
    {
        label: 'Sair do sistema',
        icon: 'pi pi-times',
        command: () => {
            logout();
        }
    },
    {
        label: 'Trocar senha',
        icon: 'pi pi-external-link',
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
const onSettingsClick = () => {
    topbarMenuActive.value = false;
    router.push('/documentation');
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
const getUserMessages = async () => {
    const url = `${baseApiUrl}/sis-messages/f-a/gbf?fld=id_user&vl=${userData.id}&slct=id,title,msg`;
    console.log(url);
    await axios.get(url).then((res) => {
        const body = res.data.data;
        if (body && body.length) {
            itemsMessages.value = [];
            body.forEach((element) => {
                itemsMessages.value.push({
                    label: element.title,
                    message: element.msg,
                    command: () => {
                        showMessage({
                            label: element.title,
                            message: element.msg
                        });
                    }
                });
            });
        }
    });
};

const showMessage = (body) => {
    dialog.open(Prompts, {
        data: {
            message: body
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
        onClose: (options) => {
            console.log('onClose');
            console.log(options);
        }
    });
};

onMounted(() => {
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
            <i class="pi pi-bars"></i>
        </button>

        <button class="p-link layout-topbar-menu-button layout-topbar-button" @click="onTopBarMenuButton()">
            <i class="pi pi-ellipsis-v"></i>
        </button>

        <div class="layout-topbar-menu" :class="topbarMenuClasses">
            <Button type="button" icon="fa-regular fa-bell fa-2xl fa-shake" severity="info" rounded size="large" :badge="itemsMessages.length" aria-haspopup="true" @click="toggleMenuMessages" />
            <Menu ref="menuMessages" id="overlay_messages" :model="itemsMessages" :popup="true" v-if="itemsMessages.length" />
            <Button type="button" label="Toggle" @click="toggle" aria-haspopup="true" aria-controls="overlay_menu" class="p-link layout-topbar-button">
                <i class="pi pi-user"></i>
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
</style>
