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
import GlobalSearchBar from "../components/GlobalSearchBar";

type FiltroFeed =
  | "Todos"
  | "Apunte"
  | "Pregunta"
  | "Ayuda";

type RecursoReciente = {
  id: string;
  titulo: string;
  materia: string;
  created_at: string;
};

type EventoProximo = {
  id: string;
  titulo: string;
  lugar: string;
  fecha_inicio: string;
};

type SocialReciente = {
  id: string;
  titulo: string;
  categoria: string;
  calificacion: number | null;
  created_at: string;
};

type EstadisticasInicio = {
  publicaciones: number;
  recursos: number;
  eventos: number;
  social: number;
};

export default function HomePage() {
  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [
    perfil,
    setPerfil,
  ] =
    useState<PerfilResumen | null>(
      null
    );

  const [
    posts,
    setPosts,
  ] =
    useState<PostConAutor[]>(
      []
    );

  const [
    filtro,
    setFiltro,
  ] =
    useState<FiltroFeed>(
      "Todos"
    );

  const [
    recursoReciente,
    setRecursoReciente,
  ] =
    useState<RecursoReciente | null>(
      null
    );

  const [
    eventoProximo,
    setEventoProximo,
  ] =
    useState<EventoProximo | null>(
      null
    );

  const [
    socialReciente,
    setSocialReciente,
  ] =
    useState<SocialReciente | null>(
      null
    );

  const [
    estadisticas,
    setEstadisticas,
  ] =
    useState<EstadisticasInicio>({
      publicaciones: 0,
      recursos: 0,
      eventos: 0,
      social: 0,
    });

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

    async function cargarInicio() {
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

        const ahora =
          new Date().toISOString();

        const [
          perfilResultado,
          postsResultado,
          recursoResultado,
          eventoResultado,
          socialResultado,
          totalPostsResultado,
          totalRecursosResultado,
          totalEventosResultado,
          totalSocialResultado,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(`
              id,
              username,
              nombre,
              carrera,
              semestre,
              avatar_url
            `)
            .eq(
              "id",
              user.id
            )
            .maybeSingle(),

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
              titulo,
              materia,
              created_at
            `)
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(1)
            .maybeSingle(),

          supabase
            .from("events")
            .select(`
              id,
              titulo,
              lugar,
              fecha_inicio
            `)
            .gte(
              "fecha_inicio",
              ahora
            )
            .order(
              "fecha_inicio",
              {
                ascending: true,
              }
            )
            .limit(1)
            .maybeSingle(),

          supabase
            .from("social_posts")
            .select(`
              id,
              titulo,
              categoria,
              calificacion,
              created_at
            `)
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(1)
            .maybeSingle(),

          supabase
            .from("posts")
            .select(
              "id",
              {
                count: "exact",
                head: true,
              }
            ),

          supabase
            .from("resources")
            .select(
              "id",
              {
                count: "exact",
                head: true,
              }
            ),

          supabase
            .from("events")
            .select(
              "id",
              {
                count: "exact",
                head: true,
              }
            )
            .gte(
              "fecha_inicio",
              ahora
            ),

          supabase
            .from("social_posts")
            .select(
              "id",
              {
                count: "exact",
                head: true,
              }
            ),
        ]);

        if (
          perfilResultado.error
        ) {
          throw new Error(
            `No pudimos cargar tu perfil: ${perfilResultado.error.message}`
          );
        }

        if (
          postsResultado.error
        ) {
          throw new Error(
            `No pudimos cargar las publicaciones: ${postsResultado.error.message}`
          );
        }

        if (
          recursoResultado.error
        ) {
          throw new Error(
            `No pudimos cargar Estudio: ${recursoResultado.error.message}`
          );
        }

        if (
          eventoResultado.error
        ) {
          throw new Error(
            `No pudimos cargar Eventos: ${eventoResultado.error.message}`
          );
        }

        if (
          socialResultado.error
        ) {
          throw new Error(
            `No pudimos cargar Social: ${socialResultado.error.message}`
          );
        }

        if (
          totalPostsResultado.error
        ) {
          throw new Error(
            `No pudimos contar las publicaciones: ${totalPostsResultado.error.message}`
          );
        }

        if (
          totalRecursosResultado.error
        ) {
          throw new Error(
            `No pudimos contar los recursos: ${totalRecursosResultado.error.message}`
          );
        }

        if (
          totalEventosResultado.error
        ) {
          throw new Error(
            `No pudimos contar los eventos: ${totalEventosResultado.error.message}`
          );
        }

        if (
          totalSocialResultado.error
        ) {
          throw new Error(
            `No pudimos contar las recomendaciones: ${totalSocialResultado.error.message}`
          );
        }

        if (!activo) {
          return;
        }

        if (
          perfilResultado.data
        ) {
          setPerfil(
            perfilResultado.data as PerfilResumen
          );
        }

        setRecursoReciente(
          recursoResultado.data as RecursoReciente | null
        );

        setEventoProximo(
          eventoResultado.data as EventoProximo | null
        );

        setSocialReciente(
          socialResultado.data as SocialReciente | null
        );

        setEstadisticas({
          publicaciones:
            totalPostsResultado.count ||
            0,

          recursos:
            totalRecursosResultado.count ||
            0,

          eventos:
            totalEventosResultado.count ||
            0,

          social:
            totalSocialResultado.count ||
            0,
        });

        const publicaciones =
          (postsResultado.data ||
            []) as PostBase[];

        if (
          publicaciones.length ===
          0
        ) {
          setPosts([]);
          return;
        }

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
          setCargando(
            false
          );
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

  function iconoSocial(
    categoria: string
  ) {
    if (
      categoria ===
      "restaurante"
    ) {
      return "🍜";
    }

    if (
      categoria ===
      "lugar"
    ) {
      return "📍";
    }

    if (
      categoria ===
      "videojuego"
    ) {
      return "🎮";
    }

    if (
      categoria ===
      "musica"
    ) {
      return "🎵";
    }

    if (
      categoria ===
      "lectura"
    ) {
      return "📖";
    }

    return "🌿";
  }

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            🦦
          </span>

          <p className="loadingText">
            Preparando tu comunidad...
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
          <GlobalSearchBar />

          <Link
            href="/notificaciones"
            className="circleButton"
            title="Notificaciones"
            aria-label="Notificaciones"
          >
            🔔
          </Link>

          <Link
            href="/perfil"
            className="profileLink"
            title="Mi perfil"
            aria-label="Mi perfil"
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
              🦦
            </span>

            <div>
              <strong>
                Uniónutriita
              </strong>

              <p>
                Tu rincón universitario
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
                Descubre qué está pasando,
                comparte algo con tus
                compañeros y encuentra
                ayuda dentro de la
                universidad.
              </p>
            </div>

            <div className="welcomeOtter">
              🦦
            </div>
          </section>

          <section className="news">
            <div className="sectionHeader">
              <p className="tiny">
                AHORA EN EL CAMPUS
              </p>

              <h3>
                Novedades
              </h3>
            </div>

            <div className="newsGrid">
              <Link
                href="/estudio"
                className="card"
                style={{
                  textDecoration:
                    "none",
                }}
              >
                <span className="cardIcon">
                  📚
                </span>

                <small>
                  Último recurso
                </small>

                <h4>
                  {recursoReciente
                    ? recursoReciente.titulo
                    : "Comparte tus apuntes"}
                </h4>

                <p>
                  {recursoReciente
                    ? `Materia: ${recursoReciente.materia}`
                    : "Todavía no hay recursos compartidos."}
                </p>
              </Link>

              {eventoProximo ? (
                <Link
                  href={`/eventos/${eventoProximo.id}`}
                  className="card"
                  style={{
                    textDecoration:
                      "none",
                  }}
                >
                  <span className="cardIcon">
                    🎉
                  </span>

                  <small>
                    Próximo evento
                  </small>

                  <h4>
                    {
                      eventoProximo.titulo
                    }
                  </h4>

                  <p>
                    📍{" "}
                    {
                      eventoProximo.lugar
                    }
                  </p>

                  <p>
                    📅{" "}
                    {new Date(
                      eventoProximo.fecha_inicio
                    ).toLocaleString(
                      "es-MX",
                      {
                        day:
                          "numeric",
                        month:
                          "short",
                        hour:
                          "numeric",
                        minute:
                          "2-digit",
                      }
                    )}
                  </p>
                </Link>
              ) : (
                <Link
                  href="/eventos"
                  className="card"
                  style={{
                    textDecoration:
                      "none",
                  }}
                >
                  <span className="cardIcon">
                    🎉
                  </span>

                  <small>
                    Eventos
                  </small>

                  <h4>
                    Sin eventos próximos
                  </h4>

                  <p>
                    Crea una actividad
                    para la comunidad.
                  </p>
                </Link>
              )}

              <Link
                href="/social"
                className="card"
                style={{
                  textDecoration:
                    "none",
                }}
              >
                <span className="cardIcon">
                  {socialReciente
                    ? iconoSocial(
                        socialReciente.categoria
                      )
                    : "🌿"}
                </span>

                <small>
                  Social
                </small>

                <h4>
                  {socialReciente
                    ? socialReciente.titulo
                    : "Descubre recomendaciones"}
                </h4>

                <p>
                  {socialReciente
                    ?.calificacion
                    ? "⭐".repeat(
                        socialReciente.calificacion
                      )
                    : "Comida, lugares, música, juegos y lecturas."}
                </p>
              </Link>
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
                  ¿Qué quieres compartir
                  con la comunidad?
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
                  Para ti
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

                    <strong>
                      {filtro ===
                      "Todos"
                        ? "Todavía no hay publicaciones"
                        : `Todavía no hay ${filtro.toLowerCase()}s`}
                    </strong>

                    <p
                      style={{
                        marginBottom:
                          "14px",
                      }}
                    >
                      {filtro ===
                      "Todos"
                        ? "Sé la primera persona en compartir algo con la comunidad."
                        : "Puedes probar otra categoría o crear una nueva publicación."}
                    </p>

                    <Link
                      href="/publicar"
                      className="primaryButton"
                    >
                      Crear publicación
                    </Link>
                  </div>
                )}

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

            <aside className="trends">
              <h3>
                Actividad
              </h3>

              <div className="trend">
                <span>
                  💬
                </span>

                <div>
                  <p>
                    {
                      estadisticas.publicaciones
                    }{" "}
                    publicaciones
                  </p>

                  <span>
                    Feed
                  </span>
                </div>
              </div>

              <Link
                href="/estudio"
                className="trend"
                style={{
                  textDecoration:
                    "none",
                }}
              >
                <span>
                  📚
                </span>

                <div>
                  <p>
                    {
                      estadisticas.recursos
                    }{" "}
                    recursos
                  </p>

                  <span>
                    Estudio
                  </span>
                </div>
              </Link>

              <Link
                href="/eventos"
                className="trend"
                style={{
                  textDecoration:
                    "none",
                }}
              >
                <span>
                  🎉
                </span>

                <div>
                  <p>
                    {
                      estadisticas.eventos
                    }{" "}
                    próximos
                  </p>

                  <span>
                    Eventos
                  </span>
                </div>
              </Link>

              <Link
                href="/social"
                className="trend"
                style={{
                  textDecoration:
                    "none",
                }}
              >
                <span>
                  🌿
                </span>

                <div>
                  <p>
                    {
                      estadisticas.social
                    }{" "}
                    recomendaciones
                  </p>

                  <span>
                    Social
                  </span>
                </div>
              </Link>

              <Link
                href="/buscar"
                className="trend"
                style={{
                  textDecoration:
                    "none",
                }}
              >
                <span>
                  🔎
                </span>

                <div>
                  <p>
                    Explorar Uniónutriita
                  </p>

                  <span>
                    Buscar
                  </span>
                </div>
              </Link>
            </aside>
          </section>
        </main>
      </div>

      <ChatPanel
        currentUserId={
          currentUserId
        }
        perfil={
          perfil
        }
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

        <Link href="/notificaciones">
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




