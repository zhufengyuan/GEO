SET @geo_has_link_url := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'publish_records'
    AND COLUMN_NAME = 'link_url'
);
SET @geo_sql := IF(
  @geo_has_link_url = 0,
  'ALTER TABLE publish_records ADD COLUMN link_url VARCHAR(1024) NULL AFTER platform_code',
  'SELECT 1'
);
PREPARE geo_stmt FROM @geo_sql;
EXECUTE geo_stmt;
DEALLOCATE PREPARE geo_stmt;
