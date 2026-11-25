-- Bucket das fotos de perfil (as regras de acesso já existem nas migrations anteriores).
-- Privado: as fotos são abertas por link assinado (signedAvatar).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
ON CONFLICT (id) DO NOTHING;
