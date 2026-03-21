import { EditEntityPageClient } from "./EditEntityPageClient";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <EditEntityPageClient slug={slug} />;
}
