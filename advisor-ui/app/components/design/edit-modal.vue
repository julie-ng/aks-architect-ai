<script setup lang="ts">
const props = defineProps<{
  id: string
}>()

const open = defineModel<boolean>('open', { default: false })

const designsStore = useDesignsStore()
const { design } = useDesign(props.id)

const titleInput = ref('')
const descriptionInput = ref('')

watch(open, (val) => {
  if (val) {
    titleInput.value = design.value?.title ?? ''
    descriptionInput.value = design.value?.description ?? ''
  }
})

async function confirm () {
  const trimmed = titleInput.value.trim()
  if (trimmed && design.value) {
    await designsStore.update(props.id, {
      title: trimmed,
      description: descriptionInput.value.trim() || null,
    })
  }
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Edit Design"
    description="Describe your cluster"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UInput
          v-model="titleInput"
          placeholder="Design title"
          autofocus
          @keydown.enter="confirm"
        />
        <UTextarea
          v-model="descriptionInput"
          placeholder="Description (optional)"
          :rows="3"
        />
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="open = false"
          />
          <UButton label="Save" @click="confirm" />
        </div>
      </div>
    </template>
  </UModal>
</template>
