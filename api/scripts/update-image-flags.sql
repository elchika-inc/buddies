UPDATE pets 
SET has_jpeg = 1, has_webp = 1 
WHERE image_url IS NOT NULL AND image_url != '';