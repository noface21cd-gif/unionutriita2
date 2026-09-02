"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from "../../lib/supabase/client";

const CARRERAS = [
  "Administración",
  "Contabilidad",
  "Negocios Internacionales",
  "Historia",
] as const;

const SEMESTRES = [
  "Nuevo ingreso",
  "3.º semestre",
  "5.º semestre",
  "7.º semestre",
] as const;

export default function RegistroPage() {
  const [
    nombre,
    setNombre,
  ] = useState("");

  const [
    username,
    setUsername,
  ] = useState("");

  const [
    correo,
    setCorreo,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmarPassword,
    setConfirmarPassword,
  ] = useState("");

  const [
    mostrarPassword,
    setMostrarPassword,
  ] = useState(false);

  const [
    carrera,
    setCarrera,
  ] = useState("");

  const [
    semestre,
    setSemestre,
  ] = useState("");

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  const [
    tipoMensaje,
    setTipoMensaje,
  ] = useState<
    "ok" | "error" | ""
  >("");

  const [
    cargando,
    setCargando,
  ] = useState(false);

  const [
    registroTerminado,
    setRegistroTerminado,
  ] = useState(false);

  function cambiarCarrera(
    nuevaCarrera: string
  ) {
    setCarrera(
      nuevaCarrera
    );

    /*
     * En Historia actualmente
     * solo usamos 3.º semestre.
     */
    if (
      nuevaCarrera ===
      "Historia"
    ) {
      setSemestre(
        "3.º semestre"
      );
    }
  }

  async function registrarse(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setCargando(true);
    setMensaje("");
    setTipoMensaje("");

    const nombreLimpio =
      nombre.trim();

    const usernameLimpio =
      username
        .trim()
        .toLowerCase()
        .replace(/^@/, "");

    const correoLimpio =
      correo
        .trim()
        .toLowerCase();

    if (
      nombreLimpio.length <
      2
    ) {
      setMensaje(
        "Tu nombre debe tener al menos 2 caracteres."
      );

      setTipoMensaje(
        "error"
      );

      setCargando(
        false
      );

      return;
    }

    if (
      nombreLimpio.length >
      80
    ) {
      setMensaje(
        "Tu nombre no puede superar los 80 caracteres."
      );

      setTipoMensaje(
        "error"
      );

      setCargando(
        false
      );

      return;
    }

    if (
      usernameLimpio.length <
      3
    ) {
      setMensaje(
        "Tu nombre de usuario debe tener al menos 3 caracteres."
      );

      setTipoMensaje(
        "error"
      );

      setCargando(
        false
      );

      return;
    }

    if (
      usernameLimpio.length >
      30
    ) {
      setMensaje(
        "Tu nombre de usuario no puede superar los 30 caracteres."
      );

      setTipoMensaje(
        "error"
      );

      setCargando(
        false
      );

      return;
    }

    if (
      !/^[a-z0-9._]+$/.test(
        usernameLimpio
      )
    ) {
      setMensaje(
        "El usuario solo puede contener letras, números, puntos y guiones bajos."
      );

      setTipoMensaje(
        "error"
      );

      setCargando(
        false
      );

      return;
    }

    if (
      !correoLimpio
    ) {
      setMensaje(
        "Escribe un correo válido."
      );

      setTipoMensaje(
        "error"
      );

      setCargando(
        false
      );

      return;
    }

    if (
      password.length <
      6
    ) {
      setMensaje(
        "La contraseña debe tener al menos 6 caracteres."
      );

      setTipoMensaje(
        "error"
      );

      setCargando(
        false
      );

      return;
    }

    if (
      password !==
      confirmarPassword
    ) {
      setMensaje(
        "Las contraseñas no coinciden."
      );

      setTipoMensaje(
        "error"
      );

      setCargando(
        false
      );

      return;
    }

    if (
      !CARRERAS.includes(
        carrera as
          (typeof CARRERAS)[number]
      )
    ) {
      setMensaje(
        "Selecciona una carrera válida."
      );

      setTipoMensaje(
        "error"
      );

      setCargando(
        false
      );

      return;
    }

    if (
      !SEMESTRES.includes(
        semestre as
          (typeof SEMESTRES)[number]
      )
    ) {
      setMensaje(
        "Selecciona un semestre válido."
      );

      setTipoMensaje(
        "error"
      );

      setCargando(
        false
      );

      return;
    }

    if (
      carrera ===
        "Historia" &&
      semestre !==
        "3.º semestre"
    ) {
      setMensaje(
        "Historia actualmente corresponde a 3.º semestre."
      );

      setTipoMensaje(
        "error"
      );

      setCargando(
        false
      );

      return;
    }

    try {
      const supabase =
        createClient();

      /*
       * Comprobamos primero si
       * el username está ocupado.
       */
      const {
        data:
          usuarioExistente,

        error:
          errorBusqueda,
      } = await supabase
        .from("profiles")
        .select("id")
        .eq(
          "username",
          usernameLimpio
        )
        .maybeSingle();

      if (
        errorBusqueda
      ) {
        throw new Error(
          `No pudimos comprobar el usuario: ${errorBusqueda.message}`
        );
      }

      if (
        usuarioExistente
      ) {
        setMensaje(
          "Ese nombre de usuario ya está ocupado."
        );

        setTipoMensaje(
          "error"
        );

        setCargando(
          false
        );

        return;
      }

      /*
       * Creamos la cuenta.
       *
       * El trigger de Supabase
       * copiará esta metadata
       * a profiles.
       */
      const {
        data,
        error,
      } =
        await supabase.auth
          .signUp({
            email:
              correoLimpio,

            password,

            options: {
              data: {
                nombre:
                  nombreLimpio,

                username:
                  usernameLimpio,

                carrera,

                semestre,
              },
            },
          });

      if (error) {
        throw new Error(
          error.message
        );
      }

      if (!data.user) {
        throw new Error(
          "Supabase no devolvió un usuario válido."
        );
      }

      /*
       * Si Supabase devuelve
       * sesión, el usuario ya
       * puede entrar.
       */
      if (data.session) {
        setMensaje(
          "Cuenta creada correctamente. Entrando a Uniónutriita 🦦"
        );

        setTipoMensaje(
          "ok"
        );

        setRegistroTerminado(
          true
        );

        setTimeout(() => {
          window.location.href =
            "/";
        }, 700);

        return;
      }

      /*
       * Si no existe sesión,
       * normalmente significa
       * que debe confirmar
       * primero su correo.
       */
      setMensaje(
        "Cuenta creada. Revisa tu correo y confirma tu dirección antes de iniciar sesión."
      );

      setTipoMensaje(
        "ok"
      );

      setRegistroTerminado(
        true
      );

      setCargando(
        false
      );
    } catch (error) {
      const texto =
        error instanceof Error
          ? error.message
          : "No pudimos crear tu cuenta.";

      const textoLower =
        texto.toLowerCase();

      if (
        textoLower.includes(
          "already registered"
        ) ||
        textoLower.includes(
          "already been registered"
        ) ||
        textoLower.includes(
          "user already registered"
        )
      ) {
        setMensaje(
          "Ya existe una cuenta con este correo."
        );
      } else if (
        textoLower.includes(
          "password"
        ) &&
        textoLower.includes(
          "weak"
        )
      ) {
        setMensaje(
          "La contraseña es demasiado débil. Prueba con una más segura."
        );
      } else if (
        textoLower.includes(
          "rate limit"
        ) ||
        textoLower.includes(
          "too many requests"
        )
      ) {
        setMensaje(
          "Se hicieron demasiados intentos. Espera un momento y vuelve a intentarlo."
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
          `No pudimos crear tu cuenta: ${texto}`
        );
      }

      setTipoMensaje(
        "error"
      );

      setCargando(
        false
      );
    }
  }

  const passwordCoincide =
    !confirmarPassword ||
    password ===
      confirmarPassword;

  const puedeRegistrarse =
    Boolean(
      nombre.trim() &&
        username.trim() &&
        correo.trim() &&
        password &&
        confirmarPassword &&
        carrera &&
        semestre &&
        !cargando &&
        !registroTerminado
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
        className="registerGrid"
        style={{
          width:
            "min(100%, 980px)",

          display:
            "grid",

          gridTemplateColumns:
            "minmax(280px, 0.75fr) minmax(0, 1.25fr)",

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
      >
        <aside
          style={{
            display:
              "flex",

            flexDirection:
              "column",

            justifyContent:
              "space-between",

            padding:
              "38px",

            background:
              "linear-gradient(145deg, #e5eedc 0%, #f4efe4 100%)",
          }}
        >
          <div>
            <div
              style={{
                display:
                  "inline-flex",

                alignItems:
                  "center",

                gap:
                  "10px",
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

                    color:
                      "#384333",

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
            </div>

            <div
              style={{
                marginTop:
                  "70px",
              }}
            >
              <p className="tiny">
                ÚNETE AL CAMPUS
              </p>

              <h2
                style={{
                  margin:
                    "8px 0 0",

                  color:
                    "#384333",

                  fontSize:
                    "clamp(29px, 4vw, 42px)",

                  lineHeight:
                    1.08,
                }}
              >
                Una cuenta, toda tu
                comunidad.
              </h2>

              <p
                style={{
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
                Crea tu perfil y empieza
                a estudiar, conectar,
                compartir y participar.
              </p>
            </div>
          </div>

          <div
            style={{
              display:
                "grid",

              gap:
                "10px",

              marginTop:
                "40px",

              color:
                "#5e6858",

              fontSize:
                "11px",
            }}
          >
            <span>
              🎓 Tu carrera y semestre
            </span>

            <span>
              🧩 Comparte tus habilidades
            </span>

            <span>
              🫂 Encuentra tu comunidad
            </span>

            <span>
              📚 Comparte y descubre recursos
            </span>
          </div>
        </aside>

        <section
          style={{
            padding:
              "38px 42px",
          }}
        >
          <div className="authOtter">
            🦦
          </div>

          <p
            className="authEyebrow"
            style={{
              marginTop:
                "12px",
            }}
          >
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
            Crea tu cuenta
          </h1>

          <p
            className="authDescription"
            style={{
              marginBottom:
                "25px",
            }}
          >
            Completa tus datos para
            entrar a la comunidad
            universitaria.
          </p>

          {!registroTerminado && (
            <form
              onSubmit={
                registrarse
              }
              className="authForm"
              style={{
                gap:
                  "16px",
              }}
            >
              <div
                className="registerFields"
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",

                  gap:
                    "14px",
                }}
              >
                <label>
                  Nombre

                  <input
                    type="text"
                    placeholder="¿Cómo te llamamos?"
                    value={
                      nombre
                    }
                    onChange={(e) =>
                      setNombre(
                        e.target.value
                      )
                    }
                    maxLength={
                      80
                    }
                    disabled={
                      cargando
                    }
                    required
                  />
                </label>

                <label>
                  Usuario

                  <div
                    style={{
                      position:
                        "relative",
                    }}
                  >
                    <span
                      style={{
                        position:
                          "absolute",

                        left:
                          "13px",

                        top:
                          "50%",

                        transform:
                          "translateY(-50%)",

                        color:
                          "#969188",

                        fontWeight:
                          700,

                        pointerEvents:
                          "none",
                      }}
                    >
                      @
                    </span>

                    <input
                      type="text"
                      placeholder="tuusuario"
                      value={
                        username
                      }
                      onChange={(e) =>
                        setUsername(
                          e.target.value
                        )
                      }
                      minLength={
                        3
                      }
                      maxLength={
                        30
                      }
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={
                        false
                      }
                      disabled={
                        cargando
                      }
                      style={{
                        paddingLeft:
                          "30px",
                      }}
                      required
                    />
                  </div>
                </label>

                <label
                  style={{
                    gridColumn:
                      "1 / -1",
                  }}
                >
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
                      placeholder="Mínimo 6 caracteres"
                      value={
                        password
                      }
                      onChange={(e) =>
                        setPassword(
                          e.target.value
                        )
                      }
                      minLength={
                        6
                      }
                      autoComplete="new-password"
                      disabled={
                        cargando
                      }
                      style={{
                        paddingRight:
                          "48px",
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
                      style={{
                        position:
                          "absolute",

                        right:
                          "9px",

                        top:
                          "50%",

                        transform:
                          "translateY(-50%)",

                        width:
                          "32px",

                        height:
                          "32px",

                        display:
                          "grid",

                        placeItems:
                          "center",

                        border:
                          0,

                        borderRadius:
                          "8px",

                        background:
                          "transparent",

                        cursor:
                          "pointer",
                      }}
                    >
                      {mostrarPassword
                        ? "🙈"
                        : "👁️"}
                    </button>
                  </div>
                </label>

                <label>
                  Confirmar contraseña

                  <input
                    type={
                      mostrarPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Repite tu contraseña"
                    value={
                      confirmarPassword
                    }
                    onChange={(e) =>
                      setConfirmarPassword(
                        e.target.value
                      )
                    }
                    autoComplete="new-password"
                    disabled={
                      cargando
                    }
                    style={{
                      borderColor:
                        passwordCoincide
                          ? undefined
                          : "#a75b51",
                    }}
                    required
                  />

                  {!passwordCoincide && (
                    <small
                      style={{
                        display:
                          "block",

                        marginTop:
                          "5px",

                        color:
                          "#a75b51",
                      }}
                    >
                      Las contraseñas no coinciden.
                    </small>
                  )}
                </label>

                <label>
                  Carrera

                  <select
                    value={
                      carrera
                    }
                    onChange={(e) =>
                      cambiarCarrera(
                        e.target.value
                      )
                    }
                    disabled={
                      cargando
                    }
                    required
                  >
                    <option value="">
                      Selecciona tu carrera
                    </option>

                    {CARRERAS.map(
                      (opcion) => (
                        <option
                          key={
                            opcion
                          }
                          value={
                            opcion
                          }
                        >
                          {opcion}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  Semestre

                  <select
                    value={
                      semestre
                    }
                    onChange={(e) =>
                      setSemestre(
                        e.target.value
                      )
                    }
                    disabled={
                      cargando ||
                      carrera ===
                        "Historia"
                    }
                    required
                  >
                    <option value="">
                      Selecciona tu semestre
                    </option>

                    {(carrera ===
                    "Historia"
                      ? [
                          "3.º semestre",
                        ]
                      : SEMESTRES
                    ).map(
                      (opcion) => (
                        <option
                          key={
                            opcion
                          }
                          value={
                            opcion
                          }
                        >
                          {opcion}
                        </option>
                      )
                    )}
                  </select>

                  {carrera ===
                    "Historia" && (
                    <small
                      style={{
                        display:
                          "block",

                        marginTop:
                          "5px",

                        color:
                          "#969188",

                        fontSize:
                          "10px",
                      }}
                    >
                      Historia actualmente
                      corresponde a 3.º semestre.
                    </small>
                  )}
                </label>
              </div>

              <div
                style={{
                  padding:
                    "11px 12px",

                  borderRadius:
                    "12px",

                  background:
                    "#f7f4ee",

                  color:
                    "#70746a",

                  fontSize:
                    "10px",

                  lineHeight:
                    1.55,
                }}
              >
                🔐 Tu contraseña debe tener
                al menos 6 caracteres.
                El usuario puede contener
                letras, números, puntos y
                guiones bajos.
              </div>

              {mensaje && (
                <div
                  className={`authMessage ${
                    tipoMensaje ===
                    "error"
                      ? "error"
                      : ""
                  }`}
                >
                  {mensaje}
                </div>
              )}

              <button
                type="submit"
                className="authButton"
                disabled={
                  !puedeRegistrarse ||
                  !passwordCoincide
                }
              >
                {cargando
                  ? "Creando tu cuenta..."
                  : "Crear mi cuenta"}
              </button>
            </form>
          )}

          {registroTerminado && (
            <div
              style={{
                marginTop:
                  "20px",

                padding:
                  "24px",

                borderRadius:
                  "18px",

                background:
                  "#f7f4ee",

                textAlign:
                  "center",
              }}
            >
              <div
                style={{
                  fontSize:
                    "38px",
                }}
              >
                📬
              </div>

              <h3
                style={{
                  margin:
                    "12px 0 7px",
                }}
              >
                Cuenta creada
              </h3>

              <p
                style={{
                  margin:
                    "0",

                  color:
                    "#70746a",

                  fontSize:
                    "12px",

                  lineHeight:
                    1.6,
                }}
              >
                {mensaje}
              </p>

              {!cargando && (
                <Link
                  href="/login"
                  className="authButton"
                  style={{
                    display:
                      "inline-flex",

                    justifyContent:
                      "center",

                    marginTop:
                      "18px",

                    textDecoration:
                      "none",
                  }}
                >
                  Ir a iniciar sesión
                </Link>
              )}
            </div>
          )}

          {!registroTerminado && (
            <p className="authFooter">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login">
                Inicia sesión
              </Link>
            </p>
          )}
        </section>
      </section>

      <style jsx>{`
        @media (max-width: 800px) {
          .registerGrid {
            grid-template-columns: 1fr !important;
          }

          .registerGrid > aside {
            padding: 26px !important;
          }

          .registerGrid > section {
            padding: 30px 24px 36px !important;
          }
        }

        @media (max-width: 600px) {
          .registerFields {
            grid-template-columns: 1fr !important;
          }

          .registerFields > label {
            grid-column: auto !important;
          }
        }

        @media (max-width: 480px) {
          .registerGrid > aside {
            padding: 22px !important;
          }

          .registerGrid > section {
            padding: 28px 20px 32px !important;
          }
        }
      `}</style>
    </main>
  );
}
