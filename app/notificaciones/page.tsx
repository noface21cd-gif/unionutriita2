"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

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
  status:
    | "pending"
    | "accepted";
  created_at: string;
};

type TipoNotificacion =
  | "like"
  | "comentario"
  | "solicitud"
  | "conexion";

type Notificacion = {
  id: string;
  tipo: TipoNotificacion;
  actor: PerfilMini | null;
  fecha: string;
  texto: string;
  detalle?: string;
  destino: string;
};

type Filtro =
  | "todas"
  | TipoNotificacion;

export default function NotificacionesPage() {
  const [
    notificaciones,
    setNotificaciones,
  ] = useState<Notificacion[]>([]);

  const [
    filtro,
    setFiltro,
  ] =
    useState<Filtro>("todas");

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargarNotificaciones() {
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

        /*
         * 1. Buscar nuestras publicaciones.
         */
        const {
          data: postsData,
          error: postsError,
        } = await supabase
          .from("posts")
          .select(
            "id, contenido"
          )
          .eq(
            "user_id",
            user.id
          );

        if (postsError) {
          throw new Error(
            postsError.message
          );
        }

        const misPosts =
          (postsData ||
            []) as PostMini[];

        const idsPosts =
          misPosts.map(
            (post) =>
              post.id
          );

        /*
         * 2. Conexiones relacionadas
         * con nosotros.
         */
        const {
          data: conexionesData,
          error:
            conexionesError,
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
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(50);

        if (
          conexionesError
        ) {
          throw new Error(
            conexionesError.message
          );
        }

        let likes: Like[] = [];

        let comentarios:
          Comentario[] = [];

        /*
         * 3. Likes y comentarios
         * recibidos en nuestros posts.
         */
        if (
          idsPosts.length >
          0
        ) {
          const [
            likesResultado,
            comentariosResultado,
          ] = await Promise.all([
            supabase
              .from(
                "post_likes"
              )
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
                  ascending:
                    false,
                }
              )
              .limit(50),

            supabase
              .from(
                "comments"
              )
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
                  ascending:
                    false,
                }
              )
              .limit(50),
          ]);

          if (
            likesResultado.error
          ) {
            throw new Error(
              likesResultado
                .error.message
            );
          }

          if (
            comentariosResultado.error
          ) {
            throw new Error(
              comentariosResultado
                .error.message
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
         * 4. Buscar perfiles de quienes
         * aparecen en la actividad.
         */
        const idsActores =
          new Set<string>();

        likes.forEach(
          (like) => {
            idsActores.add(
              like.user_id
            );
          }
        );

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

        let perfiles:
          PerfilMini[] = [];

        if (
          idsActores.size >
          0
        ) {
          const {
            data:
              perfilesData,
            error:
              perfilesError,
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

          if (
            perfilesError
          ) {
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
         * 5. Construir la actividad.
         */
        const resultado:
          Notificacion[] = [];

        likes.forEach(
          (like) => {
            const actor =
              mapaPerfiles.get(
                like.user_id
              ) || null;

            const post =
              mapaPosts.get(
                like.post_id
              );

            resultado.push({
              id:
                `like-${like.user_id}-${like.post_id}`,

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
          }
        );

        comentarios.forEach(
          (comentario) => {
            const actor =
              mapaPerfiles.get(
                comentario.user_id
              ) || null;

            resultado.push({
              id:
                `comment-${comentario.id}`,

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
                id:
                  `request-${conexion.id}`,

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
             * Conexión aceptada.
             */
            if (
              conexion.status ===
              "accepted"
            ) {
              resultado.push({
                id:
                  `connection-${conexion.id}`,

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
          setCargando(
            false
          );
        }
      }
    }

    cargarNotificaciones();

    return () => {
      activo = false;
    };
  }, []);

  function icono(
    tipo: TipoNotificacion
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

  function nombreTipo(
    tipo: TipoNotificacion
  ) {
    switch (tipo) {
      case "like":
        return "Me gusta";

      case "comentario":
        return "Comentario";

      case "solicitud":
        return "Solicitud";

      case "conexion":
        return "Conexión";

      default:
        return "Actividad";
    }
  }

  function fondoTipo(
    tipo: TipoNotificacion
  ) {
    switch (tipo) {
      case "like":
        return "#f8e6e2";

      case "comentario":
        return "#e8edf4";

      case "solicitud":
        return "#f8e7c7";

      case "conexion":
        return "#e5eedc";

      default:
        return "#f3f0e8";
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
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  const notificacionesFiltradas =
    useMemo(() => {
      if (
        filtro === "todas"
      ) {
        return notificaciones;
      }

      return notificaciones.filter(
        (notificacion) =>
          notificacion.tipo ===
          filtro
      );
    }, [
      filtro,
      notificaciones,
    ]);

  const totalLikes =
    notificaciones.filter(
      (notificacion) =>
        notificacion.tipo ===
        "like"
    ).length;

  const totalComentarios =
    notificaciones.filter(
      (notificacion) =>
        notificacion.tipo ===
        "comentario"
    ).length;

  const totalSolicitudes =
    notificaciones.filter(
      (notificacion) =>
        notificacion.tipo ===
        "solicitud"
    ).length;

  const totalConexiones =
    notificaciones.filter(
      (notificacion) =>
        notificacion.tipo ===
        "conexion"
    ).length;

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            🔔
          </span>

          <p className="loadingText">
            Revisando la actividad...
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
            style={{
              background:
                "#e5eedc",
            }}
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
            className="menuButton selected"
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
              🔔
            </span>

            <div>
              <strong>
                Actividad
              </strong>

              <p>
                Lo que está pasando
              </p>
            </div>
          </div>
        </aside>

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
                Revisa quién interactuó
                con tus publicaciones,
                quién quiere conectar
                contigo y los movimientos
                recientes de tu red.
              </p>
            </div>

            <div className="welcomeOtter">
              🔔
            </div>
          </section>

          <section
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(145px, 1fr))",

              gap:
                "10px",

              marginTop:
                "20px",
            }}
          >
            <article className="card">
              <p className="tiny">
                ACTIVIDAD
              </p>

              <strong
                style={{
                  display:
                    "block",

                  marginTop:
                    "5px",

                  fontSize:
                    "25px",
                }}
              >
                {
                  notificaciones.length
                }
              </strong>

              <p>
                notificaciones totales
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                ME GUSTA
              </p>

              <strong
                style={{
                  display:
                    "block",

                  marginTop:
                    "5px",

                  fontSize:
                    "25px",
                }}
              >
                {totalLikes}
              </strong>

              <p>
                reacciones recibidas
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                COMENTARIOS
              </p>

              <strong
                style={{
                  display:
                    "block",

                  marginTop:
                    "5px",

                  fontSize:
                    "25px",
                }}
              >
                {totalComentarios}
              </strong>

              <p>
                respuestas recibidas
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                RED
              </p>

              <strong
                style={{
                  display:
                    "block",

                  marginTop:
                    "5px",

                  fontSize:
                    "25px",
                }}
              >
                {totalSolicitudes +
                  totalConexiones}
              </strong>

              <p>
                movimientos de conexión
              </p>
            </article>
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
              href="/conexiones"
              className="backHomeButton"
            >
              🤝 Conexiones
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
              marginTop:
                "30px",

              paddingBottom:
                "60px",
            }}
          >
            <div className="sectionHeader">
              <p className="tiny">
                BANDEJA DE ACTIVIDAD
              </p>

              <h2>
                Lo más reciente
              </h2>
            </div>

            <div
              className="card"
              style={{
                padding:
                  "10px 14px",

                marginBottom:
                  "16px",
              }}
            >
              <div
                className="feedTabs"
                style={{
                  margin:
                    "0",
                }}
              >
                <button
                  type="button"
                  className={`feedTab ${
                    filtro ===
                    "todas"
                      ? "activeTab"
                      : ""
                  }`}
                  onClick={() =>
                    setFiltro(
                      "todas"
                    )
                  }
                >
                  🔔 Todas
                </button>

                <button
                  type="button"
                  className={`feedTab ${
                    filtro ===
                    "like"
                      ? "activeTab"
                      : ""
                  }`}
                  onClick={() =>
                    setFiltro(
                      "like"
                    )
                  }
                >
                  ♥️ Me gusta
                </button>

                <button
                  type="button"
                  className={`feedTab ${
                    filtro ===
                    "comentario"
                      ? "activeTab"
                      : ""
                  }`}
                  onClick={() =>
                    setFiltro(
                      "comentario"
                    )
                  }
                >
                  💬 Comentarios
                </button>

                <button
                  type="button"
                  className={`feedTab ${
                    filtro ===
                    "solicitud"
                      ? "activeTab"
                      : ""
                  }`}
                  onClick={() =>
                    setFiltro(
                      "solicitud"
                    )
                  }
                >
                  📩 Solicitudes
                </button>

                <button
                  type="button"
                  className={`feedTab ${
                    filtro ===
                    "conexion"
                      ? "activeTab"
                      : ""
                  }`}
                  onClick={() =>
                    setFiltro(
                      "conexion"
                    )
                  }
                >
                  🤝 Conexiones
                </button>
              </div>
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
                Mostrando{" "}
                <strong>
                  {
                    notificacionesFiltradas.length
                  }
                </strong>{" "}
                de{" "}
                <strong>
                  {
                    notificaciones.length
                  }
                </strong>{" "}
                notificaciones
              </p>

              {filtro !==
                "todas" && (
                <span
                  className="tag"
                  style={{
                    marginTop:
                      0,
                  }}
                >
                  {filtro ===
                  "like"
                    ? "♥️ Me gusta"
                    : filtro ===
                      "comentario"
                    ? "💬 Comentarios"
                    : filtro ===
                      "solicitud"
                    ? "📩 Solicitudes"
                    : "🤝 Conexiones"}
                </span>
              )}
            </div>

            {!mensaje &&
              notificacionesFiltradas.length ===
                0 && (
                <div className="emptyState">
                  <span className="emptyStateIcon">
                    🔔
                  </span>

                  <strong>
                    No hay actividad aquí
                  </strong>

                  <p
                    style={{
                      marginBottom:
                        0,
                    }}
                  >
                    Cuando alguien
                    interactúe contigo,
                    aparecerá en esta
                    bandeja.
                  </p>
                </div>
              )}

            <div
              style={{
                display:
                  "grid",

                gap:
                  "10px",

                maxWidth:
                  "900px",
              }}
            >
              {notificacionesFiltradas.map(
                (
                  notificacion
                ) => {
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
                        position:
                          "relative",

                        display:
                          "grid",

                        gridTemplateColumns:
                          "52px minmax(0, 1fr) auto",

                        alignItems:
                          "center",

                        gap:
                          "13px",

                        padding:
                          "15px 16px",

                        color:
                          "inherit",

                        textDecoration:
                          "none",
                      }}
                    >
                      <div
                        style={{
                          position:
                            "relative",

                          width:
                            "52px",

                          height:
                            "52px",
                        }}
                      >
                        <div
                          className="avatar"
                          style={{
                            width:
                              "52px",

                            height:
                              "52px",

                            fontSize:
                              "20px",
                          }}
                        >
                          {notificacion
                            .actor
                            ?.avatar_url ? (
                            <img
                              src={
                                notificacion
                                  .actor
                                  .avatar_url
                              }
                              alt={
                                nombre
                              }
                            />
                          ) : (
                            <span>
                              🦦
                            </span>
                          )}
                        </div>

                        <span
                          style={{
                            width:
                              "24px",

                            height:
                              "24px",

                            position:
                              "absolute",

                            right:
                              "-3px",

                            bottom:
                              "-3px",

                            display:
                              "grid",

                            placeItems:
                              "center",

                            border:
                              "2px solid #fffdf9",

                            borderRadius:
                              "50%",

                            background:
                              fondoTipo(
                                notificacion.tipo
                              ),

                            fontSize:
                              "11px",
                          }}
                        >
                          {icono(
                            notificacion.tipo
                          )}
                        </span>
                      </div>

                      <div
                        style={{
                          minWidth:
                            0,
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",

                            alignItems:
                              "center",

                            gap:
                              "6px",

                            flexWrap:
                              "wrap",

                            marginBottom:
                              "3px",
                          }}
                        >
                          <span
                            style={{
                              color:
                                "#30352d",

                              fontSize:
                                "13px",

                              fontWeight:
                                800,
                            }}
                          >
                            {nombre}
                          </span>

                          {username && (
                            <span
                              style={{
                                color:
                                  "#969188",

                                fontSize:
                                  "11px",
                              }}
                            >
                              @{username}
                            </span>
                          )}

                          <span
                            style={{
                              padding:
                                "3px 6px",

                              borderRadius:
                                "999px",

                              background:
                                fondoTipo(
                                  notificacion.tipo
                                ),

                              color:
                                "#686e63",

                              fontSize:
                                "9px",

                              fontWeight:
                                800,
                            }}
                          >
                            {nombreTipo(
                              notificacion.tipo
                            )}
                          </span>
                        </div>

                        <p
                          style={{
                            margin:
                              "3px 0 0",

                            color:
                              "#4e534a",

                            fontSize:
                              "13px",

                            lineHeight:
                              1.5,
                          }}
                        >
                          {
                            notificacion.texto
                          }
                        </p>

                        {notificacion.detalle && (
                          <div
                            style={{
                              display:
                                "-webkit-box",

                              marginTop:
                                "7px",

                              overflow:
                                "hidden",

                              color:
                                "#7a776f",

                              fontSize:
                                "12px",

                              lineHeight:
                                1.45,

                              WebkitBoxOrient:
                                "vertical",

                              WebkitLineClamp:
                                2,
                            }}
                          >
                            “
                            {
                              notificacion.detalle
                            }
                            ”
                          </div>
                        )}

                        <span
                          style={{
                            display:
                              "block",

                            marginTop:
                              "7px",

                            color:
                              "#969188",

                            fontSize:
                              "10px",
                          }}
                        >
                          {fechaBonita(
                            notificacion.fecha
                          )}
                        </span>
                      </div>

                      <div
                        style={{
                          alignSelf:
                            "center",

                          color:
                            "#969188",

                          fontSize:
                            "17px",
                        }}
                      >
                        ›
                      </div>
                    </Link>
                  );
                }
              )}
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

        <Link
          href="/notificaciones"
          className="active"
        >
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
    </div>
  );
}
