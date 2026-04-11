import { notFound } from "next/navigation";
import { CommunitySpaceClient } from "@/components/community/CommunitySpaceClient";
import { getCurrentUserContext } from "@/lib/auth/current-user-role";
import { getSpaceDetails } from "@/lib/community/service";

export const dynamic = "force-dynamic";

export default async function CommunitySpacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ user }, { slug }] = await Promise.all([getCurrentUserContext(), params]);
  if (!user) return notFound();

  const data = await getSpaceDetails(slug, user.id);
  if (!data) return notFound();

  return <CommunitySpaceClient initialData={data} />;
}
