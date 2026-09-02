"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from "../lib/supabase/client";

import type { PostConAutor } from "../lib/types";

import CommentSection from "./CommentSection";

type Props = {
  post: PostConAutor;
  currentUserId: string;
};

export default function PostCard({
  post,
  currentUserId,
}: Props) {
  const [menuAbierto, setMenuAbierto] =
    useState(false);

  const [
    comentariosAbiertos,
    setComentariosAbiertos,
  ] = useState(false);

  const [liked, setLiked] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [likes, setLikes] =
    useState(0);

  const [
    comentariosCount,
    setComentariosCount,
  ] = useState(0);

  const [
    procesandoLike,
    setProcesandoLike,
  ] = useState(false);

  const [
    procesandoSave,
    setProcesandoSave,
  ] = useState(false);

  const [eliminando, setEliminando] =
    useState(false);

  const menuRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const nombre =
    post.autor?.nombre ||
    "Estudiante";

  const username =
    post.autor?.username ||
    "usuario";

  const carrera =
    post.autor?.carrera ||
    "Sin carrera";

  const semestre =
    post.autor?.semestre ||
    "Sin semestre";

  const avatar =
    post.autor?.avatar_url;

  const esMio =
    currentUserId ===
    post.user_id;

  const fecha = new Date(
    post.created_at
  ).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const fueEditado =
    post.updated_at !==
    post.created_at;

  useEffect(() => {
    function cerrarMenu(
      event: MouseEvent
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node
        )
      ) {
        setMenuAbierto(false);
      }
    }

    document.addEventListener(
      "mousedown",
      cerrarMenu
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        cerrarMenu
      );
    };
  }, []);

  useEffect(() => {
    async function cargarInteracciones() {
      if (!currentUserId) {
        return;
      }

      const supabase =
        createClient();

      const [
        likesResultado,
        miLikeResultado,
        miGuardadoResultado,
        comentariosResultado,
      ] = await Promise.all([
        supabase
          .from("post_likes")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq(
            "post_id",
            post.id
          ),

        supabase
          .from("post_likes")
          .select("post_id")
          .eq(
            "post_id",
            post.id
          )
          .eq(
            "user_id",
            currentUserId
          )
          .maybeSingle(),

        supabase
          .from("post_saves")
          .select("post_id")
          .eq(
            "post_id",
            post.id
          )
          .eq(
            "user_id",
            currentUserId
          )
          .maybeSingle(),

        supabase
          .from("comments")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq(
            "post_id",
            post.id
          ),
      ]);

      setLikes(
        likesResultado.count ||
          0
      );

      setLiked(
        Boolean(
          miLikeResultado.data
        )
      );

      setSaved(
        Boolean(
          miGuardadoResultado.data
        )
      );

      setComentariosCount(
        comentariosResultado.count ||
          0
      );
    }

    cargarInteracciones();
  }, [
    post.id,
    currentUserId,
  ]);

  function iconoTipo() {
    switch (post.tipo) {
      case "Apunte":
        return "📚";

      case "Pregunta":
        return "❓";

      case "Formulario":
        return "📋";

      case "Ayuda":
        return "🤝";

      case "Aviso":
        return "📢";

      default:
        return "💬";
    }
  }

  async function toggleLike() {
    if (
      procesandoLike ||
      !currentUserId
    ) {
      return;
    }

    setProcesandoLike(true);

    const supabase =
      createClient();

    try {
      if (liked) {
        const { error } =
          await supabase
            .from("post_likes")
            .delete()
            .eq(
              "post_id",
              post.id
            )
            .eq(
              "user_id",
              currentUserId
            );

        if (error) {
          throw error;
        }

        setLiked(false);

        setLikes((actual) =>
          Math.max(
            0,
            actual - 1
          )
        );
      } else {
        const { error } =
          await supabase
            .from("post_likes")
            .insert({
              post_id:
                post.id,
              user_id:
                currentUserId,
            });

        if (error) {
          throw error;
        }

        setLiked(true);

        setLikes(
          (actual) =>
            actual + 1
        );
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos actualizar el Me gusta."
      );
    } finally {
      setProcesandoLike(false);
    }
  }

  async function toggleGuardado() {
    if (
      procesandoSave ||
      !currentUserId
    ) {
      return;
    }

    setProcesandoSave(true);

    const supabase =
      createClient();

    try {
      if (saved) {
        const { error } =
          await supabase
            .from("post_saves")
            .delete()
            .eq(
              "post_id",
              post.id
            )
            .eq(
              "user_id",
              currentUserId
            );

        if (error) {
          throw error;
        }

        setSaved(false);
      } else {
        const { error } =
          await supabase
            .from("post_saves")
            .insert({
              post_id:
                post.id,
              user_id:
                currentUserId,
            });

        if (error) {
          throw error;
        }

        setSaved(true);
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos guardar la publicación."
      );
    } finally {
      setProcesandoSave(false);
    }
  }

  async function eliminarPost() {
    const confirmar =
      window.confirm(
        "¿Seguro que quieres eliminar esta publicación?"
      );

    if (!confirmar) {
      return;
    }

    setEliminando(true);

    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        window.location.href =
          "/login";
        return;
      }

      const { error } =
        await supabase
          .from("posts")
          .delete()
          .eq("id", post.id)
          .eq(
            "user_id",
            user.id
          );

      if (error) {
        throw error;
      }

      window.location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos eliminar la publicación."
      );

      setEliminando(false);
    }
  }

  return (
    <article className="post">
      <div className="postHeader">
        <Link
          href={`/u/${username}`}
          className="avatar"
        >
          {avatar ? (
            <img
              src={avatar}
              alt={`Foto de ${nombre}`}
            />
          ) : (
            <span>🦦</span>
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
            {" · "}
            {carrera}
            {" · "}
            {semestre}
          </p>

          <span className="postDate">
            {fecha}

            {fueEditado
              ? " · editado"
              : ""}
          </span>
        </div>

        <div
          ref={menuRef}
          style={{
            position: "relative",
            marginLeft: "auto",
          }}
        >
          <button
            type="button"
            className="moreButton"
            onClick={() =>
              setMenuAbierto(
                !menuAbierto
              )
            }
          >
            •••
          </button>

          {menuAbierto && (
            <div
              style={{
                position:
                  "absolute",
                top: "34px",
                right: 0,
                zIndex: 20,
                width: "170px",
                padding: "7px",
                border:
                  "1px solid #e5ddcf",
                borderRadius:
                  "14px",
                background:
                  "#fffdf9",
                boxShadow:
                  "0 12px 35px rgba(66,58,43,.14)",
              }}
            >
              {esMio ? (
                <>
                  <Link
                    href={`/publicar/${post.id}/editar`}
                    style={{
                      display:
                        "block",
                      padding:
                        "10px",
                      textDecoration:
                        "none",
                    }}
                  >
                    ✏️ Editar
                  </Link>

                  <button
                    type="button"
                    onClick={
                      eliminarPost
                    }
                    disabled={
                      eliminando
                    }
                    style={{
                      width:
                        "100%",
                      padding:
                        "10px",
                      border: 0,
                      background:
                        "transparent",
                      color:
                        "#a75f59",
                      textAlign:
                        "left",
                    }}
                  >
                    {eliminando
                      ? "Eliminando..."
                      : "🗑️ Eliminar"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled
                  style={{
                    width:
                      "100%",
                    padding:
                      "10px",
                    border: 0,
                    background:
                      "transparent",
                    color:
                      "#969188",
                    textAlign:
                      "left",
                  }}
                >
                  🚩 Reportar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <span className="tag">
        {iconoTipo()}{" "}
        {post.tipo}
      </span>

      <p className="postText">
        {post.contenido}
      </p>

      <div className="actions">
        <button
          type="button"
          onClick={toggleLike}
          disabled={
            procesandoLike
          }
        >
          {liked ? "♥" : "♡"}{" "}
          Me gusta
          {likes > 0
            ? ` · ${likes}`
            : ""}
        </button>

        <button
          type="button"
          onClick={() =>
            setComentariosAbiertos(
              !comentariosAbiertos
            )
          }
        >
          💬 Comentar
          {comentariosCount >
          0
            ? ` · ${comentariosCount}`
            : ""}
        </button>

        <button
          type="button"
          onClick={
            toggleGuardado
          }
          disabled={
            procesandoSave
          }
        >
          {saved
            ? "🔖 Guardado"
            : "🔖 Guardar"}
        </button>
      </div>

      {comentariosAbiertos && (
        <CommentSection
          postId={post.id}
          currentUserId={
            currentUserId
          }
          onCountChange={
            setComentariosCount
          }
        />
      )}
    </article>
  );
}


