import { getApi, postApi } from '@/common/requests/requests.js'

// 记录游戏分数
export const gameScoreCreateReq = async (data) => {
  return await postApi('/api/game-scores', data)
}

export const gameScoreLeaderboardReq = async () => {
  return await getApi('/api/game-scores/leaderboard')
}

