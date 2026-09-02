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

  const [evento, setEvento] =
    useState<Evento | null>(
      null
    );

  const [creador, setCreador] =
    useState<PerfilMini | null>(
      null
    );

  const [
    asistentes,
    setAsistentes,
  ] = useState<Asistente[]>(
    []
  );

  const [
    perfilesAsistentes,
    setPerfilesAsistentes,
  ] = useState<PerfilMini[]>(
    []
  );

  const [cargando, setCargando] =
    useState(true);

  const [
    procesando,
    setProcesando,
  ] = useState(false);

  const [mensaje, setMensaje] =
    useState("");

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
      .order("created_at", {
        ascending: true,
      });

    if (asistentesError) {
      throw new Error(
        asistentesError.message
      );
    }

    const lista =
      (asistentesData ||
        []) as Asistente[];

    setAsistentes(lista);

    if (
      lista.length === 0
    ) {
      setPerfilesAsistentes(
        []
      );
      return;
    }

    const ids = lista.map(
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
      .in("id", ids);

    if (perfilesError) {
      throw new Error(
        perfilesError.message
      );
    }

    setPerfilesAsistentes(
      (perfilesData ||
        []) as PerfilMini[]
    );
  }

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

        if (eventoError) {
          throw new Error(
            eventoError.message
          );
        }

        if (!eventoData) {
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

        if (creadorError) {
          throw new Error(
            creadorError.message
          );
        }

        if (creadorData) {
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
          setCargando(false);
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
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
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

          <h1>
            Evento no encontrado
          </h1>

          <div className="errorBox">
            {mensaje}
          </div>

          <Link
            href="/eventos"
            className="backHomeButton"
          >
            Volver a eventos
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="content">
      <section className="welcome">
        <div>
          <p className="tiny">
            EVENTO
          </p>

          <h2>
            {evento.titulo}
          </h2>

          <p>
            {evento.descripcion ||
              "Sin descripción."}
          </p>
        </div>

        <div className="welcomeOtter">
          🎉
        </div>
      </section>

      <section
        className="profileCard"
        style={{
          maxWidth: "780px",
          marginTop: "24px",
        }}
      >
        <p>
          <strong>
            📅 Inicio
          </strong>
          <br />
          {fechaBonita(
            evento.fecha_inicio
          )}
        </p>

        {evento.fecha_fin && (
          <p>
            <strong>
              🕐 Finaliza
            </strong>
            <br />
            {fechaBonita(
              evento.fecha_fin
            )}
          </p>
        )}

        <p>
          <strong>
            📍 Lugar
          </strong>
          <br />
          {evento.lugar}
        </p>

        <p>
          <strong>
            👥 Asistentes
          </strong>
          <br />

          {asistentes.length}

          {evento.cupo
            ? ` / ${evento.cupo}`
            : ""}
        </p>

        {creador && (
          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: "10px",
              marginTop:
                "20px",
            }}
          >
            <Link
              href={`/u/${creador.username}`}
              className="avatar"
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

            <div>
              <span
                style={{
                  color:
                    "#969188",
                  fontSize:
                    "11px",
                }}
              >
                ORGANIZA
              </span>

              <div>
                <strong>
                  {creador.nombre ||
                    "Estudiante"}
                </strong>
              </div>

              <small>
                @
                {creador.username ||
                  "usuario"}
              </small>
            </div>
          </div>
        )}

        {!esCreador &&
          !asisto && (
            <button
              type="button"
              className="editProfileButton"
              style={{
                border: 0,
              }}
              disabled={
                procesando ||
                lleno
              }
              onClick={
                confirmarAsistencia
              }
            >
              {lleno
                ? "Cupo lleno"
                : "✅ Confirmar asistencia"}
            </button>
          )}

        {!esCreador &&
          asisto && (
            <button
              type="button"
              className="logoutButton"
              disabled={
                procesando
              }
              onClick={
                cancelarAsistencia
              }
            >
              ❌ Cancelar asistencia
            </button>
          )}

        {esCreador && (
          <button
            type="button"
            className="logoutButton"
            disabled={
              procesando
            }
            onClick={
              eliminarEvento
            }
          >
            🗑 Eliminar evento
          </button>
        )}

        <Link
          href="/eventos"
          className="backHomeButton"
        >
          ← Volver a eventos
        </Link>
      </section>

      <section
        style={{
          maxWidth: "780px",
          marginTop: "28px",
        }}
      >
        <p className="tiny">
          ASISTENTES
        </p>

        <h2>
          ¿Quién va?
        </h2>

        {perfilesAsistentes.length ===
        0 ? (
          <div className="emptyState">
            <span className="emptyStateIcon">
              👥
            </span>

            Todavía nadie ha confirmado.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "10px",
            }}
          >
            {perfilesAsistentes.map(
              (persona) => (
                <Link
                  key={
                    persona.id
                  }
                  href={`/u/${persona.username}`}
                  className="card"
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: "10px",
                    textDecoration:
                      "none",
                  }}
                >
                  <div className="avatar">
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

                  <div>
                    <strong>
                      {persona.nombre ||
                        "Estudiante"}
                    </strong>

                    <p
                      style={{
                        margin:
                          "3px 0 0",
                        color:
                          "#969188",
                        fontSize:
                          "12px",
                      }}
                    >
                      @
                      {persona.username ||
                        "usuario"}
                    </p>
                  </div>
                </Link>
              )
            )}
          </div>
        )}
      </section>
    </main>
  );
}
