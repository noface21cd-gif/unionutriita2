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

const INFO_TIPOS: Record<
  TipoPost,
  {
    icono: string;
    descripcion: string;
    placeholder: string;
  }
> = {
  Publicación: {
    icono: "💬",
    descripcion:
      "Actualiza una idea, experiencia o mensaje que compartiste con la comunidad.",
    placeholder:
      "¿Qué quieres compartir con la comunidad?",
  },

  Apunte: {
    icono: "📚",
    descripcion:
      "Corrige o amplía información académica que hayas compartido.",
    placeholder:
      "Actualiza tu apunte, resumen o explicación...",
  },

  Pregunta: {
    icono: "❓",
    descripcion:
      "Aclara o mejora la pregunta que hiciste a otros estudiantes.",
    placeholder:
      "¿Qué quieres preguntarle a la comunidad?",
  },

  Formulario: {
    icono: "📋",
    descripcion:
      "Actualiza la información de una encuesta o formulario académico.",
    placeholder:
      "Explica de qué trata tu formulario...",
  },

  Ayuda: {
    icono: "🤝",
    descripcion:
      "Actualiza la ayuda que necesitas de otros estudiantes.",
    placeholder:
      "Explica qué ayuda necesitas...",
  },

  Aviso: {
    icono: "📢",
    descripcion:
      "Corrige o actualiza información importante para la comunidad.",
    placeholder:
      "Escribe el aviso que quieres compartir...",
  },
};

export default function EditarPublicacionPage() {
  const params =
    useParams();

  const postId =
    typeof params.id ===
    "string"
      ? params.id
      : Array.isArray(
          params.id
        )
      ? params.id[0]
      : "";

  const [
    tipo,
    setTipo,
  ] =
    useState<TipoPost>(
      "Publicación"
    );

  const [
    contenido,
    setContenido,
  ] = useState("");

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  const [
    postEncontrado,
    setPostEncontrado,
  ] = useState(false);

  useEffect(() => {
    let activo = true;

    async function cargarPost() {
      try {
        const user =
          await requerirUsuario();

        if (
          !user ||
          !activo
        ) {
          return;
        }

        const supabase =
          createClient();

        const {
          data,
          error,
        } = await supabase
          .from("posts")
          .select(`
            id,
            user_id,
            tipo,
            contenido
          `)
          .eq(
            "id",
            postId
          )
          .eq(
            "user_id",
            user.id
          )
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

        const tipoCargado =
          data.tipo as TipoPost;

        if (
          !TIPOS.includes(
            tipoCargado
          )
        ) {
          throw new Error(
            "Esta publicación tiene un tipo no compatible."
          );
        }

        setTipo(
          tipoCargado
        );

        setContenido(
          data.contenido ||
            ""
        );

        setPostEncontrado(
          true
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

        setPostEncontrado(
          false
        );
      } finally {
        if (activo) {
          setCargando(
            false
          );
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

    setMensaje("");

    const contenidoLimpio =
      contenido.trim();

    if (
      !contenidoLimpio
    ) {
      setMensaje(
        "La publicación no puede estar vacía."
      );

      return;
    }

    if (
      contenidoLimpio.length >
      3000
    ) {
      setMensaje(
        "La publicación no puede superar los 3000 caracteres."
      );

      return;
    }

    if (
      !TIPOS.includes(tipo)
    ) {
      setMensaje(
        "Selecciona un tipo de publicación válido."
      );

      return;
    }

    setGuardando(
      true
    );

    try {
      const user =
        await requerirUsuario();

      if (!user) {
        setMensaje(
          "No pudimos identificar tu sesión."
        );

        setGuardando(
          false
        );

        return;
      }

      const supabase =
        createClient();

      const {
        error,
      } = await supabase
        .from("posts")
        .update({
          tipo,

          contenido:
            contenidoLimpio,
        })
        .eq(
          "id",
          postId
        )
        .eq(
          "user_id",
          user.id
        );

      if (error) {
        throw new Error(
          error.message
        );
      }

      window.location.href =
        "/";
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? `No pudimos guardar: ${error.message}`
          : "No pudimos guardar los cambios."
      );

      setGuardando(
        false
      );
    }
  }

  const info =
    INFO_TIPOS[tipo];

  const caracteres =
    contenido.length;

  const cercaDelLimite =
    caracteres >=
    2700;

  const puedeGuardar =
    Boolean(
      contenido.trim() &&
        postEncontrado &&
        !guardando
    );

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            ✏️
          </span>

          <p className="loadingText">
            Buscando la publicación...
          </p>
        </div>
      </main>
    );
  }

  if (
    !postEncontrado
  ) {
    return (
      <main className="profilePage">
        <section className="profileCard">
          <div className="profileAvatar">
            🦦
          </div>

          <p className="profileEyebrow">
            UNIÓNUTRIIITA
          </p>

          <h1>
            No podemos editarla
          </h1>

          <p
            style={{
              color:
                "#70746a",

              lineHeight:
                1.55,
            }}
          >
            La publicación puede haber
            sido eliminada o pertenecer
            a otra persona.
          </p>

          {mensaje && (
            <div className="errorBox">
              {mensaje}
            </div>
          )}

          <Link
            href="/"
            className="backHomeButton"
          >
            ← Volver al inicio
          </Link>
        </section>
      </main>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <Link
          href="/"
          className="brand"
        >
          <span className="logo">
            🦦
          </span>

          <div>
            <h1>
              Uniónutriita
            </h1>

            <p>
              Comunidad ENES Oaxaca
            </p>
          </div>
        </Link>

        <div className="topActions">
          <Link
            href="/buscar"
            className="circleButton"
            aria-label="Buscar"
            title="Buscar"
          >
            🔎
          </Link>

          <Link
            href="/notificaciones"
            className="circleButton"
            aria-label="Notificaciones"
            title="Notificaciones"
          >
            🔔
          </Link>

          <Link
            href="/perfil"
            className="profileButton profileLink"
            aria-label="Mi perfil"
            title="Mi perfil"
          >
            👤
          </Link>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <p className="sidebarTitle">
            Explorar
          </p>

          <Link
            href="/"
            className="menuButton"
          >
            <span className="menuIcon">
              🏠
            </span>

            Inicio
          </Link>

          <Link
            href="/buscar"
            className="menuButton"
          >
            <span className="menuIcon">
              🔎
            </span>

            Buscar
          </Link>

          <Link
            href="/estudio"
            className="menuButton"
          >
            <span className="menuIcon">
              📚
            </span>

            Estudio
          </Link>

          <Link
            href="/comunidades"
            className="menuButton"
          >
            <span className="menuIcon">
              🫂
            </span>

            Comunidades
          </Link>

          <Link
            href="/eventos"
            className="menuButton"
          >
            <span className="menuIcon">
              🎉
            </span>

            Eventos
          </Link>

          <Link
            href="/conexiones"
            className="menuButton"
          >
            <span className="menuIcon">
              🤝
            </span>

            Conexiones
          </Link>

          <Link
            href="/guardados"
            className="menuButton"
          >
            <span className="menuIcon">
              🔖
            </span>

            Guardados
          </Link>

          <Link
            href="/social"
            className="menuButton"
          >
            <span className="menuIcon">
              🌿
            </span>

            Social
          </Link>

          <p
            className="sidebarTitle"
            style={{
              marginTop:
                "24px",
            }}
          >
            Crear
          </p>

          <Link
            href="/publicar"
            className="menuButton selected"
          >
            <span className="menuIcon">
              ✍️
            </span>

            Publicar
          </Link>

          <div className="otterCard">
            <span className="bigOtter">
              ✏️
            </span>

            <div>
              <strong>
                Editando
              </strong>

              <p>
                Mejora lo que compartiste
              </p>
            </div>
          </div>
        </aside>

        <main className="content">
          <section className="welcome">
            <div>
              <p className="tiny">
                TU PUBLICACIÓN
              </p>

              <h2>
                Editar publicación ✏️
              </h2>

              <p>
                Corrige el contenido,
                cambia su categoría o
                actualiza la información
                que compartiste.
              </p>
            </div>

            <div className="welcomeOtter">
              {info.icono}
            </div>
          </section>

          <div
            style={{
              display:
                "flex",

              gap:
                "8px",

              flexWrap:
                "wrap",

              marginTop:
                "20px",
            }}
          >
            <Link
              href="/"
              className="backHomeButton"
            >
              ← Inicio
            </Link>

            <Link
              href="/perfil"
              className="backHomeButton"
            >
              👤 Mi perfil
            </Link>
          </div>

          {mensaje && (
            <div
              className="errorBox"
              style={{
                marginTop:
                  "18px",
              }}
            >
              {mensaje}
            </div>
          )}

          <section
            className="editPostGrid"
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "minmax(0, 1.45fr) minmax(260px, 0.7fr)",

              gap:
                "14px",

              marginTop:
                "22px",

              paddingBottom:
                "60px",
            }}
          >
            <section
              className="card"
              style={{
                padding:
                  "24px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "space-between",

                  gap:
                    "12px",

                  flexWrap:
                    "wrap",

                  marginBottom:
                    "20px",
                }}
              >
                <div>
                  <p className="tiny">
                    EDITAR
                  </p>

                  <h3
                    style={{
                      margin:
                        "6px 0 0",
                    }}
                  >
                    Actualiza tu publicación
                  </h3>
                </div>

                <span
                  className="cardIcon"
                  style={{
                    fontSize:
                      "23px",
                  }}
                >
                  {info.icono}
                </span>
              </div>

              <form
                onSubmit={
                  guardarCambios
                }
                className="authForm"
                style={{
                  gap:
                    "18px",
                }}
              >
                <div>
                  <label
                    style={{
                      display:
                        "block",

                      marginBottom:
                        "8px",

                      fontWeight:
                        700,
                    }}
                  >
                    Tipo de publicación
                  </label>

                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(145px, 1fr))",

                      gap:
                        "8px",
                    }}
                  >
                    {TIPOS.map(
                      (opcion) => {
                        const informacion =
                          INFO_TIPOS[
                            opcion
                          ];

                        const activo =
                          tipo ===
                          opcion;

                        return (
                          <button
                            key={
                              opcion
                            }
                            type="button"
                            disabled={
                              guardando
                            }
                            onClick={() =>
                              setTipo(
                                opcion
                              )
                            }
                            style={{
                              display:
                                "flex",

                              alignItems:
                                "center",

                              gap:
                                "8px",

                              padding:
                                "11px 12px",

                              border:
                                activo
                                  ? "1px solid #657a5b"
                                  : "1px solid #e5ddcf",

                              borderRadius:
                                "13px",

                              background:
                                activo
                                  ? "#e5eedc"
                                  : "#fbf9f4",

                              color:
                                activo
                                  ? "#506347"
                                  : "#555b51",

                              font:
                                "inherit",

                              fontSize:
                                "11px",

                              fontWeight:
                                activo
                                  ? 800
                                  : 700,

                              textAlign:
                                "left",

                              cursor:
                                guardando
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            <span
                              style={{
                                fontSize:
                                  "18px",
                              }}
                            >
                              {
                                informacion.icono
                              }
                            </span>

                            <span>
                              {opcion}
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div
                  style={{
                    padding:
                      "12px 13px",

                    borderRadius:
                      "13px",

                    background:
                      "#f7f4ee",

                    color:
                      "#70746a",

                    fontSize:
                      "11px",

                    lineHeight:
                      1.5,
                  }}
                >
                  <strong
                    style={{
                      color:
                        "#555b51",
                    }}
                  >
                    {info.icono}{" "}
                    {tipo}
                  </strong>

                  <br />

                  {
                    info.descripcion
                  }
                </div>

                <label>
                  <span
                    style={{
                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "space-between",

                      gap:
                        "10px",

                      flexWrap:
                        "wrap",
                    }}
                  >
                    <span>
                      Contenido
                    </span>

                    <small
                      style={{
                        color:
                          cercaDelLimite
                            ? "#a75b51"
                            : "#969188",

                        fontWeight:
                          cercaDelLimite
                            ? 800
                            : 500,
                      }}
                    >
                      {caracteres}
                      /3000
                    </small>
                  </span>

                  <textarea
                    value={
                      contenido
                    }
                    onChange={(e) =>
                      setContenido(
                        e.target.value
                      )
                    }
                    placeholder={
                      info.placeholder
                    }
                    rows={
                      11
                    }
                    maxLength={
                      3000
                    }
                    disabled={
                      guardando
                    }
                    style={{
                      minHeight:
                        "240px",

                      lineHeight:
                        1.6,

                      resize:
                        "vertical",
                    }}
                    required
                  />
                </label>

                <div
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "space-between",

                    gap:
                      "10px",

                    flexWrap:
                      "wrap",
                  }}
                >
                  <Link
                    href="/"
                    className="backHomeButton"
                  >
                    Cancelar
                  </Link>

                  <button
                    type="submit"
                    className="authButton"
                    disabled={
                      !puedeGuardar
                    }
                    style={{
                      width:
                        "auto",

                      minWidth:
                        "175px",
                    }}
                  >
                    {guardando
                      ? "Guardando..."
                      : "✓ Guardar cambios"}
                  </button>
                </div>
              </form>
            </section>

            <aside
              className="card"
              style={{
                alignSelf:
                  "start",

                padding:
                  "22px",
              }}
            >
              <p className="tiny">
                VISTA PREVIA
              </p>

              <h3
                style={{
                  margin:
                    "6px 0 5px",
                }}
              >
                Así quedará
              </h3>

              <p
                style={{
                  margin:
                    "0",

                  color:
                    "#70746a",

                  fontSize:
                    "12px",

                  lineHeight:
                    1.55,
                }}
              >
                Revisa los cambios antes
                de guardarlos.
              </p>

              <article
                className="post"
                style={{
                  marginTop:
                    "18px",
                }}
              >
                <div className="postHeader">
                  <div className="avatar">
                    <span>
                      🦦
                    </span>
                  </div>

                  <div className="postAuthor">
                    <strong>
                      Tú
                    </strong>

                    <p>
                      Uniónutriita
                    </p>

                    <span className="postDate">
                      Editando ahora
                    </span>
                  </div>

                  <span
                    className="tag"
                    style={{
                      marginTop:
                        0,
                    }}
                  >
                    {info.icono}{" "}
                    {tipo}
                  </span>
                </div>

                <p
                  className="postText"
                  style={{
                    whiteSpace:
                      "pre-wrap",

                    overflowWrap:
                      "anywhere",

                    color:
                      contenido.trim()
                        ? undefined
                        : "#aaa49a",
                  }}
                >
                  {contenido.trim() ||
                    info.placeholder}
                </p>
              </article>

              <div
                style={{
                  marginTop:
                    "18px",

                  paddingTop:
                    "18px",

                  borderTop:
                    "1px solid #eee7dc",
                }}
              >
                <p className="tiny">
                  RECUERDA
                </p>

                <div
                  style={{
                    display:
                      "grid",

                    gap:
                      "9px",

                    marginTop:
                      "12px",
                  }}
                >
                  <p
                    style={{
                      margin:
                        0,

                      color:
                        "#70746a",

                      fontSize:
                        "11px",

                      lineHeight:
                        1.5,
                    }}
                  >
                    ✏️ Puedes cambiar
                    tanto el texto como
                    el tipo de publicación.
                  </p>

                  <p
                    style={{
                      margin:
                        0,

                      color:
                        "#70746a",

                      fontSize:
                        "11px",

                      lineHeight:
                        1.5,
                    }}
                  >
                    🔒 Solo puedes editar
                    publicaciones que
                    pertenecen a tu cuenta.
                  </p>

                  <p
                    style={{
                      margin:
                        0,

                      color:
                        "#70746a",

                      fontSize:
                        "11px",

                      lineHeight:
                        1.5,
                    }}
                  >
                    💬 Los likes,
                    comentarios y guardados
                    seguirán asociados a la
                    misma publicación.
                  </p>
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>

      <nav className="mobileNav">
        <Link href="/">
          <span>
            🏠
          </span>

          <span>
            Inicio
          </span>
        </Link>

        <Link href="/buscar">
          <span>
            🔎
          </span>

          <span>
            Buscar
          </span>
        </Link>

        <Link
          href="/publicar"
          className="active"
        >
          <span>
            ➕
          </span>

          <span>
            Publicar
          </span>
        </Link>

        <Link href="/notificaciones">
          <span>
            🔔
          </span>

          <span>
            Actividad
          </span>
        </Link>

        <Link href="/perfil">
          <span>
            👤
          </span>

          <span>
            Perfil
          </span>
        </Link>
      </nav>

      <style jsx>{`
        @media (max-width: 850px) {
          .editPostGrid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

