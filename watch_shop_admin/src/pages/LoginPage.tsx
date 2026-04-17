import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../auth/adminAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-svh flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl admin-panel p-6">
        <h1 className="text-2xl font-semibold tracking-wide text-[var(--gold-2)]">后台登录</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">默认账号：admin / admin123</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const result = loginAdmin(username.trim(), password);
            if (!result.ok) {
              setError(result.message);
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
          {error && <div className="text-sm text-red-300">{error}</div>}
          <button className="admin-btn admin-btn-primary w-full">
            登录
          </button>
        </form>
      </div>
    </div>
  );
}
