import Link from "next/link";

export default function CTASection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900">
          지금 바로 시작하세요
        </h2>
        <p className="mt-4 text-gray-500">
          매일 반복하는 수동 작업, 더 이상 참을 필요 없습니다
        </p>
        <div className="mt-8">
          <Link
            href="/register"
            className="inline-block px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            무료로 시작하기
          </Link>
        </div>
      </div>
    </section>
  );
}
