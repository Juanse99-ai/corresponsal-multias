import { redirect } from "next/navigation";

export default function Home() {
  // El middleware envia a /login si no hay sesion.
  redirect("/panel");
}
