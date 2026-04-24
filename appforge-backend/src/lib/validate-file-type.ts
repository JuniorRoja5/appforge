import { fileTypeFromFile } from 'file-type';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
]);
const ALLOWED_DOC_MIMES = new Set([
  ...ALLOWED_IMAGE_MIMES, 'application/pdf',
]);

// SVGs are XML and can contain executable content.
// Reject SVGs with dangerous patterns.
const SVG_DANGEROUS_PATTERNS = [
  /<script[\s>]/i,
  /on\w+\s*=/i,            // onclick, onerror, onload, etc.
  /javascript\s*:/i,        // javascript: URIs
  /data\s*:\s*text\/html/i, // data:text/html embeds
  /<iframe[\s>]/i,
  /<embed[\s>]/i,
  /<object[\s>]/i,
  /<foreignObject[\s>]/i,   // foreignObject can inject arbitrary HTML
];

function validateSvgContent(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('<svg')) {
    fs.unlinkSync(filePath);
    throw new BadRequestException('El archivo no es un SVG válido');
  }
  for (const pattern of SVG_DANGEROUS_PATTERNS) {
    if (pattern.test(content)) {
      fs.unlinkSync(filePath);
      throw new BadRequestException('SVG rechazado: contiene contenido potencialmente peligroso');
    }
  }
}

/**
 * Validate an uploaded file's actual type using magic bytes (not client-provided MIME).
 * Deletes the file and throws BadRequestException if the type is not allowed.
 */
export async function validateFileType(
  filePath: string,
  allowedSet: 'image' | 'document' = 'image',
): Promise<void> {
  const allowed = allowedSet === 'document' ? ALLOWED_DOC_MIMES : ALLOWED_IMAGE_MIMES;
  const result = await fileTypeFromFile(filePath);

  // SVG is XML-based — file-type cannot detect it via magic bytes
  if (!result) {
    if (filePath.toLowerCase().endsWith('.svg')) {
      validateSvgContent(filePath);
      return;
    }
    if (filePath.toLowerCase().endsWith('.pdf')) return; // PDFs edge case
    // Unknown file type — reject
    fs.unlinkSync(filePath);
    throw new BadRequestException('No se pudo verificar el tipo de archivo');
  }

  if (!allowed.has(result.mime)) {
    fs.unlinkSync(filePath);
    throw new BadRequestException(`Tipo de archivo no permitido: ${result.mime}`);
  }
}
