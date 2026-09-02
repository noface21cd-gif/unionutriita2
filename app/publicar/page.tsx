"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import { createClient } from "../../lib/supabase/client";
import { requerirUsuario } from "../../lib/auth";
import type { TipoPost } from "../../lib/types";

const TIPOS: TipoPost[] = [
  "Publicación",
  "Apunte",
  "Pregunta",
  "Formulario",
  "Ayuda",
  "Aviso",
];

export default function PublicarPage() {
  const [userId, setUserId] = useState("");
  const [tipo, setTipo] =
    useState<TipoPost>("Publicación");
  const [contenido, setContenido] =
    useState("");

  const [cargando, setCargando] =
    useState(true);
  const [publicando, setPublicando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  useEffect(() => {
    let activo = true;

    async function comprobarUsuario() {
      const user =
        await requerirUsuario();

      if (!user || !activo) {
        return;
      }

      setUserId(user.id);
      setCargando(false);
    }

    comprobarUsuario();

    return () => {
      activo = false;
    };
  }, []);

  async function crearPublicacion(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMensaje("");

    const contenidoLimpio =
      contenido.trim();

    if (!userId) {
      setMensaje(
        "No pudimos identificar tu sesión."
      );
      return;
    }

    if (!contenidoLimpio) {
      setMensaje(
        "Escribe algo antes de publicar."
      );
      return;
    }

    if (contenidoLimpio.length > 3000) {
      setMensaje(
        "La publicación no puede superar los 3000 caracteres."
      );
      return;
    }

    setPublicando(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          tipo,
          contenido: contenidoLimpio,
        });

      if (error) {
        throw new Error(error.message);
      }

      window.location.href = "/";
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? `No pudimos publicar: ${error.message}`
          : "No pudimos crear la publicación."
      );

      setPublicando(false);
    }
  }

  if (cargando) {
    return (
      <main className="profilePage">
        <section className="profileCard">
          <div className="loadingScreen">
            <div>
              <span className="loadingOtter">
                🦦
              </span>

              <p className="loadingText">
                Preparando tu publicación...
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="profilePage">
      <section className="profileCard">
        <p className="profileEyebrow">
          UNIÓNUTRIITA
        </p>

        <h1>Nueva publicación</h1>

        <p className="authDescription">
          Comparte algo con la comunidad.
          Puede ser una pregunta, un apunte,
          una ayuda o simplemente algo que
          quieras contar.
        </p>

        <form
          onSubmit={crearPublicacion}
          className="authForm"
        >
          <label>
            Tipo de publicación

            <select
              value={tipo}
              onChange={(e) =>
                setTipo(
                  e.target.value as TipoPost
                )
              }
            >
              {TIPOS.map((opcion) => (
                <option
                  key={opcion}
                  value={opcion}
                >
                  {opcion}
                </option>
              ))}
            </select>
          </label>

          <label>
            ¿Qué quieres compartir?

            <textarea
              value={contenido}
              onChange={(e) =>
                setContenido(
                  e.target.value
                )
              }
              placeholder="Escribe aquí..."
              rows={9}
              maxLength={3000}
              required
            />
          </label>

          <small
            style={{
              textAlign: "right",
              color: "#969188",
            }}
          >
            {contenido.length}/3000
          </small>

          <button
            type="submit"
            className="authButton"
            disabled={publicando}
          >
            {publicando
              ? "Publicando..."
              : "Publicar"}
          </button>
        </form>

        {mensaje && (
          <div className="authMessage error">
            {mensaje}
          </div>
        )}

        <Link
          href="/"
          className="backHomeButton"
        >
          Cancelar y volver al inicio
        </Link>
      </section>
    </main>
  );
}
