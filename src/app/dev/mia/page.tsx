import { notFound } from "next/navigation";
import MiaLab from "./MiaLab";

export const metadata = { title: "Mia Lab" };

// Dev-only page for checking Mia's animations. 404s in production.
export default function MiaLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MiaLab />;
}
