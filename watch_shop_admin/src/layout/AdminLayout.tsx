import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboardIcon, PackageIcon, TagsIcon, LogOutIcon, RotateCcwIcon } from "lucide-react";
import { logoutAdmin } from "../auth/adminAuth";
import { resetCatalog } from "../store/catalogStore";

const nav = [
  { to: "/dashboard", label: "仪表盘", icon: LayoutDashboardIcon },
  { to: "/products", label: "商品管理", icon: PackageIcon },
  { to: "/categories", label: "分类管理", icon: TagsIcon },
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
                onClick={() => resetCatalog()}
              >
                <RotateCcwIcon size={16} />
                重置数据
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
