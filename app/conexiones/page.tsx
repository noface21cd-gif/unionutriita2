"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from "../../lib/supabase/client";
import { requerirUsuario } from "../../lib/auth";

type Perfil = {
  id: string;
  username: string | null;
  nombre: string | null;
  carrera: string | null;
  semestre: string | null;
  avatar_url: string | null;
};

type Conexion = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status:
    | "pending"
    | "accepted";
  created_at: string;
};

type Habilidad = {
  id: string;
  user_id: string;
  skill: string;
  nivel:
    | "Básico"
    | "Intermedio"
    | "Avanzado";
  created_at: string;
};

type Nivel =
  | "Básico"
  | "Intermedio"
  | "Avanzado";

export default function ConexionesPage() {
  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [
    perfiles,
    setPerfiles,
  ] = useState<Perfil[]>([]);

  const [
    conexiones,
    setConexiones,
  ] = useState<Conexion[]>([]);

  const [
    habilidades,
    setHabilidades,
  ] = useState<Habilidad[]>([]);

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  const [
    nuevaHabilidad,
    setNuevaHabilidad,
  ] = useState("");

  const [
    nivel,
    setNivel,
  ] = useState<Nivel>(
    "Intermedio"
  );

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    guardandoHabilidad,
    setGuardandoHabilidad,
  ] = useState(false);

  const [
    procesandoConexion,
    setProcesandoConexion,
  ] = useState<string | null>(
    null
  );

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  async function cargarTodo(
    usuarioId?: string
  ) {
    const supabase =
      createClient();

    const miId =
      usuarioId ||
      currentUserId;

    const [
      perfilesResultado,
      conexionesResultado,
      habilidadesResultado,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(`
          id,
          username,
          nombre,
          carrera,
          semestre,
          avatar_url
        `)
        .order(
          "nombre",
          {
            ascending: true,
          }
        ),

      supabase
        .from("connections")
        .select(`
          id,
          requester_id,
          receiver_id,
          status,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending: false,
          }
        ),

      supabase
        .from("profile_skills")
        .select(`
          id,
          user_id,
          skill,
          nivel,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending: false,
          }
        ),
    ]);

    if (
      perfilesResultado.error
    ) {
      throw new Error(
        perfilesResultado
          .error.message
      );
    }

    if (
      conexionesResultado.error
    ) {
      throw new Error(
        conexionesResultado
          .error.message
      );
    }

    if (
      habilidadesResultado.error
    ) {
      throw new Error(
        habilidadesResultado
          .error.message
      );
    }

    setPerfiles(
      (
        perfilesResultado.data ||
        []
      ).filter(
        (perfil) =>
          perfil.id !== miId
      ) as Perfil[]
    );

    setConexiones(
      (conexionesResultado.data ||
        []) as Conexion[]
    );

    setHabilidades(
      (habilidadesResultado.data ||
        []) as Habilidad[]
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

        setCurrentUserId(
          user.id
        );

        await cargarTodo(
          user.id
        );
      } catch (error) {
        if (!activo) {
          return;
        }

        setMensaje(
          error instanceof Error
            ? error.message
            : "No pudimos cargar las conexiones."
        );
      } finally {
        if (activo) {
          setCargando(
            false
          );
        }
      }
    }

    iniciar();

    return () => {
      activo = false;
    };
  }, []);

  function habilidadesDe(
    userId: string
  ) {
    return habilidades.filter(
      (habilidad) =>
        habilidad.user_id ===
        userId
    );
  }

  function conexionCon(
    userId: string
  ) {
    return (
      conexiones.find(
        (conexion) =>
          (
            conexion.requester_id ===
              currentUserId &&
            conexion.receiver_id ===
              userId
          ) ||
          (
            conexion.requester_id ===
              userId &&
            conexion.receiver_id ===
              currentUserId
          )
      ) || null
    );
  }

  async function agregarHabilidad(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const skill =
      nuevaHabilidad.trim();

    if (
      !skill ||
      !currentUserId
    ) {
      return;
    }

    setGuardandoHabilidad(
      true
    );

    setMensaje("");

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from("profile_skills")
          .insert({
            user_id:
              currentUserId,

            skill,

            nivel,
          });

      if (error) {
        if (
          error.code ===
          "23505"
        ) {
          throw new Error(
            "Ya agregaste esa habilidad."
          );
        }

        throw new Error(
          error.message
        );
      }

      setNuevaHabilidad("");

      await cargarTodo();
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No pudimos guardar la habilidad."
      );
    } finally {
      setGuardandoHabilidad(
        false
      );
    }
  }

  async function eliminarHabilidad(
    habilidadId: string
  ) {
    const confirmar =
      window.confirm(
        "¿Eliminar esta habilidad de tu perfil?"
      );

    if (!confirmar) {
      return;
    }

    const supabase =
      createClient();

    const { error } =
      await supabase
        .from("profile_skills")
        .delete()
        .eq(
          "id",
          habilidadId
        )
        .eq(
          "user_id",
          currentUserId
        );

    if (error) {
      alert(
        error.message
      );

      return;
    }

    setHabilidades(
      (actuales) =>
        actuales.filter(
          (habilidad) =>
            habilidad.id !==
            habilidadId
        )
    );
  }

  async function conectar(
    perfilId: string
  ) {
    setProcesandoConexion(
      perfilId
    );

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from("connections")
          .insert({
            requester_id:
              currentUserId,

            receiver_id:
              perfilId,

            status:
              "pending",
          });

      if (error) {
        throw new Error(
          error.message
        );
      }

      await cargarTodo();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos enviar la solicitud."
      );
    } finally {
      setProcesandoConexion(
        null
      );
    }
  }

  async function aceptar(
    conexion: Conexion
  ) {
    setProcesandoConexion(
      conexion.id
    );

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from("connections")
          .update({
            status:
              "accepted",
          })
          .eq(
            "id",
            conexion.id
          )
          .eq(
            "receiver_id",
            currentUserId
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      await cargarTodo();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos aceptar la conexión."
      );
    } finally {
      setProcesandoConexion(
        null
      );
    }
  }

  async function eliminarConexion(
    conexion: Conexion
  ) {
    const texto =
      conexion.status ===
      "accepted"
        ? "¿Eliminar esta conexión?"
        : conexion.requester_id ===
            currentUserId
        ? "¿Cancelar esta solicitud?"
        : "¿Rechazar esta solicitud?";

    const confirmar =
      window.confirm(texto);

    if (!confirmar) {
      return;
    }

    setProcesandoConexion(
      conexion.id
    );

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from("connections")
          .delete()
          .eq(
            "id",
            conexion.id
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      await cargarTodo();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos eliminar la conexión."
      );
    } finally {
      setProcesandoConexion(
        null
      );
    }
  }

  const misHabilidades =
    useMemo(
      () =>
        habilidades.filter(
          (habilidad) =>
            habilidad.user_id ===
            currentUserId
        ),
      [
        habilidades,
        currentUserId,
      ]
    );

  const solicitudesRecibidas =
    useMemo(
      () =>
        conexiones.filter(
          (conexion) =>
            conexion.status ===
              "pending" &&
            conexion.receiver_id ===
              currentUserId
        ),
      [
        conexiones,
        currentUserId,
      ]
    );

  const solicitudesEnviadas =
    useMemo(
      () =>
        conexiones.filter(
          (conexion) =>
            conexion.status ===
              "pending" &&
            conexion.requester_id ===
              currentUserId
        ),
      [
        conexiones,
        currentUserId,
      ]
    );

  const conexionesAceptadas =
    useMemo(
      () =>
        conexiones.filter(
          (conexion) =>
            conexion.status ===
              "accepted" &&
            (
              conexion.requester_id ===
                currentUserId ||
              conexion.receiver_id ===
                currentUserId
            )
        ),
      [
        conexiones,
        currentUserId,
      ]
    );

  const perfilesFiltrados =
    useMemo(() => {
      const texto =
        busqueda
          .trim()
          .toLowerCase();

      if (!texto) {
        return perfiles;
      }

      return perfiles.filter(
        (perfil) => {
          const skills =
            habilidades
              .filter(
                (habilidad) =>
                  habilidad.user_id ===
                  perfil.id
              )
              .map(
                (habilidad) =>
                  `${habilidad.skill} ${habilidad.nivel}`
              )
              .join(" ");

          const contenido = [
            perfil.nombre,
            perfil.username,
            perfil.carrera,
            perfil.semestre,
            skills,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return contenido.includes(
            texto
          );
        }
      );
    }, [
      perfiles,
      habilidades,
      busqueda,
    ]);

  function perfilPorId(
    id: string
  ) {
    return perfiles.find(
      (perfil) =>
        perfil.id === id
    );
  }

  function colorNivel(
    nivelSkill: Nivel
  ) {
    if (
      nivelSkill ===
      "Avanzado"
    ) {
      return {
        background:
          "#e5eedc",
        color:
          "#506347",
      };
    }

    if (
      nivelSkill ===
      "Intermedio"
    ) {
      return {
        background:
          "#f8e7c7",
        color:
          "#715d3d",
      };
    }

    return {
      background:
        "#f3f0e8",
      color:
        "#686e63",
    };
  }

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            🤝
          </span>

          <p className="loadingText">
            Buscando talento universitario...
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
            className="menuButton selected"
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

          <div className="otterCard">
            <span className="bigOtter">
              🤝
            </span>

            <div>
              <strong>
                Red universitaria
              </strong>

              <p>
                Talento encuentra talento
              </p>
            </div>
          </div>
        </aside>

        <main className="content">
          <section className="welcome">
            <div>
              <p className="tiny">
                RED UNIVERSITARIA
              </p>

              <h2>
                Conexiones 🤝
              </h2>

              <p>
                Encuentra estudiantes
                por carrera, semestre
                o habilidades y crea
                una red para colaborar,
                aprender y trabajar
                juntos.
              </p>
            </div>

            <div className="welcomeOtter">
              🤝
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(145px, 1fr))",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            <article className="card">
              <p className="tiny">
                CONEXIONES
              </p>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                  fontSize: "25px",
                }}
              >
                {
                  conexionesAceptadas.length
                }
              </strong>

              <p>
                contactos en tu red
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                SOLICITUDES
              </p>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                  fontSize: "25px",
                }}
              >
                {
                  solicitudesRecibidas.length
                }
              </strong>

              <p>
                pendientes por responder
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                ENVIADAS
              </p>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                  fontSize: "25px",
                }}
              >
                {
                  solicitudesEnviadas.length
                }
              </strong>

              <p>
                solicitudes esperando
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                HABILIDADES
              </p>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                  fontSize: "25px",
                }}
              >
                {
                  misHabilidades.length
                }
              </strong>

              <p>
                agregadas a tu perfil
              </p>
            </article>
          </section>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginTop: "20px",
            }}
          >
            <Link
              href="/"
              className="backHomeButton"
            >
              ← Inicio
            </Link>

            <Link
              href="/perfil"
              className="backHomeButton"
            >
              👤 Mi perfil
            </Link>
          </div>

          <section
            className="card"
            style={{
              maxWidth: "950px",
              marginTop: "22px",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems:
                  "flex-start",
                justifyContent:
                  "space-between",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <p className="tiny">
                  TU PERFIL PROFESIONAL
                </p>

                <h2
                  style={{
                    margin:
                      "6px 0 5px",
                  }}
                >
                  Mis habilidades
                </h2>

                <p
                  style={{
                    maxWidth:
                      "620px",
                    margin: 0,
                    color:
                      "#70746a",
                    fontSize:
                      "13px",
                    lineHeight: 1.55,
                  }}
                >
                  Agrega conocimientos,
                  herramientas o
                  capacidades para que
                  otros estudiantes
                  puedan encontrarte.
                </p>
              </div>

              <div
                className="cardIcon"
                style={{
                  fontSize: "23px",
                }}
              >
                🧩
              </div>
            </div>

            <form
              onSubmit={
                agregarHabilidad
              }
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(180px, 1fr) minmax(150px, 190px) auto",
                gap: "9px",
                marginTop: "20px",
              }}
            >
              <input
                value={
                  nuevaHabilidad
                }
                onChange={(e) =>
                  setNuevaHabilidad(
                    e.target.value
                  )
                }
                placeholder="Ej. Excel, Diseño, Inglés..."
                maxLength={50}
                required
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding:
                    "10px 13px",
                  border:
                    "1px solid #d5ccbd",
                  borderRadius:
                    "13px",
                  outline: "none",
                  background:
                    "#f6f3ec",
                }}
              />

              <select
                value={nivel}
                onChange={(e) =>
                  setNivel(
                    e.target
                      .value as Nivel
                  )
                }
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding:
                    "10px 12px",
                  border:
                    "1px solid #d5ccbd",
                  borderRadius:
                    "13px",
                  outline: "none",
                  background:
                    "#f6f3ec",
                  color:
                    "#30352d",
                }}
              >
                <option value="Básico">
                  Básico
                </option>

                <option value="Intermedio">
                  Intermedio
                </option>

                <option value="Avanzado">
                  Avanzado
                </option>
              </select>

              <button
                type="submit"
                className="primaryButton"
                disabled={
                  guardandoHabilidad
                }
              >
                {guardandoHabilidad
                  ? "Guardando..."
                  : "＋ Agregar"}
              </button>
            </form>

            {mensaje && (
              <div
                className="errorBox"
                style={{
                  marginTop:
                    "14px",
                }}
              >
                {mensaje}
              </div>
            )}

            <div
              style={{
                marginTop: "20px",
              }}
            >
              <p
                style={{
                  margin:
                    "0 0 9px",
                  color:
                    "#969188",
                  fontSize:
                    "11px",
                  fontWeight: 800,
                }}
              >
                HABILIDADES AGREGADAS
              </p>

              {misHabilidades.length ===
              0 ? (
                <div
                  style={{
                    padding:
                      "15px",
                    border:
                      "1px dashed #d8d0c3",
                    borderRadius:
                      "14px",
                    color:
                      "#969188",
                    fontSize:
                      "12px",
                  }}
                >
                  🧩 Todavía no has
                  agregado habilidades.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    gap: "7px",
                    flexWrap: "wrap",
                  }}
                >
                  {misHabilidades.map(
                    (habilidad) => {
                      const colores =
                        colorNivel(
                          habilidad.nivel
                        );

                      return (
                        <div
                          key={
                            habilidad.id
                          }
                          style={{
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            gap: "6px",
                            padding:
                              "7px 8px 7px 10px",
                            border:
                              "1px solid #e5ddcf",
                            borderRadius:
                              "999px",
                            background:
                              colores.background,
                            color:
                              colores.color,
                            fontSize:
                              "11px",
                            fontWeight:
                              700,
                          }}
                        >
                          <span>
                            🧩{" "}
                            {
                              habilidad.skill
                            }
                          </span>

                          <small>
                            {
                              habilidad.nivel
                            }
                          </small>

                          <button
                            type="button"
                            onClick={() =>
                              eliminarHabilidad(
                                habilidad.id
                              )
                            }
                            title="Eliminar habilidad"
                            aria-label={`Eliminar ${habilidad.skill}`}
                            style={{
                              width:
                                "22px",
                              height:
                                "22px",
                              display:
                                "grid",
                              placeItems:
                                "center",
                              border: 0,
                              borderRadius:
                                "50%",
                              background:
                                "rgba(255,255,255,0.55)",
                              color:
                                "inherit",
                              fontWeight:
                                900,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </section>

          {solicitudesRecibidas.length >
            0 && (
            <section
              style={{
                marginTop: "30px",
              }}
            >
              <div className="sectionHeader">
                <p className="tiny">
                  SOLICITUDES
                </p>

                <h2>
                  Quieren conectar contigo
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "10px",
                  maxWidth: "950px",
                }}
              >
                {solicitudesRecibidas.map(
                  (conexion) => {
                    const perfil =
                      perfilPorId(
                        conexion.requester_id
                      );

                    if (!perfil) {
                      return null;
                    }

                    const skills =
                      habilidadesDe(
                        perfil.id
                      ).slice(
                        0,
                        3
                      );

                    const procesando =
                      procesandoConexion ===
                        conexion.id;

                    return (
                      <article
                        key={
                          conexion.id
                        }
                        className="card"
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "space-between",
                            gap: "14px",
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <Link
                            href={`/u/${perfil.username}`}
                            style={{
                              minWidth:
                                "200px",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: "12px",
                              color:
                                "inherit",
                              textDecoration:
                                "none",
                            }}
                          >
                            <div
                              className="avatar"
                              style={{
                                width:
                                  "48px",
                                height:
                                  "48px",
                              }}
                            >
                              {perfil.avatar_url ? (
                                <img
                                  src={
                                    perfil.avatar_url
                                  }
                                  alt={
                                    perfil.nombre ||
                                    "Usuario"
                                  }
                                />
                              ) : (
                                <span>
                                  🦦
                                </span>
                              )}
                            </div>

                            <div>
                              <strong>
                                {perfil.nombre ||
                                  "Estudiante"}
                              </strong>

                              <p
                                style={{
                                  margin:
                                    "3px 0",
                                  color:
                                    "#969188",
                                  fontSize:
                                    "11px",
                                }}
                              >
                                @
                                {perfil.username ||
                                  "usuario"}
                              </p>

                              <p
                                style={{
                                  margin: 0,
                                  color:
                                    "#70746a",
                                  fontSize:
                                    "11px",
                                }}
                              >
                                {perfil.carrera ||
                                  "Sin carrera"}

                                {" · "}

                                {perfil.semestre ||
                                  "Sin semestre"}
                              </p>
                            </div>
                          </Link>

                          {skills.length >
                            0 && (
                            <div
                              style={{
                                display:
                                  "flex",
                                gap: "5px",
                                flexWrap:
                                  "wrap",
                              }}
                            >
                              {skills.map(
                                (
                                  skill
                                ) => (
                                  <span
                                    key={
                                      skill.id
                                    }
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
                                        "10px",
                                    }}
                                  >
                                    {
                                      skill.skill
                                    }
                                  </span>
                                )
                              )}
                            </div>
                          )}

                          <div
                            style={{
                              display:
                                "flex",
                              gap: "7px",
                              flexWrap:
                                "wrap",
                            }}
                          >
                            <button
                              type="button"
                              className="primaryButton"
                              disabled={
                                procesando
                              }
                              onClick={() =>
                                aceptar(
                                  conexion
                                )
                              }
                            >
                              {procesando
                                ? "Procesando..."
                                : "✓ Aceptar"}
                            </button>

                            <button
                              type="button"
                              className="logoutButton"
                              disabled={
                                procesando
                              }
                              onClick={() =>
                                eliminarConexion(
                                  conexion
                                )
                              }
                            >
                              Rechazar
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            </section>
          )}

          <section
            style={{
              marginTop: "32px",
              paddingBottom: "60px",
            }}
          >
            <div className="sectionHeader">
              <p className="tiny">
                DESCUBRIR PERSONAS
              </p>

              <h2>
                Encuentra compañeros
              </h2>
            </div>

            <div
              className="card"
              style={{
                padding: "14px",
                marginBottom: "14px",
              }}
            >
              <div
                className="searchBox"
                style={{
                  width: "100%",
                }}
              >
                <span>
                  🔎
                </span>

                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) =>
                    setBusqueda(
                      e.target.value
                    )
                  }
                  placeholder="Busca Excel, Contabilidad, Programación, Inglés..."
                />
              </div>

              <p
                style={{
                  margin:
                    "10px 2px 0",
                  color:
                    "#969188",
                  fontSize:
                    "11px",
                  lineHeight: 1.5,
                }}
              >
                Puedes buscar por
                nombre, usuario,
                carrera, semestre,
                habilidad o nivel.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "14px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#70746a",
                  fontSize: "12px",
                }}
              >
                Mostrando{" "}
                <strong>
                  {
                    perfilesFiltrados.length
                  }
                </strong>{" "}
                de{" "}
                <strong>
                  {perfiles.length}
                </strong>{" "}
                estudiantes
              </p>

              {busqueda && (
                <span
                  className="tag"
                  style={{
                    marginTop: 0,
                  }}
                >
                  🔎 Búsqueda activa
                </span>
              )}
            </div>

            {perfilesFiltrados.length ===
            0 ? (
              <div className="emptyState">
                <span className="emptyStateIcon">
                  🔎
                </span>

                <strong>
                  No encontramos estudiantes
                </strong>

                <p
                  style={{
                    marginBottom: 0,
                  }}
                >
                  Prueba con otra carrera,
                  nombre o habilidad.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(290px, 1fr))",
                  gap: "14px",
                }}
              >
                {perfilesFiltrados.map(
                  (perfil) => {
                    const skills =
                      habilidadesDe(
                        perfil.id
                      );

                    const conexion =
                      conexionCon(
                        perfil.id
                      );

                    const recibida =
                      conexion?.status ===
                        "pending" &&
                      conexion.receiver_id ===
                        currentUserId;

                    const enviada =
                      conexion?.status ===
                        "pending" &&
                      conexion.requester_id ===
                        currentUserId;

                    const aceptada =
                      conexion?.status ===
                      "accepted";

                    const procesando =
                      procesandoConexion ===
                        perfil.id ||
                      procesandoConexion ===
                        conexion?.id;

                    return (
                      <article
                        key={perfil.id}
                        className="card"
                        style={{
                          display: "flex",
                          flexDirection:
                            "column",
                          minHeight:
                            "320px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems:
                              "flex-start",
                            justifyContent:
                              "space-between",
                            gap: "10px",
                          }}
                        >
                          <Link
                            href={`/u/${perfil.username}`}
                            style={{
                              minWidth: 0,
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: "12px",
                              color:
                                "inherit",
                              textDecoration:
                                "none",
                            }}
                          >
                            <div
                              className="avatar"
                              style={{
                                width:
                                  "52px",
                                height:
                                  "52px",
                              }}
                            >
                              {perfil.avatar_url ? (
                                <img
                                  src={
                                    perfil.avatar_url
                                  }
                                  alt={
                                    perfil.nombre ||
                                    "Usuario"
                                  }
                                />
                              ) : (
                                <span>
                                  🦦
                                </span>
                              )}
                            </div>

                            <div
                              style={{
                                minWidth: 0,
                              }}
                            >
                              <strong>
                                {perfil.nombre ||
                                  "Estudiante"}
                              </strong>

                              <p
                                style={{
                                  margin:
                                    "3px 0 0",
                                  color:
                                    "#969188",
                                  fontSize:
                                    "11px",
                                  overflowWrap:
                                    "anywhere",
                                }}
                              >
                                @
                                {perfil.username ||
                                  "usuario"}
                              </p>
                            </div>
                          </Link>

                          {aceptada && (
                            <span
                              style={{
                                flexShrink: 0,
                                padding:
                                  "5px 8px",
                                borderRadius:
                                  "999px",
                                background:
                                  "#e5eedc",
                                color:
                                  "#506347",
                                fontSize:
                                  "10px",
                                fontWeight:
                                  800,
                              }}
                            >
                              ✓ Conectados
                            </span>
                          )}

                          {enviada && (
                            <span
                              style={{
                                flexShrink: 0,
                                padding:
                                  "5px 8px",
                                borderRadius:
                                  "999px",
                                background:
                                  "#f8e7c7",
                                color:
                                  "#715d3d",
                                fontSize:
                                  "10px",
                                fontWeight:
                                  800,
                              }}
                            >
                              Pendiente
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            flexWrap: "wrap",
                            marginTop: "15px",
                          }}
                        >
                          <span
                            style={{
                              padding:
                                "5px 8px",
                              borderRadius:
                                "999px",
                              background:
                                "#f3f0e8",
                              color:
                                "#686e63",
                              fontSize:
                                "10px",
                            }}
                          >
                            🎓{" "}
                            {perfil.carrera ||
                              "Sin carrera"}
                          </span>

                          <span
                            style={{
                              padding:
                                "5px 8px",
                              borderRadius:
                                "999px",
                              background:
                                "#f3f0e8",
                              color:
                                "#686e63",
                              fontSize:
                                "10px",
                            }}
                          >
                            📖{" "}
                            {perfil.semestre ||
                              "Sin semestre"}
                          </span>
                        </div>

                        <div
                          style={{
                            marginTop: "15px",
                          }}
                        >
                          <p
                            style={{
                              margin:
                                "0 0 7px",
                              color:
                                "#969188",
                              fontSize:
                                "10px",
                              fontWeight:
                                800,
                              letterSpacing:
                                "0.5px",
                            }}
                          >
                            HABILIDADES
                          </p>

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "6px",
                              minHeight:
                                "30px",
                            }}
                          >
                            {skills.length ===
                            0 ? (
                              <small
                                style={{
                                  color:
                                    "#969188",
                                }}
                              >
                                Sin habilidades
                                agregadas.
                              </small>
                            ) : (
                              skills.map(
                                (skill) => {
                                  const colores =
                                    colorNivel(
                                      skill.nivel
                                    );

                                  return (
                                    <span
                                      key={
                                        skill.id
                                      }
                                      style={{
                                        padding:
                                          "5px 8px",
                                        borderRadius:
                                          "999px",
                                        background:
                                          colores.background,
                                        color:
                                          colores.color,
                                        fontSize:
                                          "10px",
                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      🧩{" "}
                                      {
                                        skill.skill
                                      }

                                      {" · "}

                                      {
                                        skill.nivel
                                      }
                                    </span>
                                  );
                                }
                              )
                            )}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "7px",
                            flexWrap: "wrap",
                            marginTop: "auto",
                            paddingTop: "18px",
                          }}
                        >
                          {!conexion && (
                            <button
                              type="button"
                              className="primaryButton"
                              disabled={
                                procesando
                              }
                              onClick={() =>
                                conectar(
                                  perfil.id
                                )
                              }
                            >
                              {procesando
                                ? "Enviando..."
                                : "🤝 Conectar"}
                            </button>
                          )}

                          {enviada &&
                            conexion && (
                            <button
                              type="button"
                              className="backHomeButton"
                              disabled={
                                procesando
                              }
                              onClick={() =>
                                eliminarConexion(
                                  conexion
                                )
                              }
                            >
                              {procesando
                                ? "Procesando..."
                                : "Cancelar solicitud"}
                            </button>
                          )}

                          {recibida &&
                            conexion && (
                            <>
                              <button
                                type="button"
                                className="primaryButton"
                                disabled={
                                  procesando
                                }
                                onClick={() =>
                                  aceptar(
                                    conexion
                                  )
                                }
                              >
                                ✓ Aceptar
                              </button>

                              <button
                                type="button"
                                className="logoutButton"
                                disabled={
                                  procesando
                                }
                                onClick={() =>
                                  eliminarConexion(
                                    conexion
                                  )
                                }
                              >
                                Rechazar
                              </button>
                            </>
                          )}

                          {aceptada &&
                            conexion && (
                            <button
                              type="button"
                              className="logoutButton"
                              disabled={
                                procesando
                              }
                              onClick={() =>
                                eliminarConexion(
                                  conexion
                                )
                              }
                            >
                              Quitar conexión
                            </button>
                          )}

                          <Link
                            href={`/u/${perfil.username}`}
                            className="backHomeButton"
                          >
                            Ver perfil →
                          </Link>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
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

        <Link href="/estudio">
          <span>
            📚
          </span>

          <span>
            Estudio
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

        <Link
          href="/conexiones"
          className="active"
        >
          <span>
            🤝
          </span>

          <span>
            Conexiones
          </span>
        </Link>

        <Link href="/perfil">
          <span>
            👤
          </span>

          <span>
            Perfil
          </span>
        </Link>
      </nav>

      <style jsx>{`
        @media (max-width: 700px) {
          form {
            grid-template-columns:
              1fr !important;
          }
        }
      `}</style>
    </div>
  );
}



