"use client";

import { useEffect, useState } from "react";
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
  const [currentUserId, setCurrentUserId] = useState("");
  const [posts, setPosts] = useState<PostConAutor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargarGuardados() {
      try {
        const user = await requerirUsuario();

        if (!user || !activo) {
          return;
        }

        setCurrentUserId(user.id);

        const supabase = createClient();

        const {
          data: guardadosData,
          error: guardadosError,
        } = await supabase
          .from("post_saves")
          .select("post_id, created_at")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (guardadosError) {
          throw new Error(guardadosError.message);
        }

        if (!activo) {
          return;
        }

        const idsPosts =
          guardadosData?.map((item) => item.post_id) || [];

        if (idsPosts.length === 0) {
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
          .in("id", idsPosts);

        if (postsError) {
          throw new Error(postsError.message);
        }

        const publicaciones = (postsData || []) as PostBase[];

        const idsAutores = [
          ...new Set(
            publicaciones.map((post) => post.user_id)
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
          .in("id", idsAutores);

        if (autoresError) {
          throw new Error(autoresError.message);
        }

        const autores = (autoresData || []) as PerfilResumen[];

        const mapaAutores = new Map<string, PerfilResumen>();

        autores.forEach((autor) => {
          mapaAutores.set(autor.id, autor);
        });

        const mapaPosts = new Map<string, PostConAutor>();

        publicaciones.forEach((post) => {
          mapaPosts.set(post.id, {
            ...post,
            autor: mapaAutores.get(post.user_id) || null,
          });
        });

        /*
         * Conservamos el orden en que
         * el usuario guardó los posts.
         */
        const ordenados = idsPosts
          .map((id) => mapaPosts.get(id))
          .filter(Boolean) as PostConAutor[];

        if (activo) {
          setPosts(ordenados);
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
          setCargando(false);
        }
      }
    }

    cargarGuardados();

    return () => {
      activo = false;
    };
  }, []);

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">🦦</span>

          <p className="loadingText">
            Buscando lo que guardaste...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="content">
      <section className="welcome">
        <div>
          <p className="tiny">TU COLECCIÓN</p>

          <h2>Publicaciones guardadas 🔖</h2>

          <p>
            Todo lo que decidiste guardar para volver a consultarlo después.
          </p>
        </div>

        <div className="welcomeOtter">🦦</div>
      </section>

      <div style={{ marginTop: "20px" }}>
        <Link href="/" className="primaryButton">
          ← Volver al inicio
        </Link>
      </div>

      {mensaje && (
        <div
          className="errorBox"
          style={{ marginTop: "20px" }}
        >
          {mensaje}
        </div>
      )}

      {!mensaje && posts.length === 0 && (
        <div
          className="emptyState"
          style={{ marginTop: "20px" }}
        >
          <span className="emptyStateIcon">🔖</span>

          Todavía no has guardado ninguna publicación.
        </div>
      )}

      <div
        style={{
          maxWidth: "780px",
          marginTop: "20px",
        }}
      >
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </main>
  );
}
