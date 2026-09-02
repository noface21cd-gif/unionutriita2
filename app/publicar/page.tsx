"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

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

const INFO_TIPOS: Record<
  TipoPost,
  {
    icono: string;
    titulo: string;
    descripcion: string;
    placeholder: string;
  }
> = {
  Publicación: {
    icono: "💬",
    titulo: "Publicación",
    descripcion:
      "Comparte una idea, experiencia o algo que quieras contarle a la comunidad.",
    placeholder:
      "¿Qué quieres compartir con la comunidad?",
  },

  Apunte: {
    icono: "📚",
    titulo: "Apunte",
    descripcion:
      "Comparte información académica, consejos de clase o conocimiento útil.",
    placeholder:
      "Comparte tu apunte, resumen, explicación o consejo...",
  },

  Pregunta: {
    icono: "❓",
    titulo: "Pregunta",
    descripcion:
      "Pregunta algo a otros estudiantes y encuentra distintas respuestas.",
    placeholder:
      "¿Qué quieres preguntarle a la comunidad?",
  },

  Formulario: {
    icono: "📋",
    titulo: "Formulario",
    descripcion:
      "Solicita participación en encuestas o formularios para trabajos académicos.",
    placeholder:
      "Explica de qué trata tu formulario y cómo pueden ayudarte...",
  },

  Ayuda: {
    icono: "🤝",
    titulo: "Ayuda",
    descripcion:
      "Busca apoyo de otros estudiantes para una materia, actividad o proyecto.",
    placeholder:
      "Explica qué ayuda necesitas...",
  },

  Aviso: {
    icono: "📢",
    titulo: "Aviso",
    descripcion:
      "Comparte información importante que pueda ser útil para la comunidad.",
    placeholder:
      "Escribe el aviso que quieres compartir...",
  },
};

export default function PublicarPage() {
  const [
    userId,
    setUserId,
  ] = useState("");

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
    publicando,
    setPublicando,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  useEffect(() => {
    let activo = true;

    async function comprobarUsuario() {
      try {
        const user =
          await requerirUsuario();

        if (
          !user ||
          !activo
        ) {
          return;
        }

        setUserId(
          user.id
        );
      } catch (error) {
        if (!activo) {
          return;
        }

        setMensaje(
          error instanceof Error
            ? error.message
            : "No pudimos identificar tu sesión."
        );
      } finally {
        if (activo) {
          setCargando(
            false
          );
        }
      }
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

    setPublicando(true);

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from("posts")
          .insert({
            user_id:
              userId,

            tipo,

            contenido:
              contenidoLimpio,
          });

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
          ? `No pudimos publicar: ${error.message}`
          : "No pudimos crear la publicación."
      );

      setPublicando(
        false
      );
    }
  }

  const info =
    INFO_TIPOS[tipo];

  const caracteres =
    contenido.length;

  const cercaDelLimite =
    caracteres >= 2700;

  const puedePublicar =
    Boolean(
      userId &&
        contenido.trim() &&
        !publicando
    );

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            ✍️
          </span>

          <p className="loadingText">
            Preparando tu publicación...
          </p>
        </div>
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
              ✍️
            </span>

            <div>
              <strong>
                Participa
              </strong>

              <p>
                Comparte con el campus
              </p>
            </div>
          </div>
        </aside>

        <main className="content">
          <section className="welcome">
            <div>
              <p className="tiny">
                COMPARTIR
              </p>

              <h2>
                Nueva publicación ✍️
              </h2>

              <p>
                Comparte una idea,
                pregunta, apunte o aviso
                con toda la comunidad
                universitaria.
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
            className="publishGrid"
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
                    CREAR
                  </p>

                  <h3
                    style={{
                      margin:
                        "6px 0 0",
                    }}
                  >
                    ¿Qué quieres compartir?
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
                  crearPublicacion
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
                            onClick={() =>
                              setTipo(
                                opcion
                              )
                            }
                            disabled={
                              publicando
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
                                publicando
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

                  <select
                    value={
                      tipo
                    }
                    onChange={(e) =>
                      setTipo(
                        e.target
                          .value as TipoPost
                      )
                    }
                    disabled={
                      publicando
                    }
                    aria-label="Tipo de publicación"
                    style={{
                      position:
                        "absolute",

                      width:
                        "1px",

                      height:
                        "1px",

                      opacity:
                        0,

                      pointerEvents:
                        "none",
                    }}
                  >
                    {TIPOS.map(
                      (opcion) => (
                        <option
                          key={
                            opcion
                          }
                          value={
                            opcion
                          }
                        >
                          {opcion}
                        </option>
                      )
                    )}
                  </select>
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
                    {info.titulo}
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
                      publicando
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
                      !puedePublicar
                    }
                    style={{
                      width:
                        "auto",

                      minWidth:
                        "155px",
                    }}
                  >
                    {publicando
                      ? "Publicando..."
                      : `${info.icono} Publicar`}
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
                Así se verá
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
                Puedes revisar tu
                publicación antes de
                compartirla.
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
                      Ahora
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
                  CONSEJOS
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
                  <div
                    style={{
                      display:
                        "flex",

                      gap:
                        "9px",

                      alignItems:
                        "flex-start",

                      color:
                        "#70746a",

                      fontSize:
                        "11px",

                      lineHeight:
                        1.45,
                    }}
                  >
                    <span>
                      ✨
                    </span>

                    <span>
                      Explica claramente
                      qué quieres compartir
                      o preguntar.
                    </span>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",

                      gap:
                        "9px",

                      alignItems:
                        "flex-start",

                      color:
                        "#70746a",

                      fontSize:
                        "11px",

                      lineHeight:
                        1.45,
                    }}
                  >
                    <span>
                      🎯
                    </span>

                    <span>
                      Elige el tipo que
                      mejor represente tu
                      publicación.
                    </span>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",

                      gap:
                        "9px",

                      alignItems:
                        "flex-start",

                      color:
                        "#70746a",

                      fontSize:
                        "11px",

                      lineHeight:
                        1.45,
                    }}
                  >
                    <span>
                      🤝
                    </span>

                    <span>
                      Mantén una
                      conversación útil
                      para la comunidad.
                    </span>
                  </div>
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
          .publishGrid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
