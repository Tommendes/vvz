<template>
    <div class="overflow-hidden">
        <div class="bg-cover md:bg-contain bg-center bg-no-repeat border-round h-25rem w-full"
            style="background-image: url('/assets/images/azulChatAppQuadLogo.png');">
        </div>
    </div>
    <div class="flex text-center h-full mt-5">
        <h1 class="text-4xl">Se o chat não abrir ou se fechar, atualize a página</h1>
    </div>
    <!-- <img src="/assets/images/azulChatAppLogo.png" alt="Imagem do Azul Chat" max-width="90%" /> -->
</template>

<script setup>
import { onBeforeMount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
const route = useRoute();

// Profile do usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile()
    await initChat();
});

const initChat = async () => {
    if (!(uProf.value.chat_account_id && uProf.value.chat_status && uProf.value.chat_operator_access_token)) return;
    const baseURL = `${window.location.origin}`;
    const phone = route.query.phone;
    ChatPluginPlay.init({
        accountId: uProf.value.chat_account_id,
        enableFloatingButton: false,
        appName: 'Meu Chat',
        appIcon: `${baseURL}/assets/images/logo-app.png`,
        appLogo: `${baseURL}/assets/images/azulChatAppLogo.png`,
        appPrimaryColor: '#455CC7',
        operatorAccessToken: uProf.value.chat_operator_access_token
    });

    if (phone)
        ChatPluginPlay.openChat({
            phone: '558296061883',
            message: 'Olá, tudo bem?',
        });
    // ChatPluginPlay.openChat({ phone: phone });
    else ChatPluginPlay.openChat();
};
</script>

<style scoped>
.azul-chat {
    padding: 20px;
    background-color: #f0f0f0;
}

.azul-chat h1 {
    color: #333;
}
</style>