"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { createClient } from "../../../lib/supabase/client";
import { requerirUsuario } from "../../../lib/auth";

type Evento = {
  id: string;
  creator_id: string;
  titulo: string;
  descripcion: string | null;
  lugar: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  cupo: number | null;
  created_at: string;
};

type PerfilMini = {
  id: string;
  username: string | null;
  nombre: string | null;
  avatar_url: string | null;
};

type Asistente = {
  event_id: string;
  user_id: string;
  created_at: string;
};

export default function EventoPage() {
  const params =
    useParams();

  const eventId =
    typeof params.id ===
    "string"
      ? params.id
      : Array.isArray(
          params.id
        )
      ? params.id[0]
      : "";

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [
    evento,
    setEvento,
  ] =
    useState<Evento | null>(
      null
    );

  const [
    creador,
    setCreador,
  ] =
    useState<PerfilMini | null>(
      null
    );

  const [
    asistentes,
    setAsistentes,
  ] =
    useState<Asistente[]>(
      []
    );

  const [
    perfilesAsistentes,
    setPerfilesAsistentes,
  ] =
    useState<PerfilMini[]>(
      []
    );

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    procesando,
    setProcesando,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  async function cargarAsistentes(
    eventoActual: Evento
  ) {
    const supabase =
      createClient();

    const {
      data: asistentesData,
      error: asistentesError,
    } = await supabase
      .from("event_attendees")
      .select(`
        event_id,
        user_id,
        created_at
      `)
      .eq(
        "event_id",
        eventoActual.id
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (
      asistentesError
    ) {
      throw new Error(
        asistentesError.message
      );
    }

    const lista =
      (asistentesData ||
        []) as Asistente[];

    setAsistentes(
      lista
    );

    if (
      lista.length ===
      0
    ) {
      setPerfilesAsistentes(
        []
      );

      return;
    }

    const ids =
      lista.map(
        (item) =>
          item.user_id
      );

    const {
      data: perfilesData,
      error: perfilesError,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        username,
        nombre,
        avatar_url
      `)
      .in(
        "id",
        ids
      );

    if (
      perfilesError
    ) {
      throw new Error(
        perfilesError.message
      );
    }

    const perfiles =
      (perfilesData ||
        []) as PerfilMini[];

    const mapa =
      new Map<
        string,
        PerfilMini
      >();

    perfiles.forEach(
      (perfil) => {
        mapa.set(
          perfil.id,
          perfil
        );
      }
    );

    const perfilesOrdenados =
      lista
        .map(
          (asistente) =>
            mapa.get(
              asistente.user_id
            )
        )
        .filter(
          Boolean
        ) as PerfilMini[];

    setPerfilesAsistentes(
      perfilesOrdenados
    );
  }

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const user =
          await requerirUsuario();

        if (
          !user ||
          !activo
        ) {
          return;
        }

        setCurrentUserId(
          user.id
        );

        const supabase =
          createClient();

        const {
          data: eventoData,
          error: eventoError,
        } = await supabase
          .from("events")
          .select(`
            id,
            creator_id,
            titulo,
            descripcion,
            lugar,
            fecha_inicio,
            fecha_fin,
            cupo,
            created_at
          `)
          .eq(
            "id",
            eventId
          )
          .maybeSingle();

        if (
          eventoError
        ) {
          throw new Error(
            eventoError.message
          );
        }

        if (
          !eventoData
        ) {
          throw new Error(
            "Este evento no existe."
          );
        }

        const eventoActual =
          eventoData as Evento;

        if (!activo) {
          return;
        }

        setEvento(
          eventoActual
        );

        const {
          data: creadorData,
          error: creadorError,
        } = await supabase
          .from("profiles")
          .select(`
            id,
            username,
            nombre,
            avatar_url
          `)
          .eq(
            "id",
            eventoActual.creator_id
          )
          .maybeSingle();

        if (
          creadorError
        ) {
          throw new Error(
            creadorError.message
          );
        }

        if (
          creadorData
        ) {
          setCreador(
            creadorData as PerfilMini
          );
        }

        await cargarAsistentes(
          eventoActual
        );
      } catch (error) {
        if (!activo) {
          return;
        }

        setMensaje(
          error instanceof Error
            ? error.message
            : "No pudimos cargar el evento."
        );
      } finally {
        if (activo) {
          setCargando(
            false
          );
        }
      }
    }

    cargar();

    return () => {
      activo = false;
    };
  }, [eventId]);

  const asisto =
    asistentes.some(
      (asistente) =>
        asistente.user_id ===
        currentUserId
    );

  const esCreador =
    evento?.creator_id ===
    currentUserId;

  const lleno =
    evento?.cupo !==
      null &&
    evento?.cupo !==
      undefined &&
    asistentes.length >=
      evento.cupo;

  const lugaresDisponibles =
    evento?.cupo
      ? Math.max(
          0,
          evento.cupo -
            asistentes.length
        )
      : null;

  const porcentajeCupo =
    evento?.cupo
      ? Math.min(
          100,
          Math.round(
            (asistentes.length /
              evento.cupo) *
              100
          )
        )
      : 0;

  const ahora =
    Date.now();

  const inicioEvento =
    evento
      ? new Date(
          evento.fecha_inicio
        ).getTime()
      : 0;

  const finEvento =
    evento?.fecha_fin
      ? new Date(
          evento.fecha_fin
        ).getTime()
      : null;

  const finalizado =
    finEvento !== null &&
    ahora > finEvento;

  const yaInicio =
    ahora >= inicioEvento;

  function estadoEvento() {
    if (finalizado) {
      return {
        texto:
          "Finalizado",
        icono:
          "✓",
        fondo:
          "#f3f0e8",
        color:
          "#686e63",
      };
    }

    if (yaInicio) {
      return {
        texto:
          "En curso",
        icono:
          "🟢",
        fondo:
          "#e5eedc",
        color:
          "#506347",
      };
    }

    return {
      texto:
        "Próximo",
      icono:
        "📅",
      fondo:
        "#f8e7c7",
      color:
        "#715d3d",
    };
  }

  async function confirmarAsistencia() {
    if (!evento) {
      return;
    }

    if (
      lleno &&
      !asisto
    ) {
      alert(
        "El evento ya alcanzó su cupo."
      );

      return;
    }

    setProcesando(true);

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from(
            "event_attendees"
          )
          .insert({
            event_id:
              evento.id,

            user_id:
              currentUserId,
          });

      if (error) {
        throw new Error(
          error.message
        );
      }

      await cargarAsistentes(
        evento
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos confirmar tu asistencia."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function cancelarAsistencia() {
    if (!evento) {
      return;
    }

    setProcesando(true);

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from(
            "event_attendees"
          )
          .delete()
          .eq(
            "event_id",
            evento.id
          )
          .eq(
            "user_id",
            currentUserId
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      await cargarAsistentes(
        evento
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos cancelar tu asistencia."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function eliminarEvento() {
    if (
      !evento ||
      !esCreador
    ) {
      return;
    }

    const confirmado =
      window.confirm(
        "¿Seguro que quieres eliminar este evento?"
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
          .from("events")
          .delete()
          .eq(
            "id",
            evento.id
          )
          .eq(
            "creator_id",
            currentUserId
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      window.location.href =
        "/eventos";
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos eliminar el evento."
      );

      setProcesando(false);
    }
  }

  function fechaBonita(
    fecha: string
  ) {
    return new Date(
      fecha
    ).toLocaleString(
      "es-MX",
      {
        weekday:
          "long",

        day:
          "numeric",

        month:
          "long",

        year:
          "numeric",

        hour:
          "numeric",

        minute:
          "2-digit",
      }
    );
  }

  function fechaCorta(
    fecha: string
  ) {
    return new Date(
      fecha
    ).toLocaleDateString(
      "es-MX",
      {
        day:
          "numeric",

        month:
          "short",
      }
    );
  }

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            🎉
          </span>

          <p className="loadingText">
            Preparando el evento...
          </p>
        </div>
      </main>
    );
  }

  if (!evento) {
    return (
      <main className="profilePage">
        <section className="profileCard">
          <div className="profileAvatar">
            🎉
          </div>

          <p className="profileEyebrow">
            EVENTOS
          </p>

          <h1>
            Evento no encontrado
          </h1>

          <p
            style={{
              color:
                "#70746a",

              lineHeight:
                1.5,
            }}
          >
            Puede que este evento
            haya sido eliminado o
            que el enlace sea
            incorrecto.
          </p>

          {mensaje && (
            <div className="errorBox">
              {mensaje}
            </div>
          )}

          <Link
            href="/eventos"
            className="backHomeButton"
          >
            ← Volver a Eventos
          </Link>
        </section>
      </main>
    );
  }

  const estado =
    estadoEvento();

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
            className="menuButton selected"
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
            className="menuButton"
          >
            <span className="menuIcon">
              👤
            </span>

            Mi perfil
          </Link>

          <div className="otterCard">
            <span className="bigOtter">
              🎉
            </span>

            <div>
              <strong>
                Agenda
              </strong>

              <p>
                Vive el campus
              </p>
            </div>
          </div>
        </aside>

        <main className="content">
          <section className="welcome">
            <div>
              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    "8px",

                  flexWrap:
                    "wrap",

                  marginBottom:
                    "7px",
                }}
              >
                <p
                  className="tiny"
                  style={{
                    margin: 0,
                  }}
                >
                  EVENTO
                </p>

                <span
                  style={{
                    padding:
                      "5px 8px",

                    borderRadius:
                      "999px",

                    background:
                      estado.fondo,

                    color:
                      estado.color,

                    fontSize:
                      "10px",

                    fontWeight:
                      800,
                  }}
                >
                  {estado.icono}{" "}
                  {estado.texto}
                </span>

                {asisto && (
                  <span
                    style={{
                      padding:
                        "5px 8px",

                      borderRadius:
                        "999px",

                      background:
                        "#e5eedc",

                      color:
                        "#506347",

                      fontSize:
                        "10px",

                      fontWeight:
                        800,
                    }}
                  >
                    ✓ Vas a asistir
                  </span>
                )}

                {esCreador && (
                  <span
                    style={{
                      padding:
                        "5px 8px",

                      borderRadius:
                        "999px",

                      background:
                        "#f8e7c7",

                      color:
                        "#715d3d",

                      fontSize:
                        "10px",

                      fontWeight:
                        800,
                    }}
                  >
                    ★ Tu evento
                  </span>
                )}
              </div>

              <h2>
                {evento.titulo}
              </h2>

              <p>
                {evento.descripcion ||
                  "El organizador todavía no agregó una descripción para este evento."}
              </p>
            </div>

            <div className="welcomeOtter">
              🎉
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
              href="/eventos"
              className="backHomeButton"
            >
              ← Eventos
            </Link>

            <Link
              href="/"
              className="backHomeButton"
            >
              🏠 Inicio
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
                "minmax(0, 1.5fr) minmax(260px, 0.8fr)",

              gap:
                "14px",

              marginTop:
                "24px",
            }}
            className="eventDetailGrid"
          >
            <article
              className="card"
              style={{
                padding:
                  "22px",
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
                }}
              >
                <div>
                  <p className="tiny">
                    INFORMACIÓN
                  </p>

                  <h3
                    style={{
                      margin:
                        "5px 0 0",
                    }}
                  >
                    Detalles del evento
                  </h3>
                </div>

                <span
                  className="cardIcon"
                  style={{
                    fontSize:
                      "23px",
                  }}
                >
                  🗓️
                </span>
              </div>

              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",

                  gap:
                    "10px",

                  marginTop:
                    "18px",
                }}
              >
                <div
                  style={{
                    padding:
                      "14px",

                    borderRadius:
                      "13px",

                    background:
                      "#f7f4ee",
                  }}
                >
                  <span
                    style={{
                      display:
                        "block",

                      color:
                        "#969188",

                      fontSize:
                        "9px",

                      fontWeight:
                        800,

                      letterSpacing:
                        "0.5px",
                    }}
                  >
                    INICIO
                  </span>

                  <strong
                    style={{
                      display:
                        "block",

                      marginTop:
                        "6px",

                      fontSize:
                        "12px",

                      lineHeight:
                        1.5,
                    }}
                  >
                    📅{" "}
                    {fechaBonita(
                      evento.fecha_inicio
                    )}
                  </strong>
                </div>

                {evento.fecha_fin && (
                  <div
                    style={{
                      padding:
                        "14px",

                      borderRadius:
                        "13px",

                      background:
                        "#f7f4ee",
                    }}
                  >
                    <span
                      style={{
                        display:
                          "block",

                        color:
                          "#969188",

                        fontSize:
                          "9px",

                        fontWeight:
                          800,

                        letterSpacing:
                          "0.5px",
                      }}
                    >
                      FINALIZA
                    </span>

                    <strong
                      style={{
                        display:
                          "block",

                        marginTop:
                          "6px",

                        fontSize:
                          "12px",

                        lineHeight:
                          1.5,
                      }}
                    >
                      🕐{" "}
                      {fechaBonita(
                        evento.fecha_fin
                      )}
                    </strong>
                  </div>
                )}

                <div
                  style={{
                    padding:
                      "14px",

                    borderRadius:
                      "13px",

                    background:
                      "#f7f4ee",
                  }}
                >
                  <span
                    style={{
                      display:
                        "block",

                      color:
                        "#969188",

                      fontSize:
                        "9px",

                      fontWeight:
                        800,

                      letterSpacing:
                        "0.5px",
                    }}
                  >
                    LUGAR
                  </span>

                  <strong
                    style={{
                      display:
                        "block",

                      marginTop:
                        "6px",

                      fontSize:
                        "12px",

                      lineHeight:
                        1.5,

                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    📍{" "}
                    {evento.lugar}
                  </strong>
                </div>

                <div
                  style={{
                    padding:
                      "14px",

                    borderRadius:
                      "13px",

                    background:
                      "#f7f4ee",
                  }}
                >
                  <span
                    style={{
                      display:
                        "block",

                      color:
                        "#969188",

                      fontSize:
                        "9px",

                      fontWeight:
                        800,

                      letterSpacing:
                        "0.5px",
                    }}
                  >
                    ASISTENCIA
                  </span>

                  <strong
                    style={{
                      display:
                        "block",

                      marginTop:
                        "6px",

                      fontSize:
                        "12px",
                    }}
                  >
                    👥{" "}
                    {asistentes.length}
                    {evento.cupo
                      ? ` de ${evento.cupo}`
                      : ""}
                  </strong>
                </div>
              </div>

              {evento.cupo && (
                <div
                  style={{
                    marginTop:
                      "16px",
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
                        "10px",

                      marginBottom:
                        "6px",

                      color:
                        "#70746a",

                      fontSize:
                        "11px",
                    }}
                  >
                    <span>
                      Cupo del evento
                    </span>

                    <strong>
                      {lleno
                        ? "Cupo lleno"
                        : `${lugaresDisponibles} ${
                            lugaresDisponibles ===
                            1
                              ? "lugar disponible"
                              : "lugares disponibles"
                          }`}
                    </strong>
                  </div>

                  <div
                    style={{
                      height:
                        "8px",

                      overflow:
                        "hidden",

                      borderRadius:
                        "999px",

                      background:
                        "#eee8de",
                    }}
                  >
                    <div
                      style={{
                        width:
                          `${porcentajeCupo}%`,

                        height:
                          "100%",

                        borderRadius:
                          "999px",

                        background:
                          lleno
                            ? "#a75b51"
                            : "#657a5b",

                        transition:
                          "width 0.25s ease",
                      }}
                    />
                  </div>
                </div>
              )}

              <div
                style={{
                  marginTop:
                    "20px",

                  paddingTop:
                    "18px",

                  borderTop:
                    "1px solid #eee7dc",
                }}
              >
                <p className="tiny">
                  ORGANIZA
                </p>

                {creador ? (
                  <div
                    style={{
                      display:
                        "flex",

                      alignItems:
                        "center",

                      gap:
                        "10px",

                      marginTop:
                        "10px",
                    }}
                  >
                    {creador.username ? (
                      <Link
                        href={`/u/${creador.username}`}
                        className="avatar"
                        style={{
                          width:
                            "44px",

                          height:
                            "44px",
                        }}
                      >
                        {creador.avatar_url ? (
                          <img
                            src={
                              creador.avatar_url
                            }
                            alt={
                              creador.nombre ||
                              "Organizador"
                            }
                          />
                        ) : (
                          <span>
                            🦦
                          </span>
                        )}
                      </Link>
                    ) : (
                      <div
                        className="avatar"
                        style={{
                          width:
                            "44px",

                          height:
                            "44px",
                        }}
                      >
                        {creador.avatar_url ? (
                          <img
                            src={
                              creador.avatar_url
                            }
                            alt={
                              creador.nombre ||
                              "Organizador"
                            }
                          />
                        ) : (
                          <span>
                            🦦
                          </span>
                        )}
                      </div>
                    )}

                    <div>
                      {creador.username ? (
                        <Link
                          href={`/u/${creador.username}`}
                          style={{
                            color:
                              "#30352d",

                            fontSize:
                              "12px",

                            fontWeight:
                              800,

                            textDecoration:
                              "none",
                          }}
                        >
                          {creador.nombre ||
                            "Estudiante"}
                        </Link>
                      ) : (
                        <strong
                          style={{
                            fontSize:
                              "12px",
                          }}
                        >
                          {creador.nombre ||
                            "Estudiante"}
                        </strong>
                      )}

                      {creador.username && (
                        <p
                          style={{
                            margin:
                              "2px 0 0",

                            color:
                              "#969188",

                            fontSize:
                              "10px",
                          }}
                        >
                          @{creador.username}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p
                    style={{
                      color:
                        "#70746a",

                      fontSize:
                        "12px",
                    }}
                  >
                    No pudimos mostrar
                    el perfil del
                    organizador.
                  </p>
                )}
              </div>
            </article>

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
                TU ASISTENCIA
              </p>

              <h3
                style={{
                  margin:
                    "6px 0 7px",
                }}
              >
                {esCreador
                  ? "Administrar evento"
                  : asisto
                  ? "Ya estás en la lista"
                  : lleno
                  ? "El evento está lleno"
                  : "¿Quieres asistir?"}
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
                {esCreador
                  ? "Eres la persona que creó este evento."
                  : asisto
                  ? "Tu lugar está confirmado. Si tus planes cambian, puedes cancelar tu asistencia."
                  : lleno
                  ? "Por ahora no quedan lugares disponibles."
                  : evento.cupo
                  ? `${lugaresDisponibles} ${
                      lugaresDisponibles ===
                      1
                        ? "lugar disponible"
                        : "lugares disponibles"
                    }.`
                  : "Este evento no tiene un límite de asistentes."}
              </p>

              {!esCreador &&
                !asisto && (
                  <button
                    type="button"
                    className="editProfileButton"
                    style={{
                      width:
                        "100%",

                      justifyContent:
                        "center",

                      marginTop:
                        "18px",

                      border:
                        0,
                    }}
                    disabled={
                      procesando ||
                      lleno
                    }
                    onClick={
                      confirmarAsistencia
                    }
                  >
                    {procesando
                      ? "Confirmando..."
                      : lleno
                      ? "Cupo lleno"
                      : "✅ Confirmar asistencia"}
                  </button>
                )}

              {!esCreador &&
                asisto && (
                  <button
                    type="button"
                    className="logoutButton"
                    style={{
                      width:
                        "100%",

                      justifyContent:
                        "center",

                      marginTop:
                        "18px",
                    }}
                    disabled={
                      procesando
                    }
                    onClick={
                      cancelarAsistencia
                    }
                  >
                    {procesando
                      ? "Procesando..."
                      : "❌ Cancelar asistencia"}
                  </button>
                )}

              {esCreador && (
                <>
                  <div
                    style={{
                      marginTop:
                        "17px",

                      padding:
                        "11px 12px",

                      borderRadius:
                        "12px",

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
                    👥{" "}
                    <strong>
                      {asistentes.length}
                    </strong>{" "}
                    personas han
                    confirmado hasta
                    ahora.
                  </div>

                  <button
                    type="button"
                    className="logoutButton"
                    style={{
                      width:
                        "100%",

                      justifyContent:
                        "center",

                      marginTop:
                        "12px",
                    }}
                    disabled={
                      procesando
                    }
                    onClick={
                      eliminarEvento
                    }
                  >
                    {procesando
                      ? "Eliminando..."
                      : "🗑️ Eliminar evento"}
                  </button>
                </>
              )}
            </aside>
          </section>

          <section
            style={{
              marginTop:
                "30px",

              paddingBottom:
                "60px",
            }}
          >
            <div className="sectionHeader">
              <p className="tiny">
                ASISTENTES
              </p>

              <h2>
                ¿Quién va?
              </h2>
            </div>

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

                marginBottom:
                  "14px",
              }}
            >
              <p
                style={{
                  margin: 0,

                  color:
                    "#70746a",

                  fontSize:
                    "12px",
                }}
              >
                <strong>
                  {perfilesAsistentes.length}
                </strong>{" "}
                {perfilesAsistentes.length ===
                1
                  ? "persona confirmada"
                  : "personas confirmadas"}
              </p>

              <span
                className="tag"
                style={{
                  marginTop:
                    0,
                }}
              >
                📅{" "}
                {fechaCorta(
                  evento.fecha_inicio
                )}
              </span>
            </div>

            {perfilesAsistentes.length ===
            0 ? (
              <div className="emptyState">
                <span className="emptyStateIcon">
                  👥
                </span>

                <strong>
                  Todavía nadie ha confirmado
                </strong>

                <p
                  style={{
                    marginBottom:
                      0,
                  }}
                >
                  Cuando los estudiantes
                  confirmen su asistencia,
                  aparecerán aquí.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",

                  gap:
                    "10px",
                }}
              >
                {perfilesAsistentes.map(
                  (persona) => {
                    const contenidoPersona = (
                      <article
                        className="card"
                        style={{
                          display:
                            "flex",

                          alignItems:
                            "center",

                          gap:
                            "10px",

                          height:
                            "100%",

                          padding:
                            "14px",
                        }}
                      >
                        <div
                          className="avatar"
                          style={{
                            width:
                              "42px",

                            height:
                              "42px",
                          }}
                        >
                          {persona.avatar_url ? (
                            <img
                              src={
                                persona.avatar_url
                              }
                              alt={
                                persona.nombre ||
                                "Usuario"
                              }
                            />
                          ) : (
                            <span>
                              🦦
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            minWidth:
                              0,
                          }}
                        >
                          <strong
                            style={{
                              display:
                                "block",

                              fontSize:
                                "12px",

                              overflowWrap:
                                "anywhere",
                            }}
                          >
                            {persona.nombre ||
                              "Estudiante"}
                          </strong>

                          {persona.username && (
                            <p
                              style={{
                                margin:
                                  "3px 0 0",

                                color:
                                  "#969188",

                                fontSize:
                                  "10px",

                                overflowWrap:
                                  "anywhere",
                              }}
                            >
                              @{persona.username}
                            </p>
                          )}
                        </div>
                      </article>
                    );

                    return persona.username ? (
                      <Link
                        key={
                          persona.id
                        }
                        href={`/u/${persona.username}`}
                        style={{
                          color:
                            "inherit",

                          textDecoration:
                            "none",
                        }}
                      >
                        {contenidoPersona}
                      </Link>
                    ) : (
                      <div
                        key={
                          persona.id
                        }
                      >
                        {contenidoPersona}
                      </div>
                    );
                  }
                )}
              </div>
            )}
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

        <Link href="/publicar">
          <span>
            ➕
          </span>

          <span>
            Publicar
          </span>
        </Link>

        <Link
          href="/eventos"
          className="active"
        >
          <span>
            🎉
          </span>

          <span>
            Eventos
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
          .eventDetailGrid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
