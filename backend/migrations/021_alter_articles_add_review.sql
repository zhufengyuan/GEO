SET @geo_has_review_status := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'articles'
    AND COLUMN_NAME = 'review_status'
);
SET @geo_sql1 := IF(
  @geo_has_review_status = 0,
  'ALTER TABLE articles ADD COLUMN review_status TINYINT(1) DEFAULT 0 AFTER brand_embed',
  'SELECT 1'
);
PREPARE geo_stmt1 FROM @geo_sql1;
EXECUTE geo_stmt1;
DEALLOCATE PREPARE geo_stmt1;

SET @geo_has_reviewed_at := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'articles'
    AND COLUMN_NAME = 'reviewed_at'
);
SET @geo_sql2 := IF(
  @geo_has_reviewed_at = 0,
  'ALTER TABLE articles ADD COLUMN reviewed_at DATETIME NULL AFTER review_status',
  'SELECT 1'
);
PREPARE geo_stmt2 FROM @geo_sql2;
EXECUTE geo_stmt2;
DEALLOCATE PREPARE geo_stmt2;
