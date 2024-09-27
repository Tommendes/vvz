<template>
    <div class="grid">
        <div class="block md:hidden col-12">
            <div class="overflow-hidden">                
                <div class="bg-cover bg-center bg-no-repeat border-round h-30rem w-full" style="background-image: url('/assets/images/azulBotAppQuadLogo.png');"></div>
            </div>
        </div>
        <div class="col-12 md:col-6">
            <div class="text-center">
                <!-- <h1 class="text-4xl">Clique <span @click="openChat" class="cursor-pointer text-blue-900">aqui</span> para abrir o chat ou digite uma mensagem abaixo</h1> -->
                <h1 class="text-4xl">Digite abaixo uma mensagem</h1>
            </div>
            <AzulChatForm />
        </div>
        <div class="hidden md: block md:col-6 mt-6">
            <div class="overflow-hidden mt-5">
                <div class="h-30rem flex align-items-center justify-content-center md:bg-contain bg-center bg-no-repeat border-round w-full"
                    style="background-image: url('/assets/images/azulBotAppQuadLogo.png');">
                </div>
            </div>
        </div>
    </div>
    <!-- <img src="/assets/images/azulBotAppLogo.png" alt="Imagem do Azul Bot" max-width="90%" /> -->
</template>

<script setup>
import { onBeforeMount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
const route = useRoute();

const baseURL = ref(window.location.origin);

import AzulChatForm from './AzulBotForm.vue';

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
    
    const phone = route.query.phone;
    // ChatPluginPlay.init({
    //     accountId: uProf.value.chat_account_id,
    //     enableFloatingButton: false,
    //     appName: 'Meu Bot',
    //     appIcon: `${baseURL.value}/assets/images/logo-app.png`,
    //     appLogo: `${baseURL.value}/assets/images/azulBotAppLogo.png`,
    //     appPrimaryColor: '#455CC7',
    //     operatorAccessToken: uProf.value.chat_operator_access_token
    // });

    // Comentado pois o SDK não está executando a função
    // if (phone)
    //     ChatPluginPlay.openChat({
    //         phone: phone,
    //         message: 'Olá, tudo bem?',
    //     });
    // else 

    // ChatPluginPlay.openChat();
};
const openChat = async () => {
    // ChatPluginPlay.openChat();
};
</script>

<style scoped>
.azul-bot {
    padding: 20px;
    background-color: #f0f0f0;
}

.azul-bot h1 {
    color: #333;
}
</style>