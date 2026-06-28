/**
 * Reglas canónicas de contraseña para la plataforma. SINGLE SOURCE OF
 * TRUTH — importadas por los 3 DTOs que crean o cambian contraseña:
 *
 *   - `register.dto.ts`        — registro nuevo de usuario.
 *   - `change-password.dto.ts` — usuario logueado cambia su contraseña.
 *   - `reset-password.dto.ts`  — usuario recupera vía token de email.
 *
 * Si esta regla cambia, se cambia AQUÍ y los 3 DTOs siguen el cambio
 * automáticamente. Cualquier divergencia entre los 3 endpoints es un
 * agujero conocido: el del reset débil pre-fix permitía registrar con
 * `Abcdef12` y luego resetear a `123456`. Cerrado al unificar.
 *
 * Política elegida: OWASP estándar.
 *   - Mínimo 8 caracteres.
 *   - Al menos una minúscula, una mayúscula y un dígito.
 *     ("contraseña1" falla; "Contraseña1" pasa.)
 *   - SIN exigir símbolos: punto de equilibrio entre fricción UX y
 *     entropía. Ataques de fuerza bruta están mitigados también por
 *     rate-limit + bcrypt hash en DB.
 *   - Máximo 128 caracteres: evita DoS por bcrypt con strings
 *     enormes (cada char eleva el coste de hashing).
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// (?=.*[a-z])    → al menos una minúscula.
// (?=.*[A-Z])    → al menos una mayúscula.
// (?=.*\d)       → al menos un dígito.
// .{8,}          → mínimo 8 caracteres totales. Hace innecesario añadir
//                  @MinLength(8) encima del @Matches — duplicaría el
//                  mensaje de error para el mismo fallo.
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const PASSWORD_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.';
