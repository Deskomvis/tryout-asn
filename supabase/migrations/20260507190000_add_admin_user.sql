-- Add admin role to deskomviscom@gmail.com user
DELETE FROM user_roles WHERE user_id = 'b7684e02-0fb7-4ef1-91fd-5306a0071882';

INSERT INTO user_roles (user_id, role)
VALUES ('b7684e02-0fb7-4ef1-91fd-5306a0071882', 'admin');
