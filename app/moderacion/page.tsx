"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from "../../lib/supabase/client";
import { requerirUsuario } from "../../lib/auth";

type EstadoReporte =
  | "pending"
  | "reviewed"
  | "dismissed";

type TipoReporte =
  | "post"
  | "comment"
  | "profile"
  | "social";

type Reporte = {
  id: string;
  reporter_id: string;
  target_type: TipoReporte;
  target_id: string;
  motivo: string;
  detalles: string | null;
  status: EstadoReporte;
  created_at: string;
};

type Perfil = {
  id: string;
  username: string | null;
  nombre: string | null;
  carrera: string | null;
  semestre: string | null;
  avatar_url: string | null;
};

type Post = {
  id: string;
  user_id: string;
  tipo: string;
  contenido: string;
  created_at: string;
};

type Comentario = {
  id: string;
  post_id: string;
  user_id: string;
  contenido: string;
  created_at: string;
};

type SocialPost = {
  id: string;
  user_id: string;
  categoria: string;
  titulo: string;
  contenido: string;
  created_at: string;
};

type Filtro =
  | "todos"
  | EstadoReporte;

export default function ModeracionPage() {
  const [
    reportes,
    setReportes,
  ] = useState<Reporte[]>([]);

  const [
    perfiles,
    setPerfiles,
  ] = useState<
    Record<string, Perfil>
  >({});

  const [
    posts,
    setPosts,
  ] = useState<
    Record<string, Post>
  >({});

  const [
    comentarios,
    setComentarios,
  ] = useState<
    Record<string, Comentario>
  >({});

  const [
    social,
    setSocial,
  ] = useState<
    Record<string, SocialPost>
  >({});

  const [
    filtro,
    setFiltro,
  ] =
    useState<Filtro>("pending");

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    autorizado,
    setAutorizado,
  ] = useState(false);

  const [
    procesando,
    setProcesando,
  ] = useState<string | null>(
    null
  );

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  async function cargarReportes() {
    const supabase =
      createClient();

    const {
      data: reportesData,
      error: reportesError,
    } = await supabase
      .from("reports")
      .select(`
        id,
        reporter_id,
        target_type,
        target_id,
        motivo,
        detalles,
        status,
        created_at
      `)
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (reportesError) {
      throw new Error(
        reportesError.message
      );
    }

    const lista =
      (reportesData ||
        []) as Reporte[];

    setReportes(lista);

    if (
      lista.length === 0
    ) {
      setPerfiles({});
      setPosts({});
      setComentarios({});
      setSocial({});
      return;
    }

    const idsPerfiles =
      new Set<string>();

    const idsPosts:
      string[] = [];

    const idsComentarios:
      string[] = [];

    const idsSocial:
      string[] = [];

    lista.forEach(
      (reporte) => {
        idsPerfiles.add(
          reporte.reporter_id
        );

        if (
          reporte.target_type ===
          "post"
        ) {
          idsPosts.push(
            reporte.target_id
          );
        }

        if (
          reporte.target_type ===
          "comment"
        ) {
          idsComentarios.push(
            reporte.target_id
          );
        }

        if (
          reporte.target_type ===
          "social"
        ) {
          idsSocial.push(
            reporte.target_id
          );
        }

        if (
          reporte.target_type ===
          "profile"
        ) {
          idsPerfiles.add(
            reporte.target_id
          );
        }
      }
    );

    const [
      postsResultado,
      comentariosResultado,
      socialResultado,
    ] = await Promise.all([
      idsPosts.length > 0
        ? supabase
            .from("posts")
            .select(`
              id,
              user_id,
              tipo,
              contenido,
              created_at
            `)
            .in(
              "id",
              idsPosts
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      idsComentarios.length > 0
        ? supabase
            .from("comments")
            .select(`
              id,
              post_id,
              user_id,
              contenido,
              created_at
            `)
            .in(
              "id",
              idsComentarios
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),

      idsSocial.length > 0
        ? supabase
            .from("social_posts")
            .select(`
              id,
              user_id,
              categoria,
              titulo,
              contenido,
              created_at
            `)
            .in(
              "id",
              idsSocial
            )
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

    if (
      postsResultado.error
    ) {
      throw new Error(
        postsResultado.error.message
      );
    }

    if (
      comentariosResultado.error
    ) {
      throw new Error(
        comentariosResultado.error.message
      );
    }

    if (
      socialResultado.error
    ) {
      throw new Error(
        socialResultado.error.message
      );
    }

    const postsLista =
      (postsResultado.data ||
        []) as Post[];

    const comentariosLista =
      (comentariosResultado.data ||
        []) as Comentario[];

    const socialLista =
      (socialResultado.data ||
        []) as SocialPost[];

    postsLista.forEach(
      (post) =>
        idsPerfiles.add(
          post.user_id
        )
    );

    comentariosLista.forEach(
      (comentario) =>
        idsPerfiles.add(
          comentario.user_id
        )
    );

    socialLista.forEach(
      (item) =>
        idsPerfiles.add(
          item.user_id
        )
    );

    let perfilesLista:
      Perfil[] = [];

    if (
      idsPerfiles.size > 0
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
          Array.from(
            idsPerfiles
          )
        );

      if (error) {
        throw new Error(
          error.message
        );
      }

      perfilesLista =
        (data ||
          []) as Perfil[];
    }

    const mapaPerfiles:
      Record<string, Perfil> =
        {};

    perfilesLista.forEach(
      (perfil) => {
        mapaPerfiles[
          perfil.id
        ] = perfil;
      }
    );

    const mapaPosts:
      Record<string, Post> =
        {};

    postsLista.forEach(
      (post) => {
        mapaPosts[
          post.id
        ] = post;
      }
    );

    const mapaComentarios:
      Record<string, Comentario> =
        {};

    comentariosLista.forEach(
      (comentario) => {
        mapaComentarios[
          comentario.id
        ] = comentario;
      }
    );

    const mapaSocial:
      Record<string, SocialPost> =
        {};

    socialLista.forEach(
      (item) => {
        mapaSocial[
          item.id
        ] = item;
      }
    );

    setPerfiles(
      mapaPerfiles
    );

    setPosts(
      mapaPosts
    );

    setComentarios(
      mapaComentarios
    );

    setSocial(
      mapaSocial
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

        const supabase =
          createClient();

        const {
          data: moderador,
          error,
        } = await supabase
          .from("moderators")
          .select("user_id")
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

        if (error) {
          throw new Error(
            error.message
          );
        }

        if (!moderador) {
          setAutorizado(false);
          return;
        }

        setAutorizado(true);

        await cargarReportes();
      } catch (error) {
        if (!activo) {
          return;
        }

        setMensaje(
          error instanceof Error
            ? error.message
            : "No pudimos abrir moderación."
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    iniciar();

    return () => {
      activo = false;
    };
  }, []);

  async function cambiarEstado(
    reporte: Reporte,
    nuevoEstado:
      | "reviewed"
      | "dismissed"
  ) {
    setProcesando(
      reporte.id
    );

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from("reports")
          .update({
            status:
              nuevoEstado,
          })
          .eq(
            "id",
            reporte.id
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      setReportes(
        (actuales) =>
          actuales.map(
            (item) =>
              item.id ===
              reporte.id
                ? {
                    ...item,
                    status:
                      nuevoEstado,
                  }
                : item
          )
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos actualizar el reporte."
      );
    } finally {
      setProcesando(null);
    }
  }

  async function eliminarPublicacion(
    reporte: Reporte
  ) {
    const post =
      posts[
        reporte.target_id
      ];

    if (!post) {
      alert(
        "Esta publicación ya no existe."
      );
      return;
    }

    const confirmar =
      window.confirm(
        "¿Eliminar definitivamente esta publicación?\n\nEsta acción no se puede deshacer."
      );

    if (!confirmar) {
      return;
    }

    setProcesando(
      reporte.id
    );

    try {
      const supabase =
        createClient();

      const {
        data,
        error,
      } = await supabase.rpc(
        "moderator_delete_post",
        {
          p_post_id:
            reporte.target_id,
        }
      );

      if (error) {
        throw new Error(
          error.message
        );
      }

      if (!data) {
        throw new Error(
          "La publicación ya no existe."
        );
      }

      setPosts(
        (actuales) => {
          const copia = {
            ...actuales,
          };

          delete copia[
            reporte.target_id
          ];

          return copia;
        }
      );

      setReportes(
        (actuales) =>
          actuales.map(
            (item) =>
              item.target_type ===
                "post" &&
              item.target_id ===
                reporte.target_id
                ? {
                    ...item,
                    status:
                      "reviewed",
                  }
                : item
          )
      );

      alert(
        "Publicación eliminada y reporte marcado como revisado."
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos eliminar la publicación."
      );
    } finally {
      setProcesando(null);
    }
  }

  const reportesFiltrados =
    useMemo(() => {
      if (
        filtro === "todos"
      ) {
        return reportes;
      }

      return reportes.filter(
        (reporte) =>
          reporte.status ===
          filtro
      );
    }, [
      reportes,
      filtro,
    ]);

  const pendientes =
    reportes.filter(
      (reporte) =>
        reporte.status ===
        "pending"
    ).length;

  const revisados =
    reportes.filter(
      (reporte) =>
        reporte.status ===
        "reviewed"
    ).length;

  const descartados =
    reportes.filter(
      (reporte) =>
        reporte.status ===
        "dismissed"
    ).length;

  function nombreMotivo(
    motivo: string
  ) {
    switch (motivo) {
      case "spam":
        return "Spam";

      case "acoso":
        return "Acoso";

      case "contenido_inapropiado":
        return "Contenido inapropiado";

      case "informacion_falsa":
        return "Información falsa";

      default:
        return "Otro";
    }
  }

  function estadoNombre(
    estado: EstadoReporte
  ) {
    if (
      estado === "pending"
    ) {
      return "Pendiente";
    }

    if (
      estado === "reviewed"
    ) {
      return "Revisado";
    }

    return "Descartado";
  }

  function iconoEstado(
    estado: EstadoReporte
  ) {
    if (
      estado === "pending"
    ) {
      return "🟡";
    }

    if (
      estado === "reviewed"
    ) {
      return "✅";
    }

    return "⚪";
  }

  function obtenerAutor(
    reporte: Reporte
  ) {
    if (
      reporte.target_type ===
      "post"
    ) {
      const post =
        posts[
          reporte.target_id
        ];

      return post
        ? perfiles[
            post.user_id
          ] || null
        : null;
    }

    if (
      reporte.target_type ===
      "comment"
    ) {
      const comentario =
        comentarios[
          reporte.target_id
        ];

      return comentario
        ? perfiles[
            comentario.user_id
          ] || null
        : null;
    }

    if (
      reporte.target_type ===
      "social"
    ) {
      const item =
        social[
          reporte.target_id
        ];

      return item
        ? perfiles[
            item.user_id
          ] || null
        : null;
    }

    if (
      reporte.target_type ===
      "profile"
    ) {
      return (
        perfiles[
          reporte.target_id
        ] || null
      );
    }

    return null;
  }

  function contenidoReporte(
    reporte: Reporte
  ) {
    if (
      reporte.target_type ===
      "post"
    ) {
      const post =
        posts[
          reporte.target_id
        ];

      if (!post) {
        return (
          <div>
            <p
              style={{
                color:
                  "#969188",
              }}
            >
              Esta publicación ya
              no existe.
            </p>

            <span
              style={{
                fontSize:
                  "12px",
                color:
                  "#657a5b",
                fontWeight:
                  700,
              }}
            >
              ✓ Contenido retirado
            </span>
          </div>
        );
      }

      return (
        <>
          <span className="tag">
            💬 {post.tipo}
          </span>

          <p
            style={{
              lineHeight: 1.6,
              whiteSpace:
                "pre-wrap",
            }}
          >
            {post.contenido}
          </p>
        </>
      );
    }

    if (
      reporte.target_type ===
      "comment"
    ) {
      const comentario =
        comentarios[
          reporte.target_id
        ];

      if (!comentario) {
        return (
          <p
            style={{
              color:
                "#969188",
            }}
          >
            Este comentario ya
            no existe.
          </p>
        );
      }

      return (
        <>
          <span className="tag">
            💬 Comentario
          </span>

          <p
            style={{
              lineHeight: 1.6,
              whiteSpace:
                "pre-wrap",
            }}
          >
            {
              comentario.contenido
            }
          </p>
        </>
      );
    }

    if (
      reporte.target_type ===
      "social"
    ) {
      const item =
        social[
          reporte.target_id
        ];

      if (!item) {
        return (
          <p
            style={{
              color:
                "#969188",
            }}
          >
            Esta recomendación ya
            no existe.
          </p>
        );
      }

      return (
        <>
          <span className="tag">
            🌿 {item.categoria}
          </span>

          <h3>
            {item.titulo}
          </h3>

          <p
            style={{
              lineHeight: 1.6,
              whiteSpace:
                "pre-wrap",
            }}
          >
            {item.contenido}
          </p>
        </>
      );
    }

    if (
      reporte.target_type ===
      "profile"
    ) {
      const perfil =
        perfiles[
          reporte.target_id
        ];

      if (!perfil) {
        return (
          <p>
            Este perfil ya no
            existe.
          </p>
        );
      }

      return (
        <div>
          <strong>
            👤{" "}
            {perfil.nombre ||
              "Estudiante"}
          </strong>

          <p>
            @{perfil.username}
          </p>

          <p
            style={{
              color:
                "#70746a",
            }}
          >
            {perfil.carrera ||
              "Sin carrera"}
            {" · "}
            {perfil.semestre ||
              "Sin semestre"}
          </p>
        </div>
      );
    }

    return null;
  }

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            🛡️
          </span>

          <p className="loadingText">
            Revisando permisos...
          </p>
        </div>
      </main>
    );
  }

  if (!autorizado) {
    return (
      <main className="profilePage">
        <section
          className="profileCard"
          style={{
            maxWidth:
              "520px",
          }}
        >
          <div
            style={{
              fontSize:
                "55px",
            }}
          >
            🔒
          </div>

          <p className="tiny">
            ACCESO RESTRINGIDO
          </p>

          <h1>
            Moderación
          </h1>

          <p
            style={{
              color:
                "#70746a",
              lineHeight:
                1.6,
            }}
          >
            Esta sección solo está
            disponible para
            moderadores de
            Uniónutriita.
          </p>

          {mensaje && (
            <div className="errorBox">
              {mensaje}
            </div>
          )}

          <Link
            href="/"
            className="backHomeButton"
          >
            ← Volver al inicio
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="content">
      <section className="welcome">
        <div>
          <p className="tiny">
            ADMINISTRACIÓN
          </p>

          <h2>
            Moderación 🛡️
          </h2>

          <p>
            Revisa reportes,
            descarta denuncias
            incorrectas o retira
            contenido cuando sea
            necesario.
          </p>
        </div>

        <div className="welcomeOtter">
          🛡️
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

        <button
          type="button"
          className="primaryButton"
          onClick={() =>
            cargarReportes()
          }
        >
          ↻ Actualizar
        </button>
      </div>

      {mensaje && (
        <div
          className="errorBox"
          style={{
            marginTop:
              "20px",
          }}
        >
          {mensaje}
        </div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "12px",
          marginTop: "25px",
        }}
      >
        <article className="card">
          <div
            style={{
              fontSize:
                "30px",
            }}
          >
            🟡
          </div>

          <strong
            style={{
              fontSize:
                "26px",
            }}
          >
            {pendientes}
          </strong>

          <p>
            Pendientes
          </p>
        </article>

        <article className="card">
          <div
            style={{
              fontSize:
                "30px",
            }}
          >
            ✅
          </div>

          <strong
            style={{
              fontSize:
                "26px",
            }}
          >
            {revisados}
          </strong>

          <p>
            Revisados
          </p>
        </article>

        <article className="card">
          <div
            style={{
              fontSize:
                "30px",
            }}
          >
            ⚪
          </div>

          <strong
            style={{
              fontSize:
                "26px",
            }}
          >
            {descartados}
          </strong>

          <p>
            Descartados
          </p>
        </article>

        <article className="card">
          <div
            style={{
              fontSize:
                "30px",
            }}
          >
            🚩
          </div>

          <strong
            style={{
              fontSize:
                "26px",
            }}
          >
            {reportes.length}
          </strong>

          <p>
            Total
          </p>
        </article>
      </section>

      <div
        className="feedTabs"
        style={{
          marginTop:
            "28px",
        }}
      >
        <button
          type="button"
          className={`feedTab ${
            filtro ===
            "pending"
              ? "activeTab"
              : ""
          }`}
          onClick={() =>
            setFiltro(
              "pending"
            )
          }
        >
          🟡 Pendientes
        </button>

        <button
          type="button"
          className={`feedTab ${
            filtro ===
            "reviewed"
              ? "activeTab"
              : ""
          }`}
          onClick={() =>
            setFiltro(
              "reviewed"
            )
          }
        >
          ✅ Revisados
        </button>

        <button
          type="button"
          className={`feedTab ${
            filtro ===
            "dismissed"
              ? "activeTab"
              : ""
          }`}
          onClick={() =>
            setFiltro(
              "dismissed"
            )
          }
        >
          ⚪ Descartados
        </button>

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
          Todos
        </button>
      </div>

      <section
        style={{
          display: "grid",
          gap: "16px",
          marginTop: "20px",
          paddingBottom:
            "60px",
        }}
      >
        {reportesFiltrados.length ===
        0 ? (
          <div className="emptyState">
            <span className="emptyStateIcon">
              🦦
            </span>

            No hay reportes en esta
            categoría.
          </div>
        ) : (
          reportesFiltrados.map(
            (reporte) => {
              const reportador =
                perfiles[
                  reporte.reporter_id
                ];

              const autor =
                obtenerAutor(
                  reporte
                );

              const postExiste =
                reporte.target_type ===
                  "post" &&
                Boolean(
                  posts[
                    reporte.target_id
                  ]
                );

              return (
                <article
                  key={
                    reporte.id
                  }
                  className="card"
                  style={{
                    maxWidth:
                      "900px",
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
                      gap: "15px",
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize:
                            "12px",
                          fontWeight:
                            800,
                        }}
                      >
                        {iconoEstado(
                          reporte.status
                        )}{" "}
                        {estadoNombre(
                          reporte.status
                        )}
                      </span>

                      <h3
                        style={{
                          marginBottom:
                            "5px",
                        }}
                      >
                        🚩{" "}
                        {nombreMotivo(
                          reporte.motivo
                        )}
                      </h3>

                      <small
                        style={{
                          color:
                            "#969188",
                        }}
                      >
                        {new Date(
                          reporte.created_at
                        ).toLocaleString(
                          "es-MX"
                        )}
                      </small>
                    </div>

                    <span className="tag">
                      {
                        reporte.target_type
                      }
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop:
                        "17px",
                      padding:
                        "14px",
                      borderRadius:
                        "14px",
                      background:
                        "#f7f4ed",
                    }}
                  >
                    <p className="tiny">
                      CONTENIDO REPORTADO
                    </p>

                    {contenidoReporte(
                      reporte
                    )}
                  </div>

                  {autor && (
                    <div
                      style={{
                        marginTop:
                          "14px",
                      }}
                    >
                      <p className="tiny">
                        AUTOR DEL CONTENIDO
                      </p>

                      <Link
                        href={`/u/${autor.username}`}
                        style={{
                          fontWeight:
                            800,
                          textDecoration:
                            "none",
                        }}
                      >
                        👤{" "}
                        {autor.nombre ||
                          autor.username}
                      </Link>

                      <span
                        style={{
                          marginLeft:
                            "7px",
                          color:
                            "#969188",
                          fontSize:
                            "12px",
                        }}
                      >
                        @{autor.username}
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      marginTop:
                        "14px",
                    }}
                  >
                    <p className="tiny">
                      REPORTADO POR
                    </p>

                    {reportador ? (
                      <span>
                        {reportador.nombre ||
                          "Estudiante"}{" "}
                        <small>
                          @
                          {
                            reportador.username
                          }
                        </small>
                      </span>
                    ) : (
                      <span>
                        Usuario no
                        disponible
                      </span>
                    )}
                  </div>

                  {reporte.detalles && (
                    <div
                      style={{
                        marginTop:
                          "14px",
                      }}
                    >
                      <p className="tiny">
                        DETALLES
                      </p>

                      <p
                        style={{
                          lineHeight:
                            1.6,
                        }}
                      >
                        {
                          reporte.detalles
                        }
                      </p>
                    </div>
                  )}

                  {reporte.status ===
                    "pending" && (
                    <div
                      style={{
                        display:
                          "flex",
                        gap: "8px",
                        flexWrap:
                          "wrap",
                        marginTop:
                          "20px",
                      }}
                    >
                      <button
                        type="button"
                        className="primaryButton"
                        disabled={
                          procesando ===
                          reporte.id
                        }
                        onClick={() =>
                          cambiarEstado(
                            reporte,
                            "reviewed"
                          )
                        }
                      >
                        ✅ Marcar revisado
                      </button>

                      <button
                        type="button"
                        className="backHomeButton"
                        disabled={
                          procesando ===
                          reporte.id
                        }
                        onClick={() =>
                          cambiarEstado(
                            reporte,
                            "dismissed"
                          )
                        }
                      >
                        ⚪ Descartar
                      </button>

                      {postExiste && (
                        <button
                          type="button"
                          disabled={
                            procesando ===
                            reporte.id
                          }
                          onClick={() =>
                            eliminarPublicacion(
                              reporte
                            )
                          }
                          style={{
                            border: 0,
                            borderRadius:
                              "12px",
                            padding:
                              "10px 14px",
                            background:
                              "#a75f59",
                            color:
                              "white",
                            fontWeight:
                              800,
                            cursor:
                              "pointer",
                          }}
                        >
                          {procesando ===
                          reporte.id
                            ? "Procesando..."
                            : "🗑️ Eliminar publicación"}
                        </button>
                      )}
                    </div>
                  )}

                  {reporte.status !==
                    "pending" && (
                    <div
                      style={{
                        marginTop:
                          "18px",
                        fontSize:
                          "12px",
                        color:
                          "#70746a",
                      }}
                    >
                      {reporte.status ===
                      "reviewed"
                        ? "✅ Este caso ya fue revisado."
                        : "⚪ Este reporte fue descartado."}
                    </div>
                  )}
                </article>
              );
            }
          )
        )}
      </section>
    </main>
  );
}

