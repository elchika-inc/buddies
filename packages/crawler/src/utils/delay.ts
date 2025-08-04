/**
 * 指定されたミリ秒数だけ待機する
 * @param ms 待機時間（ミリ秒）
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * ランダムな遅延を生成する（指定された範囲内）
 * @param minMs 最小待機時間（ミリ秒）
 * @param maxMs 最大待機時間（ミリ秒）
 */
export const randomDelay = (minMs: number, maxMs: number): Promise<void> => {
  const ms = Math.random() * (maxMs - minMs) + minMs;
  return delay(Math.floor(ms));
};