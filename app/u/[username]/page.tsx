"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { createClient } from "../../../lib/supabase/client";
import { requerirUsuario } from "../../../lib/auth";

import PostCard from "../../../components/PostCard";

import type {
  PerfilResumen,
  PostBase,
  PostConAutor,
} from "../../../lib/types";

type PerfilPublico =
  PerfilResumen & {
    bio: string | null;
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

type Habilidad = {
  id: string;
  user_id: string;
  skill: string;
  nivel:
    | "Básico"
    | "Intermedio"
    | "Avanzado";
  created_at: string;
};

type Recurso = {
  id: string;
  user_id: string;
  titulo: string;
  descripcion: string | null;
  materia: string;
  carrera: string;
  semestre: string;
  archivo_path: string;
  archivo_nombre: string;
  archivo_tipo: string | null;
  created_at: string;
};

type SocialPost = {
  id: string;
  user_id: string;

  categoria:
    | "restaurante"
    | "lugar"
    | "videojuego"
    | "musica"
    | "lectura";

  titulo: string;
  contenido: string;
  calificacion: number | null;
  referencia: string | null;
  created_at: string;
};

type Pestana =
  | "publicaciones"
  | "recursos"
  | "social";

const CATEGORIAS = {
  restaurante: {
    nombre: "Restaurante",
    icono: "🍜",
  },

  lugar: {
    nombre: "Lugar",
    icono: "📍",
  },

  videojuego: {
    nombre: "Videojuego",
    icono: "🎮",
  },

  musica: {
    nombre: "Música",
    icono: "🎵",
  },

  lectura: {
    nombre: "Lectura",
    icono: "📚",
  },
};

export default function PerfilPublicoPage() {
  const params =
    useParams();

  const username =
    typeof params.username ===
    "string"
      ? decodeURIComponent(
          params.username
        )
      : "";

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [
    perfil,
    setPerfil,
  ] =
    useState<PerfilPublico | null>(
      null
    );

  const [
    conexion,
    setConexion,
  ] =
    useState<Conexion | null>(
      null
    );

  const [
    habilidades,
    setHabilidades,
  ] =
    useState<Habilidad[]>(
      []
    );

  const [
    posts,
    setPosts,
  ] =
    useState<PostConAutor[]>(
      []
    );

  const [
    recursos,
    setRecursos,
  ] =
    useState<Recurso[]>(
      []
    );

  const [
    social,
    setSocial,
  ] =
    useState<SocialPost[]>(
      []
    );

  const [
    conexionesAceptadas,
    setConexionesAceptadas,
  ] = useState(0);

  const [
    pestana,
    setPestana,
  ] =
    useState<Pestana>(
      "publicaciones"
    );

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    procesandoConexion,
    setProcesandoConexion,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  async function cargarConexion(
    miId: string,
    perfilId: string
  ) {
    const supabase =
      createClient();

    const {
      data,
      error,
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
        `and(requester_id.eq.${miId},receiver_id.eq.${perfilId}),and(requester_id.eq.${perfilId},receiver_id.eq.${miId})`
      )
      .maybeSingle();

    if (error) {
      throw new Error(
        error.message
      );
    }

    setConexion(
      (data as Conexion) ||
        null
    );
  }

  async function cargarPagina() {
    try {
      setCargando(true);
      setMensaje("");

      const user =
        await requerirUsuario();

      if (!user) {
        return;
      }

      setCurrentUserId(
        user.id
      );

      const supabase =
        createClient();

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
          username
        )
        .maybeSingle();

      if (
        perfilError
      ) {
        throw new Error(
          perfilError.message
        );
      }

      if (
        !perfilData
      ) {
        setPerfil(null);

        setMensaje(
          "No encontramos este perfil."
        );

        return;
      }

      const perfilActual =
        perfilData as PerfilPublico;

      setPerfil(
        perfilActual
      );

      const [
        postsResultado,
        recursosResultado,
        socialResultado,
        conexionesResultado,
        habilidadesResultado,
      ] = await Promise.all([
        supabase
          .from("posts")
          .select(`
            id,
            user_id,
            tipo,
            contenido,
            created_at,
            updated_at
          `)
          .eq(
            "user_id",
            perfilActual.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from("resources")
          .select(`
            id,
            user_id,
            titulo,
            descripcion,
            materia,
            carrera,
            semestre,
            archivo_path,
            archivo_nombre,
            archivo_tipo,
            created_at
          `)
          .eq(
            "user_id",
            perfilActual.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from("social_posts")
          .select(`
            id,
            user_id,
            categoria,
            titulo,
            contenido,
            calificacion,
            referencia,
            created_at
          `)
          .eq(
            "user_id",
            perfilActual.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from("connections")
          .select(`
            id,
            requester_id,
            receiver_id
          `)
          .eq(
            "status",
            "accepted"
          )
          .or(
            `requester_id.eq.${perfilActual.id},receiver_id.eq.${perfilActual.id}`
          ),

        supabase
          .from("profile_skills")
          .select(`
            id,
            user_id,
            skill,
            nivel,
            created_at
          `)
          .eq(
            "user_id",
            perfilActual.id
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          ),
      ]);

      if (
        postsResultado.error
      ) {
        throw new Error(
          postsResultado.error.message
        );
      }

      if (
        recursosResultado.error
      ) {
        throw new Error(
          recursosResultado.error.message
        );
      }

      if (
        socialResultado.error
      ) {
        throw new Error(
          socialResultado.error.message
        );
      }

      if (
        conexionesResultado.error
      ) {
        throw new Error(
          conexionesResultado.error.message
        );
      }

      if (
        habilidadesResultado.error
      ) {
        throw new Error(
          habilidadesResultado.error.message
        );
      }

      const postsBase =
        (postsResultado.data ||
          []) as PostBase[];

      const autor:
        PerfilResumen = {
        id:
          perfilActual.id,

        username:
          perfilActual.username,

        nombre:
          perfilActual.nombre,

        carrera:
          perfilActual.carrera,

        semestre:
          perfilActual.semestre,

        avatar_url:
          perfilActual.avatar_url,
      };

      setPosts(
        postsBase.map(
          (post) => ({
            ...post,
            autor,
          })
        )
      );

      setRecursos(
        (recursosResultado.data ||
          []) as Recurso[]
      );

      setSocial(
        (socialResultado.data ||
          []) as SocialPost[]
      );

      setHabilidades(
        (habilidadesResultado.data ||
          []) as Habilidad[]
      );

      setConexionesAceptadas(
        conexionesResultado.data
          ?.length || 0
      );

      if (
        user.id !==
        perfilActual.id
      ) {
        await cargarConexion(
          user.id,
          perfilActual.id
        );
      } else {
        setConexion(null);
      }
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No pudimos cargar el perfil."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (!username) {
      return;
    }

    cargarPagina();
  }, [username]);

  async function conectar() {
    if (
      !perfil ||
      !currentUserId
    ) {
      return;
    }

    setProcesandoConexion(
      true
    );

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from(
            "connections"
          )
          .insert({
            requester_id:
              currentUserId,

            receiver_id:
              perfil.id,

            status:
              "pending",
          });

      if (error) {
        throw new Error(
          error.message
        );
      }

      await cargarConexion(
        currentUserId,
        perfil.id
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos enviar la solicitud."
      );
    } finally {
      setProcesandoConexion(
        false
      );
    }
  }

  async function aceptarConexion() {
    if (
      !perfil ||
      !conexion
    ) {
      return;
    }

    setProcesandoConexion(
      true
    );

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from(
            "connections"
          )
          .update({
            status:
              "accepted",
          })
          .eq(
            "id",
            conexion.id
          )
          .eq(
            "receiver_id",
            currentUserId
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      await cargarConexion(
        currentUserId,
        perfil.id
      );

      setConexionesAceptadas(
        (actual) =>
          actual + 1
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos aceptar la solicitud."
      );
    } finally {
      setProcesandoConexion(
        false
      );
    }
  }

  async function eliminarConexion() {
    if (
      !perfil ||
      !conexion
    ) {
      return;
    }

    const solicitudRecibida =
      conexion.status ===
        "pending" &&
      conexion.receiver_id ===
        currentUserId;

    const textoConfirmacion =
      conexion.status ===
      "accepted"
        ? "¿Eliminar esta conexión?"
        : solicitudRecibida
        ? "¿Rechazar esta solicitud?"
        : "¿Cancelar esta solicitud?";

    const confirmar =
      window.confirm(
        textoConfirmacion
      );

    if (!confirmar) {
      return;
    }

    setProcesandoConexion(
      true
    );

    try {
      const supabase =
        createClient();

      const eraAceptada =
        conexion.status ===
        "accepted";

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

      if (eraAceptada) {
        setConexionesAceptadas(
          (actual) =>
            Math.max(
              0,
              actual - 1
            )
        );
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos eliminar la conexión."
      );
    } finally {
      setProcesandoConexion(
        false
      );
    }
  }

  async function descargarRecurso(
    recurso: Recurso
  ) {
    try {
      const supabase =
        createClient();

      const {
        data,
        error,
      } =
        await supabase.storage
          .from(
            "resources"
          )
          .download(
            recurso.archivo_path
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      const url =
        URL.createObjectURL(
          data
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        recurso.archivo_nombre;

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      URL.revokeObjectURL(
        url
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos descargar el archivo."
      );
    }
  }

  function colorNivel(
    nivel:
      | "Básico"
      | "Intermedio"
      | "Avanzado"
  ) {
    if (
      nivel ===
      "Avanzado"
    ) {
      return {
        background:
          "#e5eedc",

        color:
          "#506347",
      };
    }

    if (
      nivel ===
      "Intermedio"
    ) {
      return {
        background:
          "#f8e7c7",

        color:
          "#715d3d",
      };
    }

    return {
      background:
        "#f3f0e8",

      color:
        "#686e63",
    };
  }

  function fechaBonita(
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

        year:
          "numeric",
      }
    );
  }

  const actividadTotal =
    useMemo(
      () =>
        posts.length +
        recursos.length +
        social.length,
      [
        posts,
        recursos,
        social,
      ]
    );

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            🦦
          </span>

          <p className="loadingText">
            Visitando este perfil...
          </p>
        </div>
      </main>
    );
  }

  if (
    mensaje ||
    !perfil
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

          <h2>
            Perfil no disponible
          </h2>

          <p>
            {mensaje ||
              "No encontramos este estudiante."}
          </p>

          <Link
            href="/buscar"
            className="backHomeButton"
          >
            ← Volver a Buscar
          </Link>
        </section>
      </main>
    );
  }

  const esMiPerfil =
    currentUserId ===
    perfil.id;

  const solicitudRecibida =
    conexion?.status ===
      "pending" &&
    conexion.receiver_id ===
      currentUserId;

  const solicitudEnviada =
    conexion?.status ===
      "pending" &&
    conexion.requester_id ===
      currentUserId;

  const sonConexion =
    conexion?.status ===
    "accepted";

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
            className="menuButton selected"
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
              👤
            </span>

            <div>
              <strong>
                Perfiles
              </strong>

              <p>
                Conoce a tu comunidad
              </p>
            </div>
          </div>
        </aside>

        <main className="content">
          <section className="welcome">
            <div>
              <p className="tiny">
                PERFIL UNIVERSITARIO
              </p>

              <h2>
                {perfil.nombre ||
                  "Estudiante"}
              </h2>

              <p>
                Conoce su actividad,
                habilidades, recursos y
                aportaciones dentro de
                Uniónutriita.
              </p>
            </div>

            <div className="welcomeOtter">
              👤
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
              href="/buscar"
              className="backHomeButton"
            >
              ← Buscar
            </Link>

            <Link
              href="/conexiones"
              className="backHomeButton"
            >
              🤝 Conexiones
            </Link>
          </div>

          <section
            className="card"
            style={{
              marginTop:
                "20px",

              padding:
                "26px",
            }}
          >
            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "space-between",

                alignItems:
                  "flex-start",

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

                  minWidth:
                    0,
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
                      alt={
                        perfil.nombre ||
                        "Avatar"
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
                  <p
                    className="tiny"
                    style={{
                      marginBottom:
                        "6px",
                    }}
                  >
                    ESTUDIANTE
                  </p>

                  <h1
                    style={{
                      margin:
                        "0 0 4px",

                      fontSize:
                        "clamp(25px, 4vw, 36px)",

                      lineHeight:
                        1.15,

                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    {perfil.nombre ||
                      "Estudiante"}
                  </h1>

                  <p
                    style={{
                      margin: 0,

                      color:
                        "#7f7a71",

                      fontSize:
                        "14px",

                      fontWeight:
                        700,

                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    @
                    {perfil.username ||
                      "usuario"}
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
                        "Carrera no indicada"}
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
                        "Semestre no indicado"}
                    </span>

                    {sonConexion && (
                      <span
                        style={{
                          padding:
                            "6px 9px",

                          borderRadius:
                            "999px",

                          background:
                            "#e8edf4",

                          color:
                            "#566476",

                          fontSize:
                            "11px",

                          fontWeight:
                            800,
                        }}
                      >
                        🤝 Conectados
                      </span>
                    )}
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
                {esMiPerfil ? (
                  <Link
                    href="/perfil/editar"
                    className="editProfileButton"
                  >
                    ✏️ Editar perfil
                  </Link>
                ) : (
                  <>
                    {!conexion && (
                      <button
                        type="button"
                        className="primaryButton"
                        disabled={
                          procesandoConexion
                        }
                        onClick={
                          conectar
                        }
                      >
                        {procesandoConexion
                          ? "Enviando..."
                          : "🤝 Conectar"}
                      </button>
                    )}

                    {solicitudEnviada && (
                      <button
                        type="button"
                        className="backHomeButton"
                        disabled={
                          procesandoConexion
                        }
                        onClick={
                          eliminarConexion
                        }
                      >
                        {procesandoConexion
                          ? "Procesando..."
                          : "✓ Solicitud enviada"}
                      </button>
                    )}

                    {solicitudRecibida && (
                      <>
                        <button
                          type="button"
                          className="primaryButton"
                          disabled={
                            procesandoConexion
                          }
                          onClick={
                            aceptarConexion
                          }
                        >
                          {procesandoConexion
                            ? "Procesando..."
                            : "✓ Aceptar"}
                        </button>

                        <button
                          type="button"
                          className="logoutButton"
                          style={{
                            width:
                              "auto",

                            margin: 0,
                          }}
                          disabled={
                            procesandoConexion
                          }
                          onClick={
                            eliminarConexion
                          }
                        >
                          Rechazar
                        </button>
                      </>
                    )}

                    {sonConexion && (
                      <button
                        type="button"
                        className="logoutButton"
                        style={{
                          width:
                            "auto",

                          margin: 0,
                        }}
                        disabled={
                          procesandoConexion
                        }
                        onClick={
                          eliminarConexion
                        }
                      >
                        {procesandoConexion
                          ? "Procesando..."
                          : "Eliminar conexión"}
                      </button>
                    )}
                  </>
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
                  {posts.length}
                </strong>

                <span>
                  Publicaciones
                </span>
              </div>

              <div className="profileStat">
                <strong>
                  {
                    conexionesAceptadas
                  }
                </strong>

                <span>
                  Conexiones
                </span>
              </div>

              <div className="profileStat">
                <strong>
                  {
                    habilidades.length
                  }
                </strong>

                <span>
                  Habilidades
                </span>
              </div>

              <div className="profileStat">
                <strong>
                  {recursos.length}
                </strong>

                <span>
                  Recursos
                </span>
              </div>

              <div className="profileStat">
                <strong>
                  {actividadTotal}
                </strong>

                <span>
                  Actividad
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
                    SOBRE MÍ
                  </p>

                  <h3
                    style={{
                      margin:
                        "6px 0 0",
                    }}
                  >
                    Biografía
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

              <p
                style={{
                  margin:
                    "18px 0 0",

                  color:
                    perfil.bio
                      ? "#555b51"
                      : "#969188",

                  fontSize:
                    "13px",

                  lineHeight:
                    1.65,

                  whiteSpace:
                    "pre-wrap",

                  overflowWrap:
                    "anywhere",
                }}
              >
                {perfil.bio ||
                  "Este estudiante todavía no ha escrito una biografía."}
              </p>
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
                    TALENTO
                  </p>

                  <h3
                    style={{
                      margin:
                        "6px 0 0",
                    }}
                  >
                    Habilidades
                  </h3>
                </div>

                <span
                  className="cardIcon"
                  style={{
                    fontSize:
                      "22px",
                  }}
                >
                  🧩
                </span>
              </div>

              {habilidades.length ===
              0 ? (
                <p
                  style={{
                    margin:
                      "18px 0 0",

                    color:
                      "#969188",

                    fontSize:
                      "13px",
                  }}
                >
                  Todavía no ha agregado
                  habilidades.
                </p>
              ) : (
                <div
                  style={{
                    display:
                      "flex",

                    gap:
                      "7px",

                    flexWrap:
                      "wrap",

                    marginTop:
                      "18px",
                  }}
                >
                  {habilidades.map(
                    (
                      habilidad
                    ) => {
                      const colores =
                        colorNivel(
                          habilidad.nivel
                        );

                      return (
                        <span
                          key={
                            habilidad.id
                          }
                          style={{
                            display:
                              "inline-flex",

                            alignItems:
                              "center",

                            gap:
                              "5px",

                            padding:
                              "7px 10px",

                            borderRadius:
                              "999px",

                            background:
                              colores.background,

                            color:
                              colores.color,

                            fontSize:
                              "11px",

                            fontWeight:
                              700,
                          }}
                        >
                          🧩{" "}
                          {
                            habilidad.skill
                          }

                          <small
                            style={{
                              opacity:
                                0.7,
                            }}
                          >
                            {
                              habilidad.nivel
                            }
                          </small>
                        </span>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          </div>

          <section
            style={{
              marginTop:
                "28px",

              paddingBottom:
                "60px",
            }}
          >
            <div className="sectionHeader">
              <p className="tiny">
                ACTIVIDAD
              </p>

              <h2>
                Aportes a Uniónutriita
              </h2>
            </div>

            <div
              className="feedTabs"
              style={{
                marginTop:
                  "14px",
              }}
            >
              <button
                type="button"
                className={`feedTab ${
                  pestana ===
                  "publicaciones"
                    ? "activeTab"
                    : ""
                }`}
                onClick={() =>
                  setPestana(
                    "publicaciones"
                  )
                }
              >
                💬 Publicaciones
                {" "}
                ({posts.length})
              </button>

              <button
                type="button"
                className={`feedTab ${
                  pestana ===
                  "recursos"
                    ? "activeTab"
                    : ""
                }`}
                onClick={() =>
                  setPestana(
                    "recursos"
                  )
                }
              >
                📚 Recursos
                {" "}
                ({recursos.length})
              </button>

              <button
                type="button"
                className={`feedTab ${
                  pestana ===
                  "social"
                    ? "activeTab"
                    : ""
                }`}
                onClick={() =>
                  setPestana(
                    "social"
                  )
                }
              >
                🌿 Social
                {" "}
                ({social.length})
              </button>
            </div>

            {pestana ===
              "publicaciones" && (
              <section
                style={{
                  marginTop:
                    "20px",

                  maxWidth:
                    "800px",
                }}
              >
                {posts.length ===
                0 ? (
                  <div className="emptyState">
                    <span className="emptyStateIcon">
                      💬
                    </span>

                    <strong>
                      Sin publicaciones
                    </strong>

                    <p
                      style={{
                        marginBottom:
                          0,
                      }}
                    >
                      Este estudiante
                      todavía no ha
                      publicado en el
                      feed general.
                    </p>
                  </div>
                ) : (
                  posts.map(
                    (post) => (
                      <PostCard
                        key={
                          post.id
                        }
                        post={
                          post
                        }
                        currentUserId={
                          currentUserId
                        }
                      />
                    )
                  )
                )}
              </section>
            )}

            {pestana ===
              "recursos" && (
              <section
                style={{
                  marginTop:
                    "20px",
                }}
              >
                {recursos.length ===
                0 ? (
                  <div className="emptyState">
                    <span className="emptyStateIcon">
                      📚
                    </span>

                    <strong>
                      Sin recursos
                    </strong>

                    <p
                      style={{
                        marginBottom:
                          0,
                      }}
                    >
                      Este estudiante
                      todavía no ha
                      compartido materiales
                      de estudio.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(260px, 1fr))",

                      gap:
                        "12px",
                    }}
                  >
                    {recursos.map(
                      (recurso) => (
                        <article
                          key={
                            recurso.id
                          }
                          className="card"
                          style={{
                            display:
                              "flex",

                            flexDirection:
                              "column",

                            minHeight:
                              "260px",
                          }}
                        >
                          <div
                            className="cardIcon"
                            style={{
                              fontSize:
                                "23px",
                            }}
                          >
                            📚
                          </div>

                          <p
                            className="tiny"
                            style={{
                              marginTop:
                                "13px",
                            }}
                          >
                            {
                              recurso.materia
                            }
                          </p>

                          <h3
                            style={{
                              margin:
                                "5px 0",
                            }}
                          >
                            {
                              recurso.titulo
                            }
                          </h3>

                          {recurso.descripcion && (
                            <p
                              style={{
                                margin:
                                  "4px 0",

                                color:
                                  "#70746a",

                                fontSize:
                                  "12px",

                                lineHeight:
                                  1.55,
                              }}
                            >
                              {
                                recurso.descripcion
                              }
                            </p>
                          )}

                          <div
                            style={{
                              display:
                                "flex",

                              gap:
                                "5px",

                              flexWrap:
                                "wrap",

                              marginTop:
                                "9px",
                            }}
                          >
                            <span
                              style={{
                                padding:
                                  "5px 7px",

                                borderRadius:
                                  "999px",

                                background:
                                  "#f3f0e8",

                                color:
                                  "#686e63",

                                fontSize:
                                  "9px",
                              }}
                            >
                              🎓{" "}
                              {
                                recurso.carrera
                              }
                            </span>

                            <span
                              style={{
                                padding:
                                  "5px 7px",

                                borderRadius:
                                  "999px",

                                background:
                                  "#f3f0e8",

                                color:
                                  "#686e63",

                                fontSize:
                                  "9px",
                              }}
                            >
                              📖{" "}
                              {
                                recurso.semestre
                              }
                            </span>
                          </div>

                          <div
                            style={{
                              marginTop:
                                "11px",

                              padding:
                                "8px 9px",

                              borderRadius:
                                "10px",

                              background:
                                "#f7f4ee",

                              color:
                                "#969188",

                              fontSize:
                                "10px",

                              overflowWrap:
                                "anywhere",
                            }}
                          >
                            📎{" "}
                            {
                              recurso.archivo_nombre
                            }
                          </div>

                          <p
                            style={{
                              margin:
                                "9px 0 0",

                              color:
                                "#969188",

                              fontSize:
                                "9px",
                            }}
                          >
                            {fechaBonita(
                              recurso.created_at
                            )}
                          </p>

                          <button
                            type="button"
                            className="primaryButton"
                            style={{
                              marginTop:
                                "auto",
                            }}
                            onClick={() =>
                              descargarRecurso(
                                recurso
                              )
                            }
                          >
                            ⬇️ Descargar
                          </button>
                        </article>
                      )
                    )}
                  </div>
                )}
              </section>
            )}

            {pestana ===
              "social" && (
              <section
                style={{
                  marginTop:
                    "20px",
                }}
              >
                {social.length ===
                0 ? (
                  <div className="emptyState">
                    <span className="emptyStateIcon">
                      🌿
                    </span>

                    <strong>
                      Sin recomendaciones
                    </strong>

                    <p
                      style={{
                        marginBottom:
                          0,
                      }}
                    >
                      Este estudiante
                      todavía no ha
                      compartido nada en
                      Social.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(260px, 1fr))",

                      gap:
                        "12px",
                    }}
                  >
                    {social.map(
                      (item) => {
                        const categoria =
                          CATEGORIAS[
                            item.categoria
                          ];

                        return (
                          <article
                            key={
                              item.id
                            }
                            className="card"
                            style={{
                              display:
                                "flex",

                              flexDirection:
                                "column",

                              minHeight:
                                "260px",
                            }}
                          >
                            <div
                              className="cardIcon"
                              style={{
                                fontSize:
                                  "23px",
                              }}
                            >
                              {
                                categoria.icono
                              }
                            </div>

                            <p
                              className="tiny"
                              style={{
                                marginTop:
                                  "13px",
                              }}
                            >
                              {
                                categoria.nombre
                              }
                            </p>

                            <h3
                              style={{
                                margin:
                                  "5px 0",
                              }}
                            >
                              {
                                item.titulo
                              }
                            </h3>

                            {item.calificacion && (
                              <div
                                style={{
                                  margin:
                                    "4px 0 8px",

                                  color:
                                    "#ad7d39",

                                  fontSize:
                                    "14px",

                                  letterSpacing:
                                    "1px",
                                }}
                              >
                                {"⭐".repeat(
                                  item.calificacion
                                )}
                              </div>
                            )}

                            <p
                              style={{
                                margin:
                                  "4px 0",

                                color:
                                  "#70746a",

                                fontSize:
                                  "12px",

                                lineHeight:
                                  1.55,

                                whiteSpace:
                                  "pre-wrap",

                                overflowWrap:
                                  "anywhere",
                              }}
                            >
                              {
                                item.contenido
                              }
                            </p>

                            {item.referencia && (
                              <div
                                style={{
                                  marginTop:
                                    "11px",

                                  padding:
                                    "8px 9px",

                                  borderRadius:
                                    "10px",

                                  background:
                                    "#f7f4ee",

                                  color:
                                    "#969188",

                                  fontSize:
                                    "10px",

                                  overflowWrap:
                                    "anywhere",
                                }}
                              >
                                📌{" "}
                                {
                                  item.referencia
                                }
                              </div>
                            )}

                            <span
                              style={{
                                display:
                                  "block",

                                marginTop:
                                  "auto",

                                paddingTop:
                                  "14px",

                                color:
                                  "#969188",

                                fontSize:
                                  "9px",
                              }}
                            >
                              {fechaBonita(
                                item.created_at
                              )}
                            </span>
                          </article>
                        );
                      }
                    )}
                  </div>
                )}
              </section>
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
          href="/conexiones"
          className="active"
        >
          <span>
            🤝
          </span>

          <span>
            Conectar
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




