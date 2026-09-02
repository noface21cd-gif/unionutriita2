"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { createClient } from "../../lib/supabase/client";
import { requerirUsuario } from "../../lib/auth";

type Recurso = {
  id: string;
  user_id: string;
  titulo: string;
  descripcion: string | null;
  materia: string;
  carrera: string;
  semestre: string;
  archivo_path: string;
  archivo_nombre: string;
  archivo_tipo: string | null;
  archivo_size: number | null;
  created_at: string;
};

const CARRERAS = [
  "Administración",
  "Contabilidad",
  "Negocios Internacionales",
  "Historia",
];

const SEMESTRES = [
  "Nuevo ingreso",
  "3.º semestre",
  "5.º semestre",
  "7.º semestre",
];

export default function EstudioPage() {
  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [
    recursos,
    setRecursos,
  ] = useState<Recurso[]>([]);

  const [
    titulo,
    setTitulo,
  ] = useState("");

  const [
    descripcion,
    setDescripcion,
  ] = useState("");

  const [
    materia,
    setMateria,
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
    archivo,
    setArchivo,
  ] = useState<File | null>(
    null
  );

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  const [
    filtroCarrera,
    setFiltroCarrera,
  ] = useState("");

  const [
    filtroSemestre,
    setFiltroSemestre,
  ] = useState("");

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    subiendo,
    setSubiendo,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  async function cargarRecursos() {
    const supabase =
      createClient();

    const {
      data,
      error,
    } = await supabase
      .from("resources")
      .select(`
        id,
        user_id,
        titulo,
        descripcion,
        materia,
        carrera,
        semestre,
        archivo_path,
        archivo_nombre,
        archivo_tipo,
        archivo_size,
        created_at
      `)
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    setRecursos(
      (data || []) as Recurso[]
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

        await cargarRecursos();
      } catch (error) {
        if (!activo) {
          return;
        }

        setMensaje(
          error instanceof Error
            ? error.message
            : "No pudimos cargar los recursos."
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

  function seleccionarArchivo(
    e: ChangeEvent<HTMLInputElement>
  ) {
    const seleccionado =
      e.target.files?.[0];

    if (!seleccionado) {
      return;
    }

    const limite =
      10 * 1024 * 1024;

    if (
      seleccionado.size >
      limite
    ) {
      setMensaje(
        "El archivo no puede superar los 10 MB."
      );

      e.target.value = "";

      return;
    }

    setArchivo(
      seleccionado
    );

    setMensaje("");
  }

  async function subirRecurso(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!archivo) {
      setMensaje(
        "Selecciona un archivo."
      );

      return;
    }

    if (
      !titulo.trim() ||
      !materia.trim() ||
      !carrera ||
      !semestre
    ) {
      setMensaje(
        "Completa los datos obligatorios."
      );

      return;
    }

    setSubiendo(true);
    setMensaje("");

    try {
      const supabase =
        createClient();

      const extension =
        archivo.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "archivo";

      const nombreUnico =
        `${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const ruta =
        `${currentUserId}/${nombreUnico}`;

      const {
        error:
          errorArchivo,
      } =
        await supabase.storage
          .from("resources")
          .upload(
            ruta,
            archivo,
            {
              upsert: false,

              contentType:
                archivo.type ||
                undefined,
            }
          );

      if (errorArchivo) {
        throw new Error(
          `No pudimos subir el archivo: ${errorArchivo.message}`
        );
      }

      const {
        error:
          errorRegistro,
      } = await supabase
        .from("resources")
        .insert({
          user_id:
            currentUserId,

          titulo:
            titulo.trim(),

          descripcion:
            descripcion.trim(),

          materia:
            materia.trim(),

          carrera,

          semestre,

          archivo_path:
            ruta,

          archivo_nombre:
            archivo.name,

          archivo_tipo:
            archivo.type,

          archivo_size:
            archivo.size,
        });

      if (errorRegistro) {
        await supabase.storage
          .from("resources")
          .remove([
            ruta,
          ]);

        throw new Error(
          errorRegistro.message
        );
      }

      setTitulo("");
      setDescripcion("");
      setMateria("");
      setCarrera("");
      setSemestre("");
      setArchivo(null);

      setMostrarFormulario(
        false
      );

      await cargarRecursos();
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No pudimos subir el recurso."
      );
    } finally {
      setSubiendo(false);
    }
  }

  async function descargar(
    recurso: Recurso
  ) {
    try {
      const supabase =
        createClient();

      const {
        data,
        error,
      } =
        await supabase.storage
          .from("resources")
          .download(
            recurso.archivo_path
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      const url =
        URL.createObjectURL(
          data
        );

      const enlace =
        document.createElement(
          "a"
        );

      enlace.href = url;

      enlace.download =
        recurso.archivo_nombre;

      document.body.appendChild(
        enlace
      );

      enlace.click();
      enlace.remove();

      URL.revokeObjectURL(
        url
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos descargar el archivo."
      );
    }
  }

  async function eliminar(
    recurso: Recurso
  ) {
    if (
      recurso.user_id !==
      currentUserId
    ) {
      return;
    }

    const confirmado =
      window.confirm(
        "¿Eliminar este recurso?"
      );

    if (!confirmado) {
      return;
    }

    try {
      const supabase =
        createClient();

      const {
        error:
          errorStorage,
      } =
        await supabase.storage
          .from("resources")
          .remove([
            recurso.archivo_path,
          ]);

      if (errorStorage) {
        throw new Error(
          errorStorage.message
        );
      }

      const {
        error:
          errorRegistro,
      } = await supabase
        .from("resources")
        .delete()
        .eq(
          "id",
          recurso.id
        )
        .eq(
          "user_id",
          currentUserId
        );

      if (errorRegistro) {
        throw new Error(
          errorRegistro.message
        );
      }

      setRecursos(
        (actuales) =>
          actuales.filter(
            (item) =>
              item.id !==
              recurso.id
          )
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos eliminar el recurso."
      );
    }
  }

  function tamanoBonito(
    bytes: number | null
  ) {
    if (!bytes) {
      return "";
    }

    if (
      bytes < 1024
    ) {
      return `${bytes} B`;
    }

    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  function iconoArchivo(
    tipo: string | null
  ) {
    if (
      tipo?.includes(
        "pdf"
      )
    ) {
      return "📕";
    }

    if (
      tipo?.includes(
        "image"
      )
    ) {
      return "🖼️";
    }

    if (
      tipo?.includes(
        "word"
      )
    ) {
      return "📘";
    }

    if (
      tipo?.includes(
        "presentation"
      )
    ) {
      return "📙";
    }

    return "📄";
  }

  function fechaBonita(
    fecha: string
  ) {
    return new Date(
      fecha
    ).toLocaleDateString(
      "es-MX",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  const recursosFiltrados =
    useMemo(() => {
      const texto =
        busqueda
          .trim()
          .toLowerCase();

      return recursos.filter(
        (recurso) => {
          const coincideBusqueda =
            !texto ||
            [
              recurso.titulo,
              recurso.descripcion,
              recurso.materia,
              recurso.carrera,
              recurso.semestre,
              recurso.archivo_nombre,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(texto);

          const coincideCarrera =
            !filtroCarrera ||
            recurso.carrera ===
              filtroCarrera;

          const coincideSemestre =
            !filtroSemestre ||
            recurso.semestre ===
              filtroSemestre;

          return (
            coincideBusqueda &&
            coincideCarrera &&
            coincideSemestre
          );
        }
      );
    }, [
      recursos,
      busqueda,
      filtroCarrera,
      filtroSemestre,
    ]);

  const misRecursos =
    recursos.filter(
      (recurso) =>
        recurso.user_id ===
        currentUserId
    ).length;

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            📚
          </span>

          <p className="loadingText">
            Ordenando los apuntes...
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
            className="menuButton selected"
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

          <div className="otterCard">
            <span className="bigOtter">
              📚
            </span>

            <div>
              <strong>
                Biblioteca
              </strong>

              <p>
                Aprende y comparte
              </p>
            </div>
          </div>
        </aside>

        <main className="content">
          <section className="welcome">
            <div>
              <p className="tiny">
                CENTRO DE ESTUDIO
              </p>

              <h2>
                Recursos 📚
              </h2>

              <p>
                Encuentra apuntes,
                documentos,
                presentaciones y
                materiales compartidos
                por la comunidad.
              </p>
            </div>

            <div className="welcomeOtter">
              📚
            </div>
          </section>

          <section
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",

              gap:
                "10px",

              marginTop:
                "20px",
            }}
          >
            <article className="card">
              <p className="tiny">
                BIBLIOTECA
              </p>

              <strong
                style={{
                  display:
                    "block",

                  marginTop:
                    "5px",

                  fontSize:
                    "25px",
                }}
              >
                {recursos.length}
              </strong>

              <p>
                recursos disponibles
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                RESULTADOS
              </p>

              <strong
                style={{
                  display:
                    "block",

                  marginTop:
                    "5px",

                  fontSize:
                    "25px",
                }}
              >
                {
                  recursosFiltrados.length
                }
              </strong>

              <p>
                con los filtros actuales
              </p>
            </article>

            <article className="card">
              <p className="tiny">
                MIS APORTES
              </p>

              <strong
                style={{
                  display:
                    "block",

                  marginTop:
                    "5px",

                  fontSize:
                    "25px",
                }}
              >
                {misRecursos}
              </strong>

              <p>
                recursos compartidos
              </p>
            </article>
          </section>

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
                "20px",
            }}
          >
            <div
              style={{
                display:
                  "flex",

                gap:
                  "8px",

                flexWrap:
                  "wrap",
              }}
            >
              <Link
                href="/"
                className="backHomeButton"
              >
                ← Inicio
              </Link>

              <Link
                href="/guardados"
                className="backHomeButton"
              >
                🔖 Guardados
              </Link>
            </div>

            <button
              type="button"
              className="primaryButton"
              onClick={() =>
                setMostrarFormulario(
                  !mostrarFormulario
                )
              }
            >
              {mostrarFormulario
                ? "✕ Cerrar formulario"
                : "＋ Subir recurso"}
            </button>
          </div>

          {mostrarFormulario && (
            <section
              className="card"
              style={{
                maxWidth:
                  "820px",

                marginTop:
                  "18px",

                padding:
                  "24px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  alignItems:
                    "flex-start",

                  gap:
                    "15px",

                  marginBottom:
                    "20px",
                }}
              >
                <div>
                  <p className="tiny">
                    COMPARTIR
                  </p>

                  <h2
                    style={{
                      margin:
                        "5px 0",
                    }}
                  >
                    Nuevo recurso
                  </h2>

                  <p
                    style={{
                      margin: 0,

                      color:
                        "#70746a",

                      fontSize:
                        "13px",

                      lineHeight:
                        1.5,
                    }}
                  >
                    Sube un material útil
                    para que otros
                    estudiantes puedan
                    consultarlo.
                  </p>
                </div>

                <span
                  style={{
                    fontSize:
                      "34px",
                  }}
                >
                  📤
                </span>
              </div>

              <form
                className="authForm"
                onSubmit={
                  subirRecurso
                }
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
                    Título

                    <input
                      value={titulo}
                      onChange={(e) =>
                        setTitulo(
                          e.target.value
                        )
                      }
                      placeholder="Ej. Resumen Unidad 3"
                      maxLength={120}
                      required
                    />
                  </label>

                  <label>
                    Materia

                    <input
                      value={materia}
                      onChange={(e) =>
                        setMateria(
                          e.target.value
                        )
                      }
                      placeholder="Ej. Finanzas"
                      maxLength={100}
                      required
                    />
                  </label>

                  <label>
                    Carrera

                    <select
                      value={carrera}
                      onChange={(e) =>
                        setCarrera(
                          e.target.value
                        )
                      }
                      required
                    >
                      <option value="">
                        Selecciona una carrera
                      </option>

                      {CARRERAS.map(
                        (item) => (
                          <option
                            key={item}
                            value={item}
                          >
                            {item}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    Semestre

                    <select
                      value={semestre}
                      onChange={(e) =>
                        setSemestre(
                          e.target.value
                        )
                      }
                      required
                    >
                      <option value="">
                        Selecciona un semestre
                      </option>

                      {SEMESTRES.map(
                        (item) => (
                          <option
                            key={item}
                            value={item}
                          >
                            {item}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                </div>

                <label>
                  Descripción

                  <textarea
                    value={descripcion}
                    onChange={(e) =>
                      setDescripcion(
                        e.target.value
                      )
                    }
                    rows={4}
                    maxLength={500}
                    placeholder="Describe brevemente qué contiene el recurso..."
                  />
                </label>

                <label>
                  Archivo

                  <input
                    type="file"
                    onChange={
                      seleccionarArchivo
                    }
                    required
                  />
                </label>

                <div
                  style={{
                    padding:
                      "12px 14px",

                    border:
                      "1px dashed #d5ccbd",

                    borderRadius:
                      "13px",

                    background:
                      "#f7f4ee",

                    color:
                      "#70746a",

                    fontSize:
                      "12px",

                    lineHeight:
                      1.5,
                  }}
                >
                  {archivo ? (
                    <>
                      <strong>
                        📎 {archivo.name}
                      </strong>

                      <span>
                        {" · "}
                        {tamanoBonito(
                          archivo.size
                        )}
                      </span>
                    </>
                  ) : (
                    <>
                      📁 Selecciona el
                      archivo que quieres
                      compartir. Tamaño
                      máximo: 10 MB.
                    </>
                  )}
                </div>

                <button
                  type="submit"
                  className="authButton"
                  disabled={subiendo}
                >
                  {subiendo
                    ? "Subiendo recurso..."
                    : "📤 Publicar recurso"}
                </button>
              </form>
            </section>
          )}

          {mensaje && (
            <div
              className="errorBox"
              style={{
                marginTop:
                  "18px",
              }}
            >
              {mensaje}
            </div>
          )}

          <section
            style={{
              marginTop:
                "30px",

              paddingBottom:
                "60px",
            }}
          >
            <div
              className="sectionHeader"
            >
              <p className="tiny">
                BIBLIOTECA
              </p>

              <h2>
                Explorar materiales
              </h2>
            </div>

            <div
              className="card"
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",

                gap:
                  "10px",

                marginBottom:
                  "18px",

                padding:
                  "14px",
              }}
            >
              <div
                className="searchBox"
                style={{
                  width:
                    "100%",
                }}
              >
                <span>
                  🔎
                </span>

                <input
                  value={busqueda}
                  onChange={(e) =>
                    setBusqueda(
                      e.target.value
                    )
                  }
                  placeholder="Buscar título, materia o archivo..."
                />
              </div>

              <select
                value={
                  filtroCarrera
                }
                onChange={(e) =>
                  setFiltroCarrera(
                    e.target.value
                  )
                }
                style={{
                  width:
                    "100%",

                  minHeight:
                    "44px",

                  padding:
                    "10px 12px",

                  border:
                    "1px solid #d5ccbd",

                  borderRadius:
                    "13px",

                  outline:
                    "none",

                  background:
                    "#f6f3ec",

                  color:
                    "#30352d",
                }}
              >
                <option value="">
                  Todas las carreras
                </option>

                {CARRERAS.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>

              <select
                value={
                  filtroSemestre
                }
                onChange={(e) =>
                  setFiltroSemestre(
                    e.target.value
                  )
                }
                style={{
                  width:
                    "100%",

                  minHeight:
                    "44px",

                  padding:
                    "10px 12px",

                  border:
                    "1px solid #d5ccbd",

                  borderRadius:
                    "13px",

                  outline:
                    "none",

                  background:
                    "#f6f3ec",

                  color:
                    "#30352d",
                }}
              >
                <option value="">
                  Todos los semestres
                </option>

                {SEMESTRES.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>

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

                marginBottom:
                  "14px",
              }}
            >
              <p
                style={{
                  margin: 0,

                  color:
                    "#70746a",

                  fontSize:
                    "12px",
                }}
              >
                Mostrando{" "}
                <strong>
                  {
                    recursosFiltrados.length
                  }
                </strong>{" "}
                de{" "}
                <strong>
                  {recursos.length}
                </strong>{" "}
                recursos
              </p>

              {(busqueda ||
                filtroCarrera ||
                filtroSemestre) && (
                <span
                  className="tag"
                  style={{
                    marginTop:
                      0,
                  }}
                >
                  🔎 Filtros activos
                </span>
              )}
            </div>

            {recursosFiltrados.length ===
            0 ? (
              <div className="emptyState">
                <span className="emptyStateIcon">
                  📚
                </span>

                <strong>
                  No encontramos recursos
                </strong>

                <p
                  style={{
                    marginBottom:
                      0,
                  }}
                >
                  Prueba con otra búsqueda
                  o cambia los filtros.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(270px, 1fr))",

                  gap:
                    "14px",
                }}
              >
                {recursosFiltrados.map(
                  (recurso) => {
                    const esMio =
                      recurso.user_id ===
                      currentUserId;

                    return (
                      <article
                        key={
                          recurso.id
                        }
                        className="card"
                        style={{
                          display:
                            "flex",

                          flexDirection:
                            "column",

                          minHeight:
                            "315px",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",

                            alignItems:
                              "flex-start",

                            justifyContent:
                              "space-between",

                            gap:
                              "12px",
                          }}
                        >
                          <div
                            className="cardIcon"
                            style={{
                              fontSize:
                                "25px",
                            }}
                          >
                            {iconoArchivo(
                              recurso.archivo_tipo
                            )}
                          </div>

                          {esMio && (
                            <span
                              style={{
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
                              Mi recurso
                            </span>
                          )}
                        </div>

                        <p
                          className="tiny"
                          style={{
                            marginTop:
                              "15px",
                          }}
                        >
                          {
                            recurso.materia
                          }
                        </p>

                        <h3
                          style={{
                            margin:
                              "6px 0 4px",

                            fontSize:
                              "17px",

                            lineHeight:
                              1.3,
                          }}
                        >
                          {
                            recurso.titulo
                          }
                        </h3>

                        <p
                          style={{
                            margin:
                              "5px 0",

                            color:
                              "#70746a",

                            fontSize:
                              "13px",

                            lineHeight:
                              1.55,
                          }}
                        >
                          {recurso.descripcion ||
                            "Sin descripción."}
                        </p>

                        <div
                          style={{
                            display:
                              "flex",

                            gap:
                              "6px",

                            flexWrap:
                              "wrap",

                            marginTop:
                              "8px",
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
                            {
                              recurso.carrera
                            }
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
                            📅{" "}
                            {
                              recurso.semestre
                            }
                          </span>
                        </div>

                        <div
                          style={{
                            marginTop:
                              "14px",

                            padding:
                              "10px 11px",

                            borderRadius:
                              "12px",

                            background:
                              "#f7f4ee",

                            color:
                              "#7d7971",

                            fontSize:
                              "11px",

                            overflowWrap:
                              "anywhere",
                          }}
                        >
                          <div>
                            📎{" "}
                            {
                              recurso.archivo_nombre
                            }
                          </div>

                          <div
                            style={{
                              marginTop:
                                "4px",

                              color:
                                "#969188",
                            }}
                          >
                            {recurso.archivo_size
                              ? tamanoBonito(
                                  recurso.archivo_size
                                )
                              : "Tamaño no disponible"}

                            {" · "}

                            {fechaBonita(
                              recurso.created_at
                            )}
                          </div>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",

                            gap:
                              "8px",

                            flexWrap:
                              "wrap",

                            marginTop:
                              "auto",

                            paddingTop:
                              "16px",
                          }}
                        >
                          <button
                            type="button"
                            className="primaryButton"
                            onClick={() =>
                              descargar(
                                recurso
                              )
                            }
                          >
                            ⬇ Descargar
                          </button>

                          {esMio && (
                            <button
                              type="button"
                              className="logoutButton"
                              onClick={() =>
                                eliminar(
                                  recurso
                                )
                              }
                            >
                              🗑 Eliminar
                            </button>
                          )}
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

        <Link
          href="/estudio"
          className="active"
        >
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

        <Link href="/guardados">
          <span>
            🔖
          </span>

          <span>
            Guardados
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
    </div>
  );
}
