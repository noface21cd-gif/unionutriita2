"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from "../lib/supabase/client";

type ComentarioBase = {
  id: string;
  post_id: string;
  user_id: string;
  contenido: string;
  created_at: string;
};

type AutorComentario = {
  id: string;
  username: string | null;
  nombre: string | null;
  avatar_url: string | null;
};

type Comentario = ComentarioBase & {
  autor: AutorComentario | null;
};

type Props = {
  postId: string;
  currentUserId: string;
  onCountChange?: (
    count: number
  ) => void;
};

export default function CommentSection({
  postId,
  currentUserId,
  onCountChange,
}: Props) {
  const [comentarios, setComentarios] =
    useState<Comentario[]>([]);

  const [contenido, setContenido] =
    useState("");

  const [cargando, setCargando] =
    useState(true);

  const [enviando, setEnviando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  async function cargarComentarios() {
    try {
      const supabase =
        createClient();

      const {
        data: comentariosData,
        error: comentariosError,
      } = await supabase
        .from("comments")
        .select(
          `
            id,
            post_id,
            user_id,
            contenido,
            created_at
          `
        )
        .eq("post_id", postId)
        .order("created_at", {
          ascending: true,
        });

      if (comentariosError) {
        throw new Error(
          comentariosError.message
        );
      }

      const comentariosBase =
        (comentariosData ||
          []) as ComentarioBase[];

      if (
        comentariosBase.length === 0
      ) {
        setComentarios([]);
        onCountChange?.(0);
        return;
      }

      const idsUsuarios =
        Array.from(
          new Set(
            comentariosBase.map(
              (comentario) =>
                comentario.user_id
            )
          )
        );

      const {
        data: autoresData,
        error: autoresError,
      } = await supabase
        .from("profiles")
        .select(
          `
            id,
            username,
            nombre,
            avatar_url
          `
        )
        .in("id", idsUsuarios);

      if (autoresError) {
        throw new Error(
          autoresError.message
        );
      }

      const autores =
        (autoresData ||
          []) as AutorComentario[];

      const mapaAutores =
        new Map<
          string,
          AutorComentario
        >();

      autores.forEach((autor) => {
        mapaAutores.set(
          autor.id,
          autor
        );
      });

      const unidos: Comentario[] =
        comentariosBase.map(
          (comentario) => ({
            ...comentario,

            autor:
              mapaAutores.get(
                comentario.user_id
              ) || null,
          })
        );

      setComentarios(unidos);

      onCountChange?.(
        unidos.length
      );
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No pudimos cargar los comentarios."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarComentarios();
  }, [postId]);

  async function comentar(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const texto =
      contenido.trim();

    if (!texto) {
      return;
    }

    if (texto.length > 1000) {
      setMensaje(
        "El comentario no puede superar los 1000 caracteres."
      );
      return;
    }

    setEnviando(true);
    setMensaje("");

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from("comments")
          .insert({
            post_id: postId,
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

      await cargarComentarios();
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? `No pudimos comentar: ${error.message}`
          : "No pudimos publicar el comentario."
      );
    } finally {
      setEnviando(false);
    }
  }

  async function eliminarComentario(
    comentarioId: string
  ) {
    const confirmado =
      window.confirm(
        "¿Eliminar este comentario?"
      );

    if (!confirmado) {
      return;
    }

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from("comments")
          .delete()
          .eq("id", comentarioId)
          .eq(
            "user_id",
            currentUserId
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      await cargarComentarios();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos eliminar el comentario."
      );
    }
  }

  return (
    <div
      style={{
        marginTop: "14px",
        paddingTop: "14px",
        borderTop:
          "1px solid #eee7dc",
      }}
    >
      <form
        onSubmit={comentar}
        style={{
          display: "flex",
          gap: "8px",
        }}
      >
        <input
          type="text"
          value={contenido}
          onChange={(e) =>
            setContenido(
              e.target.value
            )
          }
          maxLength={1000}
          placeholder="Escribe un comentario..."
          style={{
            flex: 1,
            minWidth: 0,
            padding:
              "10px 12px",
            border:
              "1px solid #e5ddcf",
            borderRadius:
              "12px",
            background:
              "#f7f4ed",
            outline: "none",
          }}
        />

        <button
          type="submit"
          disabled={
            enviando ||
            !contenido.trim()
          }
          style={{
            border: 0,
            borderRadius:
              "12px",
            padding:
              "10px 14px",
            background:
              "#657a5b",
            color: "white",
            fontWeight: 800,
          }}
        >
          {enviando
            ? "..."
            : "Enviar"}
        </button>
      </form>

      {mensaje && (
        <div
          className="errorBox"
          style={{
            marginTop:
              "10px",
          }}
        >
          {mensaje}
        </div>
      )}

      {cargando ? (
        <p
          style={{
            color:
              "#969188",
            fontSize:
              "12px",
          }}
        >
          Cargando comentarios...
        </p>
      ) : comentarios.length ===
        0 ? (
        <p
          style={{
            color:
              "#969188",
            fontSize:
              "12px",
          }}
        >
          Todavía no hay
          comentarios.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "10px",
            marginTop:
              "14px",
          }}
        >
          {comentarios.map(
            (comentario) => {
              const nombre =
                comentario.autor
                  ?.nombre ||
                "Estudiante";

              const username =
                comentario.autor
                  ?.username ||
                "usuario";

              return (
                <div
                  key={
                    comentario.id
                  }
                  style={{
                    display:
                      "flex",
                    gap: "9px",
                  }}
                >
                  <Link
                    href={`/u/${username}`}
                    className="avatar"
                    style={{
                      width:
                        "34px",
                      height:
                        "34px",
                    }}
                  >
                    {comentario
                      .autor
                      ?.avatar_url ? (
                      <img
                        src={
                          comentario
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

                  <div
                    style={{
                      flex: 1,
                      padding:
                        "10px 12px",
                      borderRadius:
                        "14px",
                      background:
                        "#f4f1e9",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: "6px",
                      }}
                    >
                      <Link
                        href={`/u/${username}`}
                        style={{
                          fontSize:
                            "12px",
                          fontWeight:
                            800,
                          textDecoration:
                            "none",
                        }}
                      >
                        {nombre}
                      </Link>

                      <span
                        style={{
                          color:
                            "#969188",
                          fontSize:
                            "11px",
                        }}
                      >
                        @{username}
                      </span>

                      {comentario.user_id ===
                        currentUserId && (
                        <button
                          type="button"
                          onClick={() =>
                            eliminarComentario(
                              comentario.id
                            )
                          }
                          style={{
                            marginLeft:
                              "auto",
                            border:
                              0,
                            background:
                              "transparent",
                            color:
                              "#a75f59",
                            fontSize:
                              "11px",
                          }}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>

                    <p
                      style={{
                        margin:
                          "5px 0 0",
                        fontSize:
                          "13px",
                        lineHeight:
                          1.45,
                        whiteSpace:
                          "pre-wrap",
                      }}
                    >
                      {
                        comentario.contenido
                      }
                    </p>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
