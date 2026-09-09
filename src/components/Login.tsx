import { LogIn, LogOut } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "./ui/Button";
import { ENTIDAD } from "../constants";
import escudo from "../data/escudosm.png";

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
  onLogout: () => void;
  username: string | null;
  error: string | null;
  cargando: boolean;
}

export function Login({ onLogin, onLogout, username, error, cargando }: Props) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  if (username) {
    return (
      <div className="app login-root">
        <div className="login__card">
          <img src={escudo} alt="" className="login__escudo" />
          <h1 className="login__titulo">{ENTIDAD}</h1>
          <p className="login__sub">
            Conectado como <strong>{username}</strong>
          </p>
          <Button fuerte onClick={onLogout}>
            <LogOut size={15} /> Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void onLogin(user, pass);
  };

  return (
    <div className="app login-root">
      <form className="login__card" onSubmit={handleSubmit}>
        <img src={escudo} alt="" className="login__escudo" />
        <h1 className="login__titulo">{ENTIDAD}</h1>
        <p className="login__sub">Acceso restringido a miembros</p>

        {error && <p className="login__error">{error}</p>}

        <label className="campo">
          Usuario
          <input
            className="login__campo"
            type="text"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoFocus
            autoComplete="username"
            required
          />
        </label>

        <label className="campo">
          Contraseña
          <input
            className="login__campo"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <Button fuerte type="submit" loading={cargando}>
          <LogIn size={15} /> Entrar
        </Button>
      </form>
    </div>
  );
}
