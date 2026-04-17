import { createHashRouter, redirect } from "react-router-dom";
import { isAdminAuthed } from "./auth/adminAuth";
import { AdminLayout } from "./layout/AdminLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ProductsPage } from "./pages/ProductsPage";
import { CategoriesPage } from "./pages/CategoriesPage";

function requireAdmin() {
  if (!isAdminAuthed()) throw redirect("/login");
  return null;
}

function redirectIfAuthed() {
  if (isAdminAuthed()) throw redirect("/dashboard");
  return null;
}

export const router = createHashRouter([
  { path: "/login", loader: redirectIfAuthed, Component: LoginPage },
  {
    path: "/",
    loader: requireAdmin,
    Component: AdminLayout,
    children: [
      { index: true, loader: () => redirect("/dashboard") },
      { path: "dashboard", Component: DashboardPage },
      { path: "products", Component: ProductsPage },
      { path: "categories", Component: CategoriesPage },
    ],
  },
]);
