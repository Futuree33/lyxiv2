-- Clear all existing chat images (they're using broken base64 URLs)
DELETE FROM chat_images;

-- Optionally, you can also reset the auto-increment:
ALTER TABLE chat_images AUTO_INCREMENT = 1;
