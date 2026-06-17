-- 为医院表添加挂号链接字段
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS booking_url TEXT;

-- 更新医院挂号链接
UPDATE hospitals SET booking_url = 'https://www.hxkq.org' WHERE name = '四川大学华西口腔医院';
UPDATE hospitals SET booking_url = 'https://jgkq.com' WHERE name LIKE '成都极光口腔%';
UPDATE hospitals SET booking_url = 'https://www.xqkq.com' WHERE name LIKE '成都新桥口腔%';
UPDATE hospitals SET booking_url = 'https://cdtykq.com' WHERE name = '成都团圆口腔';
UPDATE hospitals SET booking_url = 'https://malo.clinic/chengdu' WHERE name LIKE '成都马泷齿科%';
UPDATE hospitals SET booking_url = 'https://www.arrail-dental.com' WHERE name LIKE '成都瑞尔齿科%';
UPDATE hospitals SET booking_url = 'https://www.bcckq.com' WHERE name LIKE '成都贝臣齿科%';
UPDATE hospitals SET booking_url = 'https://www.ydkq.com' WHERE name LIKE '成都牙道口腔%';
UPDATE hospitals SET booking_url = 'https://www.cqmukq.com' WHERE name LIKE '重庆医科大学附属口腔医院%';
UPDATE hospitals SET booking_url = 'https://cdtykq.com' WHERE name LIKE '重庆团圆口腔%';
UPDATE hospitals SET booking_url = 'https://www.mykq.com' WHERE name LIKE '重庆美奥口腔%';
UPDATE hospitals SET booking_url = 'https://www.bykq.com' WHERE name LIKE '重庆八益牙科%';
UPDATE hospitals SET booking_url = 'https://www.ccqkq.com' WHERE name LIKE '重庆橙橙口腔%';
UPDATE hospitals SET booking_url = 'https://www.cqkq.com' WHERE name LIKE '重庆牙博士口腔%';
