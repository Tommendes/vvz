<script setup>
import axios from '@/axios-interceptor';
const baseApiUrl = import.meta.env.VITE_BASE_API_URL;
import { defaultError, defaultSuccess } from '@/toast';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();
const wait = ref([]);
const waiting = ref(false);
const idUser = ref('');
const itemData = ref({});
const token = ref('');
const isToken = ref(true);
const tokenTimeMinutesLeft = ref(0);
const tokenTimeLeft = ref(0);
const tokenTimeMessage = ref('');
const tokenTimeLeftMessage = ref('');
const urlUnlock = ref(`${baseApiUrl}/user-unlock/`);

onMounted(() => {
    idUser.value = route.params.id;
    if (route.query.tkn) token.value = route.query.tkn.substring(0, 8);
    getTokenTime();
});

const unlock = async () => {
    const urlTo = `${urlUnlock.value}${idUser.value}`;
    if (token.value) {
        // Se preencheu todos os dados obrigatórios
        if (idUser.value) {
            axios
                .post(urlTo, {
                    token: token.value.toUpperCase()
                })
                .then(async (body) => {
                    const user = body.data;
                    defaultSuccess(user.msg, true);
                    wait.value.push('Por favor, aguarde enquanto preparamos tudo para você começar a usar o sistema. Não vai demorar 😀');
                    wait.value.push('Quando estiver tudo pronto, você será direcionado para a tela de login');
                    waiting.value = true;
                    await axios
                        .post(`${baseApiUrl}/s-n-c-s`, {
                            email: itemData.value.email,
                            fantasia: itemData.value.initial_schema_description
                        })
                        .then((body) => {
                            defaultSuccess(body.data, true);
                            location.href = '/#/signin';
                        });
                })
                .catch((error) => {
                    console.log(error);

                    defaultError(error.response.data.msg, true);
                    return;
                });
        }
    }
};

const getTokenTime = async () => {
    const urlTo = `${baseApiUrl}/users/f/gtt?q=${idUser.value}`;
    tokenTimeLeft.value = 0;
    if (idUser.value) {
        await axios
            .get(urlTo)
            .then((body) => {
                itemData.value = body.data;
                const gtt = body.data.gtt;
                tokenTimeLeft.value = gtt;
                setInterval(() => {
                    if (tokenTimeLeft.value > 0) {
                        tokenTimeLeft.value--;
                        tokenTimeMinutesLeft.value = Math.floor(tokenTimeLeft.value / 60) + 1;
                        if (tokenTimeMinutesLeft.value > 1) {
                            tokenTimeMessage.value = `Dentro de ${tokenTimeMinutesLeft.value} minutos, informe o token enviado por e-mail`;
                            tokenTimeLeftMessage.value = `Aguarde ${tokenTimeMinutesLeft.value} minutos para solicitar novo token`;
                        } else {
                            tokenTimeMessage.value = `Dentro de ${tokenTimeLeft.value + 1} segundos, informe o token enviado por e-mail`;
                        }
                    } else tokenTimeLeftMessage.value = `Seu token venceu.<br>Clique abaixo para solicitar novo token`;
                }, 1000);
            })
            .catch((error) => {
                const data = error.response.data;
                isToken.value = data.isToken;
                if (data.isToken == false || data.isTokenValid == false) defaultError(data.msg);
                if (data.isToken == false) return router.push({ path: '/' });
            });
    } else {
        defaultError('Token de validação não informado');
        return router.push({ path: '/' });
    }
};

const getNewToken = async () => {
    const urlTo = `${baseApiUrl}/user-mail-unlock`;
    const urlTo2 = `${baseApiUrl}/user-whats-unlock`;

    axios
        .patch(urlTo, { id: idUser.value })
        .then(async (body) => {
            tokenTimeLeftMessage.value = '';
            defaultSuccess(body.data);
            // window.location.reload();
            getTokenTime();
        })
        .catch((error) => {
            defaultError(error.response.data.msg);
            return;
        });
    axios
        .patch(urlTo2, { id: idUser.value })
        .then(async (body) => {
            tokenTimeLeftMessage.value = '';
            defaultSuccess(body.data);
            getTokenTime();
        })
        .catch((error) => {
            defaultError(error.response.data.msg);
            return;
        });
    // setTimeout(() => {
    //     window.location.reload();
    // }, 3000);
};
</script>

<template>
    <div class="align-items-center justify-content-center">
        <Message v-for="item in wait" :key="item" severity="info">{{ item }}</Message>
        <div class="flex flex-column">
            <div
                style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                <div class="w-full surface-card py-5 px-5" style="border-radius: 53px">
                    <div class="text-center mb-2">
                        <img src="/icon.png" alt="Vivazul logo" class="mb-4 w-20 shrink-0 mx-auto"
                            style="width: 10rem" />
                        <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Bem vindo ao
                            Vivazul!</div>
                        <span v-if="isToken" class="text-muted-color font-medium">Preencha abaixo para recuperar sua
                            senha</span>
                        <div v-else class="text-muted-color font-medium gap-4">
                            <p>Página inválida</p>
                            <p>Prossiga para a home</p>
                            <p>Ou utilize um dos links abaixo</p>
                        </div>
                        <div class="text-center">
                            <span v-if="tokenTimeLeft > 0" style="color: chocolate; text-decoration: underline">
                                {{ tokenTimeMessage }}
                            </span>
                        </div>
                    </div>

                    <div v-if="isToken && tokenTimeLeft > 0">
                        <label for="token" class="block text-surface-900 dark:text-surface-0 text-xl font-medium">Seu
                            token</label>
                        <Card class="flex flex-wrap justify-content-center card-container blue-container gap-1 mb-4">
                            <template #content>
                                <InputOtp v-model="token" :length="8" style="gap: 1; text-transform: uppercase" />
                            </template>
                        </Card>
                    </div>

                    <div class="text-center mb-2">
                        <span style="color: chocolate; text-decoration: underline" v-html="tokenTimeLeftMessage" />
                    </div>

                    <div class="flex items-center justify-between mt-2 mb-8 gap-8">
                        <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary"
                            @click="router.push({ name: 'request-password-reset' })">Esqueceu sua senha?</span>
                        <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary"
                            @click="router.push({ name: 'signin' })">Acessar</span>
                    </div>

                    <div v-if="isToken">
                        <Button v-if="tokenTimeLeft > 0" label="Confirmar e acessar o sistema"
                            icon="fa-solid fa-arrow-right-to-bracket" :disabled="token && token.length != 8"
                            @click="unlock" class="w-full p-3 text-xl mt-3 mb-3 gap-5"></Button>
                        <Button v-else label="Solicite outro token" icon="fa-solid fa-arrow-right-to-bracket"
                            @click="getNewToken" class="w-full p-3 text-xl mt-3 mb-3 gap-5"></Button>
                    </div>
                    <Button v-else label="Para home" icon="fa-solid fa-arrow-right-to-bracket" @click="router.push('/')"
                        class="w-full p-3 text-xl mt-3 mb-3 gap-5"></Button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.custom-otp-input {
    width: 40px;
    font-size: 36px;
    border: 0 none;
    appearance: none;
    text-align: center;
    transition: all 0.2s;
    background: transparent;
    border-bottom: 2px solid var(--p-inputtext-border-color);
}

.custom-otp-input:focus {
    outline: 0 none;
    border-bottom-color: var(--p-primary-color);
}
</style>
