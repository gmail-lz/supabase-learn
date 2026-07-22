<template>
  <main class="mobile-shell">
    <nav class="top-nav">
      <NuxtLink to="/products">商品</NuxtLink>
      <NuxtLink to="/admin/orders">后台订单</NuxtLink>
    </nav>

    <header class="page-header">
      <p class="eyebrow">订单中心</p>
      <h1>我的订单</h1>
      <p class="muted">查看正常订单、待付款订单和退货/退款订单。</p>
      <button v-if="auth.isLoggedIn.value" class="ghost-btn" type="button" :disabled="loading" @click="loadOrders">刷新订单</button>
      <p v-if="successMessage" class="success-text">{{ successMessage }}</p>
    </header>

    <section v-if="!auth.isLoggedIn.value" class="panel empty-state">
      <h2>需要先登录</h2>
      <p class="muted">游客可以浏览商品，但查看订单和下单需要登录。</p>
      <NuxtLink class="primary-btn" :to="`/register?mode=login&redirect=${encodeURIComponent(route.fullPath)}`">去登录</NuxtLink>
    </section>

    <template v-else>
      <div class="segmented scrollable">
        <button v-for="tab in tabs" :key="tab.value" :class="{ active: activeTab === tab.value }" type="button" @click="activeTab = tab.value">
          {{ tab.label }}
        </button>
      </div>

      <p v-if="loading" class="muted">订单加载中...</p>
      <p v-else-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <section v-else-if="filteredOrders.length" class="order-list">
        <article v-for="order in filteredOrders" :key="order.id" class="order-card">
          <NuxtLink class="order-card-link" :to="`/orders/${order.id}`">
            <div>
              <span class="tag">{{ statusLabel(order.status) }}</span>
              <h2>{{ firstItem(order)?.product_title || '订单' }}</h2>
              <p class="muted">订单号：{{ order.order_no }}</p>
            </div>
            <strong>¥{{ Number(order.total_amount).toFixed(2) }}</strong>
          </NuxtLink>
          <div class="actions">
            <button
              v-if="order.status === 'pending_payment'"
              class="primary-btn small"
              type="button"
              :disabled="submittingId === order.id"
              @click="quickAction(order.id, 'pay', '支付完成')"
            >
              继续付款
            </button>
            <button
              v-if="['paid', 'shipped', 'completed'].includes(order.status)"
              class="ghost-btn small"
              type="button"
              :disabled="submittingId === order.id"
              @click="quickAction(order.id, 'refund', '已提交退款申请')"
            >
              申请退款
            </button>
          </div>
        </article>
      </section>
      <section v-else class="panel empty-state">暂无订单</section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from '#app'
import { useApiBase } from '~/composables/useApiBase'
import { useDemoAuth } from '~/composables/useDemoAuth'

interface OrderItem { product_title: string; sku_name: string }
interface Order { id: string; order_no: string; status: string; total_amount: number | string; demo_order_items?: OrderItem[] }

const route = useRoute()
const apiBase = useApiBase()
const auth = useDemoAuth()
const orders = ref<Order[]>([])
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const activeTab = ref('all')
const submittingId = ref('')
const tabs = [
  { label: '全部', value: 'all' },
  { label: '待付款', value: 'pending_payment' },
  { label: '正常', value: 'normal' },
  { label: '退货/退款', value: 'after_sale' }
]

const filteredOrders = computed(() => {
  if (activeTab.value === 'all') return orders.value
  if (activeTab.value === 'normal') return orders.value.filter((order) => ['paid', 'shipped', 'completed'].includes(order.status))
  if (activeTab.value === 'after_sale') return orders.value.filter((order) => ['refund_requested', 'refunded', 'returned'].includes(order.status))
  return orders.value.filter((order) => order.status === activeTab.value)
})

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

function firstItem(order: Order) {
  return order.demo_order_items?.[0]
}

async function loadOrders() {
  await auth.syncUser()
  if (!auth.user.value?.id) {
    orders.value = []
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<{ data: Order[] }>(`${apiBase}/api/orders`, {
      query: { userId: auth.user.value.id, _t: Date.now() }
    })
    orders.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

async function quickAction(orderId: string, action: 'pay' | 'refund', success: string) {
  await auth.syncUser()
  if (!auth.user.value?.id) return

  submittingId.value = orderId
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await $fetch(`${apiBase}/api/orders/${orderId}/${action}`, {
      method: 'POST',
      body: { userId: auth.user.value.id }
    })
    successMessage.value = success
    await loadOrders()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    submittingId.value = ''
  }
}

watch(() => auth.user.value?.id, () => {
  loadOrders()
}, { immediate: true })
</script>


