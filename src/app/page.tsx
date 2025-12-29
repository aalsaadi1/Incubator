export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-6xl font-bold text-white mb-4">
            The <span className="text-blue-400">Gatekeeper</span>
          </h1>
          <p className="text-2xl text-slate-300 mb-8">
            Don't build a pitch deck. Build a Score.
          </p>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            The first AI-native incubator that proves you are worth funding through
            ruthless execution, real validation, and an Investor Ready Score.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="text-4xl mb-4">🔥</div>
              <h3 className="text-xl font-bold text-white mb-2">Reality Check</h3>
              <p className="text-slate-300">
                AI Idea Shredder attacks your concept. Pass the test or pivot.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-white mb-2">Forced Execution</h3>
              <p className="text-slate-300">
                Time-boxed development. Launch in 2 weeks or we launch for you.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-white mb-2">Investor Score</h3>
              <p className="text-slate-300">
                Real-time IRS (0-1000). Investors fund the score, not the story.
              </p>
            </div>
          </div>

          <div className="mt-16 space-y-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors">
              Start Your Reality Check
            </button>
            <p className="text-slate-400 text-sm">
              No fluff. No false hope. Just brutal honesty and forced progress.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
