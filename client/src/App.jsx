import React, { useState, useEffect } from "react";

const App = () => {
  const [data, setData] = useState(null);
  const [inputVal, setInputVal] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  const fetchData = async () => {
    const res = await fetch("http://localhost:5000/api/today");
    const json = await res.json();
    setData(json);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const submitVote = async () => {
    await fetch("http://localhost:5000/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: data.today.id, value: inputVal }),
    });
    setSubmitted(true);
    fetchData(); // Refresh stats
  };

  if (!data) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6 font-sans">
      <div className="max-w-xl mx-auto space-y-8">
        {/* Main Question Section */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold mb-2">
            How {data.today.x} is too {data.today.x}:{" "}
            <span className="text-blue-600">{data.today.y}</span>?
          </h1>

          <div className="mt-6 space-y-4">
            <input
              type="range"
              min={data.today.min}
              max={data.today.max}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-center items-center gap-3">
              <input
                type="number"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="w-24 text-center text-xl font-semibold border-2 border-gray-200 rounded-lg p-2"
              />
              <span className="text-gray-500">{data.today.unit}</span>
            </div>
            <button
              onClick={submitVote}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition"
            >
              Submit My Answer
            </button>
          </div>
        </section>

        {/* Real-time Stats Section */}
        {submitted && data.stats && (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-500">
            <StatCard label="Average" val={data.stats.average} color="blue" />
            <StatCard label="Median" val={data.stats.median} color="green" />
            <StatCard label="Minimum" val={data.stats.min} color="gray" />
            <StatCard label="Maximum" val={data.stats.max} color="red" />
          </div>
        )}

        {/* Footer Info Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h3 className="text-sm font-bold text-blue-800 uppercase tracking-tight">
              Up Next (Tomorrow)
            </h3>
            <p className="text-lg font-medium">{data.tomorrow}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <h3 className="text-sm font-bold text-purple-800 uppercase tracking-tight">
              Total Participation
            </h3>
            <p className="text-lg font-medium">
              {data.stats?.count || 0} humans
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, val, color }) => (
  <div
    className={`bg-white p-4 rounded-xl border-l-4 border-${color}-500 shadow-sm`}
  >
    <p className="text-xs font-bold text-gray-400 uppercase">{label}</p>
    <p className="text-2xl font-bold">{val}</p>
  </div>
);

export default App;
