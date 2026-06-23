import { ApiError } from "../api/client";

/** Human-readable, actionable message for any thrown value. */
export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 400:
        return err.message || "Parámetros inválidos. Revisa los filtros.";
      case 401:
        return "Tu sesión expiró. Vuelve a iniciar sesión.";
      case 404:
        return "No se encontró el recurso solicitado.";
      case 429:
        return "Demasiadas solicitudes. Espera unos segundos e inténtalo de nuevo.";
      case 500:
        return "El servidor tuvo un problema. Inténtalo de nuevo.";
      default:
        return err.message || "Ocurrió un error inesperado.";
    }
  }
  if (err instanceof TypeError) {
    // Network failure / CORS / DNS.
    return "No se pudo conectar con el servidor. Revisa tu conexión.";
  }
  if (err instanceof Error) return err.message;
  return "Ocurrió un error inesperado.";
}
