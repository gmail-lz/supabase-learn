<template>
  <main class="mobile-shell">
    <nav class="top-nav">
      <NuxtLink to="/products">商品</NuxtLink>
      <NuxtLink to="/orders">我的订单</NuxtLink>
      <button v-if="auth.isLoggedIn.value" class="link-btn compact" type="button" @click="auth.logout()">退出登录</button>
      <NuxtLink v-else to="/register?redirect=/products">登录</NuxtLink>
    </nav>

    <p v-if="loading" class="muted">详情加载中...</p>
    <p v-else-if="errorMessage" class="error-text">{{ errorMessage }}</p>

    <article v-else-if="product" class="detail-card">
      <img class="detail-cover" :src="product.cover_url || fallbackCover" :alt="product.title">
      <div class="detail-content">
        <p class="eyebrow">商品详情</p>
        <h1>{{ product.title }}</h1>
        <p class="muted">{{ product.subtitle }}</p>
        <p>{{ product.description }}</p>

        <section class="sku-box">
          <h2>选择 SKU</h2>
          <div class="sku-list">
            <button
              v-for="sku in activeSkus"
              :key="sku.id"
              type="button"
              :class="['sku-pill', { active: selectedSkuId === sku.id }]"
              @click="selectedSkuId = sku.id"
            >
              <span>{{ sku.sku_name }}</span>
              <strong>¥{{ Number(sku.price).toFixed(2) }}</strong>
              <small>库存 {{ sku.stock }}</small>
            </button>
          </div>
        </section>

        <label class="quantity-row">
          数量
          <input v-model.number="quantity" min="1" type="number">
        </label>

        <div class="payment-card">
          <h2>模拟付款</h2>
          <p class="muted">立即付款会创建已付款订单并跳转订单详情；稍后付款会创建/复用待付款订单并留在商品详情。</p>
          <div class="actions stacked-on-mobile">
            <button class="primary-btn" type="button" :disabled="submitting" @click="checkout('pay_now')">立即付款</button>
            <button class="ghost-btn" type="button" :disabled="submitting" @click="checkout('pay_later')">稍后付款</button>
            <button class="ghost-btn" type="button" :disabled="loading" @click="loadProduct">刷新详情</button>
          </div>
          <p v-if="successMessage" class="success-text">{{ successMessage }}</p>
        </div>
      </div>
    </article>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { navigateTo, useRoute } from '#app'
import { useApiBase } from '~/composables/useApiBase'
import { useDemoAuth } from '~/composables/useDemoAuth'

interface Sku { id: string; sku_name: string; price: number | string; stock: number; status: string }
interface Product { id: string; title: string; subtitle?: string; description?: string; cover_url?: string; demo_skus?: Sku[] }
interface OrderResponse { data: { id: string }; reusedPending?: boolean; paid?: boolean }

const route = useRoute()
const apiBase = useApiBase()
const auth = useDemoAuth()
const product = ref<Product | null>(null)
const selectedSkuId = ref('')
const quantity = ref(1)
const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const fallbackCover = 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=900&q=80'

const productId = computed(() => Array.isArray(route.params.id) ? route.params.id[0] : String(route.params.id))
const activeSkus = computed(() => (product.value?.demo_skus ?? []).filter((sku) => sku.status === 'active'))
const selectedSku = computed(() => activeSkus.value.find((sku) => sku.id === selectedSkuId.value))

async function loadProduct() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await $fetch<{ data: Product }>(`${apiBase}/api/products/${productId.value}`, {
      query: { _t: Date.now() },
      cache: 'no-store'
    })
    product.value = response.data
    if (!selectedSkuId.value || !activeSkus.value.find((sku) => sku.id === selectedSkuId.value)) {
      selectedSkuId.value = activeSkus.value[0]?.id ?? ''
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

async function checkout(paymentAction: 'pay_now' | 'pay_later') {
  await auth.syncUser()
  if (!auth.isLoggedIn.value || !auth.user.value?.id) {
    return navigateTo(`/register?mode=login&redirect=${encodeURIComponent(route.fullPath)}`)
  }
  if (!selectedSku.value) {
    errorMessage.value = '请先选择 SKU'
    return
  }

  const buyQty = Math.max(1, Number(quantity.value || 1))
  if (buyQty > Number(selectedSku.value.stock)) {
    errorMessage.value = '购买数量超过库存，请调整后再试'
    return
  }

  submitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await $fetch<OrderResponse>(`${apiBase}/api/orders`, {
      method: 'POST',
      body: {
        userId: auth.user.value.id,
        skuId: selectedSku.value.id,
        quantity: buyQty,
        paymentAction
      }
    })

    if (paymentAction === 'pay_now') {
      successMessage.value = response.reusedPending ? '已继续待付款订单并完成付款' : '下单成功，已模拟付款'
      await navigateTo(`/orders/${response.data.id}?success=1`)
      return
    }

    successMessage.value = response.reusedPending
      ? '发现同 SKU 待付款订单，已继续原订单流程，可稍后在“我的订单”中付款。'
      : '已生成待付款订单，可在“我的订单”中继续付款。'

    await loadProduct()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    submitting.value = false
  }
}

watch(productId, () => {
  loadProduct()
}, { immediate: true })
</script>



