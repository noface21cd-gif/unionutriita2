"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { createClient } from "../../../lib/supabase/client";
import { requerirUsuario } from "../../../lib/auth";

type PerfilPublico = {
  id: string;
  username: string | null;
  nombre: string | null;
  carrera: string | null;
  semestre: string | null;
  bio: string | null;
  avatar_url: string | null;
};

type Conexion = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted";
};

export default function PerfilPublicoPage() {
  const params = useParams();

  const usernameParam =
    typeof params.username === "string"
      ? params.username
      : Array.isArray(
          params.username
        )
      ? params.username[0]
      : "";

  const [perfil, setPerfil] =
    useState<PerfilPublico | null>(
      null
    );

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [conexion, setConexion] =
    useState<Conexion | null>(
      null
    );

  const [cargando, setCargando] =
    useState(true);

  const [procesando, setProcesando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  const esMiPerfil =
    perfil?.id ===
    currentUserId;

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const user =
          await requerirUsuario();

        if (!user || !activo) {
          return;
        }

        setCurrentUserId(
          user.id
        );

        const supabase =
          createClient();

        const usernameLimpio =
          decodeURIComponent(
            usernameParam
          )
            .replace(/^@/, "")
            .toLowerCase();

        const {
          data: perfilData,
          error: perfilError,
        } = await supabase
          .from("profiles")
          .select(`
            id,
            username,
            nombre,
            carrera,
            semestre,
            bio,
            avatar_url
          `)
          .eq(
            "username",
            usernameLimpio
          )
          .maybeSingle();

        if (perfilError) {
          throw new Error(
            perfilError.message
          );
        }

        if (!perfilData) {
          throw new Error(
            "Ese perfil no existe."
          );
        }

        if (!activo) {
          return;
        }

        const perfilEncontrado =
          perfilData as PerfilPublico;

        setPerfil(
          perfilEncontrado
        );

        if (
          perfilEncontrado.id ===
          user.id
        ) {
          return;
        }

        const {
          data: enviada,
          error: errorEnviada,
        } = await supabase
          .from("connections")
          .select(`
            id,
            requester_id,
            receiver_id,
            status
          `)
          .eq(
            "requester_id",
            user.id
          )
          .eq(
            "receiver_id",
            perfilEncontrado.id
          )
          .maybeSingle();

        if (errorEnviada) {
          throw new Error(
            errorEnviada.message
          );
        }

        if (enviada) {
          setConexion(
            enviada as Conexion
          );
          return;
        }

        const {
          data: recibida,
          error: errorRecibida,
        } = await supabase
          .from("connections")
          .select(`
            id,
            requester_id,
            receiver_id,
            status
          `)
          .eq(
            "requester_id",
            perfilEncontrado.id
          )
          .eq(
            "receiver_id",
            user.id
          )
          .maybeSingle();

        if (errorRecibida) {
          throw new Error(
            errorRecibida.message
          );
        }

        setConexion(
          recibida
            ? (recibida as Conexion)
            : null
        );
      } catch (error) {
        if (!activo) {
          return;
        }

        setMensaje(
          error instanceof Error
            ? error.message
            : "No pudimos cargar el perfil."
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargar();

    return () => {
      activo = false;
    };
  }, [usernameParam]);

  async function conectar() {
    if (
      !perfil ||
      !currentUserId
    ) {
      return;
    }

    setProcesando(true);

    try {
      const supabase =
        createClient();

      const { data, error } =
        await supabase
          .from("connections")
          .insert({
            requester_id:
              currentUserId,
            receiver_id:
              perfil.id,
            status: "pending",
          })
          .select(`
            id,
            requester_id,
            receiver_id,
            status
          `)
          .single();

      if (error) {
        throw new Error(
          error.message
        );
      }

      setConexion(
        data as Conexion
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos enviar la solicitud."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function aceptar() {
    if (!conexion) {
      return;
    }

    setProcesando(true);

    try {
      const supabase =
        createClient();

      const { data, error } =
        await supabase
          .from("connections")
          .update({
            status: "accepted",
          })
          .eq(
            "id",
            conexion.id
          )
          .eq(
            "receiver_id",
            currentUserId
          )
          .select(`
            id,
            requester_id,
            receiver_id,
            status
          `)
          .single();

      if (error) {
        throw new Error(
          error.message
        );
      }

      setConexion(
        data as Conexion
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos aceptar la solicitud."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function eliminarConexion() {
    if (!conexion) {
      return;
    }

    const confirmado =
      window.confirm(
        conexion.status ===
          "accepted"
          ? "¿Eliminar esta conexión?"
          : "¿Cancelar esta solicitud?"
      );

    if (!confirmado) {
      return;
    }

    setProcesando(true);

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from("connections")
          .delete()
          .eq(
            "id",
            conexion.id
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      setConexion(null);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos actualizar la conexión."
      );
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            🦦
          </span>

          <p className="loadingText">
            Buscando a esta nutria...
          </p>
        </div>
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
            Perfil no encontrado
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
              alt={
                perfil.nombre ||
                "Usuario"
              }
            />
          ) : (
            <span>🦦</span>
          )}
        </div>

        <p className="profileEyebrow">
          PERFIL DE ESTUDIANTE
        </p>

        <h1>
          {perfil.nombre ||
            "Estudiante"}
        </h1>

        <p className="profileUsername">
          @
          {perfil.username ||
            "usuario"}
        </p>

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
              "Este estudiante todavía no ha escrito una bio."}
          </p>
        </div>

        {esMiPerfil && (
          <Link
            href="/perfil/editar"
            className="editProfileButton"
          >
            Editar mi perfil
          </Link>
        )}

        {!esMiPerfil &&
          !conexion && (
            <button
              type="button"
              className="editProfileButton"
              style={{
                border: 0,
              }}
              disabled={
                procesando
              }
              onClick={conectar}
            >
              🤝 Conectar
            </button>
          )}

        {!esMiPerfil &&
          conexion?.status ===
            "pending" &&
          conexion.requester_id ===
            currentUserId && (
            <button
              type="button"
              className="logoutButton"
              disabled={
                procesando
              }
              onClick={
                eliminarConexion
              }
            >
              ⏳ Solicitud enviada
            </button>
          )}

        {!esMiPerfil &&
          conexion?.status ===
            "pending" &&
          conexion.receiver_id ===
            currentUserId && (
            <>
              <button
                type="button"
                className="editProfileButton"
                style={{
                  border: 0,
                }}
                disabled={
                  procesando
                }
                onClick={
                  aceptar
                }
              >
                📩 Aceptar solicitud
              </button>

              <button
                type="button"
                className="logoutButton"
                onClick={
                  eliminarConexion
                }
              >
                Rechazar
              </button>
            </>
          )}

        {!esMiPerfil &&
          conexion?.status ===
            "accepted" && (
            <button
              type="button"
              className="logoutButton"
              disabled={
                procesando
              }
              onClick={
                eliminarConexion
              }
            >
              ✓ Conectados
            </button>
          )}

        <Link
          href="/conexiones"
          className="backHomeButton"
        >
          Ver estudiantes
        </Link>

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

