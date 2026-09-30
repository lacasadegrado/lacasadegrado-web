import type { Metadata } from "next";

import { getPublicForm } from "@/modules/forms/lib/services/public-form.service";
import { PublicFormScreen } from "@/modules/forms/screens/public-form-screen";

/** Shared by link only: keep these pages out of search results. */
export async function generateMetadata(props: PageProps<"/f/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const form = /^[a-z0-9]{6,40}$/.test(slug) ? await getPublicForm(slug) : null;
  return {
    title: form?.title ?? "Formulario",
    robots: { index: false, follow: false },
  };
}

export default async function Page(props: PageProps<"/f/[slug]">) {
  const { slug } = await props.params;
  return <PublicFormScreen slug={slug} />;
}
