import { ProposalReviewClient } from "./ProposalReviewClient";

type PageProps = {
  params: {
    proposalId: string;
  };
};

export default function Page({ params }: PageProps) {
  return <ProposalReviewClient proposalId={params.proposalId} />;
}
