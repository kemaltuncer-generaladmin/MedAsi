import { NextRequest, NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/community/guards";
import { getUserChats, markChatAsRead, sendGroupMessage } from "@/lib/community/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSignedInUser();
  if (auth.error) return auth.error;

  const chats = await getUserChats(auth.user.id);
  return NextResponse.json({ chats });
}

export async function POST(request: NextRequest) {
  const auth = await requireSignedInUser();
  if (auth.error) return auth.error;

  const body = await request.json();

  if (body.action === "mark-read") {
    const result = await markChatAsRead(auth.user.id, body.chatId);
    return NextResponse.json(result);
  }

  const message = await sendGroupMessage(auth.user.id, {
    chatId: body.chatId,
    title: body.title,
    spaceId: body.spaceId,
    memberIds: Array.isArray(body.memberIds) ? body.memberIds : [],
    body: body.body,
    replyToMessageId: body.replyToMessageId,
  });

  return NextResponse.json({ message }, { status: 201 });
}
