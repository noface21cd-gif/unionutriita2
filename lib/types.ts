export type Perfil = {
  id: string;
  username: string | null;
  nombre: string | null;
  carrera: string | null;
  semestre: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

export type PerfilResumen = {
  id: string;
  username: string | null;
  nombre: string | null;
  carrera: string | null;
  semestre: string | null;
  avatar_url: string | null;
};

export type TipoPost =
  | "Publicación"
  | "Apunte"
  | "Pregunta"
  | "Formulario"
  | "Ayuda"
  | "Aviso";

export type PostBase = {
  id: string;
  user_id: string;
  tipo: TipoPost;
  contenido: string;
  created_at: string;
  updated_at: string;
};

export type PostConAutor = PostBase & {
  autor: PerfilResumen | null;
};

export type EstadoCarga =
  | "cargando"
  | "listo"
  | "error";

export type ResultadoOperacion = {
  ok: boolean;
  mensaje?: string;
};
