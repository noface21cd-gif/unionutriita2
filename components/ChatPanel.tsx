"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from "../lib/supabase/client";

import type {
  PerfilResumen,
} from "../lib/types";

type TipoCanal =
  | "general"
  | "carrera"
  | "salon";

type MensajeBase = {
  id: string;
  user_id: string;
  channel_type: TipoCanal;
  channel_key: string;
  contenido: string;
  created_at: string;
};

type Mensaje = MensajeBase & {
  autor: PerfilResumen | null;
};

type Props = {
  currentUserId: string;
  perfil: PerfilResumen | null;
};

export default function ChatPanel({
  currentUserId,
  perfil,
}: Props) {
  const [tipoCanal, setTipoCanal] =
    useState<TipoCanal>("general");

  const [mensajes, setMensajes] =
    useState<Mensaje[]>([]);

  const [contenido, setContenido] =
    useState("");

  const [cargando, setCargando] =
    useState(true);

  const [enviando, setEnviando] =
    useState(false);

  const [minimizado, setMinimizado] =
    useState(false);

  const [mensajeError, setMensajeError] =
    useState("");

  const finalRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const obtenerCanalKey =
    useCallback(() => {
      if (tipoCanal === "general") {
        return "general";
      }

      if (tipoCanal === "carrera") {
        return perfil?.carrera || "";
      }

      return `${perfil?.carrera || ""}|${
        perfil?.semestre || ""
      }`;
    }, [
      tipoCanal,
      perfil?.carrera,
      perfil?.semestre,
    ]);

  const cargarMensajes =
    useCallback(async () => {
      if (!currentUserId) {
        return;
      }

      const canalKey =
        obtenerCanalKey();

      if (!canalKey) {
        setMensajes([]);
        setCargando(false);
        return;
      }

      try {
        const supabase =
          createClient();

        const {
          data: mensajesData,
          error: mensajesError,
        } = await supabase
          .from("chat_messages")
          .select(`
            id,
            user_id,
            channel_type,
            channel_key,
            contenido,
            created_at
          `)
          .eq(
            "channel_type",
            tipoCanal
          )
          .eq(
            "channel_key",
            canalKey
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(50);

        if (mensajesError) {
          throw new Error(
            mensajesError.message
          );
        }

        const mensajesBase =
          (
            mensajesData || []
          ).reverse() as MensajeBase[];

        if (
          mensajesBase.length === 0
        ) {
          setMensajes([]);
          return;
        }

        const idsAutores =
          Array.from(
            new Set(
              mensajesBase.map(
                (mensaje) =>
                  mensaje.user_id
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

        if (autoresError) {
          throw new Error(
            autoresError.message
          );
        }

        const autores =
          (
            autoresData || []
          ) as PerfilResumen[];

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

        const unidos =
          mensajesBase.map(
            (mensaje) => ({
              ...mensaje,

              autor:
                mapaAutores.get(
                  mensaje.user_id
                ) || null,
            })
          );

        setMensajes(unidos);
        setMensajeError("");
      } catch (error) {
        setMensajeError(
          error instanceof Error
            ? error.message
            : "No pudimos cargar el chat."
        );
      } finally {
        setCargando(false);
      }
    }, [
      currentUserId,
      tipoCanal,
      obtenerCanalKey,
    ]);

  useEffect(() => {
    setCargando(true);
    cargarMensajes();
  }, [cargarMensajes]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const canalKey =
      obtenerCanalKey();

    if (!canalKey) {
      return;
    }

    const supabase =
      createClient();

    const canal =
      supabase
        .channel(
          `chat-${tipoCanal}-${canalKey}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              "chat_messages",
            filter:
              `channel_key=eq.${canalKey}`,
          },
          (payload) => {
            const nuevo =
              payload.new as MensajeBase;

            if (
              nuevo.channel_type ===
              tipoCanal
            ) {
              cargarMensajes();
            }
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        canal
      );
    };
  }, [
    currentUserId,
    tipoCanal,
    obtenerCanalKey,
    cargarMensajes,
  ]);

  useEffect(() => {
    finalRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [
    mensajes,
    minimizado,
  ]);

  async function enviarMensaje(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const texto =
      contenido.trim();

    if (
      !texto ||
      !currentUserId
    ) {
      return;
    }

    if (texto.length > 1000) {
      setMensajeError(
        "El mensaje no puede superar los 1000 caracteres."
      );
      return;
    }

    const canalKey =
      obtenerCanalKey();

    if (!canalKey) {
      setMensajeError(
        "No pudimos identificar este canal."
      );
      return;
    }

    setEnviando(true);
    setMensajeError("");

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from(
            "chat_messages"
          )
          .insert({
            user_id:
              currentUserId,
            channel_type:
              tipoCanal,
            channel_key:
              canalKey,
            contenido: texto,
          });

      if (error) {
        throw new Error(
          error.message
        );
      }

      setContenido("");

      await cargarMensajes();
    } catch (error) {
      setMensajeError(
        error instanceof Error
          ? error.message
          : "No pudimos enviar el mensaje."
      );
    } finally {
      setEnviando(false);
    }
  }

  function hora(
    fecha: string
  ) {
    return new Date(
      fecha
    ).toLocaleTimeString(
      "es-MX",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  return (
    <section
      className="chat"
      style={{
        height: minimizado
          ? "58px"
          : "405px",
      }}
    >
      <div className="chatHeader">
        <div>
          <strong>
            Chat del campus
          </strong>

          {!minimizado && (
            <p>
              {tipoCanal ===
              "general"
                ? "🌎 Toda la universidad"
                : tipoCanal ===
                  "carrera"
                ? `🎓 ${
                    perfil?.carrera ||
                    "Tu carrera"
                  }`
                : `📖 ${
                    perfil?.carrera ||
                    ""
                  } · ${
                    perfil?.semestre ||
                    ""
                  }`}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setMinimizado(
              !minimizado
            )
          }
          title={
            minimizado
              ? "Abrir chat"
              : "Minimizar chat"
          }
        >
          {minimizado
            ? "💬"
            : "—"}
        </button>
      </div>

      {!minimizado && (
        <>
          <div className="chatTabs">
            <button
              type="button"
              className={`chatTab ${
                tipoCanal ===
                "general"
                  ? "activeChat"
                  : ""
              }`}
              onClick={() =>
                setTipoCanal(
                  "general"
                )
              }
            >
              General
            </button>

            <button
              type="button"
              className={`chatTab ${
                tipoCanal ===
                "carrera"
                  ? "activeChat"
                  : ""
              }`}
              disabled={
                !perfil?.carrera
              }
              onClick={() =>
                setTipoCanal(
                  "carrera"
                )
              }
            >
              Carrera
            </button>

            <button
              type="button"
              className={`chatTab ${
                tipoCanal ===
                "salon"
                  ? "activeChat"
                  : ""
              }`}
              disabled={
                !perfil?.carrera ||
                !perfil?.semestre
              }
              onClick={() =>
                setTipoCanal(
                  "salon"
                )
              }
            >
              Salón
            </button>
          </div>

          <div className="messages">
            {cargando ? (
              <p className="emptyChat">
                🦦 Cargando mensajes...
              </p>
            ) : mensajes.length ===
              0 ? (
              <p className="emptyChat">
                Todavía no hay mensajes
                aquí.
                <br />
                Inicia la conversación.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "10px",
                }}
              >
                {mensajes.map(
                  (mensaje) => {
                    const esMio =
                      mensaje.user_id ===
                      currentUserId;

                    const nombre =
                      mensaje.autor
                        ?.nombre ||
                      "Estudiante";

                    const username =
                      mensaje.autor
                        ?.username ||
                      "usuario";

                    return (
                      <div
                        key={
                          mensaje.id
                        }
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            esMio
                              ? "flex-end"
                              : "flex-start",
                          gap: "7px",
                        }}
                      >
                        {!esMio && (
                          <Link
                            href={`/u/${username}`}
                            className="avatar"
                            style={{
                              width:
                                "30px",
                              height:
                                "30px",
                            }}
                          >
                            {mensaje.autor
                              ?.avatar_url ? (
                              <img
                                src={
                                  mensaje
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
                        )}

                        <div
                          style={{
                            maxWidth:
                              "78%",
                          }}
                        >
                          {!esMio && (
                            <Link
                              href={`/u/${username}`}
                              style={{
                                display:
                                  "block",
                                marginBottom:
                                  "3px",
                                color:
                                  "#70746a",
                                fontSize:
                                  "10px",
                                fontWeight:
                                  800,
                                textDecoration:
                                  "none",
                              }}
                            >
                              {nombre}
                            </Link>
                          )}

                          <div
                            style={{
                              padding:
                                "9px 11px",
                              borderRadius:
                                esMio
                                  ? "14px 14px 4px 14px"
                                  : "14px 14px 14px 4px",

                              background:
                                esMio
                                  ? "#e5eedc"
                                  : "#f2eee6",

                              fontSize:
                                "12px",

                              lineHeight:
                                1.4,

                              overflowWrap:
                                "anywhere",
                            }}
                          >
                            {
                              mensaje.contenido
                            }
                          </div>

                          <span
                            style={{
                              display:
                                "block",
                              marginTop:
                                "2px",
                              color:
                                "#aaa49a",
                              fontSize:
                                "9px",
                              textAlign:
                                esMio
                                  ? "right"
                                  : "left",
                            }}
                          >
                            {hora(
                              mensaje.created_at
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}

                <div
                  ref={finalRef}
                />
              </div>
            )}
          </div>

          {mensajeError && (
            <p
              style={{
                margin:
                  "0 10px 5px",
                color:
                  "#a75f59",
                fontSize:
                  "10px",
              }}
            >
              {mensajeError}
            </p>
          )}

          <form
            className="chatInput"
            onSubmit={
              enviarMensaje
            }
          >
            <input
              type="text"
              value={contenido}
              onChange={(e) =>
                setContenido(
                  e.target.value
                )
              }
              placeholder="Escribe un mensaje..."
              maxLength={1000}
            />

            <button
              type="submit"
              disabled={
                enviando ||
                !contenido.trim()
              }
            >
              {enviando
                ? "…"
                : "➤"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
