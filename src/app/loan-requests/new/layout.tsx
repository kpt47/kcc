import { requireUser } from "@/lib/auth";

export default async function LoanRequestsNewLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}
