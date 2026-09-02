"use client";

import {
  FormEvent,
  useState,
} from "react";

import { createClient } from "../lib/supabase/client";

type TipoObjetivo =
  | "post"
  | "comment"
  | "profile"
  | "social";

type Props = {
  targetId: string;
  targetType: TipoObjetivo;
  currentUserId: string;
};

type Motivo =
  | "spam"
  | "acoso"
  | "contenido_inapropiado"
  | "informacion_falsa"
  | "otro";

export default function ReportButton({
  targetId,
  targetType,
  currentUserId,
}: Props) {
  const [
    abierto,
    setAbierto,
  ] = useState(false);

  const [
    motivo,
    setMotivo,
  ] =
    useState<Motivo>("spam");

  const [
    detalles,
    setDetalles,
  ] = useState("");

  const [
    enviando,
    setEnviando,
  ] = useState(false);

  const [
    enviado,
    setEnviado,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  async function enviarReporte(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (
      !targetId ||
      !currentUserId
    ) {
      return;
    }

    setEnviando(true);
    setMensaje("");

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from("reports")
          .insert({
            reporter_id:
              currentUserId,

            target_type:
              targetType,

            target_id:
              targetId,

            motivo,

            detalles:
              detalles.trim() ||
              null,
          });

      if (error) {
        if (
          error.code ===
          "23505"
        ) {
          throw new Error(
            "Ya reportaste este contenido."
          );
        }

        throw new Error(
          error.message
        );
      }

      setEnviado(true);
      setDetalles("");

      setTimeout(() => {
        setAbierto(false);
      }, 1000);
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No pudimos enviar el reporte."
      );
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <span
        style={{
          fontSize: "12px",
          color: "#657a5b",
          fontWeight: 700,
        }}
      >
        ✓ Reportado
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setAbierto(true)
        }
        style={{
          border: 0,
          background: "transparent",
          cursor: "pointer",
          color: "#777",
          fontSize: "12px",
          padding: "6px 8px",
        }}
      >
        🚩 Reportar
      </button>

      {abierto && (
        <div
          onClick={() =>
            setAbierto(false)
          }
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0, 0, 0, 0.35)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            className="profileCard"
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: "480px",
            }}
          >
            <p className="tiny">
              MODERACIÓN
            </p>

            <h2>
              🚩 Reportar contenido
            </h2>

            <p
              style={{
                color: "#70746a",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              El reporte se guardará
              para revisión. La persona
              reportada no verá quién
              realizó el reporte.
            </p>

            <form
              className="authForm"
              onSubmit={
                enviarReporte
              }
            >
              <label>
                Motivo

                <select
                  value={motivo}
                  onChange={(e) =>
                    setMotivo(
                      e.target
                        .value as Motivo
                    )
                  }
                >
                  <option value="spam">
                    Spam
                  </option>

                  <option value="acoso">
                    Acoso
                  </option>

                  <option value="contenido_inapropiado">
                    Contenido inapropiado
                  </option>

                  <option value="informacion_falsa">
                    Información falsa
                  </option>

                  <option value="otro">
                    Otro
                  </option>
                </select>
              </label>

              <label>
                Detalles opcionales

                <textarea
                  value={detalles}
                  onChange={(e) =>
                    setDetalles(
                      e.target.value
                    )
                  }
                  maxLength={1000}
                  rows={4}
                  placeholder="Explica brevemente el problema..."
                />
              </label>

              {mensaje && (
                <div className="errorBox">
                  {mensaje}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="submit"
                  className="authButton"
                  disabled={enviando}
                >
                  {enviando
                    ? "Enviando..."
                    : "Enviar reporte"}
                </button>

                <button
                  type="button"
                  className="backHomeButton"
                  disabled={enviando}
                  onClick={() =>
                    setAbierto(false)
                  }
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
