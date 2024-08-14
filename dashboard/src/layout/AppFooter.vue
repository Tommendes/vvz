<script setup>
import { useLayout } from '@/layout/composables/layout';
import { computed, onBeforeMount, ref } from 'vue';
import { softwareHouse } from '@/global';

// Profile do usuário
import { useUserStore } from '@/stores/user';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile()
});

// Computed property para calcular o tempo restante
const timeRemaining = computed(() => {
  const currentTime = Math.floor(Date.now() / 1000);
  const timePassed = currentTime - store.user.timeLogged;
  return Math.max(store.timeToLogOut - timePassed, 0); // Garante que não seja negativo
});

const logoUrl = computed(() => {
    return `/assets/images/logo-app.png`;
});
</script>

<template>
    <div class="layout-footer">
        <img :src="logoUrl" alt="Logo" height="20" class="mr-2" />
        by
        <span class="font-medium ml-2">{{ softwareHouse }}</span>
        <div>Tempo restante para logoff: {{ timeRemaining }} segundos</div>
    </div>
</template>
<style lang="scss" scoped></style>
