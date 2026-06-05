CREATE TABLE IF NOT EXISTS products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    enterprise_id BIGINT NULL,
    product_name VARCHAR(200) NOT NULL,
    core_function TEXT NULL,
    advantages TEXT NULL,
    specs TEXT NULL,
    material VARCHAR(200) NULL,
    craft VARCHAR(200) NULL,
    origin VARCHAR(100) NULL,
    use_scene TEXT NULL,
    target_group VARCHAR(200) NULL,
    delivery VARCHAR(100) NULL,
    others TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

