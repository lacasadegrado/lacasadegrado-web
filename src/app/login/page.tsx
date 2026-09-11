import type { Metadata } from "next";

import { LoginScreen } from "@/modules/auth/screens/login-screen";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default async function Page(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  return <LoginScreen next={typeof next === "string" ? next : undefined} />;
}
