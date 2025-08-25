-- 全ペットの画像フラグをリセット
UPDATE pets 
SET 
  has_jpeg = 0,
  has_webp = 0,
  image_checked_at = NULL,
  screenshot_requested_at = NULL,
  screenshot_completed_at = NULL
WHERE 1=1;
