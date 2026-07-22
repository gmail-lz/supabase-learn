<template>
  <main class="mobile-shell">
    <nav class="top-nav">
      <NuxtLink to="/orders">我的订单</NuxtLink>
      <NuxtLink to="/products">继续购物</NuxtLink>
    </nav>

    <section v-if="route.query.success" class="success-banner">下单成功！这是模拟付款结果。</section>
    <p v-if="loading" class="muted">订单详情加载中...</p>
    <p v-else-if="errorMessage" class="error-text">{{ errorMessage }}</p>

    <article v-else-if="order" class="panel order-detail">
      <div class="detail-title-row">
        <div>
          <p class="eyebrow">订单详情</p>
          <h1>{{ statusLabel(order.status) }}</h1>
        </div>
        <strong>¥{{ Number(order.total_amount).toFixed(2) }}</strong>
      </div>

      <p class="muted">订单号：{{ order.order_no }}</p>
      <p class="muted">收货人：{{ order.receiver_name }} / {{ order.receiver_phone }}</p>
      <p class="muted">地址：{{ order.receiver_address }}</p>

      <section class="line-items">
        <article v-for="item in order.demo_order_items" :key="item.id" class="line-item">
          <div>
            <h2>{{ item.product_title }}</h2>
            <p class="muted">{{ item.sku_name }} × {{ item.quantity }}</p>
          </div>
          <strong>¥{{ Number(item.amount).toFixed(2) }}</strong>
        </article>
      </section>

      <div class="actions stacked-on-mobile">
        <button v-if="order.status === 'pending_payment'" class="primary-btn" type="button" :disabled="submitting" @click="pay">继续付款</button>
        <button v-if="['paid', 'shipped'].includes(order.status)" class="ghost-btn" type="button" :disabled="submitting" @click="remind">催发货</button>
        <button v-if="['paid', 'shipped', 'completed'].includes(order.status)" class="danger-btn" type="button" :disabled="submitting" @click="refund">申请退款</button>
        <button class="ghost-btn" type="button" :disabled="loading" @click="loadOrder">刷新订单</button>
      </div>
      <p v-if="message" class="success-text">{{ message }}</p>
    </article>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { navigateTo, useRoute } from '#app'
import { useApiBase } from '~/composables/useApiBase'
import { useDemoAuth } from '~/composables/useDemoAuth'

interface OrderItem { id: string; product_title: string; sku_name: string; quantity: number; amount: number | string }
interface Order {
  id: string
  order_no: string
  status: string
  total_amount: number | string
  receiver_name?: string
  receiver_phone?: string
  receiver_address?: string
  demo_order_items?: OrderItem[]
}

const route = useRoute()
const apiBase = useApiBase()
const auth = useDemoAuth()
const order = ref<Order | null>(null)
const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const message = ref('')
const orderId = computed(() => Array.isArray(route.params.id) ? route.params.id[0] : String(route.params.id))

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending_payment: '待付款',
    paid: '已付款',
    shipped: '已发货',
    completed: '已完成',
    refund_requested: '退款中',
    refunded: '已退款',
    returned: '已退货',
    cancelled: '已取消'
  }
  return map[status] ?? status
}

async function loadOrder() {
  await auth.syncUser()
  const userId = auth.user.value?.id
  if (!userId) {
    await navigateTo(`/register?mode=login&redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<{ data: Order }>(`${apiBase}/api/orders/${orderId.value}`, {
      query: { userId, _t: Date.now() }
    })
    order.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

async function action(path: string, fallbackMessage: string) {
  await auth.syncUser()
  const userId = auth.user.value?.id
  if (!userId) {
    await navigateTo(`/register?mode=login&redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }

  submitting.value = true
  message.value = ''
  try {
    const response = await $fetch<{ data: Order; message?: string }>(`${apiBase}/api/orders/${orderId.value}/${path}`, {
      method: 'POST',
      body: { userId }
    })
    order.value = response.data
    message.value = response.message ?? fallbackMessage
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    submitting.value = false
  }
}

function pay() {
  return action('pay', '付款成功')
}

function remind() {
  return action('remind', '已催发货')
}

function refund() {
  return action('refund', '退款申请已提交')
}

watch([orderId, () => auth.user.value?.id], () => {
  loadOrder()
}, { immediate: true })
</script>


