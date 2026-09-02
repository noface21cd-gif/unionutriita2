"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setCargando(true);
    setMensaje("");

    try {
      const supabase = createClient();

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: correo.trim(),
          password,
        });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user || !data.session) {
        throw new Error(
          "No pudimos iniciar una sesión válida."
        );
      }

      window.location.href = "/";
    } catch (error) {
      const texto =
        error instanceof Error
          ? error.message
          : "No pudimos iniciar sesión.";

      const textoLower =
        texto.toLowerCase();

      if (
        textoLower.includes(
          "invalid login credentials"
        ) ||
        textoLower.includes(
          "invalid credentials"
        )
      ) {
        setMensaje(
          "Correo o contraseña incorrectos."
        );
      } else if (
        textoLower.includes(
          "email not confirmed"
        )
      ) {
        setMensaje(
          "Tu correo todavía no está confirmado."
        );
      } else if (
        textoLower.includes(
          "too many requests"
        )
      ) {
        setMensaje(
          "Hay demasiados intentos. Espera un momento y vuelve a intentarlo."
        );
      } else {
        setMensaje(
          `No pudimos iniciar sesión: ${texto}`
        );
      }

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
          Volviste al río
        </h1>

        <p className="authDescription">
          Inicia sesión para volver a
          tus publicaciones, perfil y
          comunidad universitaria.
        </p>

        <form
          onSubmit={iniciarSesion}
          className="authForm"
        >
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
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              autoComplete="current-password"
              required
            />
          </label>

          <button
            type="submit"
            className="authButton"
            disabled={cargando}
          >
            {cargando
              ? "Buscando tu madriguera..."
              : "Entrar"}
          </button>
        </form>

        {mensaje && (
          <div className="authMessage error">
            {mensaje}
          </div>
        )}

        <p className="authFooter">
          ¿Todavía no tienes cuenta?{" "}
          <Link href="/registro">
            Regístrate
          </Link>
        </p>
      </section>
    </main>
  );
}
