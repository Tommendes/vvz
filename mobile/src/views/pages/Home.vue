<!-- eslint-disable vue/multi-word-component-names -->
<script setup>
import { appName } from '@/global';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';

const router = useRouter();

const store = useUserStore();

const getYear = () => {
    const date = new Date();
    return date.getFullYear();
};

const logout = () => {
    useUserStore().logout();
    location.reload();
};
</script>

<template>
    <div class="max-w-25rem mb-5 md:max-w-max" style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
        <div class="grid grid-nogutter surface-section text-800" style="border-radius: 53px">
            <div class="col-12 max-w-30rem p-6 text-center flex align-items-center">
                <section>
                    <span class="block text-5xl font-bold mb-1">
                        Bem vindo ao {{ appName }}<small><sup>&copy;</sup></small>
                    </span>
                    <div class="text-3xl text-primary font-bold mb-3">Gestão Inteligente para Representações Comerciais</div>
                    <div class="mt-0 mb-4 text-800 line-height-2">Vivazul &copy; 2012 - {{ getYear() }}</div>

                    <Button @click="router.push('/signin')" v-if="!store.userStore.id" class="p-button-text p-button-rounded border-none font-light line-height-2 text-blue-500"> Acessar </Button>
                    <Button label="Sign Out" @click="logout" v-else class="p-button-rounded border-none ml-5 font-light text-white line-height-2 bg-blue-500"> Sair </Button>
                    <Button @click="router.push('/signup')" v-if="!store.userStore.id" class="p-button-rounded border-none ml-5 font-light text-white line-height-2 bg-blue-500"> Inscrever-se </Button>
                    <!-- <p>Time on: {{ store.userStore.timeLogged }}</p>
                    <p>Time out: {{ store.userStore.timeToLogOut }}</p> -->
                    <div class="col-12 flex-grow-1 flex overflow-hidden justify-content-center">
                        <img src="/assets/images/logo-app.png" alt="Image" class="max-w-10rem md:imgApp" :style="{ width: '20vw' }" />
                    </div>

                </section>                
            </div>
            <!-- <div class="col-12 md:col-6 flex-grow-1 flex overflow-hidden justify-content-center">
                <img src="/assets/images/logo-app.png" alt="Image" class=" mb-5 md:max-w-2rem md:imgApp" :style="{ width: '20vw' }" />
            </div> -->
        </div>
    </div>
</template>

<style scope>
</style>
