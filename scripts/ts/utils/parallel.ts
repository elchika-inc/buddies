/**
 * 並列処理のヘルパー
 */

/**
 * 並列処理の結果
 */
export interface ParallelResult<T> {
  success: boolean
  value?: T
  error?: Error
}

/**
 * 複数の非同期処理を並列実行し、全ての結果を返す
 * エラーが発生しても他の処理を継続する
 */
export async function runParallel<T>(
  tasks: Array<() => Promise<T>>
): Promise<ParallelResult<T>[]> {
  const results = await Promise.allSettled(tasks.map((task) => task()))

  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return {
        success: true,
        value: result.value,
      }
    } else {
      return {
        success: false,
        error: result.reason,
      }
    }
  })
}

/**
 * 並列処理の進捗を表示しながら実行
 */
export async function runParallelWithProgress<T>(
  tasks: Array<{ name: string; task: () => Promise<T> }>,
  onProgress?: (completed: number, total: number, name: string) => void
): Promise<ParallelResult<T>[]> {
  const total = tasks.length
  let completed = 0

  const wrappedTasks = tasks.map(({ name, task }) => async () => {
    const result = await task()
    completed++
    if (onProgress) {
      onProgress(completed, total, name)
    }
    return result
  })

  return runParallel(wrappedTasks)
}

/**
 * バッチ処理: タスクを指定サイズのバッチに分割して並列実行
 */
export async function runBatches<T>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await Promise.allSettled(batch.map((item) => processor(item)))
  }
}
