"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { createClient } from "../../lib/supabase/client";
import { requerirUsuario } from "../../lib/auth";

type PerfilMini = {
  id: string;
  username: string | null;
  nombre: string | null;
  avatar_url: string | null;
};

type PostMini = {
  id: string;
  contenido: string;
};

type Like = {
  post_id: string;
  user_id: string;
  created_at: string;
};

type Comentario = {
  id: string;
  post_id: string;
  user_id: string;
  contenido: string;
  created_at: string;
};

type Conexion = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted";
  created_at: string;
};

type Notificacion = {
  id: string;
  tipo: "like" | "comentario" | "solicitud" | "conexion";
  actor: PerfilMini | null;
  fecha: string;
  texto: string;
  detalle?: string;
  destino: string;
};

export default function NotificacionesPage() {
  const [notificaciones, setNotificaciones] =
    useState<Notificacion[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [mensaje, setMensaje] =
    useState("");

  useEffect(() => {
    let activo = true;

    async function cargarNotificaciones() {
      try {
        const user =
          await requerirUsuario();

        if (!user || !activo) {
          return;
        }

        const supabase =
          createClient();

        /*
         * 1. Buscar nuestras publicaciones
         */
        const {
          data: postsData,
          error: postsError,
        } = await supabase
          .from("posts")
          .select("id, contenido")
          .eq("user_id", user.id);

        if (postsError) {
          throw new Error(
            postsError.message
          );
        }

        const misPosts =
          (postsData || []) as PostMini[];

        const idsPosts =
          misPosts.map(
            (post) => post.id
          );

        /*
         * 2. Conexiones relacionadas
         * con nosotros.
         */
        const {
          data: conexionesData,
          error: conexionesError,
        } = await supabase
          .from("connections")
          .select(`
            id,
            requester_id,
            receiver_id,
            status,
            created_at
          `)
          .or(
            `requester_id.eq.${user.id},receiver_id.eq.${user.id}`
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(50);

        if (conexionesError) {
          throw new Error(
            conexionesError.message
          );
        }

        let likes: Like[] = [];
        let comentarios: Comentario[] = [];

        /*
         * 3. Likes y comentarios
         * recibidos en nuestros posts.
         */
        if (idsPosts.length > 0) {
          const [
            likesResultado,
            comentariosResultado,
          ] = await Promise.all([
            supabase
              .from("post_likes")
              .select(`
                post_id,
                user_id,
                created_at
              `)
              .in(
                "post_id",
                idsPosts
              )
              .neq(
                "user_id",
                user.id
              )
              .order(
                "created_at",
                {
                  ascending: false,
                }
              )
              .limit(50),

            supabase
              .from("comments")
              .select(`
                id,
                post_id,
                user_id,
                contenido,
                created_at
              `)
              .in(
                "post_id",
                idsPosts
              )
              .neq(
                "user_id",
                user.id
              )
              .order(
                "created_at",
                {
                  ascending: false,
                }
              )
              .limit(50),
          ]);

          if (
            likesResultado.error
          ) {
            throw new Error(
              likesResultado.error.message
            );
          }

          if (
            comentariosResultado.error
          ) {
            throw new Error(
              comentariosResultado.error.message
            );
          }

          likes =
            (likesResultado.data ||
              []) as Like[];

          comentarios =
            (comentariosResultado.data ||
              []) as Comentario[];
        }

        const conexiones =
          (conexionesData ||
            []) as Conexion[];

        /*
         * 4. Averiguar qué usuarios
         * participan en las notificaciones.
         */
        const idsActores =
          new Set<string>();

        likes.forEach((like) => {
          idsActores.add(
            like.user_id
          );
        });

        comentarios.forEach(
          (comentario) => {
            idsActores.add(
              comentario.user_id
            );
          }
        );

        conexiones.forEach(
          (conexion) => {
            const otroUsuario =
              conexion.requester_id ===
              user.id
                ? conexion.receiver_id
                : conexion.requester_id;

            idsActores.add(
              otroUsuario
            );
          }
        );

        let perfiles: PerfilMini[] =
          [];

        if (idsActores.size > 0) {
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
              Array.from(
                idsActores
              )
            );

          if (perfilesError) {
            throw new Error(
              perfilesError.message
            );
          }

          perfiles =
            (perfilesData ||
              []) as PerfilMini[];
        }

        const mapaPerfiles =
          new Map<
            string,
            PerfilMini
          >();

        perfiles.forEach(
          (perfil) => {
            mapaPerfiles.set(
              perfil.id,
              perfil
            );
          }
        );

        const mapaPosts =
          new Map<
            string,
            PostMini
          >();

        misPosts.forEach(
          (post) => {
            mapaPosts.set(
              post.id,
              post
            );
          }
        );

        /*
         * 5. Construir notificaciones
         */
        const resultado:
          Notificacion[] = [];

        likes.forEach((like) => {
          const actor =
            mapaPerfiles.get(
              like.user_id
            ) || null;

          const post =
            mapaPosts.get(
              like.post_id
            );

          resultado.push({
            id: `like-${like.user_id}-${like.post_id}`,
            tipo: "like",
            actor,
            fecha:
              like.created_at,
            texto:
              "le gustó tu publicación.",
            detalle:
              post?.contenido,
            destino: "/",
          });
        });

        comentarios.forEach(
          (comentario) => {
            const actor =
              mapaPerfiles.get(
                comentario.user_id
              ) || null;

            resultado.push({
              id: `comment-${comentario.id}`,
              tipo:
                "comentario",
              actor,
              fecha:
                comentario.created_at,
              texto:
                "comentó en tu publicación.",
              detalle:
                comentario.contenido,
              destino: "/",
            });
          }
        );

        conexiones.forEach(
          (conexion) => {
            const otroUsuarioId =
              conexion.requester_id ===
              user.id
                ? conexion.receiver_id
                : conexion.requester_id;

            const actor =
              mapaPerfiles.get(
                otroUsuarioId
              ) || null;

            /*
             * Solicitud recibida.
             */
            if (
              conexion.status ===
                "pending" &&
              conexion.receiver_id ===
                user.id
            ) {
              resultado.push({
                id: `request-${conexion.id}`,
                tipo:
                  "solicitud",
                actor,
                fecha:
                  conexion.created_at,
                texto:
                  "quiere conectar contigo.",
                destino:
                  "/conexiones",
              });
            }

            /*
             * Conexiones ya aceptadas.
             */
            if (
              conexion.status ===
              "accepted"
            ) {
              resultado.push({
                id: `connection-${conexion.id}`,
                tipo:
                  "conexion",
                actor,
                fecha:
                  conexion.created_at,
                texto:
                  "ahora forma parte de tus conexiones.",
                destino:
                  actor?.username
                    ? `/u/${actor.username}`
                    : "/conexiones",
              });
            }
          }
        );

        /*
         * Más recientes primero.
         */
        resultado.sort(
          (a, b) =>
            new Date(
              b.fecha
            ).getTime() -
            new Date(
              a.fecha
            ).getTime()
        );

        if (activo) {
          setNotificaciones(
            resultado
          );
        }
      } catch (error) {
        if (!activo) {
          return;
        }

        setMensaje(
          error instanceof Error
            ? `No pudimos cargar las notificaciones: ${error.message}`
            : "No pudimos cargar las notificaciones."
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarNotificaciones();

    return () => {
      activo = false;
    };
  }, []);

  function icono(
    tipo: Notificacion["tipo"]
  ) {
    switch (tipo) {
      case "like":
        return "♥️";

      case "comentario":
        return "💬";

      case "solicitud":
        return "📩";

      case "conexion":
        return "🤝";

      default:
        return "🔔";
    }
  }

  function fechaBonita(
    fecha: string
  ) {
    return new Date(
      fecha
    ).toLocaleString("es-MX", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            🔔
          </span>

          <p className="loadingText">
            Revisando qué pasó mientras
            nadabas por otros lados...
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
            ACTIVIDAD
          </p>

          <h2>
            Notificaciones 🔔
          </h2>

          <p>
            Likes, comentarios,
            solicitudes y conexiones
            recientes.
          </p>
        </div>

        <div className="welcomeOtter">
          🦦
        </div>
      </section>

      <div
        style={{
          marginTop: "18px",
        }}
      >
        <Link
          href="/"
          className="primaryButton"
        >
          ← Volver al inicio
        </Link>
      </div>

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

      {!mensaje &&
        notificaciones.length ===
          0 && (
          <div
            className="emptyState"
            style={{
              marginTop:
                "22px",
            }}
          >
            <span className="emptyStateIcon">
              🔔
            </span>

            No tienes notificaciones
            todavía.
          </div>
        )}

      <section
        style={{
          display: "grid",
          gap: "12px",
          maxWidth: "780px",
          marginTop: "22px",
        }}
      >
        {notificaciones.map(
          (notificacion) => {
            const nombre =
              notificacion.actor
                ?.nombre ||
              "Un estudiante";

            const username =
              notificacion.actor
                ?.username;

            return (
              <Link
                key={
                  notificacion.id
                }
                href={
                  notificacion.destino
                }
                className="card"
                style={{
                  display: "flex",
                  alignItems:
                    "flex-start",
                  gap: "12px",
                  textDecoration:
                    "none",
                }}
              >
                <div
                  className="avatar"
                  style={{
                    width: "46px",
                    height: "46px",
                  }}
                >
                  {notificacion.actor
                    ?.avatar_url ? (
                    <img
                      src={
                        notificacion
                          .actor
                          .avatar_url
                      }
                      alt={nombre}
                    />
                  ) : (
                    <span>
                      {icono(
                        notificacion.tipo
                      )}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      lineHeight:
                        1.45,
                    }}
                  >
                    <strong>
                      {nombre}
                    </strong>{" "}

                    {username &&
                      `@${username} `}

                    {
                      notificacion.texto
                    }
                  </p>

                  {notificacion.detalle && (
                    <p
                      style={{
                        margin:
                          "6px 0 0",
                        color:
                          "#70746a",
                        fontSize:
                          "13px",
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      “
                      {
                        notificacion.detalle
                      }
                      ”
                    </p>
                  )}

                  <span
                    style={{
                      display:
                        "block",
                      marginTop:
                        "6px",
                      color:
                        "#969188",
                      fontSize:
                        "11px",
                    }}
                  >
                    {fechaBonita(
                      notificacion.fecha
                    )}
                  </span>
                </div>

                <span>
                  {icono(
                    notificacion.tipo
                  )}
                </span>
              </Link>
            );
          }
        )}
      </section>
    </main>
  );
}

