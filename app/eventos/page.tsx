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

  const [eventos, setEventos] =
    useState<Evento[]>([]);

  const [asistentes, setAsistentes] =
    useState<Asistente[]>([]);

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [titulo, setTitulo] =
    useState("");

  const [descripcion, setDescripcion] =
    useState("");

  const [lugar, setLugar] =
    useState("");

  const [
    fechaInicio,
    setFechaInicio,
  ] = useState("");

  const [fechaFin, setFechaFin] =
    useState("");

  const [cupo, setCupo] =
    useState("");

  const [busqueda, setBusqueda] =
    useState("");

  const [cargando, setCargando] =
    useState(true);

  const [creando, setCreando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

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
        .order("fecha_inicio", {
          ascending: true,
        }),

      supabase
        .from("event_attendees")
        .select(`
          event_id,
          user_id
        `),
    ]);

    if (eventosResultado.error) {
      throw new Error(
        eventosResultado.error.message
      );
    }

    if (asistentesResultado.error) {
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

        if (!user || !activo) {
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
          setCargando(false);
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

    let fin: Date | null =
      null;

    if (fechaFin) {
      fin = new Date(fechaFin);

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

      const { data, error } =
        await supabase
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

      setMostrarFormulario(false);

      if (data) {
        setEventos(
          (actuales) =>
            [...actuales, data as Evento].sort(
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
            eventos de la comunidad.
          </p>
        </div>

        <div className="welcomeOtter">
          🎉
        </div>
      </section>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginTop: "20px",
        }}
      >
        <Link
          href="/"
          className="primaryButton"
        >
          ← Inicio
        </Link>

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
            ? "Cancelar"
            : "＋ Crear evento"}
        </button>
      </div>

      {mostrarFormulario && (
        <section
          className="profileCard"
          style={{
            maxWidth: "720px",
            marginTop: "22px",
          }}
        >
          <h2>
            Crear evento
          </h2>

          <form
            className="authForm"
            onSubmit={crearEvento}
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
                placeholder="¿De qué trata?"
              />
            </label>

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

            <button
              type="submit"
              className="authButton"
              disabled={creando}
            >
              {creando
                ? "Creando evento..."
                : "Publicar evento"}
            </button>
          </form>
        </section>
      )}

      {mensaje && (
        <div
          className="errorBox"
          style={{
            marginTop: "20px",
          }}
        >
          {mensaje}
        </div>
      )}

      <section
        style={{
          marginTop: "28px",
        }}
      >
        <p className="tiny">
          AGENDA
        </p>

        <h2>
          Próximos eventos
        </h2>

        <div
          className="searchBox"
          style={{
            width: "100%",
            maxWidth: "650px",
            marginBottom: "20px",
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
            placeholder="Buscar evento o lugar..."
          />
        </div>

        {eventosFiltrados.length ===
        0 ? (
          <div className="emptyState">
            <span className="emptyStateIcon">
              🎉
            </span>

            Todavía no hay eventos.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
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

                return (
                  <article
                    key={
                      evento.id
                    }
                    className="card"
                  >
                    <div
                      style={{
                        fontSize:
                          "38px",
                      }}
                    >
                      🎉
                    </div>

                    <p className="tiny">
                      EVENTO
                    </p>

                    <h3>
                      {
                        evento.titulo
                      }
                    </h3>

                    <p
                      style={{
                        color:
                          "#70746a",
                        fontSize:
                          "13px",
                      }}
                    >
                      {evento.descripcion ||
                        "Sin descripción."}
                    </p>

                    <p>
                      📅{" "}
                      {fechaBonita(
                        evento.fecha_inicio
                      )}
                    </p>

                    <p>
                      📍{" "}
                      {evento.lugar}
                    </p>

                    <p
                      style={{
                        color:
                          "#70746a",
                        fontSize:
                          "13px",
                      }}
                    >
                      👥 {total}
                      {evento.cupo
                        ? ` / ${evento.cupo}`
                        : ""}{" "}
                      asistentes
                    </p>

                    {voy && (
                      <p
                        style={{
                          color:
                            "#657a5b",
                          fontWeight:
                            800,
                          fontSize:
                            "13px",
                        }}
                      >
                        ✓ Confirmaste asistencia
                      </p>
                    )}

                    {!voy &&
                      lleno && (
                        <p
                          style={{
                            color:
                              "#a75f59",
                            fontWeight:
                              800,
                            fontSize:
                              "13px",
                          }}
                        >
                          Cupo lleno
                        </p>
                      )}

                    <Link
                      href={`/eventos/${evento.id}`}
                      className="primaryButton"
                      style={{
                        display:
                          "inline-block",
                        marginTop:
                          "8px",
                      }}
                    >
                      Ver evento →
                    </Link>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </main>
  );
}
