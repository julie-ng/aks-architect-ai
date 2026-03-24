<script setup lang="ts">
const props = defineProps<{
  id: string
}>()

const designsStore = useDesignsStore()

const design = computed(() => designsStore.getDesign(props.id))

const renameOpen = ref(false)
const renameInput = ref('')
const deleteOpen = ref(false)

const actionItems = [[
  {
    label: 'Rename',
    icon: 'i-lucide-pencil',
    onSelect () {
      renameInput.value = design.value?.title ?? ''
      renameOpen.value = true
    },
  },
  {
    label: 'Delete',
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect () {
      deleteOpen.value = true
    },
  },
]]

async function confirmRename () {
  const trimmed = renameInput.value.trim()
  if (trimmed) {
    const record = designsStore.getRecord(props.id)
    if (record) {
      record.title.value = trimmed
      await record.save()
    }
  }
  renameOpen.value = false
}

async function confirmDelete () {
  const record = designsStore.getRecord(props.id)
  await record?.delete()
  deleteOpen.value = false
}
</script>

<template>
  <UCard v-if="design" class="my-6">
    <template #header>
      <div class="flex items-center justify-between">
        <h1 class="font-bold">
          <NuxtLink :to="designsStore.getPathById(id)" class="text-primary">
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

    <div class="text-sm">
      {{ design.description }}
    </div>
    <p class="text-xs text-muted">
      Last Updated {{ new Date(design.updatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }}
    </p>
  </UCard>

  <UModal
    v-model:open="renameOpen"
    title="Rename"
    description="Enter a new name"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UInput
          v-model="renameInput"
          placeholder="Design title"
          autofocus
          @keydown.enter="confirmRename"
        />
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="renameOpen = false"
          />
          <UButton label="Rename" @click="confirmRename" />
        </div>
      </div>
    </template>
  </UModal>

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
