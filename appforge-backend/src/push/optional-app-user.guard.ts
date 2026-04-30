import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard que extrae el AppUser del JWT si existe, pero no falla si no lo hay.
 * Usado en endpoints que se benefician de saber qué usuario hace la petición
 * pero deben funcionar también para clientes anónimos.
 */
@Injectable()
export class OptionalAppUserAuthGuard extends AuthGuard('app-user-jwt') {
  // Nunca lanzar — devolver null si no hay user válido
  handleRequest(_err: any, user: any) {
    return user || null;
  }

  // Siempre permitir el paso al handler — la decisión real sobre auth está en el método
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // Ignoramos errores de auth — handleRequest devolverá null si no hay JWT válido
    }
    return true;
  }
}
