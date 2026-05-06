import { clearToken, getToken, login } from "../api/adminApi";

export function isAdminAuthed() {
  if (typeof window === "undefined") return false;
  return Boolean(getToken());
}

export async function loginAdmin(username: string, password: string) {
  try {
    const data = await login(username, password);
    return { ok: true as const, mustChangePassword: Boolean(data.mustChangePassword) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "账号或密码错误";
    return { ok: false as const, message: msg || "账号或密码错误" };
  }
}

export function logoutAdmin() {
  clearToken();
}
