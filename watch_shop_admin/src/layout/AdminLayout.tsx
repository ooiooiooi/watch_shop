import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboardIcon, PackageIcon, TagsIcon, LogOutIcon, BadgeIcon, LayersIcon, HeadsetIcon, KeyRoundIcon, RadarIcon } from "lucide-react";
import { logoutAdmin } from "../auth/adminAuth";
import { changePassword } from "../api/adminApi";

const nav = [
  { to: "/dashboard", label: "仪表盘", icon: LayoutDashboardIcon },
  { to: "/products", label: "商品管理", icon: PackageIcon },
  { to: "/categories", label: "分类管理", icon: TagsIcon },
  { to: "/brands", label: "品牌管理", icon: BadgeIcon },
  { to: "/models", label: "型号管理", icon: LayersIcon },
  { to: "/visitors", label: "访客记录", icon: RadarIcon },
  { to: "/customer-service", label: "客服配置", icon: HeadsetIcon },
];

export function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div className="h-full min-h-svh text-[var(--text)]">
      <div className="flex min-h-svh">
        <aside className="hidden w-64 shrink-0 border-r border-[var(--line)] bg-[var(--panel)]/95 backdrop-blur md:block">
          <div className="h-14 border-b border-[var(--line)] px-4 flex items-center">
            <Link to="/dashboard" className="font-semibold tracking-wide">
              Watch Shop Admin
            </Link>
          </div>
          <nav className="p-3 space-y-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                    isActive
                      ? "bg-[linear-gradient(180deg,var(--gold-2),var(--gold))] text-[#14110a]"
                      : "text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]",
                  ].join(" ")
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="h-14 border-b border-[var(--line)] bg-[var(--panel)]/70 backdrop-blur px-4 flex items-center gap-3">
            <div className="md:hidden text-sm font-semibold">Admin</div>
            <div className="ml-auto flex items-center gap-2">
              <button
                className="admin-btn admin-btn-ghost inline-flex items-center gap-2"
                onClick={async () => {
                  const oldPassword = window.prompt("请输入当前密码");
                  if (!oldPassword) return;
                  const newPassword = window.prompt("请输入新密码（至少 8 位）");
                  if (!newPassword) return;
                  if (newPassword.trim().length < 8) return window.alert("新密码长度至少 8 位");
                  try {
                    await changePassword(oldPassword, newPassword);
                    window.alert("密码修改成功");
                  } catch {
                    window.alert("密码修改失败，请检查当前密码");
                  }
                }}
              >
                <KeyRoundIcon size={16} />
                修改密码
              </button>
              <button
                className="admin-btn admin-btn-ghost inline-flex items-center gap-2"
                onClick={() => {
                  logoutAdmin();
                  navigate("/login");
                }}
              >
                <LogOutIcon size={16} />
                退出
              </button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <div className="mx-auto w-full max-w-7xl min-w-0">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
