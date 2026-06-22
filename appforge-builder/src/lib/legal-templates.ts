/**
 * Plantillas legales de partida para Términos y Privacidad.
 *
 * El cliente las carga vía el botón "Cargar plantilla" en TermsTab/PrivacyTab
 * y las edita inline para adaptarlas a su negocio. Los placeholders entre
 * corchetes ([NOMBRE DE LA APP], etc.) los sustituye manualmente el cliente
 * al editar.
 *
 * IMPORTANTE: el texto aquí es plantilla genérica de partida — NO es
 * asesoría legal vetada. El UI advierte al cliente que debe revisar con un
 * profesional legal antes de publicar (ver disclaimer en italic al final
 * de cada plantilla). Cuando exista una versión legal validada (futuro
 * checkpoint legal), reemplazar estas consts en un commit propio.
 *
 * Formato: HTML compatible con ReactQuill (h2, h3, p, strong, em, ul, ol, li).
 * Sin fancy markup que el editor no pueda preservar/reflejar en su toolbar.
 */

export const PRIVACY_TEMPLATE_HTML = `<h2>Política de Privacidad</h2>
<p><strong>Última actualización: [FECHA]</strong></p>
<p>Esta política describe cómo <strong>[NOMBRE DE LA APP]</strong> recopila, usa y protege los datos personales de sus usuarios.</p>
<h3>1. Datos que recopilamos</h3>
<p>Cuando usas nuestra app, podemos recopilar:</p>
<ul>
<li>Nombre y apellidos</li>
<li>Correo electrónico</li>
<li>Número de teléfono</li>
<li>Información de pedidos, reservas o transacciones que realices</li>
</ul>
<h3>2. Cómo usamos tus datos</h3>
<p>Usamos tu información para:</p>
<ul>
<li>Gestionar tu cuenta y autenticarte</li>
<li>Procesar pedidos y reservas</li>
<li>Enviarte notificaciones relacionadas con el servicio</li>
<li>Mejorar la experiencia de uso de la app</li>
</ul>
<h3>3. Borrado de cuenta y retención</h3>
<p>Puedes solicitar el borrado de tu cuenta y datos personales:</p>
<ul>
<li>Desde la pantalla "Mi Cuenta" dentro de la app</li>
<li>Desde la página pública de solicitud disponible en [URL DE BORRADO]</li>
</ul>
<p>Al borrar tu cuenta, eliminamos tu información personal (nombre, correo, teléfono). Los pedidos, reservas y transacciones se <strong>conservan anonimizadas</strong> (sin tu información personal asociada) por motivos contables, fiscales y de auditoría.</p>
<h3>4. Compartir con terceros</h3>
<p>No vendemos ni alquilamos tu información a terceros. Compartimos datos solo con proveedores que nos ayudan a operar el servicio (pagos, mensajería, hosting), bajo acuerdos de confidencialidad.</p>
<h3>5. Contacto</h3>
<p>Para cualquier consulta sobre esta política o el tratamiento de tus datos, escríbenos a <strong>[EMAIL DE CONTACTO]</strong>.</p>
<p><em>Esta es una plantilla de partida. Te recomendamos adaptarla a tu negocio y hacerla revisar por un profesional legal antes de publicar.</em></p>`;

export const TERMS_TEMPLATE_HTML = `<h2>Términos y Condiciones</h2>
<p><strong>Última actualización: [FECHA]</strong></p>
<p>Al usar la aplicación <strong>[NOMBRE DE LA APP]</strong>, aceptas estos términos y condiciones. Léelos detenidamente.</p>
<h3>1. Descripción del servicio</h3>
<p>[NOMBRE DE LA APP] es una aplicación móvil que permite [DESCRIPCIÓN DEL SERVICIO]. El uso del servicio requiere registrar una cuenta.</p>
<h3>2. Uso aceptable</h3>
<p>Al usar la app, te comprometes a:</p>
<ul>
<li>Proporcionar información veraz al registrarte</li>
<li>Mantener segura la contraseña de tu cuenta</li>
<li>No usar la app para fines ilegales o no autorizados</li>
<li>No intentar acceder a cuentas o datos de otros usuarios</li>
</ul>
<h3>3. Contenido del usuario</h3>
<p>Si la app permite a los usuarios publicar contenido (comentarios, fotos, etc.), eres responsable de lo que publicas. Nos reservamos el derecho de eliminar contenido que infrinja la ley o estos términos.</p>
<h3>4. Modificaciones</h3>
<p>Podemos modificar estos términos en cualquier momento. Las modificaciones entran en vigor al publicarlas. El uso continuado de la app tras la modificación implica aceptación.</p>
<h3>5. Limitación de responsabilidad</h3>
<p>La app se proporciona "tal cual". No nos hacemos responsables de daños indirectos derivados del uso o imposibilidad de uso del servicio, en la medida permitida por la ley aplicable.</p>
<h3>6. Terminación</h3>
<p>Podemos suspender o cerrar tu cuenta si infringes estos términos. Puedes cerrar tu cuenta en cualquier momento desde la pantalla de Mi Cuenta.</p>
<h3>7. Contacto</h3>
<p>Para consultas sobre estos términos, escríbenos a <strong>[EMAIL DE CONTACTO]</strong>.</p>
<p><em>Esta es una plantilla de partida. Te recomendamos adaptarla a tu negocio y hacerla revisar por un profesional legal antes de publicar.</em></p>`;
