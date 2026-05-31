// src/composables/useTransferRecords.js
import { ref } from 'vue'
import { request } from './request.js'

export function useTransferRecords() {
  const records = ref([])
  const loading = ref(false)
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(10)

  async function fetchRecords() {
    loading.value = true
    try {
      const res = await request(`/api/transfer/records?page=${page.value}&pageSize=${pageSize.value}`)
      const data = await res.json()
      if (res.ok) {
        records.value = data.list || []
        total.value = data.total || 0
      } else {
        throw new Error(data.error || '获取记录失败')
      }
    } catch (err) {
      console.error('[转增记录]', err.message)
    } finally {
      loading.value = false
    }
  }

  function loadMore() {
    if (records.value.length < total.value) {
      page.value += 1
      fetchRecords()
    }
  }

  return { records, loading, total, page, fetchRecords, loadMore }
}
