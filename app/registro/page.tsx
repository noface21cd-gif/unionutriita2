"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { createClient } from "../../lib/supabase/client";

export default function RegistroPage() {
  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [carrera, setCarrera] = useState("");
  const [semestre, setSemestre] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<
    "ok" | "error" | ""
  >("");

  const [cargando, setCargando] = useState(false);

  async function registrarse(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setCargando(true);
    setMensaje("");
    setTipoMensaje("");

    const nombreLimpio = nombre.trim();

    const usernameLimpio = username
      .trim()
      .toLowerCase()
      .replace(/^@/, "");

    if (nombreLimpio.length < 2) {
      setMensaje(
        "Tu nombre debe tener al menos 2 caracteres."
      );
      setTipoMensaje("error");
      setCargando(false);
      return;
    }

    if (usernameLimpio.length < 3) {
      setMensaje(
        "Tu nombre de usuario debe tener al menos 3 caracteres."
      );
      setTipoMensaje("error");
      setCargando(false);
      return;
    }

    if (!/^[a-z0-9._]+$/.test(usernameLimpio)) {
      setMensaje(
        "El usuario solo puede contener letras, números, puntos y guiones bajos."
      );
      setTipoMensaje("error");
      setCargando(false);
      return;
    }

    try {
      const supabase = createClient();

      /*
       * Comprobamos primero si el username
       * ya está ocupado.
       */
      const {
        data: usuarioExistente,
        error: errorBusqueda,
      } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", usernameLimpio)
        .maybeSingle();

      if (errorBusqueda) {
        throw new Error(
          `No pudimos comprobar el usuario: ${errorBusqueda.message}`
        );
      }

      if (usuarioExistente) {
        setMensaje(
          "Ese nombre de usuario ya está ocupado."
        );
        setTipoMensaje("error");
        setCargando(false);
        return;
      }

      /*
       * Creamos el usuario en Supabase Auth.
       *
       * Nuestro trigger ya existente
       * copiará esta metadata a profiles.
       */
      const { data, error } =
        await supabase.auth.signUp({
          email: correo.trim(),
          password,
          options: {
            data: {
              nombre: nombreLimpio,
              username: usernameLimpio,
              carrera,
              semestre,
            },
          },
        });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error(
          "Supabase no devolvió un usuario válido."
        );
      }

      setMensaje(
        "Cuenta creada correctamente. Bienvenido a Uniónutriita 🦦"
      );
      setTipoMensaje("ok");

      setTimeout(() => {
        window.location.href = "/";
      }, 700);
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? `No pudimos crear tu cuenta: ${error.message}`
          : "No pudimos crear tu cuenta."
      );

      setTipoMensaje("error");
      setCargando(false);
    }
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <div className="authOtter">
          🦦
        </div>

        <p className="authEyebrow">
          UNIÓNUTRIITA
        </p>

        <h1>
          Únete a la madriguera
        </h1>

        <p className="authDescription">
          Crea tu cuenta universitaria
          y entra a la comunidad de
          ENES Oaxaca.
        </p>

        <form
          onSubmit={registrarse}
          className="authForm"
        >
          <label>
            Nombre

            <input
              type="text"
              placeholder="¿Cómo te llamamos?"
              value={nombre}
              onChange={(e) =>
                setNombre(e.target.value)
              }
              maxLength={80}
              required
            />
          </label>

          <label>
            Usuario

            <input
              type="text"
              placeholder="@tuusuario"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              minLength={3}
              maxLength={30}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </label>

          <label>
            Correo

            <input
              type="email"
              placeholder="tu-correo@ejemplo.com"
              value={correo}
              onChange={(e) =>
                setCorreo(e.target.value)
              }
              autoComplete="email"
              required
            />
          </label>

          <label>
            Contraseña

            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              minLength={6}
              autoComplete="new-password"
              required
            />
          </label>

          <label>
            Carrera

            <select
              value={carrera}
              onChange={(e) =>
                setCarrera(e.target.value)
              }
              required
            >
              <option value="">
                Selecciona tu carrera
              </option>

              <option value="Administración">
                Administración
              </option>

              <option value="Contabilidad">
                Contabilidad
              </option>

              <option value="Negocios Internacionales">
                Negocios Internacionales
              </option>

              <option value="Historia">
                Historia
              </option>
            </select>
          </label>

          <label>
            Semestre

            <select
              value={semestre}
              onChange={(e) =>
                setSemestre(e.target.value)
              }
              required
            >
              <option value="">
                Selecciona tu semestre
              </option>

              <option value="Nuevo ingreso">
                Nuevo ingreso
              </option>

              <option value="3.º semestre">
                3.º semestre
              </option>

              <option value="5.º semestre">
                5.º semestre
              </option>

              <option value="7.º semestre">
                7.º semestre
              </option>
            </select>
          </label>

          <button
            type="submit"
            className="authButton"
            disabled={cargando}
          >
            {cargando
              ? "Creando tu cuenta..."
              : "Crear mi cuenta"}
          </button>
        </form>

        {mensaje && (
          <div
            className={`authMessage ${
              tipoMensaje === "error"
                ? "error"
                : ""
            }`}
          >
            {mensaje}
          </div>
        )}

        <p className="authFooter">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login">
            Inicia sesión
          </Link>
        </p>
      </section>
    </main>
  );
}
