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
  const [
    perfil,
    setPerfil,
  ] =
    useState<Perfil | null>(
      null
    );

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

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    cerrando,
    setCerrando,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargarPerfil() {
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
            .eq(
              "id",
              user.id
            )
            .maybeSingle(),

          supabase
            .from("posts")
            .select(
              "*",
              {
                count: "exact",
                head: true,
              }
            )
            .eq(
              "user_id",
              user.id
            ),

          supabase
            .from("connections")
            .select(
              "*",
              {
                count: "exact",
                head: true,
              }
            )
            .eq(
              "status",
              "accepted"
            )
            .or(
              `requester_id.eq.${user.id},receiver_id.eq.${user.id}`
            ),

          supabase
            .from("post_saves")
            .select(
              "*",
              {
                count: "exact",
                head: true,
              }
            )
            .eq(
              "user_id",
              user.id
            ),
        ]);

        if (
          perfilResultado.error
        ) {
          throw new Error(
            perfilResultado
              .error.message
          );
        }

        if (
          postsResultado.error
        ) {
          throw new Error(
            postsResultado
              .error.message
          );
        }

        if (
          conexionesResultado.error
        ) {
          throw new Error(
            conexionesResultado
              .error.message
          );
        }

        if (
          guardadosResultado.error
        ) {
          throw new Error(
            guardadosResultado
              .error.message
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
          postsResultado.count ||
            0
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
          setCargando(
            false
          );
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

  function fechaIngreso(
    fecha: string | null
  ) {
    if (!fecha) {
      return null;
    }

    return new Date(
      fecha
    ).toLocaleDateString(
      "es-MX",
      {
        month: "long",
        year: "numeric",
      }
    );
  }

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            👤
          </span>

          <p className="loadingText">
            Preparando tu perfil...
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

          <p className="profileEyebrow">
            UNIÓNUTRIIITA
          </p>

          <h1>
            No encontramos tu perfil
          </h1>

          <p
            style={{
              color:
                "#70746a",

              lineHeight:
                1.5,
            }}
          >
            Hubo un problema al
            recuperar la información
            de tu cuenta.
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

  const ingreso =
    fechaIngreso(
      perfil.created_at
    );

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
            style={{
              background:
                "#e5eedc",
            }}
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
            Tu cuenta
          </p>

          <Link
            href="/notificaciones"
            className="menuButton"
          >
            <span className="menuIcon">
              🔔
            </span>

            Notificaciones
          </Link>

          <Link
            href="/perfil"
            className="menuButton selected"
          >
            <span className="menuIcon">
              👤
            </span>

            Mi perfil
          </Link>

          <div className="otterCard">
            <span className="bigOtter">
              👤
            </span>

            <div>
              <strong>
                Tu espacio
              </strong>

              <p>
                Así te ve la comunidad
              </p>
            </div>
          </div>
        </aside>

        <main className="content">
          <section className="welcome">
            <div>
              <p className="tiny">
                TU CUENTA
              </p>

              <h2>
                Mi perfil 👤
              </h2>

              <p>
                Administra cómo apareces
                dentro de Uniónutriita,
                revisa tu actividad y
                mantén actualizada tu
                información universitaria.
              </p>
            </div>

            <div className="welcomeOtter">
              👤
            </div>
          </section>

          <section
            className="card"
            style={{
              marginTop:
                "20px",

              padding:
                "26px",

              overflow:
                "hidden",
            }}
          >
            <div
              style={{
                display:
                  "flex",

                alignItems:
                  "flex-start",

                justifyContent:
                  "space-between",

                gap:
                  "24px",

                flexWrap:
                  "wrap",
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    "18px",

                  flexWrap:
                    "wrap",
                }}
              >
                <div
                  className="profileAvatar"
                  style={{
                    margin: 0,
                  }}
                >
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
                    <span>
                      🦦
                    </span>
                  )}
                </div>

                <div>
                  <p
                    className="tiny"
                    style={{
                      marginBottom:
                        "6px",
                    }}
                  >
                    MI PERFIL
                  </p>

                  <h1
                    style={{
                      margin:
                        "0 0 4px",

                      fontSize:
                        "clamp(25px, 4vw, 36px)",

                      lineHeight:
                        1.15,
                    }}
                  >
                    {perfil.nombre ||
                      "Sin nombre"}
                  </h1>

                  <p
                    style={{
                      margin:
                        "0",

                      color:
                        "#7f7a71",

                      fontSize:
                        "14px",

                      fontWeight:
                        700,
                    }}
                  >
                    {perfil.username
                      ? `@${perfil.username}`
                      : "@sinusuario"}
                  </p>

                  <div
                    style={{
                      display:
                        "flex",

                      gap:
                        "6px",

                      flexWrap:
                        "wrap",

                      marginTop:
                        "12px",
                    }}
                  >
                    <span
                      style={{
                        padding:
                          "6px 9px",

                        borderRadius:
                          "999px",

                        background:
                          "#e5eedc",

                        color:
                          "#506347",

                        fontSize:
                          "11px",

                        fontWeight:
                          700,
                      }}
                    >
                      🎓{" "}
                      {perfil.carrera ||
                        "Carrera sin especificar"}
                    </span>

                    <span
                      style={{
                        padding:
                          "6px 9px",

                        borderRadius:
                          "999px",

                        background:
                          "#f3f0e8",

                        color:
                          "#686e63",

                        fontSize:
                          "11px",

                        fontWeight:
                          700,
                      }}
                    >
                      📖{" "}
                      {perfil.semestre ||
                        "Semestre sin especificar"}
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display:
                    "flex",

                  gap:
                    "8px",

                  flexWrap:
                    "wrap",
                }}
              >
                <Link
                  href="/perfil/editar"
                  className="editProfileButton"
                >
                  ✏️ Editar perfil
                </Link>

                {perfil.username && (
                  <Link
                    href={`/u/${perfil.username}`}
                    className="backHomeButton"
                  >
                    👁 Ver perfil público
                  </Link>
                )}
              </div>
            </div>

            <div
              className="profileStats"
              style={{
                marginTop:
                  "26px",
              }}
            >
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
          </section>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",

              gap:
                "14px",

              marginTop:
                "14px",
            }}
          >
            <section className="card">
              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  alignItems:
                    "center",

                  gap:
                    "10px",
                }}
              >
                <div>
                  <p className="tiny">
                    INFORMACIÓN
                  </p>

                  <h3
                    style={{
                      margin:
                        "6px 0 0",
                    }}
                  >
                    Datos universitarios
                  </h3>
                </div>

                <span
                  className="cardIcon"
                  style={{
                    fontSize:
                      "22px",
                  }}
                >
                  🎓
                </span>
              </div>

              <div
                className="profileInfo"
                style={{
                  marginTop:
                    "18px",
                }}
              >
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

              {ingreso && (
                <div
                  style={{
                    marginTop:
                      "16px",

                    padding:
                      "11px 12px",

                    borderRadius:
                      "12px",

                    background:
                      "#f7f4ee",

                    color:
                      "#70746a",

                    fontSize:
                      "12px",
                  }}
                >
                  🗓️ En Uniónutriita
                  desde{" "}
                  <strong>
                    {ingreso}
                  </strong>
                </div>
              )}
            </section>

            <section className="card">
              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  alignItems:
                    "center",

                  gap:
                    "10px",
                }}
              >
                <div>
                  <p className="tiny">
                    SOBRE MÍ
                  </p>

                  <h3
                    style={{
                      margin:
                        "6px 0 0",
                    }}
                  >
                    Bio
                  </h3>
                </div>

                <span
                  className="cardIcon"
                  style={{
                    fontSize:
                      "22px",
                  }}
                >
                  💬
                </span>
              </div>

              <div
                className="profileBio"
                style={{
                  marginTop:
                    "18px",
                }}
              >
                <p
                  style={{
                    whiteSpace:
                      "pre-wrap",

                    overflowWrap:
                      "anywhere",
                  }}
                >
                  {perfil.bio ||
                    "Todavía no has escrito nada sobre ti."}
                </p>
              </div>

              {!perfil.bio && (
                <Link
                  href="/perfil/editar"
                  className="backHomeButton"
                  style={{
                    marginTop:
                      "12px",
                  }}
                >
                  ＋ Agregar bio
                </Link>
              )}
            </section>
          </div>

          <section
            style={{
              marginTop:
                "28px",
            }}
          >
            <div className="sectionHeader">
              <p className="tiny">
                TU ACTIVIDAD
              </p>

              <h2>
                Accesos rápidos
              </h2>
            </div>

            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",

                gap:
                  "12px",
              }}
            >
              <Link
                href="/guardados"
                className="card"
                style={{
                  color:
                    "inherit",

                  textDecoration:
                    "none",
                }}
              >
                <span
                  className="cardIcon"
                  style={{
                    fontSize:
                      "22px",
                  }}
                >
                  🔖
                </span>

                <h3
                  style={{
                    margin:
                      "12px 0 5px",
                  }}
                >
                  Mis guardados
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
                      1.5,
                  }}
                >
                  Revisa las publicaciones
                  que reservaste para
                  después.
                </p>

                <strong
                  style={{
                    display:
                      "block",

                    marginTop:
                      "14px",

                    fontSize:
                      "22px",
                  }}
                >
                  {guardados}
                </strong>
              </Link>

              <Link
                href="/conexiones"
                className="card"
                style={{
                  color:
                    "inherit",

                  textDecoration:
                    "none",
                }}
              >
                <span
                  className="cardIcon"
                  style={{
                    fontSize:
                      "22px",
                  }}
                >
                  🤝
                </span>

                <h3
                  style={{
                    margin:
                      "12px 0 5px",
                  }}
                >
                  Mis conexiones
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
                      1.5,
                  }}
                >
                  Explora tu red de
                  estudiantes y encuentra
                  nuevas personas.
                </p>

                <strong
                  style={{
                    display:
                      "block",

                    marginTop:
                      "14px",

                    fontSize:
                      "22px",
                  }}
                >
                  {conexiones}
                </strong>
              </Link>

              <Link
                href="/publicar"
                className="card"
                style={{
                  color:
                    "inherit",

                  textDecoration:
                    "none",
                }}
              >
                <span
                  className="cardIcon"
                  style={{
                    fontSize:
                      "22px",
                  }}
                >
                  ✍️
                </span>

                <h3
                  style={{
                    margin:
                      "12px 0 5px",
                  }}
                >
                  Crear publicación
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
                      1.5,
                  }}
                >
                  Comparte algo con la
                  comunidad universitaria.
                </p>

                <strong
                  style={{
                    display:
                      "block",

                    marginTop:
                      "14px",

                    fontSize:
                      "22px",
                  }}
                >
                  {publicaciones}
                </strong>
              </Link>
            </div>
          </section>

          {mensaje && (
            <div
              className="errorBox"
              style={{
                marginTop:
                  "20px",
              }}
            >
              {mensaje}
            </div>
          )}

          <section
            className="card"
            style={{
              marginTop:
                "28px",

              marginBottom:
                "60px",

              padding:
                "20px",
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
                  "15px",

                flexWrap:
                  "wrap",
              }}
            >
              <div>
                <p className="tiny">
                  CUENTA
                </p>

                <h3
                  style={{
                    margin:
                      "6px 0 4px",
                  }}
                >
                  Sesión
                </h3>

                <p
                  style={{
                    margin: 0,

                    color:
                      "#70746a",

                    fontSize:
                      "12px",
                  }}
                >
                  Puedes cerrar tu sesión
                  de Uniónutriita desde
                  aquí.
                </p>
              </div>

              <div
                style={{
                  display:
                    "flex",

                  gap:
                    "8px",

                  flexWrap:
                    "wrap",
                }}
              >
                <Link
                  href="/"
                  className="backHomeButton"
                >
                  ← Inicio
                </Link>

                <button
                  type="button"
                  className="logoutButton"
                  onClick={
                    manejarCerrarSesion
                  }
                  disabled={
                    cerrando
                  }
                >
                  {cerrando
                    ? "Cerrando sesión..."
                    : "Cerrar sesión"}
                </button>
              </div>
            </div>
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

        <Link href="/estudio">
          <span>
            📚
          </span>

          <span>
            Estudio
          </span>
        </Link>

        <Link href="/publicar">
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

        <Link
          href="/perfil"
          className="active"
        >
          <span>
            👤
          </span>

          <span>
            Perfil
          </span>
        </Link>
      </nav>
    </div>
  );
}

