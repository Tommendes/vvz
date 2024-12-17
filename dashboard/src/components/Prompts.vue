<script setup>
import { inject, onBeforeMount, ref } from 'vue';

const dialogRef = inject('dialogRef');
const itemData = ref({});
onBeforeMount(() => {
    itemData.value = { ...dialogRef.value.data.body };
});
const action = (itemData) => {
    // Devolve o itemData para o componente que chamou o dialog
    dialogRef.value.close(itemData);
};
</script>

<template>
    <!-- <h3 class="text-center mb-5">{{ itemData.label }}</h3> -->
    <div class="text-xl text-center" v-for="item in itemData.message" :key="itemData.message">
        <!-- Renderizar o valor de item que poderá ser um conteúdo -->
        {{ item }}
    </div>
    <div class="flex justify-content-center flex-wrap gap-3">
        <Button :label="item.label" @click="action(item)" v-for="item in itemData.buttons" :key="item.id" text raised :severity="item.severity" />
    </div>
</template>
