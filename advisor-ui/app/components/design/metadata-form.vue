<script setup lang="ts">
const props = defineProps<{
  loading?: boolean
  submitLabel?: string
}>()

const title = defineModel<string>('title', { default: '' })
const description = defineModel<string>('description', { default: '' })

const emit = defineEmits<{
  submit: []
}>()
</script>

<template>
  <div class="space-y-3 w-full max-w-lg">
    <UFormField label="Title" class="mb-6" required>
      <UInput
        v-model="title"
        placeholder="Name for your design"
        size="lg"
        class="w-full" />
    </UFormField>

    <UFormField label="Description" class="mb-3">
      <UTextarea
        v-model="description"
        placeholder="Description (optional)"
        :rows="4"
        size="lg"
        class="w-full"
        autoresize />
    </UFormField>

    <div class="mt-6">
      <UButton
        :label="props.submitLabel ?? 'Next'"
        trailing-icon="i-lucide-arrow-right"
        :loading="props.loading"
        class="cursor-pointer"
        size="lg"
        color="primary"
        @click="emit('submit')"
      />
    </div>
  </div>
</template>
