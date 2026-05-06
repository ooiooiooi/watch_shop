import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { HomePage } from "./components/HomePage";
import { CategoryPage } from "./components/CategoryPage";
import { ProductDetailPage } from "./components/ProductDetailPage";
import { AboutPage } from "./components/AboutPage";
import { RouteErrorPage } from "./components/RouteErrorPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, Component: HomePage },
      { path: "category", Component: CategoryPage },
      { path: "about", Component: AboutPage },
      { path: "product/:id", Component: ProductDetailPage },
    ],
  },
]);
