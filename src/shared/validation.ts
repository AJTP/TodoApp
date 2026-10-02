import { z } from "zod";

// Schemas de validación comunes (reutilizables)

export const emailSchema = z.string().email("Email inválido");

export const passwordSchema = z.string().min(8, "Contraseña debe tener al menos 8 caracteres");

export const uuidSchema = z.string().uuid("UUID inválido");

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Helper para crear errores de validación consistentes
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  error.errors.forEach((err) => {
    const path = err.path.join(".");
    formatted[path] = err.message;
  });
  return formatted;
}
