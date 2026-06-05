INSERT INTO users (id, phone, password_hash, real_name, is_real_name_verified)
SELECT 1, 'dev', '', 'dev', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 1);

