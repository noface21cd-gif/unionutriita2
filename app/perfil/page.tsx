"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from "../../lib/supabase/client";

import {
  cerrarSesion,
  requerirUsuario,
} from "../../lib/auth";

import type { Perfil } from "../../lib/types";

export default function PerfilPage() {
  const [perfil, setPerfil] =
    useState<Perfil | null>(null);

  const [
    publicaciones,
    setPublicaciones,
  ] = useState(0);

  const [
    conexiones,
    setConexiones,
  ] = useState(0);

  const [
    guardados,
    setGuardados,
  ] = useState(0);

  const [cargando, setCargando] =
    useState(true);

  const [cerrando, setCerrando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  useEffect(() => {
    let activo = true;

    async function cargarPerfil() {
      try {
        const user =
          await requerirUsuario();

        if (!user || !activo) {
          return;
        }

        const supabase =
          createClient();

        const [
          perfilResultado,
          postsResultado,
          conexionesResultado,
          guardadosResultado,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(`
              id,
              username,
              nombre,
              carrera,
              semestre,
              bio,
              avatar_url,
              created_at
            `)
            .eq("id", user.id)
            .maybeSingle(),

          supabase
            .from("posts")
            .select("*", {
              count: "exact",
              head: true,
            })
            .eq(
              "user_id",
              user.id
            ),

          supabase
            .from("connections")
            .select("*", {
              count: "exact",
              head: true,
            })
            .eq(
              "status",
              "accepted"
            )
            .or(
              `requester_id.eq.${user.id},receiver_id.eq.${user.id}`
            ),

          supabase
            .from("post_saves")
            .select("*", {
              count: "exact",
              head: true,
            })
            .eq(
              "user_id",
              user.id
            ),
        ]);

        if (
          perfilResultado.error
        ) {
          throw new Error(
            perfilResultado.error.message
          );
        }

        if (
          postsResultado.error
        ) {
          throw new Error(
            postsResultado.error.message
          );
        }

        if (
          conexionesResultado.error
        ) {
          throw new Error(
            conexionesResultado.error.message
          );
        }

        if (
          guardadosResultado.error
        ) {
          throw new Error(
            guardadosResultado.error.message
          );
        }

        if (!activo) {
          return;
        }

        if (
          !perfilResultado.data
        ) {
          throw new Error(
            "No encontramos tu perfil."
          );
        }

        setPerfil(
          perfilResultado.data as Perfil
        );

        setPublicaciones(
          postsResultado.count || 0
        );

        setConexiones(
          conexionesResultado.count ||
            0
        );

        setGuardados(
          guardadosResultado.count ||
            0
        );
      } catch (error) {
        if (!activo) {
          return;
        }

        setMensaje(
          error instanceof Error
            ? `No pudimos cargar tu perfil: ${error.message}`
            : "No pudimos cargar tu perfil."
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarPerfil();

    return () => {
      activo = false;
    };
  }, []);

  async function manejarCerrarSesion() {
    setCerrando(true);
    setMensaje("");

    const resultado =
      await cerrarSesion();

    if (!resultado.ok) {
      setMensaje(
        resultado.error ||
          "No pudimos cerrar tu sesión."
      );

      setCerrando(false);
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
                Contando piedras,
                publicaciones y
                amistades...
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!perfil) {
    return (
      <main className="profilePage">
        <section className="profileCard">
          <div className="profileAvatar">
            🦦
          </div>

          <h1>
            No encontramos tu perfil
          </h1>

          <div className="errorBox">
            {mensaje}
          </div>

          <Link
            href="/"
            className="backHomeButton"
          >
            Volver
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="profilePage">
      <section className="profileCard">
        <div className="profileAvatar">
          {perfil.avatar_url ? (
            <img
              src={
                perfil.avatar_url
              }
              alt={`Foto de ${
                perfil.nombre ||
                "usuario"
              }`}
            />
          ) : (
            <span>🦦</span>
          )}
        </div>

        <p className="profileEyebrow">
          MI PERFIL
        </p>

        <h1>
          {perfil.nombre ||
            "Sin nombre"}
        </h1>

        <p className="profileUsername">
          {perfil.username
            ? `@${perfil.username}`
            : "@sinusuario"}
        </p>

        <div className="profileStats">
          <div className="profileStat">
            <strong>
              {publicaciones}
            </strong>

            <span>
              Publicaciones
            </span>
          </div>

          <div className="profileStat">
            <strong>
              {conexiones}
            </strong>

            <span>
              Conexiones
            </span>
          </div>

          <div className="profileStat">
            <strong>
              {guardados}
            </strong>

            <span>
              Guardados
            </span>
          </div>
        </div>

        <div className="profileInfo">
          <div>
            <span>
              Carrera
            </span>

            <strong>
              {perfil.carrera ||
                "Sin especificar"}
            </strong>
          </div>

          <div>
            <span>
              Semestre
            </span>

            <strong>
              {perfil.semestre ||
                "Sin especificar"}
            </strong>
          </div>
        </div>

        <div className="profileBio">
          <span>Bio</span>

          <p>
            {perfil.bio ||
              "Todavía no has escrito nada sobre ti."}
          </p>
        </div>

        {mensaje && (
          <div className="authMessage error">
            {mensaje}
          </div>
        )}

        <Link
          href="/perfil/editar"
          className="editProfileButton"
        >
          Editar perfil
        </Link>

        <Link
          href="/guardados"
          className="backHomeButton"
        >
          🔖 Ver mis guardados
        </Link>

        <Link
          href="/conexiones"
          className="backHomeButton"
        >
          🤝 Ver mis conexiones
        </Link>

        <Link
          href="/"
          className="backHomeButton"
        >
          Volver al inicio
        </Link>

        <button
          type="button"
          className="logoutButton"
          onClick={
            manejarCerrarSesion
          }
          disabled={cerrando}
        >
          {cerrando
            ? "Cerrando sesión..."
            : "Cerrar sesión"}
        </button>
      </section>
    </main>
  );
}
