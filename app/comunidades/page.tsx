"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from "../../lib/supabase/client";
import { requerirUsuario } from "../../lib/auth";

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

type Miembro = {
  community_id: string;
  user_id: string;
  joined_at: string;
};

type Filtro =
  | "todas"
  | "carrera"
  | "semestre";

export default function ComunidadesPage() {
  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [
    comunidades,
    setComunidades,
  ] = useState<Comunidad[]>([]);

  const [
    miembros,
    setMiembros,
  ] = useState<Miembro[]>([]);

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  const [
    filtro,
    setFiltro,
  ] =
    useState<Filtro>("todas");

  const [
    procesando,
    setProcesando,
  ] = useState<string | null>(
    null
  );

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

        const [
          comunidadesResultado,
          miembrosResultado,
        ] = await Promise.all([
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
            .order(
              "nombre",
              {
                ascending: true,
              }
            ),

          supabase
            .from("community_members")
            .select(`
              community_id,
              user_id,
              joined_at
            `),
        ]);

        if (
          comunidadesResultado.error
        ) {
          throw new Error(
            comunidadesResultado
              .error.message
          );
        }

        if (
          miembrosResultado.error
        ) {
          throw new Error(
            miembrosResultado
              .error.message
          );
        }

        if (!activo) {
          return;
        }

        setComunidades(
          (comunidadesResultado.data ||
            []) as Comunidad[]
        );

        setMiembros(
          (miembrosResultado.data ||
            []) as Miembro[]
        );
      } catch (error) {
        if (!activo) {
          return;
        }

        setMensaje(
          error instanceof Error
            ? error.message
            : "No pudimos cargar las comunidades."
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
  }, []);

  function esMiembro(
    comunidadId: string
  ) {
    return miembros.some(
      (miembro) =>
        miembro.community_id ===
          comunidadId &&
        miembro.user_id ===
          currentUserId
    );
  }

  function totalMiembros(
    comunidadId: string
  ) {
    return miembros.filter(
      (miembro) =>
        miembro.community_id ===
        comunidadId
    ).length;
  }

  async function unirme(
    comunidadId: string
  ) {
    if (!currentUserId) {
      return;
    }

    setProcesando(
      comunidadId
    );

    try {
      const supabase =
        createClient();

      const {
        data,
        error,
      } = await supabase
        .from("community_members")
        .insert({
          community_id:
            comunidadId,

          user_id:
            currentUserId,
        })
        .select(`
          community_id,
          user_id,
          joined_at
        `)
        .single();

      if (error) {
        throw new Error(
          error.message
        );
      }

      setMiembros(
        (actuales) => [
          ...actuales,
          data as Miembro,
        ]
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos unirte a la comunidad."
      );
    } finally {
      setProcesando(null);
    }
  }

  async function salir(
    comunidadId: string
  ) {
    const confirmado =
      window.confirm(
        "¿Quieres salir de esta comunidad?"
      );

    if (!confirmado) {
      return;
    }

    setProcesando(
      comunidadId
    );

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from("community_members")
          .delete()
          .eq(
            "community_id",
            comunidadId
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

      setMiembros(
        (actuales) =>
          actuales.filter(
            (miembro) =>
              !(
                miembro.community_id ===
                  comunidadId &&
                miembro.user_id ===
                  currentUserId
              )
          )
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos salir de la comunidad."
      );
    } finally {
      setProcesando(null);
    }
  }

  const comunidadesFiltradas =
    useMemo(() => {
      const texto =
        busqueda
          .trim()
          .toLowerCase();

      return comunidades.filter(
        (comunidad) => {
          const coincideTipo =
            filtro === "todas" ||
            comunidad.tipo ===
              filtro;

          const contenido = [
            comunidad.nombre,
            comunidad.carrera,
            comunidad.semestre,
            comunidad.descripcion,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const coincideTexto =
            !texto ||
            contenido.includes(
              texto
            );

          return (
            coincideTipo &&
            coincideTexto
          );
        }
      );
    }, [
      comunidades,
      busqueda,
      filtro,
    ]);

  const misComunidades =
    comunidades.filter(
      (comunidad) =>
        esMiembro(
          comunidad.id
        )
    ).length;

  const comunidadesCarrera =
    comunidades.filter(
      (comunidad) =>
        comunidad.tipo ===
        "carrera"
    ).length;

  const comunidadesSemestre =
    comunidades.filter(
      (comunidad) =>
        comunidad.tipo ===
        "semestre"
    ).length;

  function iconoComunidad(
    comunidad: Comunidad
  ) {
    if (
      comunidad.tipo ===
      "general"
    ) {
      return "🏫";
    }

    if (
      comunidad.tipo ===
      "carrera"
    ) {
      return "🎓";
    }

    return "📖";
  }

  function nombreTipo(
    comunidad: Comunidad
  ) {
    if (
      comunidad.tipo ===
      "general"
    ) {
      return "Comunidad general";
    }

    if (
      comunidad.tipo ===
      "carrera"
    ) {
      return "Carrera";
    }

    return "Semestre";
  }

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            🫂
          </span>

          <p className="loadingText">
            Reuniendo a las comunidades...
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

          <div className="otterCard">
            <span className="bigOtter">
              🫂
            </span>

            <div>
              <strong>
                Comunidad
              </strong>

              <p>
                Conecta y colabora
              </p>
            </div>
          </div>
        </aside>

        <main className="content">
          <section className="welcome">
            <div>
              <p className="tiny">
                CAMPUS DIGITAL
              </p>

              <h2>
                Comunidades 🫂
              </h2>

              <p>
                Encuentra estudiantes
                de tu carrera y semestre,
                comparte ideas y entra a
                espacios donde puedas
                colaborar con la
                comunidad universitaria.
              </p>
            </div>

            <div className="welcomeOtter">
              🫂
            </div>
          </section>

          <section
            style={{
              display: "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(145px, 1fr))",

              gap: "10px",

              marginTop: "20px",
            }}
          >
            <article className="card">
              <p className="tiny">
                COMUNIDADES
              </p>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                  fontSize: "25px",
                }}
              >
                {comunidades.length}
              </strong>

              <p>
                espacios disponibles
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                MIS GRUPOS
              </p>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                  fontSize: "25px",
                }}
              >
                {misComunidades}
              </strong>

              <p>
                comunidades unidas
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                CARRERAS
              </p>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                  fontSize: "25px",
                }}
              >
                {comunidadesCarrera}
              </strong>

              <p>
                comunidades académicas
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                SEMESTRES
              </p>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                  fontSize: "25px",
                }}
              >
                {comunidadesSemestre}
              </strong>

              <p>
                espacios por generación
              </p>
            </article>
          </section>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginTop: "20px",
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
                marginTop: "18px",
              }}
            >
              {mensaje}
            </div>
          )}

          <section
            style={{
              marginTop: "28px",
              paddingBottom: "60px",
            }}
          >
            <div className="sectionHeader">
              <p className="tiny">
                EXPLORAR
              </p>

              <h2>
                Encuentra tu espacio
              </h2>
            </div>

            <div
              className="card"
              style={{
                padding: "14px",
                marginBottom: "16px",
              }}
            >
              <div
                className="searchBox"
                style={{
                  width: "100%",
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
                  placeholder="Buscar carrera, semestre o comunidad..."
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
                    filtro === "todas"
                      ? "activeTab"
                      : ""
                  }`}
                  onClick={() =>
                    setFiltro(
                      "todas"
                    )
                  }
                >
                  🫂 Todas
                </button>

                <button
                  type="button"
                  className={`feedTab ${
                    filtro === "carrera"
                      ? "activeTab"
                      : ""
                  }`}
                  onClick={() =>
                    setFiltro(
                      "carrera"
                    )
                  }
                >
                  🎓 Carreras
                </button>

                <button
                  type="button"
                  className={`feedTab ${
                    filtro === "semestre"
                      ? "activeTab"
                      : ""
                  }`}
                  onClick={() =>
                    setFiltro(
                      "semestre"
                    )
                  }
                >
                  📖 Semestres
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "14px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#70746a",
                  fontSize: "12px",
                }}
              >
                Mostrando{" "}
                <strong>
                  {
                    comunidadesFiltradas.length
                  }
                </strong>{" "}
                de{" "}
                <strong>
                  {comunidades.length}
                </strong>{" "}
                comunidades
              </p>

              {(busqueda ||
                filtro !==
                  "todas") && (
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

            {comunidadesFiltradas.length ===
            0 ? (
              <div className="emptyState">
                <span className="emptyStateIcon">
                  🫂
                </span>

                <strong>
                  No encontramos comunidades
                </strong>

                <p
                  style={{
                    marginBottom: 0,
                  }}
                >
                  Prueba con otro nombre
                  o cambia el filtro.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(280px, 1fr))",

                  gap: "14px",
                }}
              >
                {comunidadesFiltradas.map(
                  (comunidad) => {
                    const unido =
                      esMiembro(
                        comunidad.id
                      );

                    const cantidadMiembros =
                      totalMiembros(
                        comunidad.id
                      );

                    return (
                      <article
                        key={
                          comunidad.id
                        }
                        className="card"
                        style={{
                          display: "flex",
                          flexDirection:
                            "column",
                          minHeight: "290px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems:
                              "flex-start",
                            justifyContent:
                              "space-between",
                            gap: "10px",
                          }}
                        >
                          <div
                            className="cardIcon"
                            style={{
                              fontSize: "24px",
                            }}
                          >
                            {iconoComunidad(
                              comunidad
                            )}
                          </div>

                          {unido && (
                            <span
                              style={{
                                padding:
                                  "5px 9px",

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
                              ✓ Miembro
                            </span>
                          )}
                        </div>

                        <p
                          className="tiny"
                          style={{
                            marginTop: "15px",
                          }}
                        >
                          {nombreTipo(
                            comunidad
                          )}
                        </p>

                        <h3
                          style={{
                            margin:
                              "6px 0 4px",

                            fontSize:
                              "18px",

                            lineHeight: 1.3,
                          }}
                        >
                          {comunidad.nombre}
                        </h3>

                        <p
                          style={{
                            margin:
                              "5px 0",

                            color:
                              "#70746a",

                            fontSize:
                              "13px",

                            lineHeight: 1.55,
                          }}
                        >
                          {comunidad.descripcion ||
                            "Espacio para conectar y colaborar con otros estudiantes."}
                        </p>

                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                            marginTop: "8px",
                          }}
                        >
                          {comunidad.carrera && (
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
                              {
                                comunidad.carrera
                              }
                            </span>
                          )}

                          {comunidad.semestre && (
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
                              {
                                comunidad.semestre
                              }
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            marginTop: "14px",

                            padding:
                              "10px 11px",

                            borderRadius:
                              "12px",

                            background:
                              "#f7f4ee",

                            color:
                              "#70746a",

                            fontSize:
                              "12px",
                          }}
                        >
                          👥{" "}
                          <strong>
                            {
                              cantidadMiembros
                            }
                          </strong>{" "}
                          {cantidadMiembros ===
                          1
                            ? "miembro"
                            : "miembros"}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                            marginTop: "auto",
                            paddingTop: "16px",
                          }}
                        >
                          {unido ? (
                            <>
                              <Link
                                href={`/comunidades/${comunidad.slug}`}
                                className="primaryButton"
                              >
                                Entrar →
                              </Link>

                              <button
                                type="button"
                                className="logoutButton"
                                disabled={
                                  procesando ===
                                  comunidad.id
                                }
                                onClick={() =>
                                  salir(
                                    comunidad.id
                                  )
                                }
                              >
                                {procesando ===
                                comunidad.id
                                  ? "Procesando..."
                                  : "Salir"}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="primaryButton"
                              disabled={
                                procesando ===
                                comunidad.id
                              }
                              onClick={() =>
                                unirme(
                                  comunidad.id
                                )
                              }
                            >
                              {procesando ===
                              comunidad.id
                                ? "Uniéndote..."
                                : "＋ Unirme"}
                            </button>
                          )}
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
