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
  tipo: "general" | "carrera" | "semestre";
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

  const [comunidad, setComunidad] =
    useState<Comunidad | null>(
      null
    );

  const [esMiembro, setEsMiembro] =
    useState(false);

  const [miembros, setMiembros] =
    useState(0);

  const [posts, setPosts] =
    useState<PostComunidad[]>([]);

  const [contenido, setContenido] =
    useState("");

  const [cargando, setCargando] =
    useState(true);

  const [publicando, setPublicando] =
    useState(false);

  const [procesando, setProcesando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

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
      .order("created_at", {
        ascending: false,
      });

    if (postsError) {
      throw new Error(
        postsError.message
      );
    }

    const postsBase =
      postsData || [];

    if (postsBase.length === 0) {
      setPosts([]);
      return;
    }

    const idsAutores = [
      ...new Set(
        postsBase.map(
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
        avatar_url
      `)
      .in("id", idsAutores);

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

        if (!user || !activo) {
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
          .eq("slug", slug)
          .maybeSingle();

        if (comunidadError) {
          throw new Error(
            comunidadError.message
          );
        }

        if (!comunidadData) {
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
            .select("*", {
              count: "exact",
              head: true,
            })
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

        setEsMiembro(unido);

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
          setCargando(false);
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
            contenido: texto,
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
          .eq("id", postId)
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
              post.id !== postId
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

          <h1>
            Comunidad no encontrada
          </h1>

          <div className="errorBox">
            {mensaje}
          </div>

          <Link
            href="/comunidades"
            className="backHomeButton"
          >
            Volver
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
            {comunidad.descripcion}
          </p>

          <p>
            👥 {miembros} miembros
          </p>
        </div>

        <div className="welcomeOtter">
          {comunidad.tipo ===
          "general"
            ? "🏫"
            : comunidad.tipo ===
              "carrera"
            ? "🎓"
            : "📖"}
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
          href="/comunidades"
          className="primaryButton"
        >
          ← Comunidades
        </Link>

        {!esMiembro ? (
          <button
            type="button"
            className="primaryButton"
            disabled={procesando}
            onClick={unirme}
          >
            ＋ Unirme
          </button>
        ) : (
          <button
            type="button"
            className="logoutButton"
            style={{
              width: "auto",
              margin: 0,
            }}
            disabled={procesando}
            onClick={salir}
          >
            Salir
          </button>
        )}
      </div>

      {!esMiembro ? (
        <div
          className="emptyState"
          style={{
            marginTop: "25px",
          }}
        >
          <span className="emptyStateIcon">
            🔒
          </span>

          Únete a esta comunidad para
          participar y ver sus
          publicaciones.
        </div>
      ) : (
        <>
          <section
            className="createBox"
            style={{
              maxWidth: "760px",
              marginTop: "25px",
            }}
          >
            <form
              onSubmit={publicar}
              style={{
                width: "100%",
                display: "grid",
                gap: "10px",
              }}
            >
              <textarea
                value={contenido}
                onChange={(e) =>
                  setContenido(
                    e.target.value
                  )
                }
                placeholder={`Comparte algo con ${comunidad.nombre}...`}
                maxLength={3000}
                rows={4}
                style={{
                  width: "100%",
                  padding:
                    "12px 14px",
                  border:
                    "1px solid #e5ddcf",
                  borderRadius:
                    "14px",
                  resize:
                    "vertical",
                  background:
                    "#f7f4ed",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                }}
              >
                <small>
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
              maxWidth: "760px",
              marginTop: "22px",
            }}
          >
            <p className="tiny">
              CONVERSACIÓN
            </p>

            <h2>
              Publicaciones
            </h2>

            {posts.length === 0 ? (
              <div className="emptyState">
                <span className="emptyStateIcon">
                  🦦
                </span>

                Todavía nadie ha
                publicado aquí.
              </div>
            ) : (
              posts.map(
                (post) => {
                  const nombre =
                    post.autor
                      ?.nombre ||
                    "Estudiante";

                  const username =
                    post.autor
                      ?.username ||
                    "usuario";

                  return (
                    <article
                      key={post.id}
                      className="post"
                    >
                      <div className="postHeader">
                        <Link
                          href={`/u/${username}`}
                          className="avatar"
                        >
                          {post.autor
                            ?.avatar_url ? (
                            <img
                              src={
                                post.autor
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

                        <div className="postAuthor">
                          <Link
                            href={`/u/${username}`}
                            className="postAuthorName"
                          >
                            <strong>
                              {nombre}
                            </strong>
                          </Link>

                          <p>
                            @{username}
                          </p>

                          <span className="postDate">
                            {new Date(
                              post.created_at
                            ).toLocaleString(
                              "es-MX",
                              {
                                day: "numeric",
                                month: "short",
                                hour: "numeric",
                                minute:
                                  "2-digit",
                              }
                            )}
                          </span>
                        </div>

                        {post.user_id ===
                          currentUserId && (
                          <button
                            type="button"
                            className="moreButton"
                            onClick={() =>
                              eliminarPost(
                                post.id
                              )
                            }
                            title="Eliminar"
                          >
                            🗑
                          </button>
                        )}
                      </div>

                      <p className="postText">
                        {post.contenido}
                      </p>
                    </article>
                  );
                }
              )
            )}
          </section>
        </>
      )}
    </main>
  );
}
