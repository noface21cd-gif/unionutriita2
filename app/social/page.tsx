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

type Categoria =
  | "restaurante"
  | "lugar"
  | "videojuego"
  | "musica"
  | "lectura";

type SocialPostBase = {
  id: string;
  user_id: string;
  categoria: Categoria;
  titulo: string;
  contenido: string;
  calificacion: number | null;
  referencia: string | null;
  created_at: string;
};

type Autor = {
  id: string;
  username: string | null;
  nombre: string | null;
  avatar_url: string | null;
};

type SocialPost =
  SocialPostBase & {
    autor: Autor | null;
  };

type Filtro =
  | "todos"
  | Categoria;

const CATEGORIAS: {
  value: Categoria;
  nombre: string;
  singular: string;
  icono: string;
}[] = [
  {
    value: "restaurante",
    nombre: "Restaurantes",
    singular: "Restaurante",
    icono: "🍜",
  },
  {
    value: "lugar",
    nombre: "Lugares",
    singular: "Lugar",
    icono: "📍",
  },
  {
    value: "videojuego",
    nombre: "Videojuegos",
    singular: "Videojuego",
    icono: "🎮",
  },
  {
    value: "musica",
    nombre: "Música",
    singular: "Música",
    icono: "🎵",
  },
  {
    value: "lectura",
    nombre: "Lecturas",
    singular: "Lectura",
    icono: "📚",
  },
];

export default function SocialPage() {
  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [
    posts,
    setPosts,
  ] = useState<SocialPost[]>([]);

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    categoria,
    setCategoria,
  ] = useState<Categoria>(
    "restaurante"
  );

  const [
    titulo,
    setTitulo,
  ] = useState("");

  const [
    contenido,
    setContenido,
  ] = useState("");

  const [
    calificacion,
    setCalificacion,
  ] = useState("5");

  const [
    referencia,
    setReferencia,
  ] = useState("");

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  const [
    filtro,
    setFiltro,
  ] =
    useState<Filtro>("todos");

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    publicando,
    setPublicando,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  async function cargarPosts() {
    const supabase =
      createClient();

    const {
      data: postsData,
      error: postsError,
    } = await supabase
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

    const publicaciones =
      (postsData ||
        []) as SocialPostBase[];

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
        []) as Autor[];

    const mapaAutores =
      new Map<
        string,
        Autor
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
      publicaciones.map(
        (post) => ({
          ...post,

          autor:
            mapaAutores.get(
              post.user_id
            ) || null,
        })
      )
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

        await cargarPosts();
      } catch (error) {
        if (!activo) {
          return;
        }

        setMensaje(
          error instanceof Error
            ? error.message
            : "No pudimos cargar Social."
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

  async function publicar(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const tituloLimpio =
      titulo.trim();

    const contenidoLimpio =
      contenido.trim();

    if (
      !tituloLimpio ||
      !contenidoLimpio
    ) {
      setMensaje(
        "Escribe un título y una recomendación."
      );

      return;
    }

    setPublicando(true);
    setMensaje("");

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from("social_posts")
          .insert({
            user_id:
              currentUserId,

            categoria,

            titulo:
              tituloLimpio,

            contenido:
              contenidoLimpio,

            calificacion:
              Number(
                calificacion
              ),

            referencia:
              referencia.trim() ||
              null,
          });

      if (error) {
        throw new Error(
          error.message
        );
      }

      setTitulo("");
      setContenido("");
      setReferencia("");
      setCalificacion("5");

      setMostrarFormulario(
        false
      );

      await cargarPosts();
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? `No pudimos publicar: ${error.message}`
          : "No pudimos publicar la recomendación."
      );
    } finally {
      setPublicando(false);
    }
  }

  async function eliminar(
    post: SocialPost
  ) {
    if (
      post.user_id !==
      currentUserId
    ) {
      return;
    }

    const confirmado =
      window.confirm(
        "¿Eliminar esta recomendación?"
      );

    if (!confirmado) {
      return;
    }

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from("social_posts")
          .delete()
          .eq(
            "id",
            post.id
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
            (item) =>
              item.id !==
              post.id
          )
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos eliminar la recomendación."
      );
    }
  }

  function datosCategoria(
    categoriaActual: Categoria
  ) {
    return (
      CATEGORIAS.find(
        (item) =>
          item.value ===
          categoriaActual
      ) ||
      CATEGORIAS[0]
    );
  }

  function estrellas(
    cantidad: number | null
  ) {
    if (!cantidad) {
      return "";
    }

    return "⭐".repeat(
      cantidad
    );
  }

  function fechaBonita(
    fecha: string
  ) {
    return new Date(
      fecha
    ).toLocaleDateString(
      "es-MX",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  function placeholderTitulo() {
    if (
      categoria ===
      "restaurante"
    ) {
      return "Ej. Mi restaurante favorito";
    }

    if (
      categoria ===
      "lugar"
    ) {
      return "Ej. Jardín Etnobotánico";
    }

    if (
      categoria ===
      "videojuego"
    ) {
      return "Ej. Minecraft";
    }

    if (
      categoria ===
      "musica"
    ) {
      return "Ej. Álbum o artista";
    }

    return "Ej. Nombre del libro";
  }

  function placeholderReferencia() {
    if (
      categoria ===
        "restaurante" ||
      categoria ===
        "lugar"
    ) {
      return "Dirección, colonia o zona";
    }

    if (
      categoria ===
      "videojuego"
    ) {
      return "Plataforma o desarrollador";
    }

    if (
      categoria ===
      "musica"
    ) {
      return "Artista, álbum o plataforma";
    }

    return "Autor o editorial";
  }

  function fondoCategoria(
    categoriaActual: Categoria
  ) {
    if (
      categoriaActual ===
      "restaurante"
    ) {
      return "#f8e7c7";
    }

    if (
      categoriaActual ===
      "lugar"
    ) {
      return "#e5eedc";
    }

    if (
      categoriaActual ===
      "videojuego"
    ) {
      return "#ece8f5";
    }

    if (
      categoriaActual ===
      "musica"
    ) {
      return "#f5e8ee";
    }

    return "#e8edf4";
  }

  const postsFiltrados =
    useMemo(() => {
      const texto =
        busqueda
          .trim()
          .toLowerCase();

      return posts.filter(
        (post) => {
          const coincideCategoria =
            filtro === "todos" ||
            post.categoria ===
              filtro;

          const contenidoCompleto =
            [
              post.titulo,
              post.contenido,
              post.referencia,
              post.autor?.nombre,
              post.autor?.username,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          const coincideTexto =
            !texto ||
            contenidoCompleto.includes(
              texto
            );

          return (
            coincideCategoria &&
            coincideTexto
          );
        }
      );
    }, [
      posts,
      filtro,
      busqueda,
    ]);

  const misRecomendaciones =
    posts.filter(
      (post) =>
        post.user_id ===
        currentUserId
    ).length;

  const restaurantes =
    posts.filter(
      (post) =>
        post.categoria ===
        "restaurante"
    ).length;

  const lugares =
    posts.filter(
      (post) =>
        post.categoria ===
        "lugar"
    ).length;

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            🌿
          </span>

          <p className="loadingText">
            Reuniendo recomendaciones...
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
            className="menuButton"
          >
            <span className="menuIcon">
              🔖
            </span>

            Guardados
          </Link>

          <Link
            href="/social"
            className="menuButton selected"
          >
            <span className="menuIcon">
              🌿
            </span>

            Social
          </Link>

          <div className="otterCard">
            <span className="bigOtter">
              🌿
            </span>

            <div>
              <strong>
                Fuera del salón
              </strong>

              <p>
                Descubre algo nuevo
              </p>
            </div>
          </div>
        </aside>

        <main className="content">
          <section className="welcome">
            <div>
              <p className="tiny">
                FUERA DEL SALÓN
              </p>

              <h2>
                Social 🌿
              </h2>

              <p>
                Descubre restaurantes,
                rincones de Oaxaca,
                videojuegos, música y
                lecturas recomendadas
                por otros estudiantes.
              </p>
            </div>

            <div className="welcomeOtter">
              🌿
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
                RECOMENDACIONES
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
                compartidas por la comunidad
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                MIS APORTES
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
                {misRecomendaciones}
              </strong>

              <p>
                recomendaciones tuyas
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                COMIDA
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
                {restaurantes}
              </strong>

              <p>
                lugares para comer
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                LUGARES
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
                {lugares}
              </strong>

              <p>
                rincones recomendados
              </p>
            </article>
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
                href="/"
                className="backHomeButton"
              >
                ← Inicio
              </Link>

              <Link
                href="/eventos"
                className="backHomeButton"
              >
                🎉 Eventos
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
                : "＋ Recomendar algo"}
            </button>
          </div>

          {mostrarFormulario && (
            <section
              className="card"
              style={{
                maxWidth:
                  "820px",

                marginTop:
                  "18px",

                padding:
                  "24px",
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
                    "15px",

                  marginBottom:
                    "20px",
                }}
              >
                <div>
                  <p className="tiny">
                    NUEVA RECOMENDACIÓN
                  </p>

                  <h2
                    style={{
                      margin:
                        "5px 0",
                    }}
                  >
                    Comparte algo
                  </h2>

                  <p
                    style={{
                      margin: 0,

                      maxWidth:
                        "580px",

                      color:
                        "#70746a",

                      fontSize:
                        "13px",

                      lineHeight:
                        1.5,
                    }}
                  >
                    Recomienda algo que
                    realmente hayas
                    disfrutado y ayuda a
                    otros estudiantes a
                    descubrirlo.
                  </p>
                </div>

                <div
                  className="cardIcon"
                  style={{
                    fontSize:
                      "25px",

                    background:
                      fondoCategoria(
                        categoria
                      ),
                  }}
                >
                  {
                    datosCategoria(
                      categoria
                    ).icono
                  }
                </div>
              </div>

              <form
                className="authForm"
                onSubmit={publicar}
              >
                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",

                    gap:
                      "14px",
                  }}
                >
                  <label>
                    Categoría

                    <select
                      value={categoria}
                      onChange={(e) =>
                        setCategoria(
                          e.target
                            .value as Categoria
                        )
                      }
                    >
                      {CATEGORIAS.map(
                        (item) => (
                          <option
                            key={
                              item.value
                            }
                            value={
                              item.value
                            }
                          >
                            {item.icono}{" "}
                            {item.nombre}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    Calificación

                    <select
                      value={
                        calificacion
                      }
                      onChange={(e) =>
                        setCalificacion(
                          e.target.value
                        )
                      }
                    >
                      <option value="5">
                        ⭐⭐⭐⭐⭐ Excelente
                      </option>

                      <option value="4">
                        ⭐⭐⭐⭐ Muy bueno
                      </option>

                      <option value="3">
                        ⭐⭐⭐ Bueno
                      </option>

                      <option value="2">
                        ⭐⭐ Regular
                      </option>

                      <option value="1">
                        ⭐ Malo
                      </option>
                    </select>
                  </label>
                </div>

                <label>
                  Título

                  <input
                    value={titulo}
                    onChange={(e) =>
                      setTitulo(
                        e.target.value
                      )
                    }
                    placeholder={
                      placeholderTitulo()
                    }
                    maxLength={150}
                    required
                  />
                </label>

                <label>
                  Tu opinión

                  <textarea
                    value={contenido}
                    onChange={(e) =>
                      setContenido(
                        e.target.value
                      )
                    }
                    rows={5}
                    maxLength={3000}
                    placeholder="¿Por qué lo recomiendas? ¿Qué te gustó?"
                    required
                  />
                </label>

                <label>
                  Referencia opcional

                  <input
                    value={referencia}
                    onChange={(e) =>
                      setReferencia(
                        e.target.value
                      )
                    }
                    maxLength={300}
                    placeholder={
                      placeholderReferencia()
                    }
                  />
                </label>

                <div
                  style={{
                    padding:
                      "12px 14px",

                    border:
                      "1px dashed #d5ccbd",

                    borderRadius:
                      "13px",

                    background:
                      "#f7f4ee",

                    color:
                      "#70746a",

                    fontSize:
                      "12px",

                    lineHeight:
                      1.5,
                  }}
                >
                  {
                    datosCategoria(
                      categoria
                    ).icono
                  }{" "}
                  Estás recomendando un{" "}
                  <strong>
                    {datosCategoria(
                      categoria
                    ).singular.toLowerCase()}
                  </strong>{" "}
                  con una calificación
                  de{" "}
                  <strong>
                    {calificacion}/5
                  </strong>
                  .
                </div>

                <button
                  type="submit"
                  className="authButton"
                  disabled={
                    publicando
                  }
                >
                  {publicando
                    ? "Publicando..."
                    : "🌿 Publicar recomendación"}
                </button>
              </form>
            </section>
          )}

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
                DESCUBRIR
              </p>

              <h2>
                Recomendaciones
              </h2>
            </div>

            <div
              className="card"
              style={{
                padding:
                  "14px",

                marginBottom:
                  "16px",
              }}
            >
              <div
                className="searchBox"
                style={{
                  width:
                    "100%",
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
                  placeholder="Buscar restaurante, lugar, juego, música, libro o persona..."
                />
              </div>

              <div
                className="feedTabs"
                style={{
                  marginBottom: 0,
                }}
              >
                <button
                  type="button"
                  className={`feedTab ${
                    filtro ===
                    "todos"
                      ? "activeTab"
                      : ""
                  }`}
                  onClick={() =>
                    setFiltro(
                      "todos"
                    )
                  }
                >
                  🌿 Todo
                </button>

                {CATEGORIAS.map(
                  (item) => (
                    <button
                      key={
                        item.value
                      }
                      type="button"
                      className={`feedTab ${
                        filtro ===
                        item.value
                          ? "activeTab"
                          : ""
                      }`}
                      onClick={() =>
                        setFiltro(
                          item.value
                        )
                      }
                    >
                      {item.icono}{" "}
                      {item.nombre}
                    </button>
                  )
                )}
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
                    postsFiltrados.length
                  }
                </strong>{" "}
                de{" "}
                <strong>
                  {posts.length}
                </strong>{" "}
                recomendaciones
              </p>

              {(busqueda ||
                filtro !==
                  "todos") && (
                <span
                  className="tag"
                  style={{
                    marginTop: 0,
                  }}
                >
                  🔎 Filtros activos
                </span>
              )}
            </div>

            {postsFiltrados.length ===
            0 ? (
              <div className="emptyState">
                <span className="emptyStateIcon">
                  🌿
                </span>

                <strong>
                  No encontramos recomendaciones
                </strong>

                <p
                  style={{
                    marginBottom:
                      0,
                  }}
                >
                  Prueba con otra búsqueda
                  o explora una categoría
                  diferente.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(300px, 1fr))",

                  gap:
                    "14px",
                }}
              >
                {postsFiltrados.map(
                  (post) => {
                    const categoriaInfo =
                      datosCategoria(
                        post.categoria
                      );

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
                        key={post.id}
                        className="card"
                        style={{
                          display:
                            "flex",

                          flexDirection:
                            "column",

                          minHeight:
                            "390px",

                          overflow:
                            "hidden",
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
                              "12px",
                          }}
                        >
                          <div
                            style={{
                              width:
                                "58px",

                              height:
                                "58px",

                              flexShrink:
                                0,

                              display:
                                "grid",

                              placeItems:
                                "center",

                              border:
                                "1px solid #e4ddcf",

                              borderRadius:
                                "17px",

                              background:
                                fondoCategoria(
                                  post.categoria
                                ),

                              fontSize:
                                "29px",
                            }}
                          >
                            {
                              categoriaInfo.icono
                            }
                          </div>

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
                                Mi recomendación
                              </span>
                            )}

                            {esMio && (
                              <button
                                type="button"
                                className="moreButton"
                                title="Eliminar recomendación"
                                aria-label="Eliminar recomendación"
                                onClick={() =>
                                  eliminar(
                                    post
                                  )
                                }
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>

                        <p
                          className="tiny"
                          style={{
                            marginTop:
                              "15px",
                          }}
                        >
                          {
                            categoriaInfo.nombre
                          }
                        </p>

                        <h3
                          style={{
                            margin:
                              "6px 0",

                            fontSize:
                              "19px",

                            lineHeight:
                              1.3,
                          }}
                        >
                          {post.titulo}
                        </h3>

                        <div
                          style={{
                            minHeight:
                              "25px",

                            marginBottom:
                              "8px",

                            color:
                              "#ad7d39",

                            fontSize:
                              "15px",

                            letterSpacing:
                              "1px",
                          }}
                          title={
                            post.calificacion
                              ? `${post.calificacion} de 5`
                              : undefined
                          }
                        >
                          {estrellas(
                            post.calificacion
                          )}
                        </div>

                        <p
                          style={{
                            margin:
                              "4px 0",

                            color:
                              "#62685d",

                            fontSize:
                              "13px",

                            lineHeight:
                              1.65,

                            overflowWrap:
                              "anywhere",

                            whiteSpace:
                              "pre-wrap",
                          }}
                        >
                          {post.contenido}
                        </p>

                        {post.referencia && (
                          <div
                            style={{
                              marginTop:
                                "12px",

                              padding:
                                "10px 11px",

                              borderRadius:
                                "12px",

                              background:
                                "#f3f0e8",

                              color:
                                "#70746a",

                              fontSize:
                                "11px",

                              lineHeight:
                                1.45,

                              overflowWrap:
                                "anywhere",
                            }}
                          >
                            📌{" "}
                            {
                              post.referencia
                            }
                          </div>
                        )}

                        <div
                          style={{
                            display:
                              "flex",

                            alignItems:
                              "center",

                            gap:
                              "9px",

                            marginTop:
                              "auto",

                            paddingTop:
                              "15px",

                            borderTop:
                              "1px solid #eee7dc",
                          }}
                        >
                          {username ? (
                            <Link
                              href={`/u/${username}`}
                              className="avatar"
                              style={{
                                width:
                                  "36px",

                                height:
                                  "36px",
                              }}
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
                            <div
                              className="avatar"
                              style={{
                                width:
                                  "36px",

                                height:
                                  "36px",
                              }}
                            >
                              🦦
                            </div>
                          )}

                          <div
                            style={{
                              minWidth:
                                0,
                            }}
                          >
                            {username ? (
                              <Link
                                href={`/u/${username}`}
                                style={{
                                  display:
                                    "block",

                                  color:
                                    "#30352d",

                                  fontSize:
                                    "12px",

                                  fontWeight:
                                    800,

                                  textDecoration:
                                    "none",

                                  overflowWrap:
                                    "anywhere",
                                }}
                              >
                                {nombre}
                              </Link>
                            ) : (
                              <strong
                                style={{
                                  fontSize:
                                    "12px",
                                }}
                              >
                                {nombre}
                              </strong>
                            )}

                            <p
                              style={{
                                margin:
                                  "2px 0 0",

                                color:
                                  "#969188",

                                fontSize:
                                  "10px",
                              }}
                            >
                              {username
                                ? `@${username} · `
                                : ""}

                              {fechaBonita(
                                post.created_at
                              )}
                            </p>
                          </div>
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
          href="/social"
          className="active"
        >
          <span>
            🌿
          </span>

          <span>
            Social
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

