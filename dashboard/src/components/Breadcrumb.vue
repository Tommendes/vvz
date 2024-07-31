<script setup>
import { ref } from 'vue';
// Profile do usuário
import { useUserStore } from '@/stores/user';
import { onBeforeMount } from 'vue';
const store = useUserStore();
const uProf = ref({});
onBeforeMount(async () => {
    uProf.value = await store.getProfile()
});
const home = ref({
    icon: 'fa-solid fa-house',
    to: `/${uProf.value.schema_description}`
});
const pilha = defineProps(['items']);
</script>

<template>
    <div class="card justify-content-left" style="padding: 0.5rem">
        <Breadcrumb :home="home" :model="pilha.items">
            <template #item="{ item, props }">
                <router-link v-if="item.to" v-slot="{ href, navigate }" :to="item.to" custom>
                    <a :href="href" v-bind="props.action" @click="navigate">
                        <span :class="[item.icon, 'text-color']" />
                        <span class="text-primary font-semibold">{{ item.label }}</span>
                    </a>
                </router-link>
                <a v-else :href="item.url" :target="item.target" v-bind="props.action">
                    <span class="text-color">{{ item.label }}</span>
                </a>
            </template>
        </Breadcrumb>
    </div>
</template>
