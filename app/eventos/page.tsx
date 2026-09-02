"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from "../../lib/supabase/client";
import { requerirUsuario } from "../../lib/auth";

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

type Asistente = {
  event_id: string;
  user_id: string;
};

export default function EventosPage() {
  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [
    eventos,
    setEventos,
  ] = useState<Evento[]>([]);

  const [
    asistentes,
    setAsistentes,
  ] = useState<Asistente[]>([]);

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    titulo,
    setTitulo,
  ] = useState("");

  const [
    descripcion,
    setDescripcion,
  ] = useState("");

  const [
    lugar,
    setLugar,
  ] = useState("");

  const [
    fechaInicio,
    setFechaInicio,
  ] = useState("");

  const [
    fechaFin,
    setFechaFin,
  ] = useState("");

  const [
    cupo,
    setCupo,
  ] = useState("");

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    creando,
    setCreando,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  async function cargarEventos() {
    const supabase =
      createClient();

    const [
      eventosResultado,
      asistentesResultado,
    ] = await Promise.all([
      supabase
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
        .order(
          "fecha_inicio",
          {
            ascending: true,
          }
        ),

      supabase
        .from("event_attendees")
        .select(`
          event_id,
          user_id
        `),
    ]);

    if (
      eventosResultado.error
    ) {
      throw new Error(
        eventosResultado.error.message
      );
    }

    if (
      asistentesResultado.error
    ) {
      throw new Error(
        asistentesResultado.error.message
      );
    }

    setEventos(
      (eventosResultado.data ||
        []) as Evento[]
    );

    setAsistentes(
      (asistentesResultado.data ||
        []) as Asistente[]
    );
  }

  useEffect(() => {
    let activo = true;

    async function iniciar() {
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

        await cargarEventos();
      } catch (error) {
        if (!activo) {
          return;
        }

        setMensaje(
          error instanceof Error
            ? error.message
            : "No pudimos cargar los eventos."
        );
      } finally {
        if (activo) {
          setCargando(
            false
          );
        }
      }
    }

    iniciar();

    return () => {
      activo = false;
    };
  }, []);

  async function crearEvento(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (
      !titulo.trim() ||
      !lugar.trim() ||
      !fechaInicio
    ) {
      setMensaje(
        "Completa título, lugar y fecha."
      );

      return;
    }

    const inicio =
      new Date(fechaInicio);

    if (
      Number.isNaN(
        inicio.getTime()
      )
    ) {
      setMensaje(
        "La fecha de inicio no es válida."
      );

      return;
    }

    let fin:
      Date | null = null;

    if (fechaFin) {
      fin =
        new Date(fechaFin);

      if (
        Number.isNaN(
          fin.getTime()
        )
      ) {
        setMensaje(
          "La fecha de finalización no es válida."
        );

        return;
      }

      if (
        fin.getTime() <=
        inicio.getTime()
      ) {
        setMensaje(
          "La fecha de finalización debe ser posterior al inicio."
        );

        return;
      }
    }

    const cupoNumero =
      cupo.trim()
        ? Number(cupo)
        : null;

    if (
      cupoNumero !== null &&
      (!Number.isInteger(
        cupoNumero
      ) ||
        cupoNumero < 1)
    ) {
      setMensaje(
        "El cupo debe ser un número entero mayor a 0."
      );

      return;
    }

    setCreando(true);
    setMensaje("");

    try {
      const supabase =
        createClient();

      const {
        data,
        error,
      } = await supabase
        .from("events")
        .insert({
          creator_id:
            currentUserId,

          titulo:
            titulo.trim(),

          descripcion:
            descripcion.trim() ||
            null,

          lugar:
            lugar.trim(),

          fecha_inicio:
            inicio.toISOString(),

          fecha_fin:
            fin
              ? fin.toISOString()
              : null,

          cupo:
            cupoNumero,
        })
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
        .single();

      if (error) {
        throw new Error(
          error.message
        );
      }

      setTitulo("");
      setDescripcion("");
      setLugar("");
      setFechaInicio("");
      setFechaFin("");
      setCupo("");

      setMostrarFormulario(
        false
      );

      if (data) {
        setEventos(
          (actuales) =>
            [
              ...actuales,
              data as Evento,
            ].sort(
              (a, b) =>
                new Date(
                  a.fecha_inicio
                ).getTime() -
                new Date(
                  b.fecha_inicio
                ).getTime()
            )
        );
      }
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? `No pudimos crear el evento: ${error.message}`
          : "No pudimos crear el evento."
      );
    } finally {
      setCreando(false);
    }
  }

  function totalAsistentes(
    eventId: string
  ) {
    return asistentes.filter(
      (asistente) =>
        asistente.event_id ===
        eventId
    ).length;
  }

  function asisto(
    eventId: string
  ) {
    return asistentes.some(
      (asistente) =>
        asistente.event_id ===
          eventId &&
        asistente.user_id ===
          currentUserId
    );
  }

  function fechaBonita(
    fecha: string
  ) {
    return new Date(
      fecha
    ).toLocaleString(
      "es-MX",
      {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  function diaEvento(
    fecha: string
  ) {
    return new Date(
      fecha
    ).toLocaleDateString(
      "es-MX",
      {
        day: "2-digit",
      }
    );
  }

  function mesEvento(
    fecha: string
  ) {
    return new Date(
      fecha
    )
      .toLocaleDateString(
        "es-MX",
        {
          month: "short",
        }
      )
      .replace(".", "")
      .toUpperCase();
  }

  const eventosFiltrados =
    useMemo(() => {
      const texto =
        busqueda
          .trim()
          .toLowerCase();

      return eventos.filter(
        (evento) => {
          const contenido = [
            evento.titulo,
            evento.descripcion,
            evento.lugar,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return (
            !texto ||
            contenido.includes(
              texto
            )
          );
        }
      );
    }, [
      eventos,
      busqueda,
    ]);

  const ahora =
    Date.now();

  const proximos =
    eventos.filter(
      (evento) =>
        new Date(
          evento.fecha_inicio
        ).getTime() >=
        ahora
    ).length;

  const eventosCreados =
    eventos.filter(
      (evento) =>
        evento.creator_id ===
        currentUserId
    ).length;

  const eventosConfirmados =
    eventos.filter(
      (evento) =>
        asisto(
          evento.id
        )
    ).length;

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            🎉
          </span>

          <p className="loadingText">
            Revisando la agenda del campus...
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
              <p className="tiny">
                VIDA UNIVERSITARIA
              </p>

              <h2>
                Eventos 🎉
              </h2>

              <p>
                Descubre actividades,
                reuniones, talleres y
                planes organizados por
                estudiantes de la
                comunidad.
              </p>
            </div>

            <div className="welcomeOtter">
              🎉
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(145px, 1fr))",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            <article className="card">
              <p className="tiny">
                AGENDA
              </p>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                  fontSize: "25px",
                }}
              >
                {eventos.length}
              </strong>

              <p>
                eventos registrados
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                PRÓXIMOS
              </p>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                  fontSize: "25px",
                }}
              >
                {proximos}
              </strong>

              <p>
                por celebrarse
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                VOY A
              </p>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                  fontSize: "25px",
                }}
              >
                {eventosConfirmados}
              </strong>

              <p>
                asistencias confirmadas
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                CREADOS POR MÍ
              </p>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                  fontSize: "25px",
                }}
              >
                {eventosCreados}
              </strong>

              <p>
                eventos organizados
              </p>
            </article>
          </section>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/"
                className="backHomeButton"
              >
                ← Inicio
              </Link>

              <Link
                href="/comunidades"
                className="backHomeButton"
              >
                🫂 Comunidades
              </Link>
            </div>

            <button
              type="button"
              className="primaryButton"
              onClick={() =>
                setMostrarFormulario(
                  !mostrarFormulario
                )
              }
            >
              {mostrarFormulario
                ? "✕ Cerrar formulario"
                : "＋ Crear evento"}
            </button>
          </div>

          {mostrarFormulario && (
            <section
              className="card"
              style={{
                maxWidth: "840px",
                marginTop: "18px",
                padding: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "flex-start",
                  gap: "15px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <p className="tiny">
                    ORGANIZAR
                  </p>

                  <h2
                    style={{
                      margin: "5px 0",
                    }}
                  >
                    Crear evento
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      color: "#70746a",
                      fontSize: "13px",
                      lineHeight: 1.5,
                    }}
                  >
                    Publica una actividad
                    para que otros
                    estudiantes puedan
                    descubrirla y
                    confirmar asistencia.
                  </p>
                </div>

                <span
                  style={{
                    fontSize: "34px",
                  }}
                >
                  🗓️
                </span>
              </div>

              <form
                className="authForm"
                onSubmit={
                  crearEvento
                }
              >
                <label>
                  Nombre del evento

                  <input
                    value={titulo}
                    onChange={(e) =>
                      setTitulo(
                        e.target.value
                      )
                    }
                    maxLength={150}
                    placeholder="Ej. Noche de juegos"
                    required
                  />
                </label>

                <label>
                  Descripción

                  <textarea
                    value={descripcion}
                    onChange={(e) =>
                      setDescripcion(
                        e.target.value
                      )
                    }
                    rows={4}
                    maxLength={3000}
                    placeholder="¿De qué trata el evento?"
                  />
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                  }}
                >
                  <label>
                    Lugar

                    <input
                      value={lugar}
                      onChange={(e) =>
                        setLugar(
                          e.target.value
                        )
                      }
                      maxLength={200}
                      placeholder="Ej. Explanada principal"
                      required
                    />
                  </label>

                  <label>
                    Cupo opcional

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={cupo}
                      onChange={(e) =>
                        setCupo(
                          e.target.value
                        )
                      }
                      placeholder="Ej. 50"
                    />
                  </label>

                  <label>
                    Inicio

                    <input
                      type="datetime-local"
                      value={fechaInicio}
                      onChange={(e) =>
                        setFechaInicio(
                          e.target.value
                        )
                      }
                      required
                    />
                  </label>

                  <label>
                    Finalización opcional

                    <input
                      type="datetime-local"
                      value={fechaFin}
                      onChange={(e) =>
                        setFechaFin(
                          e.target.value
                        )
                      }
                    />
                  </label>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    border:
                      "1px dashed #d5ccbd",
                    borderRadius: "13px",
                    background: "#f7f4ee",
                    color: "#70746a",
                    fontSize: "12px",
                    lineHeight: 1.5,
                  }}
                >
                  💡 El cupo es opcional.
                  Si lo dejas vacío, el
                  evento no tendrá límite
                  de asistentes.
                </div>

                <button
                  type="submit"
                  className="authButton"
                  disabled={creando}
                >
                  {creando
                    ? "Creando evento..."
                    : "🎉 Publicar evento"}
                </button>
              </form>
            </section>
          )}

          {mensaje && (
            <div
              className="errorBox"
              style={{
                marginTop: "18px",
              }}
            >
              {mensaje}
            </div>
          )}

          <section
            style={{
              marginTop: "30px",
              paddingBottom: "60px",
            }}
          >
            <div className="sectionHeader">
              <p className="tiny">
                AGENDA
              </p>

              <h2>
                Explorar eventos
              </h2>
            </div>

            <div
              className="card"
              style={{
                padding: "14px",
                marginBottom: "16px",
              }}
            >
              <div
                className="searchBox"
                style={{
                  width: "100%",
                }}
              >
                <span>
                  🔎
                </span>

                <input
                  value={busqueda}
                  onChange={(e) =>
                    setBusqueda(
                      e.target.value
                    )
                  }
                  placeholder="Buscar evento, actividad o lugar..."
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "14px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#70746a",
                  fontSize: "12px",
                }}
              >
                Mostrando{" "}
                <strong>
                  {eventosFiltrados.length}
                </strong>{" "}
                de{" "}
                <strong>
                  {eventos.length}
                </strong>{" "}
                eventos
              </p>

              {busqueda && (
                <span
                  className="tag"
                  style={{
                    marginTop: 0,
                  }}
                >
                  🔎 Búsqueda activa
                </span>
              )}
            </div>

            {eventosFiltrados.length ===
            0 ? (
              <div className="emptyState">
                <span className="emptyStateIcon">
                  🎉
                </span>

                <strong>
                  No encontramos eventos
                </strong>

                <p
                  style={{
                    marginBottom: 0,
                  }}
                >
                  Prueba con otro nombre
                  o lugar.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(285px, 1fr))",
                  gap: "14px",
                }}
              >
                {eventosFiltrados.map(
                  (evento) => {
                    const total =
                      totalAsistentes(
                        evento.id
                      );

                    const voy =
                      asisto(
                        evento.id
                      );

                    const lleno =
                      evento.cupo !==
                        null &&
                      total >=
                        evento.cupo;

                    const esMio =
                      evento.creator_id ===
                      currentUserId;

                    const yaPaso =
                      new Date(
                        evento.fecha_inicio
                      ).getTime() <
                      Date.now();

                    return (
                      <article
                        key={
                          evento.id
                        }
                        className="card"
                        style={{
                          display: "flex",
                          flexDirection:
                            "column",
                          minHeight: "370px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems:
                              "flex-start",
                            justifyContent:
                              "space-between",
                            gap: "12px",
                          }}
                        >
                          <div
                            style={{
                              width: "58px",
                              overflow:
                                "hidden",
                              border:
                                "1px solid #e4ddcf",
                              borderRadius:
                                "14px",
                              background:
                                "#f7f4ee",
                              textAlign:
                                "center",
                            }}
                          >
                            <div
                              style={{
                                padding:
                                  "5px",
                                background:
                                  "#e5eedc",
                                color:
                                  "#506347",
                                fontSize:
                                  "10px",
                                fontWeight:
                                  900,
                              }}
                            >
                              {mesEvento(
                                evento.fecha_inicio
                              )}
                            </div>

                            <div
                              style={{
                                padding:
                                  "7px 4px",
                                color:
                                  "#30352d",
                                fontSize:
                                  "23px",
                                fontWeight:
                                  900,
                              }}
                            >
                              {diaEvento(
                                evento.fecha_inicio
                              )}
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: "5px",
                              flexWrap: "wrap",
                              justifyContent:
                                "flex-end",
                            }}
                          >
                            {esMio && (
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
                                Mi evento
                              </span>
                            )}

                            {voy && (
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
                                ✓ Voy
                              </span>
                            )}

                            {yaPaso && (
                              <span
                                style={{
                                  padding:
                                    "5px 8px",
                                  borderRadius:
                                    "999px",
                                  background:
                                    "#f3f0e8",
                                  color:
                                    "#7b766f",
                                  fontSize:
                                    "10px",
                                  fontWeight:
                                    800,
                                }}
                              >
                                Finalizado
                              </span>
                            )}
                          </div>
                        </div>

                        <p
                          className="tiny"
                          style={{
                            marginTop: "15px",
                          }}
                        >
                          EVENTO
                        </p>

                        <h3
                          style={{
                            margin:
                              "6px 0 4px",
                            fontSize:
                              "18px",
                            lineHeight: 1.3,
                          }}
                        >
                          {evento.titulo}
                        </h3>

                        <p
                          style={{
                            margin:
                              "5px 0",
                            color:
                              "#70746a",
                            fontSize:
                              "13px",
                            lineHeight: 1.55,
                          }}
                        >
                          {evento.descripcion ||
                            "Sin descripción."}
                        </p>

                        <div
                          style={{
                            display: "grid",
                            gap: "7px",
                            marginTop: "12px",
                            padding:
                              "11px 12px",
                            borderRadius:
                              "12px",
                            background:
                              "#f7f4ee",
                            color:
                              "#686e63",
                            fontSize:
                              "12px",
                          }}
                        >
                          <div>
                            📅{" "}
                            {fechaBonita(
                              evento.fecha_inicio
                            )}
                          </div>

                          <div>
                            📍 {evento.lugar}
                          </div>

                          {evento.fecha_fin && (
                            <div>
                              🕐 Termina:{" "}
                              {fechaBonita(
                                evento.fecha_fin
                              )}
                            </div>
                          )}

                          <div>
                            👥{" "}
                            <strong>
                              {total}
                            </strong>

                            {evento.cupo !==
                            null
                              ? ` / ${evento.cupo}`
                              : ""}{" "}
                            asistentes
                          </div>
                        </div>

                        {lleno &&
                          !voy && (
                            <div
                              style={{
                                marginTop:
                                  "10px",
                                padding:
                                  "8px 10px",
                                borderRadius:
                                  "10px",
                                background:
                                  "#f8e6e2",
                                color:
                                  "#a75f59",
                                fontSize:
                                  "11px",
                                fontWeight:
                                  800,
                              }}
                            >
                              🔴 Cupo lleno
                            </div>
                          )}

                        <div
                          style={{
                            marginTop: "auto",
                            paddingTop: "16px",
                          }}
                        >
                          <Link
                            href={`/eventos/${evento.id}`}
                            className="primaryButton"
                          >
                            Ver evento →
                          </Link>
                        </div>
                      </article>
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
    </div>
  );
}
