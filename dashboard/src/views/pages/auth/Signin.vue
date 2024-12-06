<script setup>
import { useUserStore } from '@/stores/user';
import { defaultError, defaultSuccess } from '@/toast';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
const store = useUserStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const userLogin = async () => {
    if (email.value && password.value) {
        try {
            await store.registerUser(email.value, password.value);
            if (store.userStore && store.userStore.isMatch) {
                router.push({ path: '/' });
                defaultSuccess(store.userStore.msg);
            } else {
                defaultError(store.userStore.msg);
                if (store.userStore.status == 1) router.push({ path: `/user-unlock/${store.userStore.id}?` });
            }
        } catch (error) {
            console.log(error);
            defaultError('Aparentemente houve um erro ao tentar logar no sistema. Tente novamente...');
        }
    }
};
</script>

<template>
    <div class="align-items-center justify-content-center">
        <div class="flex flex-column">
            <div
                style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                <div class="w-full surface-card py-5 px-5" style="border-radius: 53px">
                    <div class="text-center mb-2">
                        <img src="/icon.png" alt="Vivazul logo" class="mb-4 w-20 shrink-0 mx-auto"
                            style="width: 10rem" />
                        <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Bem vindo ao
                            Vivazul!</div>
                        <span class="text-muted-color font-medium">Acesse para continuar</span>
                    </div>

                    <label for="email1"
                        class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
                    <InputText id="email1" type="text" placeholder="Seu e-mail" class="w-full md:w-[30rem] mb-2"
                        v-model="email" />

                    <label for="password"
                        class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Senha</label>
                    <Password id="password" v-model="password" placeholder="Sua senha" :toggleMask="true"
                        :inputClass="'w-full'" class="w-full mb-4" :feedback="false"></Password>

                    <div class="flex justify-content-between flex-wrap">
                        <span class="flex align-items-center justify-content-center cursor-pointer text-primary" @click="router.push({ name: 'signup' })">Novo por aqui 😀?</span>
                        <span class="flex align-items-center justify-content-center cursor-pointer text-primary"
                            @click="router.push({ name: 'request-password-reset' })">Esqueceu a senha?</span>
                    </div>
                    <Button label="Acessar" class="w-full" @click="userLogin"></Button>

                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.pi-eye {
    transform: scale(1.6);
    margin-right: 1rem;
}

.pi-eye-slash {
    transform: scale(1.6);
    margin-right: 1rem;
}
</style>
