<template>
  <main class="admin-shell">
    <AdminNav />
    <section class="admin-panel">
      <div class="admin-header">
        <div><p class="eyebrow">Admin</p><h1>商品 / SKU 管理（真实 Supabase）</h1></div>
        <button class="ghost-btn" type="button" :disabled="loading" @click="loadProducts">刷新</button>
      </div>

      <form class="admin-form" @submit.prevent="createProduct">
        <input v-model="newProduct.title" placeholder="商品名称" required>
        <input v-model="newProduct.subtitle" placeholder="副标题">
        <input v-model="newProduct.sku_name" placeholder="默认 SKU" required>
        <input v-model.number="newProduct.price" min="0" placeholder="价格" type="number">
        <input v-model.number="newProduct.stock" min="0" placeholder="库存" type="number">
        <button class="primary-btn small" type="submit" :disabled="submitting">新增商品</button>
      </form>

      <p v-if="successMessage" class="success-text">{{ successMessage }}</p>
      <p v-if="loading" class="muted">加载中...</p>
      <p v-else-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <section v-else class="admin-card-list">
        <article v-for="product in products" :key="product.id" class="admin-card">
          <div class="admin-card-head">
            <div>
              <input v-model="product.title" class="title-input">
              <input v-model="product.subtitle" placeholder="副标题">
            </div>
            <select v-model="product.status">
              <option value="on_sale">上架</option>
              <option value="off_sale">下架</option>
            </select>
          </div>
          <textarea v-model="product.description" placeholder="描述" />

          <div class="actions">
            <button class="primary-btn small" type="button" :disabled="submitting" @click="saveProduct(product)">保存商品</button>
            <button class="danger-btn small" type="button" :disabled="deletingProductId === product.id" @click="removeProduct(product)">
              {{ deletingProductId === product.id ? '删除中...' : '删除商品' }}
            </button>
          </div>

          <div class="sku-admin-list">
            <article v-for="sku in product.demo_skus" :key="sku.id" class="sku-admin-row">
              <input v-model="sku.sku_name">
              <input v-model.number="sku.price" min="0" type="number">
              <input v-model.number="sku.stock" min="0" type="number">
              <select v-model="sku.status">
                <option value="active">启用</option>
                <option value="disabled">禁用</option>
              </select>
              <button class="ghost-btn small" type="button" :disabled="submitting" @click="saveSku(sku)">保存 SKU</button>
              <button class="danger-btn small" type="button" :disabled="deletingSkuId === sku.id" @click="removeSku(sku)">
                {{ deletingSkuId === sku.id ? '删除中...' : '删除 SKU' }}
              </button>
            </article>
          </div>

          <form class="admin-form" @submit.prevent="createSku(product.id)">
            <input v-model="skuDraft(product.id).sku_name" placeholder="新 SKU 名称" required>
            <input v-model.number="skuDraft(product.id).price" min="0" type="number" placeholder="价格">
            <input v-model.number="skuDraft(product.id).stock" min="0" type="number" placeholder="库存">
            <button class="primary-btn small" type="submit" :disabled="submitting">新增 SKU</button>
          </form>
        </article>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import AdminNav from '~/components/AdminNav.vue'
import { useApiBase } from '~/composables/useApiBase'

interface Sku { id: string; sku_name: string; price: number | string; stock: number; status: 'active' | 'disabled' }
interface Product { id: string; title: string; subtitle?: string; description?: string; status: 'on_sale' | 'off_sale'; demo_skus?: Sku[] }
interface DeleteResponse { message?: string; softDeleted?: boolean; deleted?: boolean }

const apiBase = useApiBase()
const products = ref<Product[]>([])
const loading = ref(true)
const submitting = ref(false)
const deletingProductId = ref('')
const deletingSkuId = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const newProduct = reactive({ title: '', subtitle: '', sku_name: '标准版', price: 99, stock: 100 })
const newSkuByProduct = reactive<Record<string, { sku_name: string; price: number; stock: number }>>({})

function skuDraft(productId: string) {
  if (!newSkuByProduct[productId]) {
    newSkuByProduct[productId] = { sku_name: '新规格', price: 99, stock: 50 }
  }
  return newSkuByProduct[productId]
}

function resetSkuDraft(productId: string) {
  newSkuByProduct[productId] = { sku_name: '新规格', price: 99, stock: 50 }
}

async function loadProducts() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<{ data: Product[] }>(`${apiBase}/api/admin/products`, {
      query: { _t: Date.now() }
    })
    products.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

async function createProduct() {
  submitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await $fetch(`${apiBase}/api/admin/products`, { method: 'POST', body: newProduct })
    Object.assign(newProduct, { title: '', subtitle: '', sku_name: '标准版', price: 99, stock: 100 })
    successMessage.value = '商品创建成功（已写入 Supabase）'
    await loadProducts()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    submitting.value = false
  }
}

async function saveProduct(product: Product) {
  submitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await $fetch(`${apiBase}/api/admin/products/${product.id}`, {
      method: 'PATCH',
      body: { title: product.title, subtitle: product.subtitle, description: product.description, status: product.status }
    })
    successMessage.value = '商品信息已保存（Supabase 已更新）'
    await loadProducts()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    submitting.value = false
  }
}

async function removeProduct(product: Product) {
  if (typeof window !== 'undefined' && !window.confirm(`确认删除商品「${product.title}」吗？`)) {
    return
  }

  deletingProductId.value = product.id
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await $fetch<DeleteResponse>(`${apiBase}/api/admin/products/${product.id}`, {
      method: 'DELETE'
    })
    successMessage.value = response.message ?? '商品已删除'
    await loadProducts()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    deletingProductId.value = ''
  }
}

async function createSku(productId: string) {
  submitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const draft = skuDraft(productId)
    await $fetch(`${apiBase}/api/admin/products/${productId}/skus`, {
      method: 'POST',
      body: {
        sku_name: draft.sku_name,
        price: Number(draft.price),
        stock: Number(draft.stock),
        status: 'active'
      }
    })
    resetSkuDraft(productId)
    successMessage.value = 'SKU 创建成功（已写入 Supabase）'
    await loadProducts()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    submitting.value = false
  }
}

async function saveSku(sku: Sku) {
  submitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await $fetch(`${apiBase}/api/admin/skus/${sku.id}`, {
      method: 'PATCH',
      body: { sku_name: sku.sku_name, price: Number(sku.price), stock: Number(sku.stock), status: sku.status }
    })
    successMessage.value = 'SKU 已保存（Supabase 已更新）'
    await loadProducts()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    submitting.value = false
  }
}

async function removeSku(sku: Sku) {
  if (typeof window !== 'undefined' && !window.confirm(`确认删除 SKU「${sku.sku_name}」吗？`)) {
    return
  }

  deletingSkuId.value = sku.id
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await $fetch<DeleteResponse>(`${apiBase}/api/admin/skus/${sku.id}`, {
      method: 'DELETE'
    })
    successMessage.value = response.message ?? 'SKU 已删除'
    await loadProducts()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    deletingSkuId.value = ''
  }
}

onMounted(loadProducts)
</script>
