import { requireUser } from "@/lib/auth";

export default async function ProposalsNewLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}
