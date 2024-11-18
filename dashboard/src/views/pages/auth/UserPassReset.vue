<script setup>
import axios from '@/axios-interceptor';
import { baseApiUrl } from '@/env';
import { defaultError, defaultSuccess } from '@/toast';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();

const idUser = ref('');
const token = ref('');
const password = ref('');
const confirmPassword = ref('');
const tokenTimeMinutesLeft = ref(0);
const tokenTimeLeft = ref(0);
const tokenTimeMessage = ref('');
const tokenTimeLeftMessage = ref('');
const urlUnlock = ref(`${baseApiUrl}/password-reset/`);
const user = ref({});
const saudation = ref('');

onMounted(async () => {
    idUser.value = route.query.q;
    if (route.query.tkn) token.value = route.query.tkn.substring(0, 8);
    await getTokenTime();
    if (user.value.name) saudation.value = `Olá, ${user.value.name}!<br />`;
});

const passReset = async () => {
    const urlTo = `${urlUnlock.value}${idUser.value}`;
    if (token.value) {
        // Se preencheu todos os dados obrigatórios
        if (idUser.value) {
            axios
                .put(urlTo, {
                    token: token.value.toUpperCase().substring(0, 8),
                    password: password.value,
                    confirmPassword: confirmPassword.value
                })
                .then((body) => {
                    const user = body.data;
                    if (!user.isValidPassword) defaultError(user.msg);
                    router.push({ name: 'signin' });
                    defaultSuccess(user.msg);
                })
                .catch((error) => {
                    defaultError(error.response.data);
                    return;
                });
        }
    }
};

const getTokenTime = async () => {
    const urlTo = `${baseApiUrl}/users/f/gtt?q=${idUser.value}`;
    if (idUser.value) {
        await axios
            .get(urlTo)
            .then((body) => {
                user.value = body.data;
                const gtt = user.value.gtt;
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
                if (data.isToken == false || data.isTokenValid == false) defaultError(data.msg);
                // if (data.isToken == false) return router.push({ path: '/' });
            });
    } else {
        defaultError('Token de validação não informado');
        return;
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
                        <span class="text-muted-color font-medium">Preencha abaixo para recuperar sua senha</span>
                        <div class="text-center">
                            <span v-if="tokenTimeLeft > 0" style="color: chocolate; text-decoration: underline">
                                {{ tokenTimeMessage }}
                            </span>
                        </div>
                    </div>

                    <div v-if="tokenTimeLeft > 0">
                        <label for="token" class="block text-surface-900 dark:text-surface-0 text-xl font-medium">Seu
                            token</label>
                        <Card class="flex flex-wrap justify-content-center card-container blue-container gap-1 mb-4">
                            <template #content>
                                <InputOtp v-model="token" :length="8" style="gap: 1; text-transform: uppercase" />
                            </template>
                        </Card>

                        <label for="password"
                            class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Nova
                            senha</label>
                        <Password id="password" v-model="password" placeholder="Sua senha" :toggleMask="true"
                            :inputClass="'w-full'" class="w-full mb-4" fluid :feedback="true"></Password>

                        <label for="confirmPassword"
                            class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Confirme a
                            senha</label>
                        <Password id="confirmPassword" v-model="confirmPassword" placeholder="Confirme sua senha"
                            :toggleMask="true" :inputClass="'w-full'" class="w-full mb-4" fluid :feedback="true"></Password>
                    </div>

                    <div class="text-center mb-2">
                        <span style="color: chocolate; text-decoration: underline" v-html="tokenTimeLeftMessage" />
                    </div>

                    <div class="flex items-center justify-between mt-2 mb-8 gap-8">
                        <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary"
                            @click="router.push({ name: 'signup' })">É novo por aqui 😀?</span>
                        <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary"
                            @click="router.push({ name: 'signin' })">Acessar</span>
                    </div>

                    <Button v-if="tokenTimeLeft > 0" label="Registrar a nova senha"
                        icon="fa-solid fa-arrow-right-to-bracket"
                        :disabled="!(token && token.length == 8 && password && password.length > 5 && confirmPassword && confirmPassword.length > 5)"
                        @click="passReset" class="w-full p-3 text-xl mt-3 mb-3 gap-5"></Button>
                    <Button v-else label="Solicite outro token por e-mail" icon="fa-solid fa-arrow-right-to-bracket"
                        @click="getNewToken" class="w-full p-3 text-xl mt-3 mb-3 gap-5"></Button>
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
