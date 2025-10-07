/**
 * Screenshot Capture API アップロードのデバッグ用テストスクリプト
 *
 * 使用方法:
 * node scripts/test-upload-debug.js --pet-id="test-pet-id" --api-url="https://buddies-api.elchika.app"
 */

import { promises as fs } from 'fs'

// 引数の解析
function parseArgs() {
  const args = process.argv.slice(2)
  const params = {
    petId: 'test-pet-debug-001',
    apiUrl: 'https://buddies-api.elchika.app',
  }

  for (const arg of args) {
    if (arg.startsWith('--pet-id=')) {
      params.petId = arg.split('=')[1]
    } else if (arg.startsWith('--api-url=')) {
      params.apiUrl = arg.split('=')[1]
    }
  }

  return params
}

// 小さなテスト用PNG画像をbase64で作成（1x1ピクセルの透明PNG）
function createTestPngBase64() {
  // 1x1 transparent PNG in base64
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
}

async function testUpload() {
  const args = parseArgs()
  const API_URL = args.apiUrl
  const API_KEY = process.env.API_KEY || process.env.PUBLIC_API_KEY

  console.log('🧪 Testing API Upload Debug')
  console.log('📊 Configuration:', {
    apiUrl: API_URL,
    petId: args.petId,
    hasApiKey: !!API_KEY,
  })

  const testImageData = createTestPngBase64()

  console.log('📸 Test image created:', {
    base64Length: testImageData.length,
    sampleData: testImageData.substring(0, 50) + '...',
  })

  const requestPayload = {
    uploads: [
      {
        petId: args.petId,
        imageData: testImageData,
        mimeType: 'image/png',
      },
    ],
  }

  console.log('🔧 Request payload structure:', {
    hasUploads: !!requestPayload.uploads,
    uploadsCount: requestPayload.uploads.length,
    firstUploadKeys: Object.keys(requestPayload.uploads[0]),
    petId: requestPayload.uploads[0].petId,
    imageDataLength: requestPayload.uploads[0].imageData.length,
    mimeType: requestPayload.uploads[0].mimeType,
  })

  const requestBody = JSON.stringify(requestPayload)
  console.log('📦 Final request body size:', requestBody.length, 'bytes')

  try {
    console.log('📡 Sending request to:', `${API_URL}/api/images/upload/batch`)

    const uploadResponse = await fetch(`${API_URL}/api/images/upload/batch`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY || 'test-dummy-key',
        'Content-Type': 'application/json',
        'User-Agent': 'Buddies-Debug-Test/1.0',
      },
      body: requestBody,
    })

    console.log('📡 API Response received:', {
      status: uploadResponse.status,
      statusText: uploadResponse.statusText,
      ok: uploadResponse.ok,
      contentType: uploadResponse.headers.get('content-type'),
      contentLength: uploadResponse.headers.get('content-length'),
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('❌ API upload failed:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        errorText: errorText.substring(0, 1000),
        errorTextLength: errorText.length,
      })
      return false
    }

    const uploadResult = await uploadResponse.json()
    console.log('✅ API Response parsed successfully:', {
      success: uploadResult.success,
      hasData: !!uploadResult.data,
      dataKeys: uploadResult.data ? Object.keys(uploadResult.data) : [],
      requestId: uploadResult.data?.requestId,
      total: uploadResult.data?.total,
      successful: uploadResult.data?.successful,
      failed: uploadResult.data?.failed,
    })

    if (uploadResult.data?.results) {
      console.log(
        '📋 Upload Results:',
        uploadResult.data.results.map((r) => ({
          petId: r.petId,
          success: r.success,
          error: r.error,
          key: r.key,
          size: r.size,
        }))
      )
    }

    return true
  } catch (error) {
    console.error('💥 Request failed with exception:', {
      errorType: error.constructor.name,
      errorMessage: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    })
    return false
  }
}

// メイン実行
console.log('🚀 Starting API Upload Debug Test\n')
testUpload()
  .then((success) => {
    console.log('\n✨ Test completed:', success ? '✅ SUCCESS' : '❌ FAILED')
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
