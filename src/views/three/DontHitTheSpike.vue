<template>
  <div class="dont-hit-the-spikes" >
	<div id="dont-hit" ref="mountEl"></div>
	<div class="dont-hit-remind">
			<div class="hud">
				<h1 class="tip">按 P 暂停/继续</h1>
				<h1 class="hint">按 ↑ 键翻转重力，按空格跳跃</h1>
				<!-- <button class="leaderboard-entry" type="button" @click="showLeaderboard = true">排行榜</button> -->
				<h1 class="score">得分：{{ score }}</h1>
				<h1 class="lastScore">上次得分：{{ lastScore }}</h1>
				<h1 class="lose" :class="{ show: showLose }">你输了！</h1>
				<h1 class="paused" v-if="paused">已暂停</h1>
			</div>
	
			<div class="modal" v-if="stopped">
				<div class="modal-card">
					<h2 class="modal-title">{{ gameOver ? "游戏结束！" : "准备开始" }}</h2>
					<p class="modal-text" v-if="gameOver">得分：{{ lastScore }}</p>
					<div class="modal-actions">
						<button class="modal-btn" type="button" @click="requestStart">{{ gameOver ? "重新开始" : "开始游戏" }}</button>
						<button
							v-if="gameOver"
							class="modal-btn"
							type="button"
							:disabled="savingScore || scoreRecorded"
							@click="recordScore"
						>
							{{ recordBtnText }}
						</button>
						<button class="modal-btn" type="button" @click="showLeaderboard = true">查看排行榜</button>
					</div>
					<p v-if="recordError" class="modal-error">{{ recordError }}</p>
				</div>
			</div>
			<LeaderboardDialog :visible="showLeaderboard" @close="showLeaderboard = false" />
	</div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { DailyTimeFormat } from "@/utils/utils.js";
import { gameScoreCreateReq } from "@/apis/gameScoreApis.js";
import LeaderboardDialog from "@/views/three/components/LeaderboardDialog.vue";
import { createDontHitTheSpikeRuntime } from "@/views/three/utils/dontHitTheSpikeRuntime.js";

const mountEl = ref(null);
const score = ref(0);
const lastScore = ref(0);
const showLose = ref(false);
const paused = ref(false);
const stopped = ref(true);
const gameOver = ref(false);
const savingScore = ref(false);
const scoreRecorded = ref(false);
const lastScoreTime = ref("");
const recordError = ref("");
const showLeaderboard = ref(false);
const recordBtnText = computed(() => {
	if (scoreRecorded.value) return "已记录";
	if (savingScore.value) return "记录中...";
	return "记录分数";
});

let gameRuntime = null;

function requestStart() {
	gameRuntime?.requestStart();
}

const safeParseJson = (str) => {
	const s = String(str || "").trim();
	if (!s) return null;
	try {
		return JSON.parse(s);
	} catch {
		return null;
	}
};

const getCurrentUserId = () => {
	const userInfoObj = safeParseJson(localStorage.getItem("userInfo")) || {};
	return String(userInfoObj?.user?.id || "");
};

const recordScore = async () => {
	if (savingScore.value || scoreRecorded.value) return;
	recordError.value = "";

	const userId = getCurrentUserId();
	if (!userId) {
		ElMessage({ message: "请先登录后再记录分数", type: "warning" });
		return;
	}

	const scoreValue = Number(lastScore.value || 0);
	const scoreTime = lastScoreTime.value || DailyTimeFormat(new Date());

	savingScore.value = true;
	try {
		const res = await gameScoreCreateReq({ score: scoreValue, scoreTime, userId });
		const ok = res?.code === 0 || res?.success === true || !!res?.data;
		if (!ok) {
			const msg = res?.message || "记录失败";
			recordError.value = String(msg);
			ElMessage({ message: recordError.value, type: "error" });
			return;
		}

		scoreRecorded.value = true;
		ElMessage({ message: "分数已记录", type: "success" });
	} catch (e) {
		recordError.value = String(e?.message || "记录失败");
		ElMessage({ message: recordError.value, type: "error" });
	} finally {
		savingScore.value = false;
	}
};

onMounted(() => {
	gameRuntime = createDontHitTheSpikeRuntime({
		mountEl,
		score,
		lastScore,
		showLose,
		paused,
		stopped,
		gameOver,
		scoreRecorded,
		recordError,
		lastScoreTime,
	});
});

onUnmounted(() => {
	gameRuntime?.destroy();
	gameRuntime = null;
});
</script>

<style lang="scss">
.dont-hit-the-spikes {
	width: 100%;
	height: 100%;
	overflow: hidden;
	position: relative;
	#dont-hit{
		width: 100%;
		height: 100%;
		overflow: hidden;
		canvas {
			display: block;
		}
	}
	.dont-hit-remind{
		position: absolute;
		inset: 0;
		z-index: 2;

		.hud {
			position: absolute;
			inset: 0;
			pointer-events: none;
		}

		h1 {
			margin: 0;
			color: #fcba03;
			font-size: 1.25rem;
			text-shadow: 2px 2px rgba(0, 0, 0, 0.5);
			font-family: Arial;
		}

		.tip {
			position: absolute;
			top: 1rem;
			left: 1rem;
		}
		.hint {
			position: absolute;
			top: 3.2rem;
			left: 1rem;
			max-width: 70%;
		}
		.leaderboard-entry {
			position: absolute;
			top: 5.4rem;
			right: 1rem;
			pointer-events: auto;
			appearance: none;
			border: 1px solid rgba(252, 186, 3, 0.55);
			background: rgba(0, 0, 0, 0.25);
			color: #fcba03;
			padding: 0.45rem 0.9rem;
			border-radius: 10px;
			cursor: pointer;
			font-size: 0.95rem;
			text-shadow: none;
		}
		.leaderboard-entry:hover {
			background: rgba(252, 186, 3, 0.12);
		}
		.paused {
			position: absolute;
			top: 5.4rem;
			left: 1rem;
		}

		.score {
			position: absolute;
			top: 1rem;
			right: 1rem;
		}
		.lastScore {
			position: absolute;
			top: 3.2rem;
			right: 1rem;
		}

		.lose {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: auto;
			max-width: 100%;
			padding: 0 1rem;
			font-size: 5rem;
			text-align: center;
			opacity: 0;
			transition: opacity 0.2s ease-out;
			pointer-events: none;
		}
		.lose.show {
			opacity: 1;
		}

		.modal {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			background: rgba(0, 0, 0, 0.35);
			pointer-events: auto;
		}
		.modal-card {
			min-width: 240px;
			max-width: 80%;
			padding: 16px 18px;
			border-radius: 12px;
			background: rgba(0, 29, 69, 0.92);
			border: 1px solid rgba(252, 186, 3, 0.35);
			box-shadow: 0 10px 30px rgba(0,0,0,0.35);
			text-align: center;
		}
		.modal-title {
			margin-bottom: 0.5rem;
			font-size: 1.25rem;
			color: #fcba03;
			text-shadow: 2px 2px rgba(0, 0, 0, 0.5);
		}
		.modal-text {
			margin: 0 0 1rem 0;
			color: rgba(252, 186, 3, 0.95);
		}
		.modal-actions {
			display: flex;
			flex-direction: column;
			gap: 10px;
			align-items: stretch;
		}
		.modal-btn {
			appearance: none;
			border: 1px solid rgba(252, 186, 3, 0.55);
			background: rgba(0, 0, 0, 0.25);
			color: #fcba03;
			padding: 0.5rem 1rem;
			border-radius: 10px;
			cursor: pointer;
			font-size: 1rem;
			width: 100%;
		}
		.modal-btn:hover {
			background: rgba(252, 186, 3, 0.12);
		}
		.modal-btn:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
		.modal-error {
			margin: 0.75rem 0 0 0;
			color: rgba(255, 120, 120, 0.95);
			font-size: 0.95rem;
		}
	}
}
</style>
