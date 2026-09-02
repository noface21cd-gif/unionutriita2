"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const [
    correo,
    setCorreo,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    mostrarPassword,
    setMostrarPassword,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  const [
    cargando,
    setCargando,
  ] = useState(false);

  async function iniciarSesion(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const correoLimpio =
      correo
        .trim()
        .toLowerCase();

    if (!correoLimpio) {
      setMensaje(
        "Escribe tu correo."
      );

      return;
    }

    if (!password) {
      setMensaje(
        "Escribe tu contraseña."
      );

      return;
    }

    setCargando(true);
    setMensaje("");

    try {
      const supabase =
        createClient();

      const {
        data,
        error,
      } =
        await supabase.auth
          .signInWithPassword({
            email:
              correoLimpio,

            password,
          });

      if (error) {
        throw new Error(
          error.message
        );
      }

      if (
        !data.user ||
        !data.session
      ) {
        throw new Error(
          "No pudimos iniciar una sesión válida."
        );
      }

      window.location.href =
        "/";
    } catch (error) {
      const texto =
        error instanceof Error
          ? error.message
          : "No pudimos iniciar sesión.";

      const textoLower =
        texto.toLowerCase();

      if (
        textoLower.includes(
          "invalid login credentials"
        ) ||
        textoLower.includes(
          "invalid credentials"
        )
      ) {
        setMensaje(
          "Correo o contraseña incorrectos."
        );
      } else if (
        textoLower.includes(
          "email not confirmed"
        )
      ) {
        setMensaje(
          "Tu correo todavía no está confirmado."
        );
      } else if (
        textoLower.includes(
          "too many requests"
        ) ||
        textoLower.includes(
          "rate limit"
        )
      ) {
        setMensaje(
          "Hay demasiados intentos. Espera un momento y vuelve a intentarlo."
        );
      } else if (
        textoLower.includes(
          "network"
        ) ||
        textoLower.includes(
          "fetch"
        )
      ) {
        setMensaje(
          "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente."
        );
      } else {
        setMensaje(
          `No pudimos iniciar sesión: ${texto}`
        );
      }

      setCargando(false);
    }
  }

  const puedeEntrar =
    Boolean(
      correo.trim() &&
        password &&
        !cargando
    );

  return (
    <main
      className="authPage"
      style={{
        minHeight:
          "100vh",

        display:
          "grid",

        placeItems:
          "center",

        padding:
          "24px",
      }}
    >
      <section
        style={{
          width:
            "min(100%, 920px)",

          display:
            "grid",

          gridTemplateColumns:
            "minmax(0, 0.9fr) minmax(320px, 1fr)",

          overflow:
            "hidden",

          border:
            "1px solid #e5ddcf",

          borderRadius:
            "24px",

          background:
            "#fffdf8",

          boxShadow:
            "0 20px 60px rgba(70, 74, 63, 0.10)",
        }}
        className="loginGrid"
      >
        <aside
          style={{
            display:
              "flex",

            flexDirection:
              "column",

            justifyContent:
              "space-between",

            minHeight:
              "590px",

            padding:
              "38px",

            background:
              "linear-gradient(145deg, #e5eedc 0%, #f4efe4 100%)",
          }}
        >
          <div>
            <Link
              href="/login"
              style={{
                display:
                  "inline-flex",

                alignItems:
                  "center",

                gap:
                  "10px",

                color:
                  "#384333",

                textDecoration:
                  "none",
              }}
            >
              <span
                style={{
                  display:
                    "grid",

                  placeItems:
                    "center",

                  width:
                    "46px",

                  height:
                    "46px",

                  borderRadius:
                    "15px",

                  background:
                    "rgba(255,255,255,0.7)",

                  fontSize:
                    "24px",
                }}
              >
                🦦
              </span>

              <div>
                <strong
                  style={{
                    display:
                      "block",

                    fontSize:
                      "17px",
                  }}
                >
                  Uniónutriita
                </strong>

                <span
                  style={{
                    color:
                      "#65705f",

                    fontSize:
                      "10px",
                  }}
                >
                  Comunidad ENES Oaxaca
                </span>
              </div>
            </Link>

            <div
              style={{
                marginTop:
                  "72px",
              }}
            >
              <p
                className="tiny"
                style={{
                  marginBottom:
                    "8px",
                }}
              >
                TU CAMPUS DIGITAL
              </p>

              <h2
                style={{
                  maxWidth:
                    "360px",

                  margin:
                    "0",

                  color:
                    "#384333",

                  fontSize:
                    "clamp(30px, 4vw, 43px)",

                  lineHeight:
                    1.08,
                }}
              >
                Tu comunidad universitaria
                en un solo lugar.
              </h2>

              <p
                style={{
                  maxWidth:
                    "350px",

                  margin:
                    "18px 0 0",

                  color:
                    "#687062",

                  fontSize:
                    "13px",

                  lineHeight:
                    1.7,
                }}
              >
                Estudia, conoce personas,
                comparte recursos y
                participa en la vida de
                la universidad.
              </p>
            </div>
          </div>

          <div
            style={{
              display:
                "grid",

              gap:
                "9px",

              marginTop:
                "40px",
            }}
          >
            <div
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                gap:
                  "10px",

                color:
                  "#5e6858",

                fontSize:
                  "11px",
              }}
            >
              <span>
                📚
              </span>

              Recursos y apoyo académico
            </div>

            <div
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                gap:
                  "10px",

                color:
                  "#5e6858",

                fontSize:
                  "11px",
              }}
            >
              <span>
                🤝
              </span>

              Conexiones entre estudiantes
            </div>

            <div
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                gap:
                  "10px",

                color:
                  "#5e6858",

                fontSize:
                  "11px",
              }}
            >
              <span>
                🎉
              </span>

              Eventos y comunidad
            </div>
          </div>
        </aside>

        <section
          style={{
            display:
              "flex",

            alignItems:
              "center",

            padding:
              "42px",
          }}
        >
          <div
            style={{
              width:
                "100%",
            }}
          >
            <div
              className="authOtter"
              style={{
                marginBottom:
                  "14px",
              }}
            >
              🦦
            </div>

            <p className="authEyebrow">
              UNIÓNUTRIIITA
            </p>

            <h1
              style={{
                margin:
                  "6px 0 8px",

                fontSize:
                  "32px",
              }}
            >
              Bienvenido de vuelta
            </h1>

            <p
              className="authDescription"
              style={{
                marginBottom:
                  "26px",
              }}
            >
              Inicia sesión para volver a
              tus publicaciones, perfil y
              comunidad universitaria.
            </p>

            <form
              onSubmit={
                iniciarSesion
              }
              className="authForm"
              style={{
                gap:
                  "17px",
              }}
            >
              <label>
                Correo

                <input
                  type="email"
                  placeholder="tu-correo@ejemplo.com"
                  value={
                    correo
                  }
                  onChange={(e) =>
                    setCorreo(
                      e.target.value
                    )
                  }
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={
                    false
                  }
                  disabled={
                    cargando
                  }
                  required
                />
              </label>

              <label>
                Contraseña

                <div
                  style={{
                    position:
                      "relative",
                  }}
                >
                  <input
                    type={
                      mostrarPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Tu contraseña"
                    value={
                      password
                    }
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    autoComplete="current-password"
                    disabled={
                      cargando
                    }
                    style={{
                      paddingRight:
                        "52px",
                    }}
                    required
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setMostrarPassword(
                        (actual) =>
                          !actual
                      )
                    }
                    disabled={
                      cargando
                    }
                    aria-label={
                      mostrarPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                    title={
                      mostrarPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                    style={{
                      position:
                        "absolute",

                      top:
                        "50%",

                      right:
                        "10px",

                      transform:
                        "translateY(-50%)",

                      display:
                        "grid",

                      placeItems:
                        "center",

                      width:
                        "34px",

                      height:
                        "34px",

                      padding:
                        0,

                      border:
                        0,

                      borderRadius:
                        "9px",

                      background:
                        "transparent",

                      cursor:
                        "pointer",

                      fontSize:
                        "15px",
                    }}
                  >
                    {mostrarPassword
                      ? "🙈"
                      : "👁️"}
                  </button>
                </div>
              </label>

              {mensaje && (
                <div className="authMessage error">
                  {mensaje}
                </div>
              )}

              <button
                type="submit"
                className="authButton"
                disabled={
                  !puedeEntrar
                }
              >
                {cargando
                  ? "Iniciando sesión..."
                  : "Entrar a Uniónutriita"}
              </button>
            </form>

            <div
              style={{
                display:
                  "flex",

                alignItems:
                  "center",

                gap:
                  "10px",

                margin:
                  "24px 0",

                color:
                  "#aaa49a",

                fontSize:
                  "10px",
              }}
            >
              <span
                style={{
                  flex:
                    1,

                  height:
                    "1px",

                  background:
                    "#e9e2d7",
                }}
              />

              ¿Primera vez aquí?

              <span
                style={{
                  flex:
                    1,

                  height:
                    "1px",

                  background:
                    "#e9e2d7",
                }}
              />
            </div>

            <Link
              href="/registro"
              className="backHomeButton"
              style={{
                width:
                  "100%",

                justifyContent:
                  "center",
              }}
            >
              Crear una cuenta
            </Link>

            <p
              style={{
                margin:
                  "24px 0 0",

                color:
                  "#aaa49a",

                fontSize:
                  "9px",

                lineHeight:
                  1.5,

                textAlign:
                  "center",
              }}
            >
              Al acceder utilizas tu
              cuenta personal de
              Uniónutriita.
            </p>
          </div>
        </section>
      </section>

      <style jsx>{`
        @media (max-width: 760px) {
          .loginGrid {
            grid-template-columns: 1fr !important;
          }

          .loginGrid > aside {
            min-height: auto !important;
            padding: 26px !important;
          }

          .loginGrid > aside > div:first-child > div:last-child {
            margin-top: 34px !important;
          }

          .loginGrid > section {
            padding: 30px 24px 36px !important;
          }
        }

        @media (max-width: 480px) {
          .loginGrid > aside {
            padding: 22px !important;
          }

          .loginGrid > section {
            padding: 28px 20px 32px !important;
          }
        }
      `}</style>
    </main>
  );
}
