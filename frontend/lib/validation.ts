const phoneRegex = /^\+?[0-9]{7,15}$/;

export function validatePhone(phone: string): string | null {
  if (!phone.trim()) return "Phone is required";
  if (!phoneRegex.test(phone.trim())) return "Invalid phone format (e.g. +992900000001)";
  return null;
}

export function validateRequired(value: string, label: string): string | null {
  if (!value.trim()) return `${label} is required`;
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Invalid email format";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  return null;
}
