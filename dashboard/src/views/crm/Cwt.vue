<template>
    <div>
      <h1>Componente de Iframe</h1>
      <IframeComponent src="https://app.azulbot.com.br" width="100%" height="100%"></IframeComponent>
    </div>
  </template>
  
  <script setup>
  import IframeComponent from '@/components/IframeComponent.vue';
  </script>
  
  <style scoped>
  /* Estilos apenas para a página principal */
  h1 {
    text-align: center;
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
  </style>
  