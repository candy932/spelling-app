import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const words = await db.word.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(words)
}

export async function POST(request: Request) {
  const { english, chinese } = await request.json()
  if (!english || !chinese) return NextResponse.json({ error: '不能为空' }, { status: 400 })
  
  const existing = await db.word.findFirst({ where: { english: english.toLowerCase().trim() } })
  if (existing) return NextResponse.json({ error: '已存在' }, { status: 400 })
  
  const word = await db.word.create({
    data: { english: english.toLowerCase().trim(), chinese: chinese.trim() }
  })
  return NextResponse.json(word)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少ID' }, { status: 400 })
  await db.word.delete({ where: { id } })
  return NextResponse.json({ success: true })
}