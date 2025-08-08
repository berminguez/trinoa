/**
 * Genera un identificador único de 6 caracteres sin vocales
 * para evitar colisiones en nombres de archivos
 * 
 * Usa solo consonantes y números para evitar palabras inapropiadas
 * Caracteres permitidos: bcdfghjklmnpqrstvwxyz0123456789
 */
export function generateFileId(): string {
  // Consonantes sin vocales (a, e, i, o, u)
  const consonants = 'bcdfghjklmnpqrstvwxyz'
  const numbers = '0123456789'
  const chars = consonants + numbers
  
  let result = ''
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    result += chars[randomIndex]
  }
  
  return result
}

/**
 * Añade un identificador único al nombre de archivo antes de la extensión
 * 
 * Ejemplo:
 * - "documento.pdf" → "documento-k3f9h2.pdf"
 * - "imagen.jpg" → "imagen-p7t4m6.jpg"
 * - "archivo_sin_extension" → "archivo_sin_extension-b8n5r1"
 */
export function addFileId(filename: string): string {
  const fileId = generateFileId()
  
  // Buscar la última aparición del punto (para manejar archivos como "archivo.backup.pdf")
  const lastDotIndex = filename.lastIndexOf('.')
  
  if (lastDotIndex === -1) {
    // No hay extensión, añadir al final con guion
    return `${filename}-${fileId}`
  }
  
  // Separar nombre y extensión
  const name = filename.substring(0, lastDotIndex)
  const extension = filename.substring(lastDotIndex)
  
  return `${name}-${fileId}${extension}`
}

/**
 * Extrae el nombre base de un archivo sin el identificador único
 * 
 * Ejemplo:
 * - "documento-k3f9h2.pdf" → "documento.pdf"
 * - "imagen-p7t4m6.jpg" → "imagen.jpg"
 */
export function removeFileId(filename: string): string {
  // Patrón para identificar el ID al final del nombre (antes de la extensión)
  // Formato: -[6 caracteres sin vocales][.extensión opcional]
  const pattern = /-[bcdfghjklmnpqrstvwxyz0-9]{6}(\.|$)/i
  
  return filename.replace(pattern, (match, dotOrEnd) => {
    return dotOrEnd === '.' ? '.' : ''
  })
}