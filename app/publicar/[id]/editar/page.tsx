"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { createClient } from "../../../../lib/supabase/client";
import { requerirUsuario } from "../../../../lib/auth";
import type { TipoPost } from "../../../../lib/types";

const TIPOS: TipoPost[] = [
  "Publicación",
  "Apunte",
  "Pregunta",
  "Formulario",
  "Ayuda",
  "Aviso",
];

export default function EditarPublicacionPage() {
  const params = useParams();

  const postId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : "";

  const [tipo, setTipo] =
    useState<TipoPost>("Publicación");

  const [contenido, setContenido] =
    useState("");

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  useEffect(() => {
    let activo = true;

    async function cargarPost() {
      try {
        const user =
          await requerirUsuario();

        if (!user || !activo) {
          return;
        }

        const supabase =
          createClient();

        const { data, error } =
          await supabase
            .from("posts")
            .select(`
              id,
              user_id,
              tipo,
              contenido
            `)
            .eq("id", postId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!activo) {
          return;
        }

        if (error) {
          throw new Error(
            error.message
          );
        }

        if (!data) {
          throw new Error(
            "La publicación no existe o no te pertenece."
          );
        }

        setTipo(
          data.tipo as TipoPost
        );

        setContenido(
          data.contenido || ""
        );
      } catch (error) {
        if (!activo) {
          return;
        }

        setMensaje(
          error instanceof Error
            ? error.message
            : "No pudimos cargar la publicación."
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarPost();

    return () => {
      activo = false;
    };
  }, [postId]);

  async function guardarCambios(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const contenidoLimpio =
      contenido.trim();

    if (!contenidoLimpio) {
      setMensaje(
        "La publicación no puede estar vacía."
      );
      return;
    }

    if (contenidoLimpio.length > 3000) {
      setMensaje(
        "La publicación no puede superar los 3000 caracteres."
      );
      return;
    }

    setGuardando(true);
    setMensaje("");

    try {
      const user =
        await requerirUsuario();

      if (!user) {
        return;
      }

      const supabase =
        createClient();

      const { error } =
        await supabase
          .from("posts")
          .update({
            tipo,
            contenido:
              contenidoLimpio,
          })
          .eq("id", postId)
          .eq("user_id", user.id);

      if (error) {
        throw new Error(
          error.message
        );
      }

      window.location.href = "/";
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? `No pudimos guardar: ${error.message}`
          : "No pudimos guardar los cambios."
      );

      setGuardando(false);
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
                Buscando la publicación...
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (mensaje && !contenido) {
    return (
      <main className="profilePage">
        <section className="profileCard">
          <div className="profileAvatar">
            🦦
          </div>

          <h1>
            No podemos editarla
          </h1>

          <div className="errorBox">
            {mensaje}
          </div>

          <Link
            href="/"
            className="backHomeButton"
          >
            Volver al inicio
          </Link>
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

        <h1>
          Editar publicación
        </h1>

        <p className="authDescription">
          Corrige o actualiza lo que compartiste.
        </p>

        <form
          onSubmit={guardarCambios}
          className="authForm"
        >
          <label>
            Tipo

            <select
              value={tipo}
              onChange={(e) =>
                setTipo(
                  e.target.value as TipoPost
                )
              }
            >
              {TIPOS.map(
                (opcion) => (
                  <option
                    key={opcion}
                    value={opcion}
                  >
                    {opcion}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            Contenido

            <textarea
              value={contenido}
              onChange={(e) =>
                setContenido(
                  e.target.value
                )
              }
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
            disabled={guardando}
          >
            {guardando
              ? "Guardando..."
              : "Guardar cambios"}
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
          Cancelar
        </Link>
      </section>
    </main>
  );
}

