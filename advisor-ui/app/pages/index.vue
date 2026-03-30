<script setup lang="ts">
useHead({
  title: 'Homepage'
})
</script>

<template>
  <UContainer>
    <div class="max-w-2xl w-full mx-auto pt-4">
      <h1 class="my-4 text-2xl font-bold">
        Welcome
      </h1>
      <p class="my-2">
        This is capstone project for an AI Engineering Bootcamp. It is application designed to combine best of human curation and RAG from official documentation to guide an Azure Kubernetes Service (AKS) customer on designing a cluster.
      </p>
      <p>
        For details, see the <a class="text-primary hover:underline" href="https://github.com/julie-ng/aks-architect-ai">https://github.com/julie-ng/aks-architect-ai</a>
      </p>

      <disclaimer-alert />
    </div>
  </UContainer>
</template>
