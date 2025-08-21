import { NextResponse } from 'next/server'

export async function onRequest(context) {
  // Cloudflare Pages用のNext.js Edge Adapter
  return NextResponse.next()
}