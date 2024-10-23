<script setup>
import { ref, computed, onMounted } from 'vue';
import { appName } from '@/global';
import { useRoute, useRouter } from 'vue-router';
import { baseApiUrl } from '@/env';
import axios from '@/axios-interceptor';
import { defaultSuccess, defaultError } from '@/toast';

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

const logoUrl = computed(() => {
    return `/assets/images/logo-app.png`;
});

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
                    token: token.value.toUpperCase(),
                    password: password.value,
                    confirmPassword: confirmPassword.value
                })
                .then((body) => {
                    const user = body.data;
                    if (!user.isValidPassword) defaultError(user.msg);
                    router.push({ path: '/signin' });
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
    await axios
        .patch(urlTo, { id: idUser.value })
        .then(async (body) => {
            tokenTimeLeftMessage.value = '';
            await getTokenTime();
            defaultSuccess(body.data.msg);
        })
        .catch((error) => {
            defaultError(error.response.data.msg);
            return;
        });
};
</script>

<template>
    <div class="align-items-center justify-content-center">
        <div class="flex flex-column max-w-25rem md:max-w-30rem">
            <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                <div class="w-full text-center surface-card py-5 px-5" style="border-radius: 53px">
                    <div class="text-center mb-2">
                        <img :src="logoUrl" :alt="`${appName} logo`" class="mb-2 w-4rem flex-shrink-0" />
                        <div class="text-900 text-3xl font-medium mb-3">
                            <span v-html="saudation + `Bem vindo ao ${appName}<small><sup>&copy;</sup></small>`"></span>
                        </div>
                    </div>
                    <div v-if="tokenTimeLeft > 0" class="text-center mb-2">
                        <span style="color: chocolate; text-decoration: underline">
                            {{ tokenTimeMessage }}
                        </span>
                    </div>

                    <form @submit.prevent="passReset" class="max-w-35rem">
                        <div class="formgrid grid" v-if="tokenTimeLeft > 0">
                            <div class="field col-12">
                                <label for="token" class="block text-900 mb-2">Seu token</label>
                                <div v-focustrap class="flex flex-wrap justify-content-center card-container blue-container gap-1">
                                    <div class="card flex justify-content-center">
                                        <InputOtp v-model="token" :length="8">
                                            <template #default="{ attrs, events }">
                                                <input type="text" v-bind="attrs" v-on="events" class="custom-otp-input" pattern="[0-9a-zA-Z]{1}" style="max-width: 30px; text-transform: uppercase" />
                                            </template>
                                        </InputOtp>
                                    </div>
                                </div>

                                <div class="formgrid grid">
                                    <div class="field col-12 md:col-6 mt-4">
                                        <label for="password">Nova senha</label>
                                        <InputText id="password" type="password" autocomplete="off" class="p-2 w-full" style="padding: 1rem" v-model="password" />
                                    </div>
                                    <div class="field col-12 md:col-6 mt-4">
                                        <label for="confirmPassword">Confirme a senha</label>
                                        <InputText id="confirmPassword" type="password" autocomplete="off" class="p-2 w-full" style="padding: 1rem" v-model="confirmPassword" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="text-center mb-2">
                            <span style="color: chocolate; text-decoration: underline" v-html="tokenTimeLeftMessage" />
                        </div>

                        <div class="flex align-items-center justify-content-between mb-2" v-if="!route.params.client">
                            <Button link style="color: var(--primary-color)" class="font-medium no-underline ml-2 text-center cursor-pointer" @click="router.push('/signin')"> Acessar </Button>
                        </div>

                        <Button
                            v-if="tokenTimeLeft > 0"
                            rounded
                            label="Registrar"
                            icon="fa-solid fa-arrow-right-to-bracket"
                            :disabled="!(token && token.length == 8 && password && password.length > 5 && confirmPassword && confirmPassword.length > 5)"
                            type="submit"
                            class="w-full p-3 text-xl mt-3 mb-3 gap-5"
                        ></Button>
                        <Button v-else rounded label="Solicite outro token por e-mail" icon="fa-solid fa-arrow-right-to-bracket" @click="getNewToken" class="w-full p-3 text-xl mt-3 mb-3 gap-5"></Button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.token-input {
    text-align: center;
    font-size: 0.8rem;
    max-width: 35px;
    text-transform: uppercase;
}

.custom-otp-input {
    width: 40px;
    font-size: 36px;
    border: 0 none;
    appearance: none;
    text-align: center;
    transition: all 0.2s;
    background: transparent;
    border-bottom: 2px solid var(--surface-500);
}

.custom-otp-input:focus {
    outline: 0 none;
    border-bottom-color: var(--primary-color);
}
</style>
