"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

import { createClient } from "../lib/supabase/client";
import { requerirUsuario } from "../lib/auth";

import type {
  PerfilResumen,
  PostBase,
  PostConAutor,
} from "../lib/types";

import PostCard from "../components/PostCard";
import ChatPanel from "../components/ChatPanel";

type FiltroFeed =
  | "Todos"
  | "Apunte"
  | "Pregunta"
  | "Ayuda";

export default function HomePage() {
  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [perfil, setPerfil] =
    useState<PerfilResumen | null>(
      null
    );

  const [posts, setPosts] =
    useState<PostConAutor[]>([]);

  const [filtro, setFiltro] =
    useState<FiltroFeed>("Todos");

  const [cargando, setCargando] =
    useState(true);

  const [mensaje, setMensaje] =
    useState("");

  useEffect(() => {
    let activo = true;

    async function cargarInicio() {
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
            avatar_url
          `)
          .eq("id", user.id)
          .maybeSingle();

        if (perfilError) {
          throw new Error(
            `No pudimos cargar tu perfil: ${perfilError.message}`
          );
        }

        if (!activo) {
          return;
        }

        if (perfilData) {
          setPerfil(
            perfilData as PerfilResumen
          );
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
          .order("created_at", {
            ascending: false,
          });

        if (postsError) {
          throw new Error(
            `No pudimos cargar las publicaciones: ${postsError.message}`
          );
        }

        if (!activo) {
          return;
        }

        const publicaciones =
          (postsData || []) as PostBase[];

        if (
          publicaciones.length === 0
        ) {
          setPosts([]);
          return;
        }

        const idsAutores = [
          ...new Set(
            publicaciones.map(
              (post) =>
                post.user_id
            )
          ),
        ];

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

        if (autoresError) {
          throw new Error(
            `No pudimos cargar los autores: ${autoresError.message}`
          );
        }

        if (!activo) {
          return;
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

        const publicacionesConAutor:
          PostConAutor[] =
          publicaciones.map(
            (post) => ({
              ...post,

              autor:
                mapaAutores.get(
                  post.user_id
                ) || null,
            })
          );

        setPosts(
          publicacionesConAutor
        );
      } catch (error) {
        if (!activo) {
          return;
        }

        setMensaje(
          error instanceof Error
            ? error.message
            : "No pudimos cargar Uniónutriita."
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarInicio();

    return () => {
      activo = false;
    };
  }, []);

  const postsFiltrados =
    useMemo(() => {
      if (filtro === "Todos") {
        return posts;
      }

      return posts.filter(
        (post) =>
          post.tipo === filtro
      );
    }, [posts, filtro]);

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            🦦
          </span>

          <p className="loadingText">
            Las nutrias están
            acomodando el feed...
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
          <div className="searchBox">
            <span>
              🔎
            </span>

            <input
              type="text"
              placeholder="Buscar en Uniónutriita..."
              disabled
            />
          </div>

          <Link
            href="/notificaciones"
            className="circleButton"
            title="Notificaciones"
          >
            🔔
          </Link>

          <Link
            href="/perfil"
            className="profileLink"
          >
            <div className="profileButton">
              {perfil?.avatar_url ? (
                <img
                  src={
                    perfil.avatar_url
                  }
                  alt="Mi avatar"
                  className="topAvatarImage"
                />
              ) : (
                <span>
                  {perfil?.nombre
                    ?.charAt(0)
                    .toUpperCase() ||
                    "🦦"}
                </span>
              )}
            </div>
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
            className="menuButton selected"
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

          <div className="otterCard">
            <span className="bigOtter">
              🦦
            </span>

            <div>
              <strong>
                Uniónutriita
              </strong>

              <p>
                Tu rincón
                universitario
              </p>
            </div>
          </div>
        </aside>

        <main className="content">
          <section className="welcome">
            <div>
              <p className="tiny">
                TU COMUNIDAD
              </p>

              <h2>
                Hola,{" "}
                {perfil?.nombre ||
                  "nutria"}{" "}
                👋
              </h2>

              <p>
                Descubre qué está
                pasando, comparte algo
                con tus compañeros y
                encuentra ayuda dentro
                de la universidad.
              </p>
            </div>

            <div className="welcomeOtter">
              🦦
            </div>
          </section>

          <section className="news">
            <div className="sectionHeader">
              <p className="tiny">
                HOY EN EL CAMPUS
              </p>

              <h3>
                Novedades
              </h3>
            </div>

            <div className="newsGrid">
              <article className="card">
                <span className="cardIcon">
                  📚
                </span>

                <small>
                  Estudio
                </small>

                <h4>
                  Comparte tus
                  apuntes
                </h4>

                <p>
                  Recursos y materiales
                  creados por
                  estudiantes.
                </p>
              </article>

              <article className="card">
                <span className="cardIcon">
                  🫂
                </span>

                <small>
                  Comunidades
                </small>

                <h4>
                  Encuentra a tu
                  salón
                </h4>

                <p>
                  Carreras, semestres
                  y grupos
                  universitarios.
                </p>
              </article>

              <article className="card">
                <span className="cardIcon">
                  🎉
                </span>

                <small>
                  Campus
                </small>

                <h4>
                  Eventos
                  universitarios
                </h4>

                <p>
                  Actividades y avisos
                  dentro del campus.
                </p>
              </article>
            </div>
          </section>

          <section className="feedArea">
            <div>
              <div className="createBox">
                <div className="avatar">
                  {perfil?.avatar_url ? (
                    <img
                      src={
                        perfil.avatar_url
                      }
                      alt="Mi avatar"
                    />
                  ) : (
                    <span>
                      🦦
                    </span>
                  )}
                </div>

                <Link
                  href="/publicar"
                  className="fakeInput"
                >
                  ¿Qué quieres
                  compartir con la
                  comunidad?
                </Link>

                <Link
                  href="/publicar"
                  className="primaryButton createButtonLink"
                >
                  Publicar
                </Link>
              </div>

              <div className="feedTabs">
                <button
                  type="button"
                  className={`feedTab ${
                    filtro === "Todos"
                      ? "activeTab"
                      : ""
                  }`}
                  onClick={() =>
                    setFiltro("Todos")
                  }
                >
                  Para ti
                </button>

                <button
                  type="button"
                  className={`feedTab ${
                    filtro === "Apunte"
                      ? "activeTab"
                      : ""
                  }`}
                  onClick={() =>
                    setFiltro("Apunte")
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
                    filtro === "Ayuda"
                      ? "activeTab"
                      : ""
                  }`}
                  onClick={() =>
                    setFiltro("Ayuda")
                  }
                >
                  🤝 Ayuda
                </button>
              </div>

              {mensaje && (
                <div className="errorBox">
                  {mensaje}
                </div>
              )}

              {!mensaje &&
                postsFiltrados.length ===
                  0 && (
                  <div className="emptyState">
                    <span className="emptyStateIcon">
                      🦦
                    </span>

                    No hay publicaciones
                    en esta categoría
                    todavía.
                  </div>
                )}

              {postsFiltrados.map(
                (post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={
                      currentUserId
                    }
                  />
                )
              )}
            </div>

            <aside className="trends">
              <h3>
                Tendencias
              </h3>

              <div className="trend">
                <span>
                  🔥
                </span>

                <div>
                  <p>
                    Semana de
                    exámenes
                  </p>

                  <span>
                    Comunidad
                  </span>
                </div>
              </div>

              <div className="trend">
                <span>
                  📖
                </span>

                <div>
                  <p>
                    Apuntes
                    compartidos
                  </p>

                  <span>
                    Estudio
                  </span>
                </div>
              </div>

              <div className="trend">
                <span>
                  🌮
                </span>

                <div>
                  <p>
                    Lugares para
                    comer
                  </p>

                  <span>
                    Social
                  </span>
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>

      <ChatPanel
        currentUserId={currentUserId}
        perfil={perfil}
      />

      <nav className="mobileNav">
        <Link
          href="/"
          className="active"
        >
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

        <Link href="/guardados">
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



