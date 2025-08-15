import { mockDogs } from '@/data/dogs'
import { notFound } from 'next/navigation'
import Image from 'next/image'

type Props = {
  params: { id: string }
}

export default function DogDetailPage({ params }: Props) {
  const dog = mockDogs.find((d) => d.id === params.id)

  if (!dog) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="relative h-96">
            <Image
              src={dog.imageUrl}
              alt={dog.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            <div className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg">
              <span className="text-2xl">🐶</span>
            </div>
          </div>

          <div className="p-6">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{dog.name}</h1>
              <p className="text-xl text-gray-600">{dog.breed}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl mb-2">🎂</div>
                <div className="font-semibold text-gray-800">年齢</div>
                <div className="text-gray-600">{dog.age}歳</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl mb-2">{dog.gender === 'オス' ? '♂️' : '♀️'}</div>
                <div className="font-semibold text-gray-800">性別</div>
                <div className="text-gray-600">{dog.gender}</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl mb-2">📍</div>
                <div className="font-semibold text-gray-800">場所</div>
                <div className="text-gray-600">{dog.location}</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl mb-2">⚖️</div>
                <div className="font-semibold text-gray-800">体重</div>
                <div className="text-gray-600">{dog.weight}kg</div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">性格・特徴</h2>
              <p className="text-gray-600 leading-relaxed">{dog.description}</p>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">健康状態</h2>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  ワクチン接種済み
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  健康チェック済み
                </span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  避妊・去勢手術済み
                </span>
              </div>
            </div>

            <div className="text-center space-y-4">
              <button
                onClick={() => window.close()}
                className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                戻る
              </button>
              <p className="text-sm text-gray-500">
                この子に興味がある場合は、保護団体にお問い合わせください
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
