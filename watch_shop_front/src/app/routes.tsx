import { createHashRouter } from "react-router";
import { Layout } from "./components/Layout";
import { HomePage } from "./components/HomePage";
import { CategoryPage } from "./components/CategoryPage";
import { ProductDetailPage } from "./components/ProductDetailPage";

export const router = createHashRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "category", Component: CategoryPage },
      { path: "product/:id", Component: ProductDetailPage },
    ],
  },
]);
