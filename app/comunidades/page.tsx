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
  tipo: "general" | "carrera" | "semestre";
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

  const [comunidades, setComunidades] =
    useState<Comunidad[]>([]);

  const [miembros, setMiembros] =
    useState<Miembro[]>([]);

  const [busqueda, setBusqueda] =
    useState("");

  const [filtro, setFiltro] =
    useState<Filtro>("todas");

  const [procesando, setProcesando] =
    useState<string | null>(null);

  const [cargando, setCargando] =
    useState(true);

  const [mensaje, setMensaje] =
    useState("");

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const user =
          await requerirUsuario();

        if (!user || !activo) {
          return;
        }

        setCurrentUserId(user.id);

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
            .order("nombre", {
              ascending: true,
            }),

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
          setCargando(false);
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

    setProcesando(comunidadId);

    try {
      const supabase =
        createClient();

      const { data, error } =
        await supabase
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

    setProcesando(comunidadId);

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
            Encuentra espacios de tu
            carrera, semestre o entra a
            otras comunidades para
            colaborar con estudiantes.
          </p>
        </div>

        <div className="welcomeOtter">
          🦦
        </div>
      </section>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginTop: "20px",
        }}
      >
        <Link
          href="/"
          className="primaryButton"
        >
          ← Inicio
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

      <section
        style={{
          marginTop: "28px",
        }}
      >
        <div
          className="searchBox"
          style={{
            width: "100%",
            maxWidth: "700px",
          }}
        >
          <span>🔎</span>

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
            marginTop: "14px",
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
              setFiltro("todas")
            }
          >
            Todas
          </button>

          <button
            type="button"
            className={`feedTab ${
              filtro === "carrera"
                ? "activeTab"
                : ""
            }`}
            onClick={() =>
              setFiltro("carrera")
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
              setFiltro("semestre")
            }
          >
            📖 Semestres
          </button>
        </div>

        {comunidadesFiltradas.length ===
        0 ? (
          <div className="emptyState">
            <span className="emptyStateIcon">
              🫂
            </span>

            No encontramos comunidades.
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

                return (
                  <article
                    key={
                      comunidad.id
                    }
                    className="card"
                  >
                    <div
                      style={{
                        fontSize: "36px",
                      }}
                    >
                      {comunidad.tipo ===
                      "general"
                        ? "🏫"
                        : comunidad.tipo ===
                          "carrera"
                        ? "🎓"
                        : "📖"}
                    </div>

                    <p className="tiny">
                      {comunidad.tipo ===
                      "general"
                        ? "GENERAL"
                        : comunidad.tipo ===
                          "carrera"
                        ? "CARRERA"
                        : "SEMESTRE"}
                    </p>

                    <h3>
                      {comunidad.nombre}
                    </h3>

                    <p
                      style={{
                        color:
                          "#70746a",
                        fontSize:
                          "13px",
                        minHeight:
                          "40px",
                      }}
                    >
                      {comunidad.descripcion}
                    </p>

                    <p
                      style={{
                        color:
                          "#969188",
                        fontSize:
                          "12px",
                      }}
                    >
                      👥{" "}
                      {totalMiembros(
                        comunidad.id
                      )}{" "}
                      miembros
                    </p>

                    {unido ? (
                      <>
                        <Link
                          href={`/comunidades/${comunidad.slug}`}
                          className="primaryButton"
                          style={{
                            display:
                              "inline-block",
                            marginTop:
                              "5px",
                          }}
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
                          Salir de la comunidad
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
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </main>
  );
}
