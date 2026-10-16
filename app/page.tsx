export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b">
        <h1 className="text-2xl font-bold text-blue-600">
          DMAT Mock
        </h1>

        <div className="flex gap-4">
          <button className="px-5 py-2 rounded-lg text-gray-700">
            Login
          </button>

          <button className="px-5 py-2 rounded-lg bg-blue-600 text-white">
            Register
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-8 py-20 text-center">
        <h2 className="text-5xl font-bold text-gray-900">
          Prepare for Your DMAT Exam
        </h2>

        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
          Practice with realistic DMAT mock tests, get instant results,
          identify your mistakes, and understand where you need to improve.
        </p>

        <button className="mt-8 px-8 py-4 rounded-xl bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700">
          Start Your Mock Test
        </button>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="p-6 rounded-2xl border">
            <h3 className="text-xl font-semibold">
              Full Mock Test
            </h3>
            <p className="mt-3 text-gray-600">
              Experience a timed exam environment similar to the real test.
            </p>
          </div>

          <div className="p-6 rounded-2xl border">
            <h3 className="text-xl font-semibold">
              Instant Results
            </h3>
            <p className="mt-3 text-gray-600">
              See your score immediately after completing the test.
            </p>
          </div>

          <div className="p-6 rounded-2xl border">
            <h3 className="text-xl font-semibold">
              Mistake Analysis
            </h3>
            <p className="mt-3 text-gray-600">
              See which questions you answered incorrectly and where you need
              more practice.
            </p>
          </div>

        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-blue-600 text-white text-center px-8 py-16">
        <h2 className="text-3xl font-bold">
          Ready to Test Yourself?
        </h2>

        <p className="mt-4">
          Take your first DMAT mock test and know where you stand.
        </p>

        <button className="mt-6 px-8 py-3 bg-white text-blue-600 rounded-xl font-semibold">
          Start Mock Test
        </button>
      </section>
    </main>
  );
}