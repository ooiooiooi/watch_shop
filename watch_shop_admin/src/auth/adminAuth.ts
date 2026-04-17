const TOKEN_KEY = "watch_shop_admin_token";

export function isAdminAuthed() {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(TOKEN_KEY));
}

export function loginAdmin(username: string, password: string) {
  const ok = username === "admin" && password === "admin123";
  if (!ok) return { ok: false as const, message: "账号或密码错误" };
  window.localStorage.setItem(TOKEN_KEY, "ok");
  return { ok: true as const };
}

export function logoutAdmin() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

