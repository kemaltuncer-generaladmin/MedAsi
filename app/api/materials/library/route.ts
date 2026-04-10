import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listLibraryFiles } from "@/lib/gdrive/service-account";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const files = await listLibraryFiles(30).catch(() => []);
  return NextResponse.json({
    files,
    permissions: {
      readOnly: true,
      canDelete: false,
      canRename: false,
      canUpload: false,
    },
  });
}

