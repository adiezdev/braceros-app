-- Usuarios para login. Solo "logueado" vs "no logueado", sin roles.
CREATE TABLE usuario (
  id       integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username text      NOT NULL UNIQUE,
  hash     text      NOT NULL,  -- scrypt: salt:hash en hex
  activo   boolean   NOT NULL DEFAULT true,
  creado   timestamptz NOT NULL DEFAULT now()
);

-- Seed: admin / braceros (cambiar contraseña tras el primer login)
INSERT INTO usuario (username, hash) VALUES (
  'admin',
  'e42c39865ee3a7d53605a852cda026cd:db7f9faecd40b45d97c5fad800e0147003baf96a7aa4e59e3938fd593dabbbdd804c4b608717309a1d0eaab58aa5ba7fd6fc3fdf0f1f84079983dd0f8ac7f30e'
);
