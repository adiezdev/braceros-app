import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";

/** Botón ⋮ que abre un menú con las acciones de una fila. */
export function MenuFila({ children }: { children: ReactNode }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="fila-mas"
          aria-label="Acciones de fila"
          title="Acciones"
        >
          <MoreHorizontal size={17} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="menu" align="end" sideOffset={4}>
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}