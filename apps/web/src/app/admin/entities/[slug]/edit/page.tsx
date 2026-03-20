import { EditEntityPageClient } from "./EditEntityPageClient";

type PageProps = {
  params: {
    slug: string;
  };
};

export default function Page({ params }: PageProps) {
  return <EditEntityPageClient slug={params.slug} />;
}
