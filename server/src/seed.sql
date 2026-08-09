INSERT INTO branches (id, name) VALUES (1, 'Oxbridge academy')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, name, role, phone, email, address) VALUES
('admin', 'Admin', 'admin', '+998 90 000 00 00', 'admin@oxbridge.uz', 'Toshkent, Oxbridge academy')
ON CONFLICT (id) DO NOTHING;
