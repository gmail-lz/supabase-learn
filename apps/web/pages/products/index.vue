<template>
  <main class="mobile-shell">
    <nav class="top-nav">
      <NuxtLink to="/">首页</NuxtLink>
      <NuxtLink to="/orders">我的订单</NuxtLink>
      <NuxtLink to="/admin/users">后台</NuxtLink>
    </nav>

    <header class="page-header">
      <p class="eyebrow">H5 商城</p>
      <h1>全部商品</h1>
      <p class="muted">{{ auth.isLoggedIn.value ? `当前用户：${auth.user.value?.nickname}` : '当前为游客，可浏览商品；下单时需要登录。' }}</p>
      <button class="ghost-btn" type="button" :disabled="loading" @click="loadProducts">刷新商品</button>
    </header>

    <p v-if="loading" class="muted">商品加载中...</p>
    <p v-else-if="errorMessage" class="error-text">{{ errorMessage }}</p>

    <section v-else class="product-grid">
      <article v-for="product in products" :key="product.id" class="product-card">
        <img :src="product.cover_url || fallbackCover" :alt="product.title">
        <div>
          <h2>{{ product.title }}</h2>
          <p>{{ product.subtitle }}</p>
          <strong>¥{{ minPrice(product) }}</strong>
        </div>
        <NuxtLink class="primary-btn" :to="`/products/${product.id}`">查看详情</NuxtLink>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useApiBase } from '~/composables/useApiBase'
import { useDemoAuth } from '~/composables/useDemoAuth'

interface Sku { price: number | string; status: string }
interface Product { id: string; title: string; subtitle?: string; cover_url?: string; demo_skus?: Sku[] }

const apiBase = useApiBase()
const auth = useDemoAuth()
const products = ref<Product[]>([])
const loading = ref(true)
const errorMessage = ref('')
const fallbackCover = 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=900&q=80'

function minPrice(product: Product) {
  const prices = (product.demo_skus ?? []).filter((sku) => sku.status === 'active').map((sku) => Number(sku.price))
  return prices.length ? Math.min(...prices).toFixed(2) : '0.00'
}

async function loadProducts() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<{ data: Product[] }>(`${apiBase}/api/products`, {
      query: { _t: Date.now() },
      cache: 'no-store'
    })
    products.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

onMounted(loadProducts)
</script>



