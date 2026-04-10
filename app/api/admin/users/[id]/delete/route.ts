import { NextRequest, NextResponse } from 'next/server'
import { deleteUser } from '@/lib/actions/admin'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'Geçersiz kullanıcı ID' }, { status: 400 })
    await deleteUser(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('admin/users/[id]/delete error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 })
  }
}
