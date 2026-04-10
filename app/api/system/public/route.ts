import { NextResponse } from "next/server";
import { getPublicSystemConfigFromDb } from "@/lib/system-settings";

export async function GET() {
  return NextResponse.json(await getPublicSystemConfigFromDb());
}
