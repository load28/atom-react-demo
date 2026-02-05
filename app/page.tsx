import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">Effect + Atom 데모</h1>
        <div className="space-y-4">
          <Link
            href="/timeline"
            className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h2 className="font-semibold text-blue-600">타임라인 데모</h2>
            <p className="text-sm text-gray-500 mt-1">
              드래그 앤 드롭으로 작업을 관리하는 간트 차트
            </p>
          </Link>
          <Link
            href="/refund"
            className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h2 className="font-semibold text-red-600">환불 프로세스 데모</h2>
            <p className="text-sm text-gray-500 mt-1">
              Effect를 활용한 결제 방식별 환불 조건 처리
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
