"use client";

import {
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
  status: "pending" | "accepted";
  created_at: string;
};

export default function ConexionesPage() {
  const [currentUserId, setCurrentUserId] =
    useState("");

  const [usuarios, setUsuarios] =
    useState<Perfil[]>([]);

  const [conexiones, setConexiones] =
    useState<Conexion[]>([]);

  const [busqueda, setBusqueda] =
    useState("");

  const [cargando, setCargando] =
    useState(true);

  const [procesando, setProcesando] =
    useState<string | null>(null);

  const [mensaje, setMensaje] =
    useState("");

  useEffect(() => {
    let activo = true;

    async function cargarPagina() {
      try {
        const user =
          await requerirUsuario();

        if (!user || !activo) {
          return;
        }

        setCurrentUserId(user.id);

        const supabase =
          createClient();

        const [
          perfilesResultado,
          conexionesResultado,
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
            .neq("id", user.id)
            .order("nombre", {
              ascending: true,
            })
            .limit(1000),

          supabase
            .from("connections")
            .select(`
              id,
              requester_id,
              receiver_id,
              status,
              created_at
            `)
            .or(
              `requester_id.eq.${user.id},receiver_id.eq.${user.id}`
            ),
        ]);

        if (perfilesResultado.error) {
          throw new Error(
            perfilesResultado.error.message
          );
        }

        if (conexionesResultado.error) {
          throw new Error(
            conexionesResultado.error.message
          );
        }

        if (!activo) {
          return;
        }

        setUsuarios(
          (perfilesResultado.data ||
            []) as Perfil[]
        );

        setConexiones(
          (conexionesResultado.data ||
            []) as Conexion[]
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
          setCargando(false);
        }
      }
    }

    cargarPagina();

    return () => {
      activo = false;
    };
  }, []);

  async function actualizarConexiones() {
    if (!currentUserId) {
      return;
    }

    const supabase =
      createClient();

    const { data, error } =
      await supabase
        .from("connections")
        .select(`
          id,
          requester_id,
          receiver_id,
          status,
          created_at
        `)
        .or(
          `requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`
        );

    if (!error) {
      setConexiones(
        (data || []) as Conexion[]
      );
    }
  }

  function conexionCon(
    otroUsuarioId: string
  ) {
    return conexiones.find(
      (conexion) =>
        (conexion.requester_id ===
          currentUserId &&
          conexion.receiver_id ===
            otroUsuarioId) ||
        (conexion.receiver_id ===
          currentUserId &&
          conexion.requester_id ===
            otroUsuarioId)
    );
  }

  async function conectar(
    usuarioId: string
  ) {
    setProcesando(usuarioId);

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
              usuarioId,
            status: "pending",
          });

      if (error) {
        throw new Error(
          error.message
        );
      }

      await actualizarConexiones();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos enviar la solicitud."
      );
    } finally {
      setProcesando(null);
    }
  }

  async function aceptar(
    conexion: Conexion
  ) {
    setProcesando(
      conexion.id
    );

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from("connections")
          .update({
            status: "accepted",
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

      await actualizarConexiones();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos aceptar la solicitud."
      );
    } finally {
      setProcesando(null);
    }
  }

  async function eliminarConexion(
    conexion: Conexion
  ) {
    const texto =
      conexion.status === "accepted"
        ? "¿Eliminar esta conexión?"
        : "¿Cancelar esta solicitud?";

    if (!window.confirm(texto)) {
      return;
    }

    setProcesando(
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

      await actualizarConexiones();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No pudimos actualizar la conexión."
      );
    } finally {
      setProcesando(null);
    }
  }

  const usuariosFiltrados =
    useMemo(() => {
      const texto =
        busqueda
          .trim()
          .toLowerCase();

      if (!texto) {
        return usuarios;
      }

      return usuarios.filter(
        (usuario) => {
          const contenido = [
            usuario.nombre,
            usuario.username,
            usuario.carrera,
            usuario.semestre,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return contenido.includes(
            texto
          );
        }
      );
    }, [usuarios, busqueda]);

  const solicitudesRecibidas =
    conexiones.filter(
      (conexion) =>
        conexion.status ===
          "pending" &&
        conexion.receiver_id ===
          currentUserId
    );

  const totalConexiones =
    conexiones.filter(
      (conexion) =>
        conexion.status ===
        "accepted"
    ).length;

  if (cargando) {
    return (
      <main className="loadingScreen">
        <div>
          <span className="loadingOtter">
            🦦
          </span>

          <p className="loadingText">
            Buscando estudiantes...
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
            RED UNIVERSITARIA
          </p>

          <h2>
            Conexiones 🤝
          </h2>

          <p>
            Encuentra estudiantes por
            nombre, usuario, carrera o
            semestre.
          </p>
        </div>

        <div className="welcomeOtter">
          🦦
        </div>
      </section>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginTop: "18px",
        }}
      >
        <Link
          href="/"
          className="primaryButton"
        >
          ← Inicio
        </Link>

        <div
          className="card"
          style={{
            padding: "10px 15px",
          }}
        >
          🤝 {totalConexiones} conexiones
        </div>

        <div
          className="card"
          style={{
            padding: "10px 15px",
          }}
        >
          📩 {solicitudesRecibidas.length} pendientes
        </div>
      </div>

      <div
        className="searchBox"
        style={{
          width: "100%",
          maxWidth: "650px",
          marginTop: "22px",
        }}
      >
        <span>🔎</span>

        <input
          type="text"
          value={busqueda}
          onChange={(e) =>
            setBusqueda(
              e.target.value
            )
          }
          placeholder="Busca por nombre, @usuario, carrera o semestre..."
        />
      </div>

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

      {solicitudesRecibidas.length >
        0 && (
        <section
          style={{
            marginTop: "30px",
          }}
        >
          <p className="tiny">
            SOLICITUDES
          </p>

          <h3>
            Quieren conectar contigo
          </h3>

          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {solicitudesRecibidas.map(
              (conexion) => {
                const usuario =
                  usuarios.find(
                    (item) =>
                      item.id ===
                      conexion.requester_id
                  );

                if (!usuario) {
                  return null;
                }

                return (
                  <article
                    key={
                      conexion.id
                    }
                    className="card"
                    style={{
                      display: "flex",
                      alignItems:
                        "center",
                      gap: "12px",
                    }}
                  >
                    <Link
                      href={`/u/${usuario.username}`}
                      className="avatar"
                    >
                      {usuario.avatar_url ? (
                        <img
                          src={
                            usuario.avatar_url
                          }
                          alt={
                            usuario.nombre ||
                            "Usuario"
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
                      }}
                    >
                      <strong>
                        {usuario.nombre ||
                          "Estudiante"}
                      </strong>

                      <p
                        style={{
                          margin:
                            "3px 0",
                          color:
                            "#969188",
                          fontSize:
                            "12px",
                        }}
                      >
                        @
                        {usuario.username ||
                          "usuario"}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="primaryButton"
                      disabled={
                        procesando ===
                        conexion.id
                      }
                      onClick={() =>
                        aceptar(
                          conexion
                        )
                      }
                    >
                      Aceptar
                    </button>

                    <button
                      type="button"
                      className="logoutButton"
                      style={{
                        width: "auto",
                        margin: 0,
                      }}
                      onClick={() =>
                        eliminarConexion(
                          conexion
                        )
                      }
                    >
                      Rechazar
                    </button>
                  </article>
                );
              }
            )}
          </div>
        </section>
      )}

      <section
        style={{
          marginTop: "30px",
        }}
      >
        <p className="tiny">
          ESTUDIANTES
        </p>

        <h3>
          Comunidad
        </h3>

        {usuariosFiltrados.length ===
        0 ? (
          <div className="emptyState">
            <span className="emptyStateIcon">
              🔎
            </span>

            No encontramos estudiantes
            con esa búsqueda.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "14px",
            }}
          >
            {usuariosFiltrados.map(
              (usuario) => {
                const conexion =
                  conexionCon(
                    usuario.id
                  );

                const esperando =
                  procesando ===
                    usuario.id ||
                  procesando ===
                    conexion?.id;

                return (
                  <article
                    key={
                      usuario.id
                    }
                    className="card"
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        gap: "12px",
                        alignItems:
                          "center",
                      }}
                    >
                      <Link
                        href={`/u/${usuario.username}`}
                        className="avatar"
                      >
                        {usuario.avatar_url ? (
                          <img
                            src={
                              usuario.avatar_url
                            }
                            alt={
                              usuario.nombre ||
                              "Usuario"
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
                          minWidth: 0,
                        }}
                      >
                        <Link
                          href={`/u/${usuario.username}`}
                          style={{
                            fontWeight:
                              800,
                            textDecoration:
                              "none",
                          }}
                        >
                          {usuario.nombre ||
                            "Estudiante"}
                        </Link>

                        <p
                          style={{
                            margin:
                              "3px 0",
                            color:
                              "#969188",
                            fontSize:
                              "12px",
                          }}
                        >
                          @
                          {usuario.username ||
                            "usuario"}
                        </p>

                        <p
                          style={{
                            margin:
                              "3px 0",
                            color:
                              "#70746a",
                            fontSize:
                              "12px",
                          }}
                        >
                          {usuario.carrera ||
                            "Sin carrera"}
                          {" · "}
                          {usuario.semestre ||
                            "Sin semestre"}
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop:
                          "14px",
                      }}
                    >
                      {!conexion && (
                        <button
                          type="button"
                          className="primaryButton"
                          disabled={
                            esperando
                          }
                          onClick={() =>
                            conectar(
                              usuario.id
                            )
                          }
                        >
                          🤝 Conectar
                        </button>
                      )}

                      {conexion?.status ===
                        "accepted" && (
                        <button
                          type="button"
                          className="logoutButton"
                          style={{
                            width:
                              "auto",
                            margin: 0,
                          }}
                          onClick={() =>
                            eliminarConexion(
                              conexion
                            )
                          }
                        >
                          ✓ Conectados
                        </button>
                      )}

                      {conexion?.status ===
                        "pending" &&
                        conexion.requester_id ===
                          currentUserId && (
                          <button
                            type="button"
                            className="logoutButton"
                            style={{
                              width:
                                "auto",
                              margin: 0,
                            }}
                            onClick={() =>
                              eliminarConexion(
                                conexion
                              )
                            }
                          >
                            ⏳ Solicitud enviada
                          </button>
                        )}

                      {conexion?.status ===
                        "pending" &&
                        conexion.receiver_id ===
                          currentUserId && (
                          <button
                            type="button"
                            className="primaryButton"
                            onClick={() =>
                              aceptar(
                                conexion
                              )
                            }
                          >
                            📩 Aceptar solicitud
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
  );
}

