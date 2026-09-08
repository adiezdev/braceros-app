-- Archivados: al dar de baja a un hermano ya no se borra, pasa a este
-- listado conservando su nombre, el bloque que tenía (titular/suplente/
-- honorario) y el Nº que ocupaba antes de archivar, además de todas sus
-- cuotas y asistencias.

-- El puesto solo lo usan la lista activa. Los archivados liberan el puesto
-- (nullable) y congelan su número en puesto_archivado para no chocar con
-- el UNIQUE(puesto) ni con los puestos que los reemplazan.
ALTER TABLE hermano ALTER COLUMN puesto DROP NOT NULL;

ALTER TABLE hermano ADD COLUMN archivado boolean NOT NULL DEFAULT false;

-- El Nº que ocupaba antes de archivar, congelado tal cual estaba.
ALTER TABLE hermano ADD COLUMN puesto_archivado integer;

CREATE INDEX hermano_archivado_idx ON hermano (archivado, puesto_archivado);
