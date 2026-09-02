"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from "../../../lib/supabase/client";
import { requerirUsuario } from "../../../lib/auth";

type Perfil = {
  id: string;
  username: string | null;
  nombre: string | null;
  carrera: string | null;
  semestre: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export default function EditarPerfilPage() {
  const [
    userId,
    setUserId,
  ] = useState("");

  const [
    nombre,
    setNombre,
  ] = useState("");

  const [
    username,
    setUsername,
  ] = useState("");

  const [
    carrera,
    setCarrera,
  ] = useState("");

  const [
    semestre,
    setSemestre,
  ] = useState("");

  const [
    bio,
    setBio,
  ] = useState("");

  const [
    avatarActual,
    setAvatarActual,
  ] =
    useState<string | null>(
      null
    );

  const [
    avatarPreview,
    setAvatarPreview,
  ] =
    useState<string | null>(
      null
    );

  const [
    archivoAvatar,
    setArchivoAvatar,
  ] =
    useState<File | null>(
      null
    );

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  const [
    tipoMensaje,
    setTipoMensaje,
  ] =
    useState<
      "ok" | "error" | ""
    >("");

  useEffect(() => {
    let activo = true;

    async function cargarPerfil() {
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
            bio,
            avatar_url
          `)
          .eq(
            "id",
            user.id
          )
          .maybeSingle();

        if (!activo) {
          return;
        }

        if (error) {
          throw new Error(
            error.message
          );
        }

        if (!data) {
          throw new Error(
            "No encontramos tu perfil."
          );
        }

        const perfil =
          data as Perfil;

        setUserId(
          perfil.id
        );

        setNombre(
          perfil.nombre ||
            ""
        );

        setUsername(
          perfil.username ||
            ""
        );

        setCarrera(
          perfil.carrera ||
            ""
        );

        setSemestre(
          perfil.semestre ||
            ""
        );

        setBio(
          perfil.bio ||
            ""
        );

        setAvatarActual(
          perfil.avatar_url
        );
      } catch (error) {
        if (!activo) {
          return;
        }

        setMensaje(
          error instanceof Error
            ? `No pudimos cargar tu perfil: ${error.message}`
            : "No pudimos cargar tu perfil."
        );

        setTipoMensaje(
          "error"
        );
      } finally {
        if (activo) {
          setCargando(
            false
          );
        }
      }
    }

    cargarPerfil();

    return () => {
      activo = false;
    };
  }, []);

  /*
   * Libera la URL temporal usada
   * para previsualizar una imagen.
   */
  useEffect(() => {
    return () => {
      if (
        avatarPreview
      ) {
        URL.revokeObjectURL(
          avatarPreview
        );
      }
    };
  }, [avatarPreview]);

  function seleccionarAvatar(
    e: ChangeEvent<HTMLInputElement>
  ) {
    const archivo =
      e.target.files?.[0];

    if (!archivo) {
      return;
    }

    setMensaje("");
    setTipoMensaje("");

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !tiposPermitidos.includes(
        archivo.type
      )
    ) {
      setMensaje(
        "La imagen debe ser JPG, PNG o WebP."
      );

      setTipoMensaje(
        "error"
      );

      e.target.value =
        "";

      return;
    }

    const maximo =
      5 * 1024 * 1024;

    if (
      archivo.size >
      maximo
    ) {
      setMensaje(
        "La imagen no puede pesar más de 5 MB."
      );

      setTipoMensaje(
        "error"
      );

      e.target.value =
        "";

      return;
    }

    const preview =
      URL.createObjectURL(
        archivo
      );

    setArchivoAvatar(
      archivo
    );

    setAvatarPreview(
      preview
    );
  }

  async function guardarPerfil(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setGuardando(true);
    setMensaje("");
    setTipoMensaje("");

    const nombreLimpio =
      nombre.trim();

    const usernameLimpio =
      username
        .trim()
        .toLowerCase()
        .replace(/^@/, "");

    const bioLimpia =
      bio.trim();

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

      setGuardando(
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

      setGuardando(
        false
      );

      return;
    }

    if (
      usernameLimpio.length <
      3
    ) {
      setMensaje(
        "Tu usuario debe tener al menos 3 caracteres."
      );

      setTipoMensaje(
        "error"
      );

      setGuardando(
        false
      );

      return;
    }

    if (
      usernameLimpio.length >
      30
    ) {
      setMensaje(
        "Tu usuario no puede superar los 30 caracteres."
      );

      setTipoMensaje(
        "error"
      );

      setGuardando(
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

      setGuardando(
        false
      );

      return;
    }

    if (!carrera) {
      setMensaje(
        "Selecciona tu carrera."
      );

      setTipoMensaje(
        "error"
      );

      setGuardando(
        false
      );

      return;
    }

    if (!semestre) {
      setMensaje(
        "Selecciona tu semestre."
      );

      setTipoMensaje(
        "error"
      );

      setGuardando(
        false
      );

      return;
    }

    if (
      bioLimpia.length >
      240
    ) {
      setMensaje(
        "Tu bio no puede superar los 240 caracteres."
      );

      setTipoMensaje(
        "error"
      );

      setGuardando(
        false
      );

      return;
    }

    try {
      const user =
        await requerirUsuario();

      if (!user) {
        setGuardando(
          false
        );

        return;
      }

      const supabase =
        createClient();

      const {
        data:
          usuarioExistente,
        error:
          errorUsuario,
      } = await supabase
        .from("profiles")
        .select("id")
        .eq(
          "username",
          usernameLimpio
        )
        .neq(
          "id",
          user.id
        )
        .maybeSingle();

      if (
        errorUsuario
      ) {
        throw new Error(
          errorUsuario.message
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

        setGuardando(
          false
        );

        return;
      }

      let nuevaAvatarUrl =
        avatarActual;

      if (
        archivoAvatar
      ) {
        const extensionOriginal =
          archivoAvatar.name
            .split(".")
            .pop()
            ?.toLowerCase() ||
          "jpg";

        const extension =
          extensionOriginal ===
          "jpeg"
            ? "jpg"
            : extensionOriginal;

        const rutaArchivo =
          `${user.id}/avatar.${extension}`;

        const {
          error:
            errorSubida,
        } =
          await supabase.storage
            .from(
              "avatars"
            )
            .upload(
              rutaArchivo,
              archivoAvatar,
              {
                upsert:
                  true,

                contentType:
                  archivoAvatar.type,

                cacheControl:
                  "3600",
              }
            );

        if (
          errorSubida
        ) {
          throw new Error(
            `No pudimos subir tu foto: ${errorSubida.message}`
          );
        }

        const {
          data:
            urlData,
        } =
          supabase.storage
            .from(
              "avatars"
            )
            .getPublicUrl(
              rutaArchivo
            );

        nuevaAvatarUrl =
          `${urlData.publicUrl}?v=${Date.now()}`;
      }

      const {
        error:
          errorActualizar,
      } = await supabase
        .from("profiles")
        .update({
          nombre:
            nombreLimpio,

          username:
            usernameLimpio,

          carrera,

          semestre,

          bio:
            bioLimpia,

          avatar_url:
            nuevaAvatarUrl,
        })
        .eq(
          "id",
          user.id
        );

      if (
        errorActualizar
      ) {
        throw new Error(
          errorActualizar.message
        );
      }

      setAvatarActual(
        nuevaAvatarUrl
      );

      setArchivoAvatar(
        null
      );

      setAvatarPreview(
        null
      );

      setUsername(
        usernameLimpio
      );

      setNombre(
        nombreLimpio
      );

      setBio(
        bioLimpia
      );

      setMensaje(
        "Perfil actualizado correctamente 🦦"
      );

      setTipoMensaje(
        "ok"
      );

      setTimeout(() => {
        window.location.href =
          "/perfil";
      }, 700);
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? `No pudimos guardar los cambios: ${error.message}`
          : "No pudimos guardar los cambios."
      );

      setTipoMensaje(
        "error"
      );

      setGuardando(
        false
      );
    }
  }

  const imagenPerfil =
    avatarPreview ||
    avatarActual;

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            👤
          </span>

          <p className="loadingText">
            Preparando tu perfil...
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <Link
          href="/"
          className="brand"
        >
          <span className="logo">
            🦦
          </span>

          <div>
            <h1>
              Uniónutriita
            </h1>

            <p>
              Comunidad ENES Oaxaca
            </p>
          </div>
        </Link>

        <div className="topActions">
          <Link
            href="/buscar"
            className="circleButton"
            aria-label="Buscar"
            title="Buscar"
          >
            🔎
          </Link>

          <Link
            href="/notificaciones"
            className="circleButton"
            aria-label="Notificaciones"
            title="Notificaciones"
          >
            🔔
          </Link>

          <Link
            href="/perfil"
            className="profileButton profileLink"
            aria-label="Mi perfil"
            title="Mi perfil"
            style={{
              background:
                "#e5eedc",
            }}
          >
            👤
          </Link>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <p className="sidebarTitle">
            Explorar
          </p>

          <Link
            href="/"
            className="menuButton"
          >
            <span className="menuIcon">
              🏠
            </span>

            Inicio
          </Link>

          <Link
            href="/buscar"
            className="menuButton"
          >
            <span className="menuIcon">
              🔎
            </span>

            Buscar
          </Link>

          <Link
            href="/estudio"
            className="menuButton"
          >
            <span className="menuIcon">
              📚
            </span>

            Estudio
          </Link>

          <Link
            href="/comunidades"
            className="menuButton"
          >
            <span className="menuIcon">
              🫂
            </span>

            Comunidades
          </Link>

          <Link
            href="/eventos"
            className="menuButton"
          >
            <span className="menuIcon">
              🎉
            </span>

            Eventos
          </Link>

          <Link
            href="/conexiones"
            className="menuButton"
          >
            <span className="menuIcon">
              🤝
            </span>

            Conexiones
          </Link>

          <Link
            href="/guardados"
            className="menuButton"
          >
            <span className="menuIcon">
              🔖
            </span>

            Guardados
          </Link>

          <Link
            href="/social"
            className="menuButton"
          >
            <span className="menuIcon">
              🌿
            </span>

            Social
          </Link>

          <p
            className="sidebarTitle"
            style={{
              marginTop:
                "24px",
            }}
          >
            Tu cuenta
          </p>

          <Link
            href="/notificaciones"
            className="menuButton"
          >
            <span className="menuIcon">
              🔔
            </span>

            Notificaciones
          </Link>

          <Link
            href="/perfil"
            className="menuButton selected"
          >
            <span className="menuIcon">
              👤
            </span>

            Mi perfil
          </Link>

          <div className="otterCard">
            <span className="bigOtter">
              ✏️
            </span>

            <div>
              <strong>
                Tu identidad
              </strong>

              <p>
                Personaliza tu perfil
              </p>
            </div>
          </div>
        </aside>

        <main className="content">
          <section className="welcome">
            <div>
              <p className="tiny">
                TU CUENTA
              </p>

              <h2>
                Editar perfil ✏️
              </h2>

              <p>
                Actualiza tu foto,
                nombre, usuario e
                información académica
                para que la comunidad
                pueda conocerte mejor.
              </p>
            </div>

            <div className="welcomeOtter">
              👤
            </div>
          </section>

          <div
            style={{
              display:
                "flex",

              gap:
                "8px",

              flexWrap:
                "wrap",

              marginTop:
                "20px",
            }}
          >
            <Link
              href="/perfil"
              className="backHomeButton"
            >
              ← Mi perfil
            </Link>

            {username && (
              <Link
                href={`/u/${username
                  .trim()
                  .toLowerCase()
                  .replace(
                    /^@/,
                    ""
                  )}`}
                className="backHomeButton"
              >
                👁 Ver perfil público
              </Link>
            )}
          </div>

          {mensaje && (
            <div
              className={
                tipoMensaje ===
                "error"
                  ? "errorBox"
                  : "card"
              }
              style={{
                marginTop:
                  "18px",

                ...(tipoMensaje ===
                "ok"
                  ? {
                      background:
                        "#e5eedc",

                      color:
                        "#506347",

                      fontWeight:
                        700,
                    }
                  : {}),
              }}
            >
              {mensaje}
            </div>
          )}

          <section
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "minmax(0, 1.45fr) minmax(260px, 0.75fr)",

              gap:
                "14px",

              marginTop:
                "22px",

              paddingBottom:
                "60px",
            }}
            className="editProfileGrid"
          >
            <section
              className="card"
              style={{
                padding:
                  "24px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "space-between",

                  gap:
                    "12px",

                  flexWrap:
                    "wrap",

                  marginBottom:
                    "20px",
                }}
              >
                <div>
                  <p className="tiny">
                    INFORMACIÓN
                  </p>

                  <h3
                    style={{
                      margin:
                        "6px 0 0",
                    }}
                  >
                    Datos de tu perfil
                  </h3>
                </div>

                <span
                  className="cardIcon"
                  style={{
                    fontSize:
                      "23px",
                  }}
                >
                  ✏️
                </span>
              </div>

              <form
                onSubmit={
                  guardarPerfil
                }
                className="authForm"
                style={{
                  gap:
                    "17px",
                }}
              >
                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",

                    gap:
                      "14px",
                  }}
                >
                  <label>
                    <span
                      style={{
                        display:
                          "flex",

                        justifyContent:
                          "space-between",

                        gap:
                          "10px",
                      }}
                    >
                      <span>
                        Nombre
                      </span>

                      <small
                        style={{
                          color:
                            "#969188",
                        }}
                      >
                        {nombre.length}
                        /80
                      </small>
                    </span>

                    <input
                      type="text"
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
                      placeholder="Tu nombre"
                      required
                    />
                  </label>

                  <label>
                    <span
                      style={{
                        display:
                          "flex",

                        justifyContent:
                          "space-between",

                        gap:
                          "10px",
                      }}
                    >
                      <span>
                        Usuario
                      </span>

                      <small
                        style={{
                          color:
                            "#969188",
                        }}
                      >
                        {username.length}
                        /30
                      </small>
                    </span>

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
                        placeholder="usuario"
                        style={{
                          paddingLeft:
                            "30px",
                        }}
                        required
                      />
                    </div>

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

                        lineHeight:
                          1.4,
                      }}
                    >
                      Letras, números,
                      puntos y guiones
                      bajos.
                    </small>
                  </label>

                  <label>
                    Carrera

                    <select
                      value={
                        carrera
                      }
                      onChange={(e) =>
                        setCarrera(
                          e.target.value
                        )
                      }
                      required
                    >
                      <option value="">
                        Selecciona tu carrera
                      </option>

                      <option value="Administración">
                        Administración
                      </option>

                      <option value="Contabilidad">
                        Contabilidad
                      </option>

                      <option value="Negocios Internacionales">
                        Negocios Internacionales
                      </option>

                      <option value="Historia">
                        Historia
                      </option>
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
                      required
                    >
                      <option value="">
                        Selecciona tu semestre
                      </option>

                      <option value="Nuevo ingreso">
                        Nuevo ingreso
                      </option>

                      <option value="3.º semestre">
                        3.º semestre
                      </option>

                      <option value="5.º semestre">
                        5.º semestre
                      </option>

                      <option value="7.º semestre">
                        7.º semestre
                      </option>
                    </select>
                  </label>
                </div>

                <label>
                  <span
                    style={{
                      display:
                        "flex",

                      justifyContent:
                        "space-between",

                      gap:
                        "10px",
                    }}
                  >
                    <span>
                      Biografía
                    </span>

                    <small
                      style={{
                        color:
                          bio.length >
                          220
                            ? "#a75b51"
                            : "#969188",
                      }}
                    >
                      {bio.length}
                      /240
                    </small>
                  </span>

                  <textarea
                    value={
                      bio
                    }
                    onChange={(e) =>
                      setBio(
                        e.target.value
                      )
                    }
                    placeholder="Cuéntale algo a la comunidad..."
                    maxLength={
                      240
                    }
                    rows={
                      5
                    }
                  />
                </label>

                <div
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "space-between",

                    gap:
                      "10px",

                    flexWrap:
                      "wrap",

                    marginTop:
                      "4px",
                  }}
                >
                  <Link
                    href="/perfil"
                    className="backHomeButton"
                  >
                    Cancelar
                  </Link>

                  <button
                    type="submit"
                    className="authButton"
                    disabled={
                      guardando
                    }
                    style={{
                      width:
                        "auto",

                      minWidth:
                        "170px",
                    }}
                  >
                    {guardando
                      ? "Guardando cambios..."
                      : "Guardar cambios"}
                  </button>
                </div>
              </form>
            </section>

            <aside
              className="card"
              style={{
                padding:
                  "22px",

                alignSelf:
                  "start",
              }}
            >
              <p className="tiny">
                FOTO DE PERFIL
              </p>

              <h3
                style={{
                  margin:
                    "6px 0 5px",
                }}
              >
                Tu avatar
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
                    1.55,
                }}
              >
                Esta imagen aparecerá
                en publicaciones,
                comentarios, perfiles
                y otras zonas de la
                comunidad.
              </p>

              <div
                className="avatarEditor"
                style={{
                  marginTop:
                    "20px",
                }}
              >
                <div
                  className="profileAvatar"
                  style={{
                    width:
                      "118px",

                    height:
                      "118px",
                  }}
                >
                  {imagenPerfil ? (
                    <img
                      src={
                        imagenPerfil
                      }
                      alt="Vista previa del avatar"
                    />
                  ) : (
                    <span>
                      🦦
                    </span>
                  )}
                </div>

                <label
                  className="avatarUploadButton"
                  style={{
                    cursor:
                      guardando
                        ? "not-allowed"
                        : "pointer",

                    opacity:
                      guardando
                        ? 0.6
                        : 1,
                  }}
                >
                  📷 Cambiar foto

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={
                      seleccionarAvatar
                    }
                    disabled={
                      guardando
                    }
                    hidden
                  />
                </label>

                <p className="avatarHelp">
                  JPG, PNG o WebP · máximo 5 MB
                </p>

                {archivoAvatar && (
                  <div
                    style={{
                      width:
                        "100%",

                      padding:
                        "10px",

                      borderRadius:
                        "11px",

                      background:
                        "#e5eedc",

                      color:
                        "#506347",

                      fontSize:
                        "10px",

                      lineHeight:
                        1.45,

                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    ✓ Nueva foto
                    seleccionada
                    <br />

                    <strong>
                      {
                        archivoAvatar.name
                      }
                    </strong>
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop:
                    "22px",

                  paddingTop:
                    "18px",

                  borderTop:
                    "1px solid #eee7dc",
                }}
              >
                <p className="tiny">
                  VISTA PREVIA
                </p>

                <div
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "center",

                    gap:
                      "10px",

                    marginTop:
                      "12px",
                  }}
                >
                  <div
                    className="avatar"
                    style={{
                      width:
                        "42px",

                      height:
                        "42px",
                    }}
                  >
                    {imagenPerfil ? (
                      <img
                        src={
                          imagenPerfil
                        }
                        alt="Avatar"
                      />
                    ) : (
                      <span>
                        🦦
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      minWidth:
                        0,
                    }}
                  >
                    <strong
                      style={{
                        display:
                          "block",

                        fontSize:
                          "12px",

                        overflowWrap:
                          "anywhere",
                      }}
                    >
                      {nombre.trim() ||
                        "Tu nombre"}
                    </strong>

                    <p
                      style={{
                        margin:
                          "2px 0 0",

                        color:
                          "#969188",

                        fontSize:
                          "10px",

                        overflowWrap:
                          "anywhere",
                      }}
                    >
                      @
                      {username
                        .trim()
                        .toLowerCase()
                        .replace(
                          /^@/,
                          ""
                        ) ||
                        "usuario"}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display:
                      "flex",

                    gap:
                      "5px",

                    flexWrap:
                      "wrap",

                    marginTop:
                      "12px",
                  }}
                >
                  {carrera && (
                    <span
                      style={{
                        padding:
                          "5px 7px",

                        borderRadius:
                          "999px",

                        background:
                          "#e5eedc",

                        color:
                          "#506347",

                        fontSize:
                          "9px",

                        fontWeight:
                          700,
                      }}
                    >
                      🎓 {carrera}
                    </span>
                  )}

                  {semestre && (
                    <span
                      style={{
                        padding:
                          "5px 7px",

                        borderRadius:
                          "999px",

                        background:
                          "#f3f0e8",

                        color:
                          "#686e63",

                        fontSize:
                          "9px",

                        fontWeight:
                          700,
                      }}
                    >
                      📖 {semestre}
                    </span>
                  )}
                </div>

                {bio.trim() && (
                  <p
                    style={{
                      margin:
                        "12px 0 0",

                      color:
                        "#70746a",

                      fontSize:
                        "10px",

                      lineHeight:
                        1.55,

                      whiteSpace:
                        "pre-wrap",

                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    {bio}
                  </p>
                )}
              </div>

              {userId && (
                <div
                  style={{
                    marginTop:
                      "20px",

                    padding:
                      "10px 11px",

                    borderRadius:
                      "11px",

                    background:
                      "#f7f4ee",

                    color:
                      "#969188",

                    fontSize:
                      "10px",

                    textAlign:
                      "center",
                  }}
                >
                  🦦 Perfil de
                  Uniónutriita
                </div>
              )}
            </aside>
          </section>
        </main>
      </div>

      <nav className="mobileNav">
        <Link href="/">
          <span>
            🏠
          </span>

          <span>
            Inicio
          </span>
        </Link>

        <Link href="/buscar">
          <span>
            🔎
          </span>

          <span>
            Buscar
          </span>
        </Link>

        <Link href="/publicar">
          <span>
            ➕
          </span>

          <span>
            Publicar
          </span>
        </Link>

        <Link href="/notificaciones">
          <span>
            🔔
          </span>

          <span>
            Actividad
          </span>
        </Link>

        <Link
          href="/perfil"
          className="active"
        >
          <span>
            👤
          </span>

          <span>
            Perfil
          </span>
        </Link>
      </nav>

      <style jsx>{`
        @media (max-width: 850px) {
          .editProfileGrid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
