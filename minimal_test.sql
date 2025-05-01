-- Minimal test script
-- First make sure testuser exists
INSERT INTO users (username, password, name, email, created_at)
VALUES ('testuser', '$2a$10$iqEHxmX9PdgaS5hkS6MdNeOTHnQI0N5nVGq2TZk3Cm4DCpPeAXr3K', 'Test User', 'testuser@example.com', CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- Now insert a client directly
INSERT INTO clients (user_id, name)
SELECT id, 'Minimal Test Client'
FROM users
WHERE username = 'testuser'; 