export const isStudentLoginValue = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return false;

  if (trimmed.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(trimmed);
  }

  return /^[A-Za-z]{4}\d{7}$/i.test(trimmed) || /^[A-Za-z]{2,4}\d{5,7}$/i.test(trimmed);
};

export const normalizeStudentLogin = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }

  return trimmed.toUpperCase();
};
