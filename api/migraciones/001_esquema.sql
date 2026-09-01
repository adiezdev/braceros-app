-- Esquema normalizado. Lo importante: el año es un DATO, no una columna.
-- Añadir 2027 es insertar una fila, no migrar nada nunca más.

CREATE TYPE bloque_t    AS ENUM ('HONORARIOS', 'TITULARES', 'SUPLENTES');
CREATE TYPE marca_t     AS ENUM ('V', 'F', 'FJ');
CREATE TYPE pago_t      AS ENUM ('S', 'N');

-- Ojo: el "vacío" de la interfaz (sin anotar) NO es un valor aquí.
-- Es la ausencia de fila. Por eso los enum no lo incluyen.

-- Parámetros de la agrupación. Una sola fila, forzado por el CHECK.
CREATE TABLE ajustes (
  unico       boolean PRIMARY KEY DEFAULT true CHECK (unico),
  cupo        integer NOT NULL CHECK (cupo >= 0),
  cuota_euros numeric(7, 2) NOT NULL CHECK (cuota_euros >= 0)
);

-- Las procesiones son datos, no código: el día que haya una tercera,
-- es un INSERT.
CREATE TABLE procesion (
  clave text PRIMARY KEY,
  corto text NOT NULL,
  largo text NOT NULL,
  orden integer NOT NULL
);

INSERT INTO procesion (clave, corto, largo, orden) VALUES
  ('exc', 'Exaltación', 'Exaltación de la Santa Cruz', 1),
  ('sm',  'San Martín', 'San Martín',                  2);

CREATE TABLE hermano (
  id       text PRIMARY KEY,
  -- El número de la lista. Lo que en la hoja de papel era la fila.
  puesto   integer NOT NULL,
  nombre   text     NOT NULL DEFAULT '',
  bloque   bloque_t NOT NULL DEFAULT 'SUPLENTES',
  telefono text     NOT NULL DEFAULT '',
  notas    text     NOT NULL DEFAULT '',
  alta     timestamptz NOT NULL DEFAULT now()
);

-- DEFERRABLE porque al reordenar la lista hay un instante, dentro de la
-- transacción, en que dos hermanos comparten puesto. Se comprueba al final.
ALTER TABLE hermano
  ADD CONSTRAINT hermano_puesto_uq UNIQUE (puesto) DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX hermano_puesto_idx ON hermano (puesto);

-- Años que la interfaz enseña como columna, aunque aún no tengan ninguna
-- marca puesta. Sin esto, un año recién añadido y vacío desaparecería.
CREATE TABLE anio_cuota      (anio integer PRIMARY KEY CHECK (anio BETWEEN 1900 AND 2999));
CREATE TABLE anio_asistencia (anio integer PRIMARY KEY CHECK (anio BETWEEN 1900 AND 2999));

CREATE TABLE cuota (
  hermano_id text    NOT NULL REFERENCES hermano(id)         ON DELETE CASCADE,
  anio       integer NOT NULL REFERENCES anio_cuota(anio)    ON DELETE CASCADE,
  estado     pago_t  NOT NULL,
  PRIMARY KEY (hermano_id, anio)
);

-- Una procesión concreta de un año concreto. "La Exaltación de 2026".
CREATE TABLE evento (
  anio      integer NOT NULL REFERENCES anio_asistencia(anio) ON DELETE CASCADE,
  procesion text    NOT NULL REFERENCES procesion(clave),
  PRIMARY KEY (anio, procesion)
);

CREATE TABLE asistencia (
  hermano_id text    NOT NULL REFERENCES hermano(id) ON DELETE CASCADE,
  anio       integer NOT NULL,
  procesion  text    NOT NULL,
  marca      marca_t NOT NULL,
  PRIMARY KEY (hermano_id, anio, procesion),
  FOREIGN KEY (anio, procesion) REFERENCES evento(anio, procesion) ON DELETE CASCADE
);

CREATE INDEX asistencia_evento_idx ON asistencia (anio, procesion);

-- Bitácora de cambios. Sirve para dos cosas: saber qué pasó, y que los
-- navegadores abiertos pregunten "¿hay algo nuevo?" con una consulta barata.
CREATE TABLE cambio (
  id      bigserial PRIMARY KEY,
  momento timestamptz NOT NULL DEFAULT now(),
  ops     integer NOT NULL,
  resumen text NOT NULL
);

INSERT INTO ajustes (cupo, cuota_euros) VALUES (73, 10);
