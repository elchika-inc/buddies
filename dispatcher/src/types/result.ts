/**
 * Result型パターン - エラーハンドリングの統一
 */

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export const Ok = <T>(data: T): Result<T> => ({ 
  success: true, 
  data 
});

export const Err = <E = Error>(error: E): Result<never, E> => ({ 
  success: false, 
  error 
});

export const isOk = <T, E>(result: Result<T, E>): result is { success: true; data: T } => {
  return result.success === true;
};

export const isErr = <T, E>(result: Result<T, E>): result is { success: false; error: E } => {
  return result.success === false;
};

// Result型のマッピング関数
export const mapResult = <T, U, E = Error>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> => {
  if (isOk(result)) {
    return Ok(fn(result.data)) as Result<U, E>;
  }
  return result as Result<U, E>;
};

// Result型のフラット化
export const flatMapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> => {
  if (isOk(result)) {
    return fn(result.data);
  }
  return result;
};