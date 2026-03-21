import { ProposalReviewClient } from "./ProposalReviewClient";

type PageProps = {
  params: Promise<{
    proposalId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { proposalId } = await params;
  return <ProposalReviewClient proposalId={proposalId} />;
}
