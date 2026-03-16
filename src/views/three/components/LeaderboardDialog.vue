<template>
  <div v-if="visible" class="leaderboard-modal" @click.self="emit('close')">
    <div class="leaderboard-card">
      <div class="leaderboard-head">
        <h2 class="leaderboard-title">排行榜</h2>
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
        <div v-for="(item, index) in rows" :key="`${item.username}-${item.score}-${item.scoreTime}-${index}`" class="leaderboard-row">
          <span class="leaderboard-rank">{{ index + 1 }}</span>
          <span class="leaderboard-user">
            <img v-if="item.avatarUrl" :src="item.avatarUrl" :alt="item.username" class="leaderboard-avatar" />
            <span v-else class="leaderboard-avatar leaderboard-avatar-fallback">{{ item.username.slice(0, 1).toUpperCase() }}</span>
            <span class="leaderboard-name">{{ item.username }}</span>
          </span>
          <span class="leaderboard-score">{{ item.score }}</span>
          <span class="leaderboard-time">{{ item.scoreTime }}</span>
        </div>
      </div>

      <div class="leaderboard-actions">
        <button class="leaderboard-btn" type="button" :disabled="loading" @click="loadLeaderboard">刷新</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineEmits, defineProps, ref, watch } from "vue";
import { gameScoreLeaderboardReq } from "@/apis/gameScoreApis.js";
import { DailyTimeFormat } from "@/utils/utils.js";
import { globals_config } from "/public/config/globals_config";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);

const loading = ref(false);
const error = ref("");
const rawRows = ref([]);

const normalizeAvatarUrl = (url) => {
  const value = String(url || "").trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

  const base = String(globals_config?.host_service || "").replace(/\/+$/, "");
  if (!base) return value;
  if (value.startsWith("/")) return `${base}${value}`;
  return `${base}/${value}`;
};

const rows = computed(() => {
  return rawRows.value.map((item) => ({
    avatarUrl: normalizeAvatarUrl(item?.avatar),
    username: String(item?.username || "匿名玩家"),
    score: Number(item?.score || 0),
    scoreTime: item?.score_time || item?.scoreTime ? DailyTimeFormat(item?.score_time || item?.scoreTime) : "-",
  }));
});

const loadLeaderboard = async () => {
  loading.value = true;
  error.value = "";

  try {
    const res = await gameScoreLeaderboardReq();
    const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
    if (!Array.isArray(list)) {
      error.value = String(res?.message || "排行榜加载失败");
      rawRows.value = [];
      return;
    }
    rawRows.value = list;
  } catch (e) {
    rawRows.value = [];
    error.value = String(e?.message || "排行榜加载失败");
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.visible,
  (visible) => {
    if (visible) loadLeaderboard();
  }
);
</script>

<style lang="scss">
.leaderboard-modal {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  pointer-events: auto;
}

.leaderboard-card {
  min-width: min(760px, 92vw);
  max-width: 92vw;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  padding: 16px 18px;
  border-radius: 12px;
  background: rgba(0, 29, 69, 0.92);
  border: 1px solid rgba(252, 186, 3, 0.35);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  color: #fcba03;
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
  color: #fcba03;
  text-shadow: 2px 2px rgba(0, 0, 0, 0.5);
}

.leaderboard-close,
.leaderboard-btn {
  appearance: none;
  border: 1px solid rgba(252, 186, 3, 0.55);
  background: rgba(0, 0, 0, 0.25);
  color: #fcba03;
  padding: 0.45rem 0.9rem;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.95rem;
}

.leaderboard-close:hover,
.leaderboard-btn:hover {
  background: rgba(252, 186, 3, 0.12);
}

.leaderboard-close:disabled,
.leaderboard-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.leaderboard-state {
  padding: 28px 12px;
  text-align: center;
  color: rgba(252, 186, 3, 0.92);
}

.leaderboard-error {
  color: rgba(255, 120, 120, 0.95);
}

.leaderboard-list {
  overflow: auto;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.18);
}

.leaderboard-row {
  display: grid;
  grid-template-columns: 64px repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(252, 186, 3, 0.14);
  color: rgba(252, 186, 3, 0.96);
}

.leaderboard-row:last-child {
  border-bottom: none;
}

.leaderboard-row-head {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(0, 16, 40, 0.96);
  font-weight: 700;
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
  border: 1px solid rgba(252, 186, 3, 0.45);
  background: rgba(252, 186, 3, 0.14);
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
  .leaderboard-card {
    min-width: 94vw;
    padding: 14px;
  }

  .leaderboard-row {
    grid-template-columns: 52px repeat(3, minmax(0, 1fr));
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
