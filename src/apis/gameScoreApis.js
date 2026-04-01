import { getApi, postApi } from '@/common/requests/requests.js'

// 记录游戏分数
export const gameScoreCreateReq = async (data) => {
  return await postApi('/api/game-scores', data)
}

export const gameScoreLeaderboardReq = async (params = {}) => {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.append(key, String(value))
  })

  const query = search.toString()
  const url = query ? `/api/game-scores/leaderboard?${query}` : '/api/game-scores/leaderboard'
  return await getApi(url)
}
