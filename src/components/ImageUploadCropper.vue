<script setup lang="ts">
import Cropper from 'cropperjs'
import { Delete, Upload } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { UploadFile, UploadInstance } from 'element-plus'
import { getImageUrl, uploadImage } from '@/api/images'
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

const dialogVisible = ref(false)
const imageElement = ref<HTMLImageElement>()
const uploadRef = ref<UploadInstance>()
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

function handleUploadChange(uploadFile: UploadFile): void {
  const file = uploadFile.raw
  if (!file) {
    return
  }

  if (!file.type.startsWith('image/')) {
    ElMessage.error('Select an image file.')
    return
  }

  selectedFile.value = file
  uploadRef.value?.clearFiles()
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
    ElMessage.error('Failed to crop image.')
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
    ElMessage.success('Image uploaded.')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Failed to upload image.')
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
  <div class="image-upload-cropper">
    <div v-if="hasImage && !compact" class="image-preview">
      <img :src="previewUrl" :alt="label" />
    </div>
    <div v-else-if="!compact" class="image-placeholder">
      <span>No image</span>
    </div>

    <div class="image-actions">
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :show-file-list="false"
        :limit="1"
        accept="image/jpeg,image/png,image/webp,image/gif"
        :on-change="handleUploadChange"
      >
        <el-button :icon="Upload">{{ uploadButtonLabel }}</el-button>
      </el-upload>
      <el-button v-if="hasImage && !compact" :icon="Delete" @click="removeImage">Clear</el-button>
    </div>

    <el-dialog v-model="dialogVisible" title="Crop image" width="860px" destroy-on-close>
      <div class="cropper-frame">
        <img v-if="objectUrl" ref="imageElement" :src="objectUrl" alt="" />
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="uploading" @click="uploadCroppedImage">
          Upload
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.image-upload-cropper {
  display: grid;
  gap: 10px;
}

.image-preview,
.image-placeholder {
  display: grid;
  min-height: 150px;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-fill-color-light);
}

.image-preview img {
  width: 100%;
  height: 100%;
  max-height: 220px;
  object-fit: cover;
}

.image-placeholder {
  color: var(--el-text-color-secondary);
}

.image-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cropper-frame {
  height: min(66vh, 560px);
  background: var(--el-fill-color-darker);
}

.cropper-frame img {
  display: block;
  max-width: 100%;
}
</style>
