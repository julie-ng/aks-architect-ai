<script setup lang="ts">
const props = defineProps<{
  id: string
}>()

const { design } = useDesign(props.id)

const editOpen = ref(false)
const deleteOpen = ref(false)

const actionItems = [[
  {
    label: 'Edit',
    icon: 'i-lucide-pencil',
    onSelect () { editOpen.value = true },
  },
  {
    label: 'Delete',
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect () { deleteOpen.value = true },
  },
]]

async function confirmDelete () {
  if (design.value) {
    await design.value.delete()
  }
  deleteOpen.value = false
}
</script>

<template>
  <UCard v-if="design" class="my-6">
    <template #header>
      <div class="flex items-center justify-between">
        <h1 class="font-bold">
          <NuxtLink :to="design.path" class="text-primary">
            {{ design.title }}
          </NuxtLink>
        </h1>
        <UDropdownMenu :items="actionItems">
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            size="xs"
            class="cursor-pointer"
          />
        </UDropdownMenu>
      </div>
    </template>

    <div class="mb-2 text-sm">
      {{ design.description }}
    </div>
    <p class="text-xs text-muted">
      Last Updated {{ new Date(design.updatedAt!).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }}
    </p>
  </UCard>

  <DesignEditModal :id="id" v-model:open="editOpen" />

  <UModal v-model:open="deleteOpen" title="Confirm Deletion">
    <template #body>
      <div class="flex flex-col gap-4">
        <p>Are you sure you want to delete "{{ design?.title }}"?</p>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="soft"
            class="cursor-pointer"
            @click="deleteOpen = false"
          />
          <UButton
            label="Delete"
            color="error"
            class="cursor-pointer"
            @click="confirmDelete" />
        </div>
      </div>
    </template>
  </UModal>
</template>
