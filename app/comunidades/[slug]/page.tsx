"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { createClient } from "../../../lib/supabase/client";
import { requerirUsuario } from "../../../lib/auth";

type Comunidad = {
  id: string;
  slug: string;
  nombre: string;
  tipo:
    | "general"
    | "carrera"
    | "semestre";
  carrera: string | null;
  semestre: string | null;
  descripcion: string | null;
};

type PerfilMini = {
  id: string;
  username: string | null;
  nombre: string | null;
  avatar_url: string | null;
};

type PostComunidad = {
  id: string;
  community_id: string;
  user_id: string;
  contenido: string;
  created_at: string;
  autor: PerfilMini | null;
};

export default function ComunidadPage() {
  const params = useParams();

  const slug =
    typeof params.slug === "string"
      ? params.slug
      : Array.isArray(params.slug)
      ? params.slug[0]
      : "";

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [
    comunidad,
    setComunidad,
  ] =
    useState<Comunidad | null>(
      null
    );

  const [
    esMiembro,
    setEsMiembro,
  ] = useState(false);

  const [
    miembros,
    setMiembros,
  ] = useState(0);

  const [
    posts,
    setPosts,
  ] =
    useState<PostComunidad[]>(
      []
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
    procesando,
    setProcesando,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  async function cargarPosts(
    comunidadId: string
  ) {
    const supabase =
      createClient();

    const {
      data: postsData,
      error: postsError,
    } = await supabase
      .from("community_posts")
      .select(`
        id,
        community_id,
        user_id,
        contenido,
        created_at
      `)
      .eq(
        "community_id",
        comunidadId
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (postsError) {
      throw new Error(
        postsError.message
      );
    }

    const postsBase =
      postsData || [];

    if (
      postsBase.length ===
      0
    ) {
      setPosts([]);
      return;
    }

    const idsAutores =
      Array.from(
        new Set(
          postsBase.map(
            (post) =>
              post.user_id
          )
        )
      );

    const {
      data: autoresData,
      error: autoresError,
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
        idsAutores
      );

    if (autoresError) {
      throw new Error(
        autoresError.message
      );
    }

    const autores =
      (autoresData ||
        []) as PerfilMini[];

    const mapaAutores =
      new Map<
        string,
        PerfilMini
      >();

    autores.forEach(
      (autor) => {
        mapaAutores.set(
          autor.id,
          autor
        );
      }
    );

    setPosts(
      postsBase.map(
        (post) => ({
          ...post,

          autor:
            mapaAutores.get(
              post.user_id
            ) || null,
        })
      ) as PostComunidad[]
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
          data: comunidadData,
          error: comunidadError,
        } = await supabase
          .from("communities")
          .select(`
            id,
            slug,
            nombre,
            tipo,
            carrera,
            semestre,
            descripcion
          `)
          .eq(
            "slug",
            slug
          )
          .maybeSingle();

        if (
          comunidadError
        ) {
          throw new Error(
            comunidadError.message
          );
        }

        if (
          !comunidadData
        ) {
          throw new Error(
            "Esta comunidad no existe."
          );
        }

        if (!activo) {
          return;
        }

        const comunidadActual =
          comunidadData as Comunidad;

        setComunidad(
          comunidadActual
        );

        const [
          miembroResultado,
          totalResultado,
        ] = await Promise.all([
          supabase
            .from(
              "community_members"
            )
            .select(
              "community_id"
            )
            .eq(
              "community_id",
              comunidadActual.id
            )
            .eq(
              "user_id",
              user.id
            )
            .maybeSingle(),

          supabase
            .from(
              "community_members"
            )
            .select(
              "*",
              {
                count: "exact",
                head: true,
              }
            )
            .eq(
              "community_id",
              comunidadActual.id
            ),
        ]);

        if (
          miembroResultado.error
        ) {
          throw new Error(
            miembroResultado
              .error.message
          );
        }

        if (
          totalResultado.error
        ) {
          throw new Error(
            totalResultado
              .error.message
          );
        }

        const unido =
          Boolean(
            miembroResultado.data
          );

        setEsMiembro(
          unido
        );

        setMiembros(
          totalResultado.count ||
            0
        );

        if (unido) {
          await cargarPosts(
            comunidadActual.id
          );
        }
      } catch (error) {
        if (!activo) {
          return;
        }

        setMensaje(
          error instanceof Error
            ? error.message
            : "No pudimos cargar la comunidad."
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
  }, [slug]);

  async function unirme() {
    if (
      !comunidad ||
      !currentUserId
    ) {
      return;
    }

    setProcesando(true);

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from(
            "community_members"
          )
          .insert({
            community_id:
              comunidad.id,

            user_id:
              currentUserId,
          });

      if (error) {
        throw new Error(
          error.message
        );
      }

      setEsMiembro(true);

      setMiembros(
        (actual) =>
          actual + 1
      );

      await cargarPosts(
        comunidad.id
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos unirte."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function salir() {
    if (!comunidad) {
      return;
    }

    if (
      !window.confirm(
        "¿Quieres salir de esta comunidad?"
      )
    ) {
      return;
    }

    setProcesando(true);

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from(
            "community_members"
          )
          .delete()
          .eq(
            "community_id",
            comunidad.id
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

      setEsMiembro(false);

      setMiembros(
        (actual) =>
          Math.max(
            0,
            actual - 1
          )
      );

      setPosts([]);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos salir."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function publicar(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (
      !comunidad ||
      !esMiembro
    ) {
      return;
    }

    const texto =
      contenido.trim();

    if (!texto) {
      return;
    }

    setPublicando(true);

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from(
            "community_posts"
          )
          .insert({
            community_id:
              comunidad.id,

            user_id:
              currentUserId,

            contenido:
              texto,
          });

      if (error) {
        throw new Error(
          error.message
        );
      }

      setContenido("");

      await cargarPosts(
        comunidad.id
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos publicar."
      );
    } finally {
      setPublicando(false);
    }
  }

  async function eliminarPost(
    postId: string
  ) {
    if (
      !window.confirm(
        "¿Eliminar esta publicación?"
      )
    ) {
      return;
    }

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from(
            "community_posts"
          )
          .delete()
          .eq(
            "id",
            postId
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

      setPosts(
        (actuales) =>
          actuales.filter(
            (post) =>
              post.id !==
              postId
          )
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos eliminar la publicación."
      );
    }
  }

  function iconoComunidad() {
    if (
      comunidad?.tipo ===
      "general"
    ) {
      return "🏫";
    }

    if (
      comunidad?.tipo ===
      "carrera"
    ) {
      return "🎓";
    }

    return "📖";
  }

  function tipoComunidad() {
    if (
      comunidad?.tipo ===
      "general"
    ) {
      return "Comunidad general";
    }

    if (
      comunidad?.tipo ===
      "carrera"
    ) {
      return "Comunidad de carrera";
    }

    return "Comunidad de semestre";
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

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            🫂
          </span>

          <p className="loadingText">
            Entrando a la comunidad...
          </p>
        </div>
      </main>
    );
  }

  if (!comunidad) {
    return (
      <main className="profilePage">
        <section className="profileCard">
          <div className="profileAvatar">
            🦦
          </div>

          <p className="profileEyebrow">
            COMUNIDADES
          </p>

          <h1>
            Comunidad no encontrada
          </h1>

          <p
            style={{
              color:
                "#70746a",

              lineHeight:
                1.5,
            }}
          >
            Puede que esta comunidad
            ya no exista o que el enlace
            sea incorrecto.
          </p>

          {mensaje && (
            <div className="errorBox">
              {mensaje}
            </div>
          )}

          <Link
            href="/comunidades"
            className="backHomeButton"
          >
            ← Volver a Comunidades
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
            className="menuButton selected"
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
            className="menuButton"
          >
            <span className="menuIcon">
              👤
            </span>

            Mi perfil
          </Link>

          <div className="otterCard">
            <span className="bigOtter">
              {iconoComunidad()}
            </span>

            <div>
              <strong>
                Comunidades
              </strong>

              <p>
                Aprende y colabora
              </p>
            </div>
          </div>
        </aside>

        <main className="content">
          <section className="welcome">
            <div>
              <p className="tiny">
                {comunidad.tipo ===
                "general"
                  ? "CAMPUS"
                  : comunidad.tipo ===
                    "carrera"
                  ? "CARRERA"
                  : "SEMESTRE"}
              </p>

              <h2>
                {comunidad.nombre}
              </h2>

              <p>
                {comunidad.descripcion ||
                  "Un espacio para conectar, compartir y colaborar con otros estudiantes."}
              </p>

              <div
                style={{
                  display:
                    "flex",

                  gap:
                    "7px",

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
                      "rgba(255,255,255,0.55)",

                    fontSize:
                      "11px",

                    fontWeight:
                      700,
                  }}
                >
                  👥 {miembros}{" "}
                  {miembros === 1
                    ? "miembro"
                    : "miembros"}
                </span>

                <span
                  style={{
                    padding:
                      "6px 9px",

                    borderRadius:
                      "999px",

                    background:
                      "rgba(255,255,255,0.55)",

                    fontSize:
                      "11px",

                    fontWeight:
                      700,
                  }}
                >
                  {iconoComunidad()}{" "}
                  {tipoComunidad()}
                </span>

                {esMiembro && (
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
                        800,
                    }}
                  >
                    ✓ Eres miembro
                  </span>
                )}
              </div>
            </div>

            <div className="welcomeOtter">
              {iconoComunidad()}
            </div>
          </section>

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

              marginTop:
                "20px",
            }}
          >
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
                href="/comunidades"
                className="backHomeButton"
              >
                ← Comunidades
              </Link>

              <Link
                href="/"
                className="backHomeButton"
              >
                🏠 Inicio
              </Link>
            </div>

            {!esMiembro ? (
              <button
                type="button"
                className="primaryButton"
                disabled={
                  procesando
                }
                onClick={unirme}
              >
                {procesando
                  ? "Uniéndote..."
                  : "＋ Unirme a la comunidad"}
              </button>
            ) : (
              <button
                type="button"
                className="logoutButton"
                style={{
                  width:
                    "auto",

                  margin: 0,
                }}
                disabled={
                  procesando
                }
                onClick={salir}
              >
                {procesando
                  ? "Procesando..."
                  : "Salir de la comunidad"}
              </button>
            )}
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

          {!esMiembro ? (
            <section
              className="card"
              style={{
                marginTop:
                  "24px",

                maxWidth:
                  "800px",

                padding:
                  "28px",
              }}
            >
              <div
                style={{
                  display:
                    "grid",

                  placeItems:
                    "center",

                  textAlign:
                    "center",

                  padding:
                    "20px 10px",
                }}
              >
                <div
                  style={{
                    width:
                      "64px",

                    height:
                      "64px",

                    display:
                      "grid",

                    placeItems:
                      "center",

                    borderRadius:
                      "20px",

                    background:
                      "#f3f0e8",

                    fontSize:
                      "29px",
                  }}
                >
                  🔒
                </div>

                <h3
                  style={{
                    margin:
                      "15px 0 6px",
                  }}
                >
                  Contenido para miembros
                </h3>

                <p
                  style={{
                    maxWidth:
                      "480px",

                    margin:
                      "0",

                    color:
                      "#70746a",

                    fontSize:
                      "13px",

                    lineHeight:
                      1.6,
                  }}
                >
                  Únete para participar,
                  leer las publicaciones
                  del grupo y compartir
                  contenido con sus
                  miembros.
                </p>

                <button
                  type="button"
                  className="primaryButton"
                  style={{
                    marginTop:
                      "18px",
                  }}
                  disabled={
                    procesando
                  }
                  onClick={unirme}
                >
                  {procesando
                    ? "Uniéndote..."
                    : "＋ Unirme"}
                </button>
              </div>
            </section>
          ) : (
            <>
              <section
                className="card"
                style={{
                  maxWidth:
                    "800px",

                  marginTop:
                    "24px",

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
                      "12px",

                    marginBottom:
                      "15px",
                  }}
                >
                  <div>
                    <p className="tiny">
                      PARTICIPAR
                    </p>

                    <h3
                      style={{
                        margin:
                          "5px 0 0",
                      }}
                    >
                      Comparte con el grupo
                    </h3>
                  </div>

                  <span
                    className="cardIcon"
                    style={{
                      fontSize:
                        "22px",
                    }}
                  >
                    ✍️
                  </span>
                </div>

                <form
                  onSubmit={
                    publicar
                  }
                  style={{
                    display:
                      "grid",

                    gap:
                      "10px",
                  }}
                >
                  <textarea
                    value={
                      contenido
                    }
                    onChange={(e) =>
                      setContenido(
                        e.target.value
                      )
                    }
                    placeholder={`Comparte algo con ${comunidad.nombre}...`}
                    maxLength={
                      3000
                    }
                    rows={5}
                    style={{
                      width:
                        "100%",

                      padding:
                        "13px 14px",

                      border:
                        "1px solid #e5ddcf",

                      borderRadius:
                        "14px",

                      resize:
                        "vertical",

                      background:
                        "#f7f4ed",

                      color:
                        "#30352d",

                      font:
                        "inherit",

                      lineHeight:
                        1.55,
                    }}
                  />

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

                      flexWrap:
                        "wrap",
                    }}
                  >
                    <small
                      style={{
                        color:
                          contenido.length >
                          2800
                            ? "#a75b51"
                            : "#969188",
                      }}
                    >
                      {contenido.length}
                      /3000
                    </small>

                    <button
                      type="submit"
                      className="primaryButton"
                      disabled={
                        publicando ||
                        !contenido.trim()
                      }
                    >
                      {publicando
                        ? "Publicando..."
                        : "Publicar"}
                    </button>
                  </div>
                </form>
              </section>

              <section
                style={{
                  maxWidth:
                    "800px",

                  marginTop:
                    "28px",

                  paddingBottom:
                    "60px",
                }}
              >
                <div
                  className="sectionHeader"
                >
                  <p className="tiny">
                    CONVERSACIÓN
                  </p>

                  <h2>
                    Publicaciones
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
                      {posts.length}
                    </strong>{" "}
                    {posts.length ===
                    1
                      ? "publicación"
                      : "publicaciones"}
                  </p>

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
                        700,
                    }}
                  >
                    ✓ Solo miembros
                  </span>
                </div>

                {posts.length ===
                0 ? (
                  <div className="emptyState">
                    <span className="emptyStateIcon">
                      🦦
                    </span>

                    <strong>
                      Aún no hay publicaciones
                    </strong>

                    <p
                      style={{
                        marginBottom:
                          0,
                      }}
                    >
                      Puedes ser la primera
                      persona en iniciar la
                      conversación.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display:
                        "grid",

                      gap:
                        "12px",
                    }}
                  >
                    {posts.map(
                      (post) => {
                        const nombre =
                          post.autor
                            ?.nombre ||
                          "Estudiante";

                        const username =
                          post.autor
                            ?.username ||
                          null;

                        const esMio =
                          post.user_id ===
                          currentUserId;

                        return (
                          <article
                            key={
                              post.id
                            }
                            className="post"
                          >
                            <div className="postHeader">
                              {username ? (
                                <Link
                                  href={`/u/${username}`}
                                  className="avatar"
                                >
                                  {post.autor
                                    ?.avatar_url ? (
                                    <img
                                      src={
                                        post
                                          .autor
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
                                </Link>
                              ) : (
                                <div className="avatar">
                                  {post.autor
                                    ?.avatar_url ? (
                                    <img
                                      src={
                                        post
                                          .autor
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
                              )}

                              <div className="postAuthor">
                                {username ? (
                                  <Link
                                    href={`/u/${username}`}
                                    className="postAuthorName"
                                  >
                                    <strong>
                                      {nombre}
                                    </strong>
                                  </Link>
                                ) : (
                                  <strong>
                                    {nombre}
                                  </strong>
                                )}

                                {username && (
                                  <p>
                                    @{username}
                                  </p>
                                )}

                                <span className="postDate">
                                  {fechaBonita(
                                    post.created_at
                                  )}
                                </span>
                              </div>

                              {esMio && (
                                <div
                                  style={{
                                    display:
                                      "flex",

                                    alignItems:
                                      "center",

                                    gap:
                                      "6px",
                                  }}
                                >
                                  <span
                                    style={{
                                      padding:
                                        "4px 7px",

                                      borderRadius:
                                        "999px",

                                      background:
                                        "#e5eedc",

                                      color:
                                        "#506347",

                                      fontSize:
                                        "9px",

                                      fontWeight:
                                        800,
                                    }}
                                  >
                                    Tú
                                  </span>

                                  <button
                                    type="button"
                                    className="moreButton"
                                    onClick={() =>
                                      eliminarPost(
                                        post.id
                                      )
                                    }
                                    title="Eliminar publicación"
                                    aria-label="Eliminar publicación"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              )}
                            </div>

                            <p
                              className="postText"
                              style={{
                                whiteSpace:
                                  "pre-wrap",

                                overflowWrap:
                                  "anywhere",
                              }}
                            >
                              {
                                post.contenido
                              }
                            </p>
                          </article>
                        );
                      }
                    )}
                  </div>
                )}
              </section>
            </>
          )}
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
          href="/comunidades"
          className="active"
        >
          <span>
            🫂
          </span>

          <span>
            Grupos
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

