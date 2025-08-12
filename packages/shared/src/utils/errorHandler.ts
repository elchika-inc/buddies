/**
 * 統一されたエラーハンドリングユーティリティ
 */

/**
 * エラーオブジェクトを統一されたエラーメッセージに正規化
 */
export const normalizeError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message)
  }
  
  return 'エラーが発生しました'
}

/**
 * GraphQLエラーを正規化
 */
export const normalizeGraphQLError = (error: unknown): string => {
  // Apollo Client の GraphQLError 形式をチェック
  if (error && typeof error === 'object' && 'graphQLErrors' in error) {
    const graphQLError = error as { graphQLErrors: Array<{ message: string }> }
    if (graphQLError.graphQLErrors.length > 0) {
      return graphQLError.graphQLErrors[0].message
    }
  }
  
  return normalizeError(error)
}

/**
 * APIエラーを正規化
 */
export const normalizeApiError = (error: unknown, defaultMessage = 'APIエラーが発生しました'): string => {
  if (error instanceof Response) {
    return `HTTP ${error.status}: ${error.statusText}`
  }
  
  return normalizeError(error) || defaultMessage
}