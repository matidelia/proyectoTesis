import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidPassword } from '@/lib/validation';

describe('isValidEmail', () => {
  it('accepts a well-formed email', () => {
    expect(isValidEmail('matias@example.com')).toBe(true);
  });

  it('accepts emails with subdomains and plus-tags', () => {
    expect(isValidEmail('user+tag@mail.example.com.ar')).toBe(true);
  });

  it('rejects an email without a domain extension (the original bug)', () => {
    // Antes del fix, "a@" pasaba porque solo se chequeaba que incluyera "@".
    expect(isValidEmail('a@')).toBe(false);
  });

  it('rejects an email without "@"', () => {
    expect(isValidEmail('matias.example.com')).toBe(false);
  });

  it('rejects an email with spaces', () => {
    expect(isValidEmail('mat ias@example.com')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('accepts a password with exactly 8 characters', () => {
    expect(isValidPassword('12345678')).toBe(true);
  });

  it('accepts a longer password', () => {
    expect(isValidPassword('unaContraseñaLarga')).toBe(true);
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(isValidPassword('1234567')).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(isValidPassword('')).toBe(false);
  });
});
