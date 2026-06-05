SET @geo_has_product_images := (
  SELECT COUNT(1)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'product_images'
);

SET @geo_has_image_url := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'product_images'
    AND COLUMN_NAME = 'image_url'
);

SET @geo_sql1 := IF(
  @geo_has_product_images = 1 AND @geo_has_image_url = 1,
  'ALTER TABLE product_images MODIFY COLUMN image_url VARCHAR(1024) NOT NULL',
  'SELECT 1'
);
PREPARE geo_stmt1 FROM @geo_sql1;
EXECUTE geo_stmt1;
DEALLOCATE PREPARE geo_stmt1;

SET @geo_has_idx_product := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'product_images'
    AND INDEX_NAME = 'idx_product'
);
SET @geo_sql2 := IF(
  @geo_has_product_images = 1 AND @geo_has_idx_product = 0,
  'ALTER TABLE product_images ADD INDEX idx_product (product_id)',
  'SELECT 1'
);
PREPARE geo_stmt2 FROM @geo_sql2;
EXECUTE geo_stmt2;
DEALLOCATE PREPARE geo_stmt2;

SET @geo_has_idx_sort := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'product_images'
    AND INDEX_NAME = 'idx_sort'
);
SET @geo_sql3 := IF(
  @geo_has_product_images = 1 AND @geo_has_idx_sort = 0,
  'ALTER TABLE product_images ADD INDEX idx_sort (product_id, sort_order)',
  'SELECT 1'
);
PREPARE geo_stmt3 FROM @geo_sql3;
EXECUTE geo_stmt3;
DEALLOCATE PREPARE geo_stmt3;
