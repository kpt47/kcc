import { requireUser } from "@/lib/auth";

export default async function HouseholdsNewLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}
