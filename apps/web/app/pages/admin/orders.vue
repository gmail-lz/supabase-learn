<template>
  <main class="admin-shell">
    <AdminNav />
    <section class="admin-panel">
      <div class="admin-header">
        <div><p class="eyebrow">Admin</p><h1>订单管理（真实 Supabase）</h1></div>
        <button class="ghost-btn" type="button" :disabled="loading" @click="loadOrders">刷新</button>
      </div>

      <p v-if="successMessage" class="success-text">{{ successMessage }}</p>
      <p v-if="loading" class="muted">加载中...</p>
      <p v-else-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <div v-else class="table-wrap">
        <table>
          <thead><tr><th>订单号</th><th>用户</th><th>商品</th><th>金额</th><th>状态</th><th>备注</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="order in orders" :key="order.id">
              <td>{{ order.order_no }}</td>
              <td>{{ order.demo_users?.nickname || '-' }}</td>
              <td>{{ order.demo_order_items?.[0]?.product_title || '-' }}</td>
              <td>¥{{ Number(order.total_amount).toFixed(2) }}</td>
              <td>
                <select v-model="order.status">
                  <option value="pending_payment">待付款</option>
                  <option value="paid">已付款</option>
                  <option value="shipped">已发货</option>
                  <option value="completed">已完成</option>
                  <option value="refund_requested">退款中</option>
                  <option value="refunded">已退款</option>
                  <option value="returned">已退货</option>
                  <option value="cancelled">已取消</option>
                </select>
              </td>
              <td><input v-model="order.remark"></td>
              <td>
                <div class="actions">
                  <button class="primary-btn small" type="button" :disabled="submitting" @click="saveOrder(order)">保存</button>
                  <button class="danger-btn small" type="button" :disabled="deletingId === order.id" @click="removeOrder(order)">
                    {{ deletingId === order.id ? '删除中...' : '删除' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AdminNav from '~/components/AdminNav.vue'
import { useApiBase } from '~/composables/useApiBase'

interface AdminOrder {
  id: string
  order_no: string
  status: string
  total_amount: number | string
  remark?: string
  demo_users?: { nickname?: string }
  demo_order_items?: { product_title?: string }[]
}

const apiBase = useApiBase()
const orders = ref<AdminOrder[]>([])
const loading = ref(true)
const submitting = ref(false)
const deletingId = ref('')
const errorMessage = ref('')
const successMessage = ref('')

async function loadOrders() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<{ data: AdminOrder[] }>(`${apiBase}/api/admin/orders`, {
      query: { _t: Date.now() }
    })
    orders.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

async function saveOrder(order: AdminOrder) {
  submitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await $fetch(`${apiBase}/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      body: { status: order.status, remark: order.remark }
    })
    successMessage.value = '订单状态已更新（Supabase 已更新）'
    await loadOrders()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    submitting.value = false
  }
}

async function removeOrder(order: AdminOrder) {
  if (typeof window !== 'undefined' && !window.confirm(`确认删除订单 ${order.order_no} 吗？`)) {
    return
  }

  deletingId.value = order.id
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await $fetch(`${apiBase}/api/admin/orders/${order.id}`, {
      method: 'DELETE'
    })
    successMessage.value = '订单已删除（Supabase 已更新）'
    await loadOrders()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    deletingId.value = ''
  }
}

onMounted(loadOrders)
</script>
