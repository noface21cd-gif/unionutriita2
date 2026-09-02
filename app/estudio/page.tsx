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

export default function EstudioPage() {
  const [currentUserId, setCurrentUserId] =
    useState("");

  const [recursos, setRecursos] =
    useState<Recurso[]>([]);

  const [titulo, setTitulo] =
    useState("");

  const [descripcion, setDescripcion] =
    useState("");

  const [materia, setMateria] =
    useState("");

  const [carrera, setCarrera] =
    useState("");

  const [semestre, setSemestre] =
    useState("");

  const [archivo, setArchivo] =
    useState<File | null>(null);

  const [busqueda, setBusqueda] =
    useState("");

  const [filtroCarrera, setFiltroCarrera] =
    useState("");

  const [filtroSemestre, setFiltroSemestre] =
    useState("");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [cargando, setCargando] =
    useState(true);

  const [subiendo, setSubiendo] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  async function cargarRecursos() {
    const supabase = createClient();

    const { data, error } =
      await supabase
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
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      throw new Error(error.message);
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

        if (!user || !activo) {
          return;
        }

        setCurrentUserId(user.id);

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
          setCargando(false);
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

    setArchivo(seleccionado);
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
        error: errorArchivo,
      } = await supabase.storage
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
        error: errorRegistro,
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
          .remove([ruta]);

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

      setMostrarFormulario(false);

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
      } = await supabase.storage
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
        URL.createObjectURL(data);

      const enlace =
        document.createElement("a");

      enlace.href = url;

      enlace.download =
        recurso.archivo_nombre;

      document.body.appendChild(
        enlace
      );

      enlace.click();
      enlace.remove();

      URL.revokeObjectURL(url);
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
        error: errorStorage,
      } = await supabase.storage
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
        error: errorRegistro,
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

    if (bytes < 1024) {
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
      tipo?.includes("pdf")
    ) {
      return "📕";
    }

    if (
      tipo?.includes("image")
    ) {
      return "🖼️";
    }

    if (
      tipo?.includes("word")
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
            Comparte apuntes, documentos,
            presentaciones y materiales
            útiles con otros estudiantes.
          </p>
        </div>

        <div className="welcomeOtter">
          📚
        </div>
      </section>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginTop: "20px",
        }}
      >
        <Link
          href="/"
          className="primaryButton"
        >
          ← Inicio
        </Link>

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
            ? "Cancelar"
            : "＋ Subir recurso"}
        </button>
      </div>

      {mostrarFormulario && (
        <section
          className="profileCard"
          style={{
            maxWidth: "700px",
            marginTop: "22px",
          }}
        >
          <h2>
            Nuevo recurso
          </h2>

          <form
            className="authForm"
            onSubmit={subirRecurso}
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
                  Selecciona
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
                value={semestre}
                onChange={(e) =>
                  setSemestre(
                    e.target.value
                  )
                }
                required
              >
                <option value="">
                  Selecciona
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
                placeholder="¿Qué contiene este recurso?"
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

            {archivo && (
              <small>
                📎 {archivo.name} ·{" "}
                {tamanoBonito(
                  archivo.size
                )}
              </small>
            )}

            <button
              type="submit"
              className="authButton"
              disabled={subiendo}
            >
              {subiendo
                ? "Subiendo..."
                : "Publicar recurso"}
            </button>
          </form>
        </section>
      )}

      {mensaje && (
        <div
          className="errorBox"
          style={{
            marginTop: "20px",
          }}
        >
          {mensaje}
        </div>
      )}

      <section
        style={{
          marginTop: "28px",
        }}
      >
        <p className="tiny">
          BIBLIOTECA
        </p>

        <h2>
          Explorar materiales
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "2fr 1fr 1fr",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <input
            value={busqueda}
            onChange={(e) =>
              setBusqueda(
                e.target.value
              )
            }
            placeholder="🔎 Buscar materia, título o archivo..."
            style={{
              padding: "12px",
              border:
                "1px solid #e5ddcf",
              borderRadius: "14px",
            }}
          />

          <select
            value={filtroCarrera}
            onChange={(e) =>
              setFiltroCarrera(
                e.target.value
              )
            }
            style={{
              padding: "12px",
              border:
                "1px solid #e5ddcf",
              borderRadius: "14px",
            }}
          >
            <option value="">
              Todas las carreras
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

          <select
            value={filtroSemestre}
            onChange={(e) =>
              setFiltroSemestre(
                e.target.value
              )
            }
            style={{
              padding: "12px",
              border:
                "1px solid #e5ddcf",
              borderRadius: "14px",
            }}
          >
            <option value="">
              Todos los semestres
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
        </div>

        {recursosFiltrados.length === 0 ? (
          <div className="emptyState">
            <span className="emptyStateIcon">
              📚
            </span>

            No encontramos recursos.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "14px",
            }}
          >
            {recursosFiltrados.map(
              (recurso) => (
                <article
                  key={recurso.id}
                  className="card"
                >
                  <div
                    style={{
                      fontSize: "38px",
                    }}
                  >
                    {iconoArchivo(
                      recurso.archivo_tipo
                    )}
                  </div>

                  <p className="tiny">
                    {recurso.materia}
                  </p>

                  <h3>
                    {recurso.titulo}
                  </h3>

                  <p
                    style={{
                      color: "#70746a",
                      fontSize: "13px",
                    }}
                  >
                    {recurso.descripcion ||
                      "Sin descripción."}
                  </p>

                  <p
                    style={{
                      color: "#969188",
                      fontSize: "11px",
                    }}
                  >
                    {recurso.carrera}
                    {" · "}
                    {recurso.semestre}
                  </p>

                  <p
                    style={{
                      color: "#969188",
                      fontSize: "11px",
                    }}
                  >
                    📎{" "}
                    {
                      recurso.archivo_nombre
                    }

                    {recurso.archivo_size
                      ? ` · ${tamanoBonito(
                          recurso.archivo_size
                        )}`
                      : ""}
                  </p>

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

                  {recurso.user_id ===
                    currentUserId && (
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
                </article>
              )
            )}
          </div>
        )}
      </section>
    </main>
  );
}
