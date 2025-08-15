import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('userId')
  const sessionId = searchParams.get('sessionId')

  if (!userId && !sessionId) {
    return NextResponse.json(
      {
        success: false,
        error: 'userId または sessionId が必要です',
      },
      { status: 400 }
    )
  }

  try {
    // モックデータ（実際の実装では外部APIまたはデータベースから取得）
    const stats = {
      totalSwipes: 42,
      likes: 18,
      passes: 20,
      superLikes: 4,
      matches: 7,
    }

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: '統計取得に失敗しました',
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
