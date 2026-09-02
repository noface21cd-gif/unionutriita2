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
  const [userId, setUserId] = useState("");

  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [carrera, setCarrera] = useState("");
  const [semestre, setSemestre] = useState("");
  const [bio, setBio] = useState("");

  const [avatarActual, setAvatarActual] = useState<
    string | null
  >(null);

  const [avatarPreview, setAvatarPreview] = useState<
    string | null
  >(null);

  const [archivoAvatar, setArchivoAvatar] =
    useState<File | null>(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<
    "ok" | "error" | ""
  >("");

  useEffect(() => {
    let activo = true;

    async function cargarPerfil() {
      try {
        const user = await requerirUsuario();

        if (!user) {
          return;
        }

        const supabase = createClient();

        const { data, error } = await supabase
          .from("profiles")
          .select(
            `
              id,
              username,
              nombre,
              carrera,
              semestre,
              bio,
              avatar_url
            `
          )
          .eq("id", user.id)
          .maybeSingle();

        if (!activo) {
          return;
        }

        if (error) {
          throw new Error(error.message);
        }

        if (!data) {
          throw new Error(
            "No encontramos tu perfil."
          );
        }

        const perfil = data as Perfil;

        setUserId(perfil.id);
        setNombre(perfil.nombre || "");
        setUsername(perfil.username || "");
        setCarrera(perfil.carrera || "");
        setSemestre(perfil.semestre || "");
        setBio(perfil.bio || "");
        setAvatarActual(perfil.avatar_url);
      } catch (error) {
        if (!activo) {
          return;
        }

        setMensaje(
          error instanceof Error
            ? `No pudimos cargar tu perfil: ${error.message}`
            : "No pudimos cargar tu perfil."
        );

        setTipoMensaje("error");
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarPerfil();

    return () => {
      activo = false;
    };
  }, []);

  function seleccionarAvatar(
    e: ChangeEvent<HTMLInputElement>
  ) {
    const archivo = e.target.files?.[0];

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

    if (!tiposPermitidos.includes(archivo.type)) {
      setMensaje(
        "La imagen debe ser JPG, PNG o WebP."
      );
      setTipoMensaje("error");
      e.target.value = "";
      return;
    }

    const maximo = 5 * 1024 * 1024;

    if (archivo.size > maximo) {
      setMensaje(
        "La imagen no puede pesar más de 5 MB."
      );
      setTipoMensaje("error");
      e.target.value = "";
      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    const preview = URL.createObjectURL(archivo);

    setArchivoAvatar(archivo);
    setAvatarPreview(preview);
  }

  async function guardarPerfil(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setGuardando(true);
    setMensaje("");
    setTipoMensaje("");

    const nombreLimpio = nombre.trim();

    const usernameLimpio = username
      .trim()
      .toLowerCase()
      .replace(/^@/, "");

    const bioLimpia = bio.trim();

    if (nombreLimpio.length < 2) {
      setMensaje(
        "Tu nombre debe tener al menos 2 caracteres."
      );
      setTipoMensaje("error");
      setGuardando(false);
      return;
    }

    if (usernameLimpio.length < 3) {
      setMensaje(
        "Tu usuario debe tener al menos 3 caracteres."
      );
      setTipoMensaje("error");
      setGuardando(false);
      return;
    }

    if (!/^[a-z0-9._]+$/.test(usernameLimpio)) {
      setMensaje(
        "El usuario solo puede contener letras, números, puntos y guiones bajos."
      );
      setTipoMensaje("error");
      setGuardando(false);
      return;
    }

    if (bioLimpia.length > 240) {
      setMensaje(
        "Tu bio no puede superar los 240 caracteres."
      );
      setTipoMensaje("error");
      setGuardando(false);
      return;
    }

    try {
      const user = await requerirUsuario();

      if (!user) {
        return;
      }

      const supabase = createClient();

      const {
        data: usuarioExistente,
        error: errorUsuario,
      } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", usernameLimpio)
        .neq("id", user.id)
        .maybeSingle();

      if (errorUsuario) {
        throw new Error(errorUsuario.message);
      }

      if (usuarioExistente) {
        setMensaje(
          "Ese nombre de usuario ya está ocupado."
        );
        setTipoMensaje("error");
        setGuardando(false);
        return;
      }

      let nuevaAvatarUrl = avatarActual;

      if (archivoAvatar) {
        const extensionOriginal =
          archivoAvatar.name
            .split(".")
            .pop()
            ?.toLowerCase() || "jpg";

        const extension =
          extensionOriginal === "jpeg"
            ? "jpg"
            : extensionOriginal;

        const rutaArchivo = `${user.id}/avatar.${extension}`;

        const { error: errorSubida } =
          await supabase.storage
            .from("avatars")
            .upload(
              rutaArchivo,
              archivoAvatar,
              {
                upsert: true,
                contentType:
                  archivoAvatar.type,
                cacheControl: "3600",
              }
            );

        if (errorSubida) {
          throw new Error(
            `No pudimos subir tu foto: ${errorSubida.message}`
          );
        }

        const { data: urlData } =
          supabase.storage
            .from("avatars")
            .getPublicUrl(rutaArchivo);

        nuevaAvatarUrl =
          `${urlData.publicUrl}?v=${Date.now()}`;
      }

      const { error: errorActualizar } =
        await supabase
          .from("profiles")
          .update({
            nombre: nombreLimpio,
            username: usernameLimpio,
            carrera,
            semestre,
            bio: bioLimpia,
            avatar_url: nuevaAvatarUrl,
          })
          .eq("id", user.id);

      if (errorActualizar) {
        throw new Error(
          errorActualizar.message
        );
      }

      setAvatarActual(nuevaAvatarUrl);
      setArchivoAvatar(null);

      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }

      setMensaje(
        "Perfil actualizado correctamente 🦦"
      );
      setTipoMensaje("ok");

      setTimeout(() => {
        window.location.href = "/perfil";
      }, 700);
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? `No pudimos guardar los cambios: ${error.message}`
          : "No pudimos guardar los cambios."
      );

      setTipoMensaje("error");
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <main className="profilePage">
        <section className="profileCard">
          <div className="loadingScreen">
            <div>
              <span className="loadingOtter">
                🦦
              </span>

              <p className="loadingText">
                Preparando tu perfil...
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="profilePage">
      <section className="profileCard">
        <p className="profileEyebrow">
          UNIÓNUTRIITA
        </p>

        <h1>Editar perfil</h1>

        <p className="authDescription">
          Ajusta cómo te verán los demás
          estudiantes dentro de la comunidad.
        </p>

        <form
          onSubmit={guardarPerfil}
          className="authForm"
        >
          <div className="avatarEditor">
            <div className="profileAvatar">
              {avatarPreview ||
              avatarActual ? (
                <img
                  src={
                    avatarPreview ||
                    avatarActual ||
                    ""
                  }
                  alt="Vista previa del avatar"
                />
              ) : (
                <span>🦦</span>
              )}
            </div>

            <label className="avatarUploadButton">
              Cambiar foto

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={seleccionarAvatar}
                hidden
              />
            </label>

            <p className="avatarHelp">
              JPG, PNG o WebP · máximo 5 MB
            </p>
          </div>

          <label>
            Nombre

            <input
              type="text"
              value={nombre}
              onChange={(e) =>
                setNombre(e.target.value)
              }
              maxLength={80}
              required
            />
          </label>

          <label>
            Usuario

            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              minLength={3}
              maxLength={30}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </label>

          <label>
            Carrera

            <select
              value={carrera}
              onChange={(e) =>
                setCarrera(e.target.value)
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
              value={semestre}
              onChange={(e) =>
                setSemestre(e.target.value)
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

          <label>
            Bio

            <textarea
              value={bio}
              onChange={(e) =>
                setBio(e.target.value)
              }
              placeholder="Cuéntale algo a la comunidad..."
              maxLength={240}
              rows={4}
            />
          </label>

          <small
            style={{
              textAlign: "right",
              color: "#969188",
            }}
          >
            {bio.length}/240
          </small>

          <button
            type="submit"
            className="authButton"
            disabled={guardando}
          >
            {guardando
              ? "Guardando cambios..."
              : "Guardar cambios"}
          </button>
        </form>

        {mensaje && (
          <div
            className={`authMessage ${
              tipoMensaje === "error"
                ? "error"
                : ""
            }`}
          >
            {mensaje}
          </div>
        )}

        <Link
          href="/perfil"
          className="backHomeButton"
        >
          Cancelar y volver al perfil
        </Link>

        {userId && (
          <p
            style={{
              textAlign: "center",
              color: "#aaa49a",
              fontSize: "10px",
              marginTop: "18px",
            }}
          >
            Perfil de Uniónutriita
          </p>
        )}
      </section>
    </main>
  );
}
