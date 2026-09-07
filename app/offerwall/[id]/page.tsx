import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStoredProvidersAsync, matchesProvider } from "@/lib/providers-store";
import { buildLaunchUrl } from "@/components/PartnerOfferwalls";

export const dynamic = "force-dynamic";

interface OfferwallPageProps {
  params: Promise<{ id: string }>;
}

export default async function OfferwallPage({ params }: OfferwallPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/offerwall/${encodeURIComponent(id)}`);
  }

  const providers = await getStoredProvidersAsync();
  const provider = providers.find((p) => matchesProvider(p, id));

  if (!provider || !provider.active) {
    redirect("/earn");
  }

  const launchUrl = buildLaunchUrl(provider.url, user.id);
  redirect(launchUrl);
}
