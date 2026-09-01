interface Props {
  cupo: number;
  columnas: number;
}

/**
 * Regla de latón que cruza la tabla justo donde se cierra el cupo.
 * Es el dato que gobierna toda la lista, así que es lo único llamativo.
 */
export function LineaCupo({ cupo, columnas }: Props) {
  return (
    <tr className="cupo">
      <td colSpan={columnas}>
        <span className="cupo__texto">
          Cierre del cupo · puesto {cupo} · de aquí para abajo son suplentes
        </span>
      </td>
    </tr>
  );
}
