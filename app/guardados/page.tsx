"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from "../../lib/supabase/client";
import { requerirUsuario } from "../../lib/auth";

import type {
  PerfilResumen,
  PostBase,
  PostConAutor,
} from "../../lib/types";

import PostCard from "../../components/PostCard";

export default function GuardadosPage() {
  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [
    posts,
    setPosts,
  ] = useState<PostConAutor[]>([]);

  const [
    filtro,
    setFiltro,
  ] = useState<
    | "Todos"
    | "Publicación"
    | "Apunte"
    | "Pregunta"
    | "Formulario"
    | "Ayuda"
    | "Aviso"
  >("Todos");

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

    async function cargarGuardados() {
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
          data: guardadosData,
          error: guardadosError,
        } = await supabase
          .from("post_saves")
          .select(
            "post_id, created_at"
          )
          .eq(
            "user_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (
          guardadosError
        ) {
          throw new Error(
            guardadosError.message
          );
        }

        if (!activo) {
          return;
        }

        const idsPosts =
          guardadosData?.map(
            (item) =>
              item.post_id
          ) || [];

        if (
          idsPosts.length ===
          0
        ) {
          setPosts([]);
          return;
        }

        const {
          data: postsData,
          error: postsError,
        } = await supabase
          .from("posts")
          .select(`
            id,
            user_id,
            tipo,
            contenido,
            created_at,
            updated_at
          `)
          .in(
            "id",
            idsPosts
          );

        if (postsError) {
          throw new Error(
            postsError.message
          );
        }

        const publicaciones =
          (postsData ||
            []) as PostBase[];

        const idsAutores =
          Array.from(
            new Set(
              publicaciones.map(
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
            carrera,
            semestre,
            avatar_url
          `)
          .in(
            "id",
            idsAutores
          );

        if (
          autoresError
        ) {
          throw new Error(
            autoresError.message
          );
        }

        const autores =
          (autoresData ||
            []) as PerfilResumen[];

        const mapaAutores =
          new Map<
            string,
            PerfilResumen
          >();

        autores.forEach(
          (autor) => {
            mapaAutores.set(
              autor.id,
              autor
            );
          }
        );

        const mapaPosts =
          new Map<
            string,
            PostConAutor
          >();

        publicaciones.forEach(
          (post) => {
            mapaPosts.set(
              post.id,
              {
                ...post,

                autor:
                  mapaAutores.get(
                    post.user_id
                  ) || null,
              }
            );
          }
        );

        /*
         * Conservamos el orden
         * en que el usuario
         * guardó los posts.
         */
        const ordenados =
          idsPosts
            .map(
              (id) =>
                mapaPosts.get(id)
            )
            .filter(
              Boolean
            ) as PostConAutor[];

        if (activo) {
          setPosts(
            ordenados
          );
        }
      } catch (error) {
        if (!activo) {
          return;
        }

        setMensaje(
          error instanceof Error
            ? `No pudimos cargar tus guardados: ${error.message}`
            : "No pudimos cargar tus publicaciones guardadas."
        );
      } finally {
        if (activo) {
          setCargando(
            false
          );
        }
      }
    }

    cargarGuardados();

    return () => {
      activo = false;
    };
  }, []);

  const postsFiltrados =
    useMemo(() => {
      if (
        filtro ===
        "Todos"
      ) {
        return posts;
      }

      return posts.filter(
        (post) =>
          post.tipo ===
          filtro
      );
    }, [
      posts,
      filtro,
    ]);

  const totalApuntes =
    posts.filter(
      (post) =>
        post.tipo ===
        "Apunte"
    ).length;

  const totalPreguntas =
    posts.filter(
      (post) =>
        post.tipo ===
        "Pregunta"
    ).length;

  const totalAyuda =
    posts.filter(
      (post) =>
        post.tipo ===
        "Ayuda"
    ).length;

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            🔖
          </span>

          <p className="loadingText">
            Buscando lo que guardaste...
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
            className="menuButton selected"
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
              🔖
            </span>

            <div>
              <strong>
                Tu colección
              </strong>

              <p>
                Para volver después
              </p>
            </div>
          </div>
        </aside>

        <main className="content">
          <section className="welcome">
            <div>
              <p className="tiny">
                TU COLECCIÓN
              </p>

              <h2>
                Guardados 🔖
              </h2>

              <p>
                Conserva publicaciones,
                apuntes, preguntas y
                recursos interesantes
                para encontrarlos
                fácilmente cuando los
                necesites.
              </p>
            </div>

            <div className="welcomeOtter">
              🔖
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
                GUARDADOS
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
                {posts.length}
              </strong>

              <p>
                publicaciones guardadas
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                APUNTES
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
                {totalApuntes}
              </strong>

              <p>
                materiales académicos
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                PREGUNTAS
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
                {totalPreguntas}
              </strong>

              <p>
                dudas guardadas
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                AYUDA
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
                {totalAyuda}
              </strong>

              <p>
                publicaciones de apoyo
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
              href="/estudio"
              className="backHomeButton"
            >
              📚 Estudio
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
                COLECCIÓN
              </p>

              <h2>
                Tus publicaciones
              </h2>
            </div>

            {posts.length >
              0 && (
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
                    margin: 0,
                  }}
                >
                  <button
                    type="button"
                    className={`feedTab ${
                      filtro ===
                      "Todos"
                        ? "activeTab"
                        : ""
                    }`}
                    onClick={() =>
                      setFiltro(
                        "Todos"
                      )
                    }
                  >
                    🔖 Todos
                  </button>

                  <button
                    type="button"
                    className={`feedTab ${
                      filtro ===
                      "Apunte"
                        ? "activeTab"
                        : ""
                    }`}
                    onClick={() =>
                      setFiltro(
                        "Apunte"
                      )
                    }
                  >
                    📚 Apuntes
                  </button>

                  <button
                    type="button"
                    className={`feedTab ${
                      filtro ===
                      "Pregunta"
                        ? "activeTab"
                        : ""
                    }`}
                    onClick={() =>
                      setFiltro(
                        "Pregunta"
                      )
                    }
                  >
                    ❓ Preguntas
                  </button>

                  <button
                    type="button"
                    className={`feedTab ${
                      filtro ===
                      "Ayuda"
                        ? "activeTab"
                        : ""
                    }`}
                    onClick={() =>
                      setFiltro(
                        "Ayuda"
                      )
                    }
                  >
                    🤝 Ayuda
                  </button>

                  <button
                    type="button"
                    className={`feedTab ${
                      filtro ===
                      "Publicación"
                        ? "activeTab"
                        : ""
                    }`}
                    onClick={() =>
                      setFiltro(
                        "Publicación"
                      )
                    }
                  >
                    💬 Publicaciones
                  </button>

                  <button
                    type="button"
                    className={`feedTab ${
                      filtro ===
                      "Formulario"
                        ? "activeTab"
                        : ""
                    }`}
                    onClick={() =>
                      setFiltro(
                        "Formulario"
                      )
                    }
                  >
                    📋 Formularios
                  </button>

                  <button
                    type="button"
                    className={`feedTab ${
                      filtro ===
                      "Aviso"
                        ? "activeTab"
                        : ""
                    }`}
                    onClick={() =>
                      setFiltro(
                        "Aviso"
                      )
                    }
                  >
                    📢 Avisos
                  </button>
                </div>
              </div>
            )}

            {posts.length >
              0 && (
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

                  maxWidth:
                    "780px",
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
                      postsFiltrados.length
                    }
                  </strong>{" "}
                  de{" "}
                  <strong>
                    {posts.length}
                  </strong>{" "}
                  guardados
                </p>

                {filtro !==
                  "Todos" && (
                  <span
                    className="tag"
                    style={{
                      marginTop:
                        0,
                    }}
                  >
                    {filtro}
                  </span>
                )}
              </div>
            )}

            {!mensaje &&
              posts.length ===
                0 && (
                <div className="emptyState">
                  <span className="emptyStateIcon">
                    🔖
                  </span>

                  <strong>
                    Tu colección está vacía
                  </strong>

                  <p
                    style={{
                      marginBottom:
                        "14px",
                    }}
                  >
                    Cuando encuentres
                    una publicación que
                    quieras consultar
                    después, pulsa el
                    botón de guardar.
                  </p>

                  <Link
                    href="/"
                    className="primaryButton"
                  >
                    Explorar publicaciones
                  </Link>
                </div>
              )}

            {!mensaje &&
              posts.length >
                0 &&
              postsFiltrados.length ===
                0 && (
                <div className="emptyState">
                  <span className="emptyStateIcon">
                    🔎
                  </span>

                  <strong>
                    No tienes guardados de este tipo
                  </strong>

                  <p
                    style={{
                      marginBottom:
                        0,
                    }}
                  >
                    Elige otra categoría
                    para seguir explorando
                    tu colección.
                  </p>
                </div>
              )}

            <div
              style={{
                maxWidth:
                  "780px",
              }}
            >
              {postsFiltrados.map(
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
          href="/guardados"
          className="active"
        >
          <span>
            🔖
          </span>

          <span>
            Guardados
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

