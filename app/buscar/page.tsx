"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from "../../lib/supabase/client";
import { requerirUsuario } from "../../lib/auth";

type Perfil = {
  id: string;
  username: string | null;
  nombre: string | null;
  carrera: string | null;
  semestre: string | null;
  avatar_url: string | null;
};

type Habilidad = {
  id: string;
  user_id: string;
  skill: string;
  nivel:
    | "Básico"
    | "Intermedio"
    | "Avanzado";
};

type Post = {
  id: string;
  user_id: string;
  tipo: string;
  contenido: string;
  created_at: string;
};

type Comunidad = {
  id: string;
  slug: string;
  nombre: string;
  tipo: string;
  carrera: string | null;
  semestre: string | null;
  descripcion: string | null;
};

type Recurso = {
  id: string;
  user_id: string;
  titulo: string;
  descripcion: string | null;
  materia: string;
  carrera: string;
  semestre: string;
  archivo_nombre: string;
};

type Evento = {
  id: string;
  creator_id: string;
  titulo: string;
  descripcion: string | null;
  lugar: string;
  fecha_inicio: string;
};

export default function BuscarPage() {
  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  const [
    perfiles,
    setPerfiles,
  ] = useState<Perfil[]>([]);

  const [
    habilidades,
    setHabilidades,
  ] = useState<Habilidad[]>([]);

  const [
    posts,
    setPosts,
  ] = useState<Post[]>([]);

  const [
    comunidades,
    setComunidades,
  ] = useState<Comunidad[]>([]);

  const [
    recursos,
    setRecursos,
  ] = useState<Recurso[]>([]);

  const [
    eventos,
    setEventos,
  ] = useState<Evento[]>([]);

  const [
    autores,
    setAutores,
  ] = useState<
    Record<string, Perfil>
  >({});

  const [
    cargando,
    setCargando,
  ] = useState(false);

  const [
    inicioListo,
    setInicioListo,
  ] = useState(false);

  const [
    consultaRealizada,
    setConsultaRealizada,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  function unirPorId<
    T extends {
      id: string;
    }
  >(listas: T[][]) {
    const mapa =
      new Map<string, T>();

    listas.forEach(
      (lista) => {
        lista.forEach(
          (item) => {
            mapa.set(
              item.id,
              item
            );
          }
        );
      }
    );

    return Array.from(
      mapa.values()
    );
  }

  function habilidadesDe(
    userId: string
  ) {
    return habilidades.filter(
      (habilidad) =>
        habilidad.user_id ===
        userId
    );
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

  function fechaEvento(
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

  function fechaPost(
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

  function iconoComunidad(
    tipo: string
  ) {
    if (
      tipo === "general"
    ) {
      return "🏫";
    }

    if (
      tipo === "carrera"
    ) {
      return "🎓";
    }

    return "📖";
  }

  async function ejecutarBusqueda(
    textoOriginal: string
  ) {
    const texto =
      textoOriginal.trim();

    if (!texto) {
      return;
    }

    setCargando(true);
    setConsultaRealizada(true);
    setMensaje("");

    try {
      const supabase =
        createClient();

      const patron =
        `%${texto}%`;

      /*
       * PRIMERA BÚSQUEDA:
       * personas + habilidades
       */
      const [
        perfilesNombre,
        perfilesUsuario,
        perfilesCarrera,
        habilidadesCoincidentes,
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
          .ilike(
            "nombre",
            patron
          )
          .limit(20),

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
          .ilike(
            "username",
            patron
          )
          .limit(20),

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
          .ilike(
            "carrera",
            patron
          )
          .limit(20),

        supabase
          .from("profile_skills")
          .select(`
            id,
            user_id,
            skill,
            nivel
          `)
          .ilike(
            "skill",
            patron
          )
          .limit(50),
      ]);

      if (
        perfilesNombre.error
      ) {
        throw new Error(
          perfilesNombre
            .error.message
        );
      }

      if (
        perfilesUsuario.error
      ) {
        throw new Error(
          perfilesUsuario
            .error.message
        );
      }

      if (
        perfilesCarrera.error
      ) {
        throw new Error(
          perfilesCarrera
            .error.message
        );
      }

      if (
        habilidadesCoincidentes.error
      ) {
        throw new Error(
          habilidadesCoincidentes
            .error.message
        );
      }

      const skillsEncontradas =
        (habilidadesCoincidentes.data ||
          []) as Habilidad[];

      const idsPorHabilidad =
        Array.from(
          new Set(
            skillsEncontradas.map(
              (skill) =>
                skill.user_id
            )
          )
        );

      let perfilesPorHabilidad:
        Perfil[] = [];

      if (
        idsPorHabilidad.length >
        0
      ) {
        const {
          data,
          error,
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
            idsPorHabilidad
          );

        if (error) {
          throw new Error(
            error.message
          );
        }

        perfilesPorHabilidad =
          (data ||
            []) as Perfil[];
      }

      const perfilesFinales =
        unirPorId<Perfil>([
          (perfilesNombre.data ||
            []) as Perfil[],

          (perfilesUsuario.data ||
            []) as Perfil[],

          (perfilesCarrera.data ||
            []) as Perfil[],

          perfilesPorHabilidad,
        ]);

      /*
       * Cargar todas las habilidades
       * de las personas encontradas.
       */
      if (
        perfilesFinales.length >
        0
      ) {
        const ids =
          perfilesFinales.map(
            (perfil) =>
              perfil.id
          );

        const {
          data,
          error,
        } = await supabase
          .from("profile_skills")
          .select(`
            id,
            user_id,
            skill,
            nivel
          `)
          .in(
            "user_id",
            ids
          )
          .order(
            "skill",
            {
              ascending: true,
            }
          );

        if (error) {
          throw new Error(
            error.message
          );
        }

        setHabilidades(
          (data ||
            []) as Habilidad[]
        );
      } else {
        setHabilidades([]);
      }

      /*
       * SEGUNDA BÚSQUEDA:
       * contenido de la plataforma
       */
      const [
        postsContenido,
        postsTipo,

        comunidadesNombre,
        comunidadesCarrera,

        recursosTitulo,
        recursosMateria,

        eventosTitulo,
        eventosLugar,
      ] = await Promise.all([
        supabase
          .from("posts")
          .select(`
            id,
            user_id,
            tipo,
            contenido,
            created_at
          `)
          .ilike(
            "contenido",
            patron
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(20),

        supabase
          .from("posts")
          .select(`
            id,
            user_id,
            tipo,
            contenido,
            created_at
          `)
          .ilike(
            "tipo",
            patron
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(20),

        supabase
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
          .ilike(
            "nombre",
            patron
          )
          .limit(20),

        supabase
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
          .ilike(
            "carrera",
            patron
          )
          .limit(20),

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
            archivo_nombre
          `)
          .ilike(
            "titulo",
            patron
          )
          .limit(20),

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
            archivo_nombre
          `)
          .ilike(
            "materia",
            patron
          )
          .limit(20),

        supabase
          .from("events")
          .select(`
            id,
            creator_id,
            titulo,
            descripcion,
            lugar,
            fecha_inicio
          `)
          .ilike(
            "titulo",
            patron
          )
          .limit(20),

        supabase
          .from("events")
          .select(`
            id,
            creator_id,
            titulo,
            descripcion,
            lugar,
            fecha_inicio
          `)
          .ilike(
            "lugar",
            patron
          )
          .limit(20),
      ]);

      const resultados = [
        postsContenido,
        postsTipo,
        comunidadesNombre,
        comunidadesCarrera,
        recursosTitulo,
        recursosMateria,
        eventosTitulo,
        eventosLugar,
      ];

      const resultadoConError =
        resultados.find(
          (resultado) =>
            resultado.error
        );

      if (
        resultadoConError?.error
      ) {
        throw new Error(
          resultadoConError
            .error.message
        );
      }

      const postsFinales =
        unirPorId<Post>([
          (postsContenido.data ||
            []) as Post[],

          (postsTipo.data ||
            []) as Post[],
        ]);

      const comunidadesFinales =
        unirPorId<Comunidad>([
          (comunidadesNombre.data ||
            []) as Comunidad[],

          (comunidadesCarrera.data ||
            []) as Comunidad[],
        ]);

      const recursosFinales =
        unirPorId<Recurso>([
          (recursosTitulo.data ||
            []) as Recurso[],

          (recursosMateria.data ||
            []) as Recurso[],
        ]);

      const eventosFinales =
        unirPorId<Evento>([
          (eventosTitulo.data ||
            []) as Evento[],

          (eventosLugar.data ||
            []) as Evento[],
        ]);

      setPerfiles(
        perfilesFinales
      );

      setPosts(
        postsFinales
      );

      setComunidades(
        comunidadesFinales
      );

      setRecursos(
        recursosFinales
      );

      setEventos(
        eventosFinales
      );

      /*
       * Autores para publicaciones,
       * recursos y eventos.
       */
      const idsAutores =
        Array.from(
          new Set([
            ...postsFinales.map(
              (post) =>
                post.user_id
            ),

            ...recursosFinales.map(
              (recurso) =>
                recurso.user_id
            ),

            ...eventosFinales.map(
              (evento) =>
                evento.creator_id
            ),
          ])
        );

      if (
        idsAutores.length >
        0
      ) {
        const {
          data,
          error,
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

        if (error) {
          throw new Error(
            error.message
          );
        }

        const mapa:
          Record<
            string,
            Perfil
          > = {};

        (
          (data ||
            []) as Perfil[]
        ).forEach(
          (autor) => {
            mapa[autor.id] =
              autor;
          }
        );

        setAutores(mapa);
      } else {
        setAutores({});
      }

      window.history.replaceState(
        {},
        "",
        `/buscar?q=${encodeURIComponent(
          texto
        )}`
      );
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? `No pudimos buscar: ${error.message}`
          : "No pudimos realizar la búsqueda."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let activo = true;

    async function iniciar() {
      const user =
        await requerirUsuario();

      if (
        !user ||
        !activo
      ) {
        return;
      }

      const parametros =
        new URLSearchParams(
          window.location.search
        );

      const consulta =
        parametros
          .get("q")
          ?.trim() || "";

      if (consulta) {
        setBusqueda(
          consulta
        );

        await ejecutarBusqueda(
          consulta
        );
      }

      if (activo) {
        setInicioListo(
          true
        );
      }
    }

    iniciar();

    return () => {
      activo = false;
    };
  }, []);

  async function buscar(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    await ejecutarBusqueda(
      busqueda
    );
  }

  const total =
    perfiles.length +
    posts.length +
    comunidades.length +
    recursos.length +
    eventos.length;

  if (!inicioListo) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            🔎
          </span>

          <p className="loadingText">
            Preparando el buscador...
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
            style={{
              background:
                "#e5eedc",
            }}
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
            className="menuButton selected"
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

          <div className="otterCard">
            <span className="bigOtter">
              🔎
            </span>

            <div>
              <strong>
                Explorar
              </strong>

              <p>
                Todo Uniónutriita
              </p>
            </div>
          </div>
        </aside>

        <main className="content">
          <section className="welcome">
            <div>
              <p className="tiny">
                EXPLORAR
              </p>

              <h2>
                Buscar 🔎
              </h2>

              <p>
                Encuentra estudiantes,
                habilidades,
                publicaciones,
                comunidades, materiales
                de estudio y eventos
                desde un solo lugar.
              </p>
            </div>

            <div className="welcomeOtter">
              🔎
            </div>
          </section>

          <form
            onSubmit={buscar}
            className="card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "20px",
              padding: "10px 12px",
            }}
          >
            <div
              className="searchBox"
              style={{
                width: "100%",
                flex: 1,
              }}
            >
              <span>
                🔎
              </span>

              <input
                type="search"
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(
                    e.target.value
                  )
                }
                placeholder="Ej. Excel, Programación, Contabilidad..."
                required
              />
            </div>

            <button
              type="submit"
              className="primaryButton"
              disabled={cargando}
              style={{
                flexShrink: 0,
              }}
            >
              {cargando
                ? "Buscando..."
                : "Buscar"}
            </button>
          </form>

          <p
            style={{
              margin:
                "9px 3px 0",
              color:
                "#969188",
              fontSize:
                "11px",
              lineHeight: 1.5,
            }}
          >
            Puedes buscar nombres,
            usuarios, carreras,
            habilidades, tipos de
            publicación, materias,
            comunidades, eventos o
            lugares.
          </p>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginTop: "16px",
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
              🤝 Buscar personas
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
                marginTop: "18px",
              }}
            >
              {mensaje}
            </div>
          )}

          {consultaRealizada &&
            !cargando &&
            !mensaje &&
            total > 0 && (
              <>
                <section
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "9px",
                    marginTop: "22px",
                  }}
                >
                  <article className="card">
                    <p className="tiny">
                      TOTAL
                    </p>

                    <strong
                      style={{
                        display:
                          "block",
                        marginTop:
                          "5px",
                        fontSize:
                          "24px",
                      }}
                    >
                      {total}
                    </strong>

                    <p>
                      resultados
                    </p>
                  </article>

                  <article className="card">
                    <p className="tiny">
                      PERSONAS
                    </p>

                    <strong
                      style={{
                        display:
                          "block",
                        marginTop:
                          "5px",
                        fontSize:
                          "24px",
                      }}
                    >
                      {
                        perfiles.length
                      }
                    </strong>

                    <p>
                      estudiantes
                    </p>
                  </article>

                  <article className="card">
                    <p className="tiny">
                      PUBLICACIONES
                    </p>

                    <strong
                      style={{
                        display:
                          "block",
                        marginTop:
                          "5px",
                        fontSize:
                          "24px",
                      }}
                    >
                      {posts.length}
                    </strong>

                    <p>
                      resultados
                    </p>
                  </article>

                  <article className="card">
                    <p className="tiny">
                      COMUNIDADES
                    </p>

                    <strong
                      style={{
                        display:
                          "block",
                        marginTop:
                          "5px",
                        fontSize:
                          "24px",
                      }}
                    >
                      {
                        comunidades.length
                      }
                    </strong>

                    <p>
                      espacios
                    </p>
                  </article>

                  <article className="card">
                    <p className="tiny">
                      RECURSOS
                    </p>

                    <strong
                      style={{
                        display:
                          "block",
                        marginTop:
                          "5px",
                        fontSize:
                          "24px",
                      }}
                    >
                      {
                        recursos.length
                      }
                    </strong>

                    <p>
                      materiales
                    </p>
                  </article>

                  <article className="card">
                    <p className="tiny">
                      EVENTOS
                    </p>

                    <strong
                      style={{
                        display:
                          "block",
                        marginTop:
                          "5px",
                        fontSize:
                          "24px",
                      }}
                    >
                      {
                        eventos.length
                      }
                    </strong>

                    <p>
                      actividades
                    </p>
                  </article>
                </section>

                <div
                  style={{
                    marginTop:
                      "16px",
                    padding:
                      "11px 13px",
                    border:
                      "1px solid #e5ddcf",
                    borderRadius:
                      "13px",
                    background:
                      "#f7f4ee",
                    color:
                      "#70746a",
                    fontSize:
                      "12px",
                  }}
                >
                  🔎 Encontramos{" "}
                  <strong>
                    {total}
                  </strong>{" "}
                  resultado
                  {total === 1
                    ? ""
                    : "s"}{" "}
                  para{" "}
                  <strong>
                    “{busqueda}”
                  </strong>
                  .
                </div>
              </>
            )}

          {consultaRealizada &&
            !cargando &&
            total === 0 &&
            !mensaje && (
              <div
                className="emptyState"
                style={{
                  marginTop:
                    "22px",
                }}
              >
                <span className="emptyStateIcon">
                  🔎
                </span>

                <strong>
                  No encontramos resultados
                </strong>

                <p
                  style={{
                    marginBottom:
                      0,
                  }}
                >
                  Prueba con otro nombre,
                  carrera, habilidad,
                  materia o palabra clave.
                </p>
              </div>
            )}

          {!consultaRealizada &&
            !mensaje && (
              <section
                className="card"
                style={{
                  marginTop:
                    "24px",
                  padding:
                    "22px",
                }}
              >
                <p className="tiny">
                  IDEAS PARA BUSCAR
                </p>

                <h3
                  style={{
                    margin:
                      "6px 0 14px",
                  }}
                >
                  ¿Qué puedes encontrar?
                </h3>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "9px",
                  }}
                >
                  {[
                    [
                      "👤",
                      "Personas",
                      "Nombre o usuario",
                    ],
                    [
                      "🧩",
                      "Habilidades",
                      "Excel, idiomas...",
                    ],
                    [
                      "💬",
                      "Publicaciones",
                      "Preguntas y ayuda",
                    ],
                    [
                      "🫂",
                      "Comunidades",
                      "Carrera o grupo",
                    ],
                    [
                      "📚",
                      "Recursos",
                      "Materia o título",
                    ],
                    [
                      "🎉",
                      "Eventos",
                      "Actividad o lugar",
                    ],
                  ].map(
                    ([
                      icono,
                      titulo,
                      texto,
                    ]) => (
                      <div
                        key={titulo}
                        style={{
                          padding:
                            "13px",
                          border:
                            "1px solid #e7e0d5",
                          borderRadius:
                            "13px",
                          background:
                            "#fbf9f4",
                        }}
                      >
                        <div
                          style={{
                            fontSize:
                              "22px",
                          }}
                        >
                          {icono}
                        </div>

                        <strong
                          style={{
                            display:
                              "block",
                            marginTop:
                              "7px",
                            fontSize:
                              "12px",
                          }}
                        >
                          {titulo}
                        </strong>

                        <span
                          style={{
                            display:
                              "block",
                            marginTop:
                              "3px",
                            color:
                              "#969188",
                            fontSize:
                              "10px",
                          }}
                        >
                          {texto}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

          {perfiles.length >
            0 && (
            <section
              style={{
                marginTop:
                  "30px",
              }}
            >
              <div className="sectionHeader">
                <p className="tiny">
                  PERSONAS Y TALENTO
                </p>

                <h2>
                  👤 Estudiantes
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "12px",
                }}
              >
                {perfiles.map(
                  (perfil) => {
                    const skills =
                      habilidadesDe(
                        perfil.id
                      );

                    const username =
                      perfil.username;

                    const contenido = (
                      <article
                        className="card"
                        style={{
                          height:
                            "100%",
                          color:
                            "inherit",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "12px",
                          }}
                        >
                          <div
                            className="avatar"
                            style={{
                              width:
                                "50px",
                              height:
                                "50px",
                            }}
                          >
                            {perfil.avatar_url ? (
                              <img
                                src={
                                  perfil.avatar_url
                                }
                                alt={
                                  perfil.nombre ||
                                  "Usuario"
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
                              minWidth: 0,
                            }}
                          >
                            <strong>
                              {perfil.nombre ||
                                "Estudiante"}
                            </strong>

                            <p
                              style={{
                                margin:
                                  "3px 0",
                                color:
                                  "#969188",
                                fontSize:
                                  "11px",
                                overflowWrap:
                                  "anywhere",
                              }}
                            >
                              @
                              {perfil.username ||
                                "usuario"}
                            </p>
                          </div>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            gap: "6px",
                            flexWrap:
                              "wrap",
                            marginTop:
                              "13px",
                          }}
                        >
                          <span
                            style={{
                              padding:
                                "5px 8px",
                              borderRadius:
                                "999px",
                              background:
                                "#f3f0e8",
                              color:
                                "#686e63",
                              fontSize:
                                "10px",
                            }}
                          >
                            🎓{" "}
                            {perfil.carrera ||
                              "Sin carrera"}
                          </span>

                          <span
                            style={{
                              padding:
                                "5px 8px",
                              borderRadius:
                                "999px",
                              background:
                                "#f3f0e8",
                              color:
                                "#686e63",
                              fontSize:
                                "10px",
                            }}
                          >
                            📖{" "}
                            {perfil.semestre ||
                              "Sin semestre"}
                          </span>
                        </div>

                        {skills.length >
                          0 && (
                          <div
                            style={{
                              marginTop:
                                "14px",
                            }}
                          >
                            <p
                              style={{
                                margin:
                                  "0 0 6px",
                                color:
                                  "#969188",
                                fontSize:
                                  "9px",
                                fontWeight:
                                  800,
                                letterSpacing:
                                  "0.5px",
                              }}
                            >
                              HABILIDADES
                            </p>

                            <div
                              style={{
                                display:
                                  "flex",
                                gap: "6px",
                                flexWrap:
                                  "wrap",
                              }}
                            >
                              {skills.map(
                                (
                                  skill
                                ) => {
                                  const colores =
                                    colorNivel(
                                      skill.nivel
                                    );

                                  return (
                                    <span
                                      key={
                                        skill.id
                                      }
                                      style={{
                                        padding:
                                          "5px 8px",
                                        borderRadius:
                                          "999px",
                                        background:
                                          colores.background,
                                        color:
                                          colores.color,
                                        fontSize:
                                          "10px",
                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      🧩{" "}
                                      {
                                        skill.skill
                                      }

                                      {" · "}

                                      {
                                        skill.nivel
                                      }
                                    </span>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        )}

                        {username && (
                          <div
                            style={{
                              marginTop:
                                "15px",
                              color:
                                "#657a5b",
                              fontSize:
                                "11px",
                              fontWeight:
                                800,
                            }}
                          >
                            Ver perfil →
                          </div>
                        )}
                      </article>
                    );

                    return username ? (
                      <Link
                        key={
                          perfil.id
                        }
                        href={`/u/${username}`}
                        style={{
                          textDecoration:
                            "none",
                        }}
                      >
                        {contenido}
                      </Link>
                    ) : (
                      <div
                        key={
                          perfil.id
                        }
                      >
                        {contenido}
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          )}

          {posts.length >
            0 && (
            <section
              style={{
                marginTop:
                  "30px",
              }}
            >
              <div className="sectionHeader">
                <p className="tiny">
                  FEED
                </p>

                <h2>
                  💬 Publicaciones
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  maxWidth: "820px",
                }}
              >
                {posts.map(
                  (post) => {
                    const autor =
                      autores[
                        post.user_id
                      ];

                    return (
                      <article
                        key={
                          post.id
                        }
                        className="card"
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "space-between",
                            gap: "10px",
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <span className="tag">
                            {post.tipo}
                          </span>

                          <span
                            style={{
                              color:
                                "#969188",
                              fontSize:
                                "10px",
                            }}
                          >
                            {fechaPost(
                              post.created_at
                            )}
                          </span>
                        </div>

                        <p
                          style={{
                            margin:
                              "13px 0",
                            color:
                              "#4e534a",
                            fontSize:
                              "13px",
                            lineHeight:
                              1.6,
                            whiteSpace:
                              "pre-wrap",
                            overflowWrap:
                              "anywhere",
                          }}
                        >
                          {post.contenido}
                        </p>

                        {autor && (
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: "8px",
                              paddingTop:
                                "11px",
                              borderTop:
                                "1px solid #eee7dc",
                            }}
                          >
                            <div
                              className="avatar"
                              style={{
                                width:
                                  "32px",
                                height:
                                  "32px",
                              }}
                            >
                              {autor.avatar_url ? (
                                <img
                                  src={
                                    autor.avatar_url
                                  }
                                  alt={
                                    autor.nombre ||
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
                              {autor.username ? (
                                <Link
                                  href={`/u/${autor.username}`}
                                  style={{
                                    color:
                                      "#657a5b",
                                    fontSize:
                                      "11px",
                                    fontWeight:
                                      800,
                                    textDecoration:
                                      "none",
                                  }}
                                >
                                  {autor.nombre ||
                                    autor.username}
                                </Link>
                              ) : (
                                <strong
                                  style={{
                                    fontSize:
                                      "11px",
                                  }}
                                >
                                  {autor.nombre ||
                                    "Estudiante"}
                                </strong>
                              )}

                              {autor.username && (
                                <p
                                  style={{
                                    margin:
                                      "2px 0 0",
                                    color:
                                      "#969188",
                                    fontSize:
                                      "9px",
                                  }}
                                >
                                  @
                                  {
                                    autor.username
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            </section>
          )}

          {comunidades.length >
            0 && (
            <section
              style={{
                marginTop:
                  "30px",
              }}
            >
              <div className="sectionHeader">
                <p className="tiny">
                  CAMPUS
                </p>

                <h2>
                  🫂 Comunidades
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "12px",
                }}
              >
                {comunidades.map(
                  (
                    comunidad
                  ) => (
                    <Link
                      key={
                        comunidad.id
                      }
                      href={`/comunidades/${comunidad.slug}`}
                      className="card"
                      style={{
                        display:
                          "flex",
                        flexDirection:
                          "column",
                        minHeight:
                          "180px",
                        color:
                          "inherit",
                        textDecoration:
                          "none",
                      }}
                    >
                      <div
                        className="cardIcon"
                        style={{
                          fontSize:
                            "23px",
                        }}
                      >
                        {iconoComunidad(
                          comunidad.tipo
                        )}
                      </div>

                      <p
                        className="tiny"
                        style={{
                          marginTop:
                            "13px",
                        }}
                      >
                        {comunidad.tipo ===
                        "general"
                          ? "GENERAL"
                          : comunidad.tipo ===
                            "carrera"
                          ? "CARRERA"
                          : "SEMESTRE"}
                      </p>

                      <h3
                        style={{
                          margin:
                            "5px 0",
                        }}
                      >
                        {
                          comunidad.nombre
                        }
                      </h3>

                      <p
                        style={{
                          margin:
                            "4px 0",
                          color:
                            "#70746a",
                          fontSize:
                            "12px",
                          lineHeight:
                            1.5,
                        }}
                      >
                        {comunidad.descripcion ||
                          comunidad.carrera ||
                          comunidad.semestre ||
                          "Comunidad universitaria"}
                      </p>

                      <strong
                        style={{
                          marginTop:
                            "auto",
                          paddingTop:
                            "13px",
                          color:
                            "#657a5b",
                          fontSize:
                            "11px",
                        }}
                      >
                        Abrir comunidad →
                      </strong>
                    </Link>
                  )
                )}
              </div>
            </section>
          )}

          {recursos.length >
            0 && (
            <section
              style={{
                marginTop:
                  "30px",
              }}
            >
              <div className="sectionHeader">
                <p className="tiny">
                  ESTUDIO
                </p>

                <h2>
                  📚 Recursos
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "12px",
                }}
              >
                {recursos.map(
                  (recurso) => {
                    const autor =
                      autores[
                        recurso.user_id
                      ];

                    return (
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
                            "245px",
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
                                1.5,
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
                            gap: "5px",
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

                        {autor && (
                          <p
                            style={{
                              margin:
                                "10px 0 0",
                              color:
                                "#969188",
                              fontSize:
                                "10px",
                            }}
                          >
                            Compartido por{" "}
                            <strong>
                              {autor.nombre ||
                                autor.username ||
                                "Estudiante"}
                            </strong>
                          </p>
                        )}

                        <div
                          style={{
                            marginTop:
                              "auto",
                            paddingTop:
                              "14px",
                          }}
                        >
                          <Link
                            href="/estudio"
                            className="primaryButton"
                          >
                            Ir a Estudio →
                          </Link>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            </section>
          )}

          {eventos.length >
            0 && (
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
                  AGENDA
                </p>

                <h2>
                  🎉 Eventos
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "12px",
                }}
              >
                {eventos.map(
                  (evento) => {
                    const autor =
                      autores[
                        evento.creator_id
                      ];

                    return (
                      <Link
                        key={
                          evento.id
                        }
                        href={`/eventos/${evento.id}`}
                        className="card"
                        style={{
                          display:
                            "flex",
                          flexDirection:
                            "column",
                          minHeight:
                            "225px",
                          color:
                            "inherit",
                          textDecoration:
                            "none",
                        }}
                      >
                        <div
                          className="cardIcon"
                          style={{
                            fontSize:
                              "23px",
                          }}
                        >
                          🎉
                        </div>

                        <p
                          className="tiny"
                          style={{
                            marginTop:
                              "13px",
                          }}
                        >
                          EVENTO
                        </p>

                        <h3
                          style={{
                            margin:
                              "5px 0",
                          }}
                        >
                          {
                            evento.titulo
                          }
                        </h3>

                        {evento.descripcion && (
                          <p
                            style={{
                              margin:
                                "4px 0",
                              color:
                                "#70746a",
                              fontSize:
                                "12px",
                              lineHeight:
                                1.5,
                            }}
                          >
                            {
                              evento.descripcion
                            }
                          </p>
                        )}

                        <div
                          style={{
                            display:
                              "grid",
                            gap: "5px",
                            marginTop:
                              "11px",
                            padding:
                              "9px 10px",
                            borderRadius:
                              "11px",
                            background:
                              "#f7f4ee",
                            color:
                              "#686e63",
                            fontSize:
                              "10px",
                          }}
                        >
                          <span>
                            📍{" "}
                            {
                              evento.lugar
                            }
                          </span>

                          <span>
                            📅{" "}
                            {fechaEvento(
                              evento.fecha_inicio
                            )}
                          </span>
                        </div>

                        {autor && (
                          <p
                            style={{
                              margin:
                                "10px 0 0",
                              color:
                                "#969188",
                              fontSize:
                                "10px",
                            }}
                          >
                            Organizado por{" "}
                            <strong>
                              {autor.nombre ||
                                autor.username ||
                                "Estudiante"}
                            </strong>
                          </p>
                        )}

                        <strong
                          style={{
                            marginTop:
                              "auto",
                            paddingTop:
                              "13px",
                            color:
                              "#657a5b",
                            fontSize:
                              "11px",
                          }}
                        >
                          Ver evento →
                        </strong>
                      </Link>
                    );
                  }
                )}
              </div>
            </section>
          )}

          {consultaRealizada &&
            total > 0 &&
            eventos.length ===
              0 && (
              <div
                style={{
                  height: "50px",
                }}
              />
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

        <Link
          href="/buscar"
          className="active"
        >
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




