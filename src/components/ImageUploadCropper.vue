<script setup lang="ts">
import Cropper from 'cropperjs'
import { Trash2, Upload } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { getImageUrl, uploadImage } from '@/api/images'
import { useToast } from '@/composables/useToast'
import type { ImagePurpose, ImageResponse } from '@/types/api'

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    purpose: ImagePurpose
    label: string
    aspectRatio?: number
    outputWidth?: number
    outputHeight?: number
    compact?: boolean
    buttonLabel?: string
  }>(),
  {
    aspectRatio: Number.NaN,
    outputWidth: undefined,
    outputHeight: undefined,
    compact: false,
    buttonLabel: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  uploaded: [image: ImageResponse]
}>()

const toast = useToast()
const dialogVisible = ref(false)
const imageElement = ref<HTMLImageElement>()
const fileInput = ref<HTMLInputElement>()
const objectUrl = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
let cropper: Cropper | null = null

const previewUrl = computed(() => (props.modelValue ? getImageUrl(props.modelValue) : ''))
const hasImage = computed(() => !!props.modelValue)
const uploadButtonLabel = computed(() => props.buttonLabel ?? (hasImage.value ? 'Replace' : 'Upload'))

watch(dialogVisible, async (visible) => {
  if (visible) {
    await nextTick()
    initializeCropper()
    return
  }

  destroyCropper()
})

onBeforeUnmount(() => {
  destroyCropper()
  revokeObjectUrl()
})

function openFilePicker(): void {
  fileInput.value?.click()
}

function handleFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  input.value = ''

  if (!file) {
    return
  }

  if (!file.type.startsWith('image/')) {
    toast.error('Select an image file.')
    return
  }

  selectedFile.value = file
  revokeObjectUrl()
  objectUrl.value = URL.createObjectURL(file)
  dialogVisible.value = true
}

async function uploadCroppedImage(): Promise<void> {
  if (!cropper || !selectedFile.value) {
    return
  }

  const canvas = cropper.getCroppedCanvas({
    width: props.outputWidth,
    height: props.outputHeight,
    fillColor: '#fff',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
  })
  if (!canvas) {
    toast.error('Failed to crop image.')
    return
  }

  uploading.value = true

  try {
    const mimeType = getOutputMimeType(selectedFile.value.type)
    const blob = await canvasToBlob(canvas, mimeType)
    const file = new File([blob], buildOutputFileName(selectedFile.value.name, mimeType), {
      type: mimeType,
    })
    const image = await uploadImage(file, props.purpose)

    emit('update:modelValue', image.id)
    emit('uploaded', image)
    dialogVisible.value = false
    toast.success('Image uploaded.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to upload image.')
  } finally {
    uploading.value = false
  }
}

function removeImage(): void {
  emit('update:modelValue', null)
}

function initializeCropper(): void {
  if (!imageElement.value) {
    return
  }

  destroyCropper()
  cropper = new Cropper(imageElement.value, {
    aspectRatio: props.aspectRatio,
    viewMode: 1,
    dragMode: 'move',
    autoCropArea: 0.9,
    responsive: true,
    restore: false,
    background: false,
  })
}

function destroyCropper(): void {
  cropper?.destroy()
  cropper = null
}

function revokeObjectUrl(): void {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = null
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
          return
        }

        reject(new Error('Failed to prepare cropped image.'))
      },
      mimeType,
      0.9,
    )
  })
}

function getOutputMimeType(inputMimeType: string): string {
  return inputMimeType === 'image/png' || inputMimeType === 'image/webp'
    ? inputMimeType
    : 'image/jpeg'
}

function buildOutputFileName(fileName: string, mimeType: string): string {
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
  const baseName = fileName.replace(/\.[^.]+$/, '').trim() || props.purpose.toLowerCase()
  return `${baseName}-${props.purpose.toLowerCase()}.${extension}`
}
</script>

<template>
  <div class="grid gap-3">
    <div
      v-if="hasImage && !compact"
      class="grid min-h-40 overflow-hidden rounded-xl border border-mist-50/10 bg-[#303030] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
    >
      <img :src="previewUrl" :alt="label" class="h-full max-h-56 w-full object-cover">
    </div>
    <div
      v-else-if="!compact"
      class="grid min-h-40 place-items-center rounded-xl border border-mist-50/10 bg-[#303030] text-sm font-semibold text-mist-300"
    >
      No image
    </div>

    <div class="flex flex-wrap gap-2">
      <input
        ref="fileInput"
        class="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        @change="handleFileChange"
      >
      <button type="button" class="button" @click="openFilePicker">
        <Upload class="h-4 w-4" />
        {{ uploadButtonLabel }}
      </button>
      <button v-if="hasImage && !compact" type="button" class="button" @click="removeImage">
        <Trash2 class="h-4 w-4" />
        Clear
      </button>
    </div>

    <Teleport to="body">
      <div v-if="dialogVisible" class="fixed inset-0 z-[60] grid place-items-center bg-[#1d1d1d]/70 p-4 backdrop-blur-[6px]">
        <section
          class="grid w-[min(100%,54rem)] gap-5 rounded-xl border border-mist-50/12 bg-[#252525] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="crop-dialog-title"
        >
          <h2 id="crop-dialog-title" class="font-display text-2xl font-bold leading-none text-mist-50">Crop image</h2>
          <div class="h-[min(66vh,35rem)] overflow-hidden rounded-xl bg-ink-950">
            <img v-if="objectUrl" ref="imageElement" :src="objectUrl" alt="" class="block max-w-full">
          </div>
          <div class="flex flex-wrap justify-end gap-2">
            <button type="button" class="button" @click="dialogVisible = false">Cancel</button>
            <button type="button" class="button button-primary" :disabled="uploading" @click="uploadCroppedImage">
              <span v-if="uploading" class="h-4 w-4 animate-spin rounded-full border-2 border-brass-100/70 border-t-transparent" />
              Upload
            </button>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>
