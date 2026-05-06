import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../auth/adminAuth";
import { changePassword } from "../api/adminApi";

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mustChange, setMustChange] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-svh flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl admin-panel p-6">
        <h1 className="text-2xl font-semibold tracking-wide text-[var(--gold-2)]">后台登录</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">默认账号：admin / admin123</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            const result = await loginAdmin(username.trim(), password);
            if (!result.ok) {
              setError(result.message);
              return;
            }
            if (result.mustChangePassword) {
              setMustChange(true);
              setError("首次登录请先修改默认密码");
              return;
            }
            navigate("/dashboard");
          }}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--muted)]" htmlFor="username">
              账号
            </label>
            <input
              id="username"
              className="admin-input w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--muted)]" htmlFor="password">
              密码
            </label>
            <input
              id="password"
              type="password"
              className="admin-input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {mustChange && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--muted)]" htmlFor="new-password">
                  新密码（至少 8 位）
                </label>
                <input
                  id="new-password"
                  type="password"
                  className="admin-input w-full"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--muted)]" htmlFor="confirm-password">
                  确认新密码
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  className="admin-input w-full"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </>
          )}
          {error && <div className="text-sm text-red-300">{error}</div>}
          {!mustChange ? (
            <button className="admin-btn admin-btn-primary w-full">登录</button>
          ) : (
            <button
              type="button"
              className="admin-btn admin-btn-primary w-full"
              onClick={async () => {
                setError(null);
                if (newPassword.length < 8) return setError("新密码长度至少 8 位");
                if (newPassword !== confirmPassword) return setError("两次输入的新密码不一致");
                try {
                  await changePassword(password, newPassword);
                  navigate("/dashboard");
                } catch (e) {
                  const msg = e instanceof Error ? e.message : "修改密码失败";
                  setError(msg);
                }
              }}
            >
              修改密码并进入
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
