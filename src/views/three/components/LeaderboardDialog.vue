<template>
  <div
    v-if="visible"
    class="leaderboard-modal"
    :class="[`leaderboard-modal--${variant}`]"
    @click.self="emit('close')"
  >
    <div class="leaderboard-card" :class="[`leaderboard-card--${variant}`]">
      <div class="leaderboard-head">
        <h2 class="leaderboard-title">排行榜 TOP {{ normalizedLimit }}</h2>
        <button class="leaderboard-close" type="button" @click="emit('close')">关闭</button>
      </div>

      <div v-if="loading" class="leaderboard-state">加载中...</div>
      <div v-else-if="error" class="leaderboard-state leaderboard-error">{{ error }}</div>
      <div v-else-if="!rows.length" class="leaderboard-state">暂无排行榜数据</div>
      <div v-else class="leaderboard-list">
        <div class="leaderboard-row leaderboard-row-head">
          <span>排名</span>
          <span>玩家</span>
          <span>分数</span>
          <span>时间</span>
        </div>
        <div
          v-for="(item, index) in rows"
          :key="`${item.username}-${item.score}-${item.scoreTime}-${index}`"
          class="leaderboard-row"
        >
          <span class="leaderboard-rank">{{ index + 1 }}</span>
          <span class="leaderboard-user">
            <img
              v-if="item.avatarUrl"
              :src="item.avatarUrl"
              :alt="item.username"
              class="leaderboard-avatar"
            />
            <span v-else class="leaderboard-avatar leaderboard-avatar-fallback">
              {{ item.username.slice(0, 1).toUpperCase() }}
            </span>
            <span class="leaderboard-name">{{ item.username }}</span>
          </span>
          <span class="leaderboard-score">{{ item.score }}</span>
          <span class="leaderboard-time">{{ item.scoreTime }}</span>
        </div>
      </div>

      <div class="leaderboard-actions">
        <button class="leaderboard-btn" type="button" :disabled="loading" @click="loadLeaderboard">
          刷新
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineEmits, defineProps, ref, watch } from 'vue'
import { gameScoreLeaderboardReq } from '@/apis/gameScoreApis.js'
import { DailyTimeFormat } from '@/utils/utils.js'
import { globals_config } from '/public/config/globals_config'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  gameCode: {
    type: [String, Number],
    default: '',
  },
  limit: {
    type: Number,
    default: 10,
  },
  variant: {
    type: String,
    default: 'dark',
  },
})

const emit = defineEmits(['close'])

const loading = ref(false)
const error = ref('')
const rawRows = ref([])

const normalizedLimit = computed(() => {
  const value = Number(props.limit || 10)
  if (!Number.isFinite(value)) return 10
  return Math.max(1, Math.min(100, Math.floor(value)))
})

const normalizeAvatarUrl = (url) => {
  const value = String(url || '').trim()
  if (!value) return ''
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value
  }

  const base = String(globals_config?.host_service || '').replace(/\/+$/, '')
  if (!base) return value
  if (value.startsWith('/')) return `${base}${value}`
  return `${base}/${value}`
}

const rows = computed(() => {
  return rawRows.value.map((item) => ({
    avatarUrl: normalizeAvatarUrl(item?.avatar),
    username: String(item?.username || '匿名玩家'),
    score: Number(item?.score || 0),
    scoreTime: item?.score_time || item?.scoreTime
      ? DailyTimeFormat(item?.score_time || item?.scoreTime)
      : '-',
  }))
})

const loadLeaderboard = async () => {
  loading.value = true
  error.value = ''

  try {
    const res = await gameScoreLeaderboardReq({
      gameCode: props.gameCode,
      limit: normalizedLimit.value,
    })
    const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : [])
    if (!Array.isArray(list)) {
      error.value = String(res?.message || '排行榜加载失败')
      rawRows.value = []
      return
    }
    rawRows.value = list
  } catch (e) {
    rawRows.value = []
    error.value = String(e?.message || '排行榜加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) loadLeaderboard()
  }
)

watch(
  () => props.gameCode,
  () => {
    rawRows.value = []
    error.value = ''
    if (props.visible) loadLeaderboard()
  }
)
</script>

<style lang="scss">
.leaderboard-modal {
  position: absolute;
  inset: 0;
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  pointer-events: auto;
}

.leaderboard-modal--dark {
  background: rgba(0, 0, 0, 0.35);
}

.leaderboard-modal--graffiti {
  background: rgba(244, 240, 218, 0.55);
  backdrop-filter: blur(5px);
}

.leaderboard-card {
  min-width: min(760px, 92vw);
  max-width: 92vw;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  padding: 16px 18px;
  border-radius: 12px;
}

.leaderboard-card--dark {
  background: rgba(0, 29, 69, 0.92);
  border: 1px solid rgba(252, 186, 3, 0.35);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  color: #fcba03;
}

.leaderboard-card--graffiti {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(251, 246, 214, 0.96));
  border: 3px solid rgba(49, 68, 40, 0.12);
  box-shadow: 0 24px 54px rgba(74, 98, 55, 0.16);
  color: #314428;
}

.leaderboard-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.leaderboard-title {
  margin: 0;
  font-size: 1.25rem;
}

.leaderboard-card--dark .leaderboard-title {
  color: #fcba03;
  text-shadow: 2px 2px rgba(0, 0, 0, 0.5);
}

.leaderboard-card--graffiti .leaderboard-title {
  color: #314428;
}

.leaderboard-close,
.leaderboard-btn {
  appearance: none;
  padding: 0.45rem 0.9rem;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.95rem;
}

.leaderboard-card--dark .leaderboard-close,
.leaderboard-card--dark .leaderboard-btn {
  border: 1px solid rgba(252, 186, 3, 0.55);
  background: rgba(0, 0, 0, 0.25);
  color: #fcba03;
}

.leaderboard-card--graffiti .leaderboard-close,
.leaderboard-card--graffiti .leaderboard-btn {
  border: 1px solid rgba(73, 99, 43, 0.18);
  background: rgba(255, 252, 238, 0.88);
  color: #314428;
  box-shadow: 0 12px 26px rgba(74, 98, 55, 0.12);
}

.leaderboard-card--dark .leaderboard-close:hover,
.leaderboard-card--dark .leaderboard-btn:hover {
  background: rgba(252, 186, 3, 0.12);
}

.leaderboard-card--graffiti .leaderboard-close:hover,
.leaderboard-card--graffiti .leaderboard-btn:hover {
  background: rgba(255, 238, 210, 0.95);
}

.leaderboard-close:disabled,
.leaderboard-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.leaderboard-state {
  padding: 28px 12px;
  text-align: center;
}

.leaderboard-card--dark .leaderboard-state {
  color: rgba(252, 186, 3, 0.92);
}

.leaderboard-card--graffiti .leaderboard-state {
  color: rgba(49, 68, 40, 0.78);
}

.leaderboard-error {
  color: rgba(255, 120, 120, 0.95);
}

.leaderboard-list {
  overflow: auto;
  border-radius: 10px;
}

.leaderboard-card--dark .leaderboard-list {
  background: rgba(0, 0, 0, 0.18);
}

.leaderboard-card--graffiti .leaderboard-list {
  background: rgba(255, 252, 238, 0.76);
  box-shadow: inset 0 0 0 1px rgba(73, 99, 43, 0.08);
}

.leaderboard-row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1.4fr) 96px minmax(0, 1.2fr);
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
}

.leaderboard-card--dark .leaderboard-row {
  border-bottom: 1px solid rgba(252, 186, 3, 0.14);
  color: rgba(252, 186, 3, 0.96);
}

.leaderboard-card--graffiti .leaderboard-row {
  border-bottom: 1px solid rgba(73, 99, 43, 0.08);
  color: #314428;
}

.leaderboard-row:last-child {
  border-bottom: none;
}

.leaderboard-row-head {
  position: sticky;
  top: 0;
  z-index: 1;
  font-weight: 700;
}

.leaderboard-card--dark .leaderboard-row-head {
  background: rgba(0, 16, 40, 0.96);
}

.leaderboard-card--graffiti .leaderboard-row-head {
  background: rgba(251, 246, 214, 0.96);
}

.leaderboard-user {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.leaderboard-avatar {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  object-fit: cover;
  flex: none;
}

.leaderboard-card--dark .leaderboard-avatar {
  border: 1px solid rgba(252, 186, 3, 0.45);
  background: rgba(252, 186, 3, 0.14);
}

.leaderboard-card--graffiti .leaderboard-avatar {
  border: 1px solid rgba(73, 99, 43, 0.18);
  background: rgba(156, 224, 77, 0.18);
}

.leaderboard-avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.leaderboard-name,
.leaderboard-time {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leaderboard-rank,
.leaderboard-score {
  font-weight: 700;
}

.leaderboard-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

@media (max-width: 720px) {
  .leaderboard-modal {
    padding: 14px;
  }

  .leaderboard-card {
    min-width: 94vw;
    padding: 14px;
  }

  .leaderboard-row {
    grid-template-columns: 48px minmax(0, 1.2fr) 72px minmax(0, 1fr);
    gap: 8px;
    padding: 10px;
    font-size: 0.9rem;
  }

  .leaderboard-avatar {
    width: 30px;
    height: 30px;
  }
}
</style>
