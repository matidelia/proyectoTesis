// Validación simple pero real (antes solo chequeaba que tuviera un "@" en
// cualquier lado, así que "a@" pasaba). No pretende cubrir el RFC 5322
// completo, solo rechazar los casos claramente inválidos.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function isValidPassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 8;
}
