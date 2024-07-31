<script setup>
import { useUserStore } from '@/stores/user';
import { userKey, glKey } from '@/global';
import { baseApiAuthUrl } from '@/env';
import { onBeforeMount, ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const store = useUserStore();
const json = localStorage.getItem(userKey);
const userData = JSON.parse(json);
const isTokenValid = ref(false);
const validateToken = async () => {
    const jsonGLK = localStorage.getItem(glKey);
    const geoLocationData = JSON.parse(jsonGLK);

    await store.validateToken(userData, geoLocationData);
    isTokenValid.value = store.isTokenValid;
    if (!isTokenValid.value) router.push('/');
    if (isTokenValid.value && !(geoLocationData && geoLocationData.geolocation)) open();
};

const getIp = async () => {
    if (userData) {
        const userIp = await axios.get(`${baseApiAuthUrl}/getIp`);
        userData.ip = userIp.data;
    }
};

onBeforeMount(async () => {
    await validateToken();
    await getIp();
});

const display = ref(false);
const open = () => {
    display.value = true;
};
const close = () => {
    display.value = false;
};
</script>

<template>
    <div class="container">
        <router-view />
        <Toast position="bottom-right" v-if="!isTokenValid" />
        <Dialog id="mdlGeoLoc" header="Segurança" v-model:visible="display" :breakpoints="{ '960px': '75vw' }"
            :style="{ width: '30vw' }" :modal="true">
            <p class="line-height-3 m-0">
                <strong>Atenção!</strong>
                <br />
                Nós cuidamos de sua segurança. Por isso, desse ponto em diante, algumas funcionalidades dependem de sua
                localização. Não se preocupe, não compartilharemos seus dados!
                <br />
                Se deseja acesso total, permita o acesso à sua localização.
            </p>
            <template #footer>
                <Button label="Ok" @click="close" icon="fa-solid fa-check" class="p-button-outlined" />
            </template>
        </Dialog>
        <DynamicDialog />
        <ConfirmDialog group="templating">
            <template #message="slotProps">
                <div class="flex p-4">
                    <i :class="slotProps.message.icon" style="font-size: 1.5rem"></i>
                    <p class="pl-2">{{ slotProps.message.message }}</p>
                </div>
            </template>
        </ConfirmDialog>
        <ScrollTop />
    </div>
</template>

<style scoped>
.container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2%;
    font-size: 16px;
    /* background-color: var(--orange-700); */
}

.desktopBgn {
    background-image: url('/assets/images/wallpaper.png');
    /* Center and scale the image nicely */
    background-attachment: fixed;
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
}

.mobileBgn {
    background-image: url('/assets/images/wallpaper.png');
}
</style>

<style>
.p-disabled,
.p-component:disabled {
    opacity: 0.8;
}
</style>
