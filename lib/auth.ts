import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";

export async function obtenerUsuarioActual(): Promise<User | null> {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function haySesionActiva(): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return Boolean(session);
}

export async function requerirUsuario(): Promise<User | null> {
  const user = await obtenerUsuarioActual();

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }

    return null;
  }

  return user;
}

export async function cerrarSesion(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }

  return {
    ok: true,
  };
}
