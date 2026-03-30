import React, { useState, useEffect, useRef } from "react";

const API_BASE = "https://golden-mean.onrender.com";

/* ─── Stepper ────────────────────────────────────────────────────────────────
   Unified pointer events (mouse + touch via onPointer*) so onClick and
   onTouchStart never conflict.

   - Short press  (pointerup before 400 ms) → single ±1 step
   - Long press   (hold past 400 ms)        → accelerating repeat
   - Centre field → editable number input; clamps + enforces integers on blur
────────────────────────────────────────────────────────────────────────────── */
const Stepper = ({ value, min, max, unit, onChange }) => {
  const holdTimeout = useRef(null);
  const repeatTimeout = useRef(null);
  const didHold = useRef(false);

  const clamp = (n) => Math.min(Math.max(Math.round(n), min), max);

  const applyStep = (dir) => onChange((prev) => clamp(prev + dir));

  const startPress = (dir) => {
    didHold.current = false;

    holdTimeout.current = setTimeout(() => {
      didHold.current = true;
      let speed = 180;

      const tick = () => {
        applyStep(dir);
        speed = Math.max(40, speed * 0.85);
        repeatTimeout.current = setTimeout(tick, speed);
      };
      tick();
    }, 400);
  };

  const endPress = (dir) => {
    clearTimeout(holdTimeout.current);
    clearTimeout(repeatTimeout.current);

    // Only step once if this was a short press (no hold triggered)
    if (!didHold.current) applyStep(dir);
    didHold.current = false;
  };

  const cancelPress = () => {
    clearTimeout(holdTimeout.current);
    clearTimeout(repeatTimeout.current);
    didHold.current = false;
  };

  const btnBase =
    "w-14 h-14 rounded-2xl text-3xl font-bold flex items-center justify-center " +
    "select-none touch-none transition-transform active:scale-95 " +
    "disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-5">
        {/* − button */}
        <button
          className={btnBase + "bg-gray-100 hover:bg-gray-200 text-gray-700"}
          disabled={value <= min}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            startPress(-1);
          }}
          onPointerUp={() => endPress(-1)}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          aria-label="Decrease"
        >
          −
        </button>

        {/* Editable value */}
        <ValueInput
          value={value}
          min={min}
          max={max}
          unit={unit}
          onChange={onChange}
        />

        {/* + button */}
        <button
          className={
            btnBase + "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          }
          disabled={value >= max}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            startPress(1);
          }}
          onPointerUp={() => endPress(1)}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          aria-label="Increase"
        >
          +
        </button>
      </div>

      <p className="text-xs text-gray-400 tabular-nums">
        {min} – {max} {unit} &nbsp;·&nbsp; hold to fast-scroll
      </p>
    </div>
  );
};

/* ─── ValueInput ─────────────────────────────────────────────────────────────
   Shows the current value as large text. Clicking it reveals a number <input>
   so the user can also type directly. Clamps + enforces integers on blur/enter.
────────────────────────────────────────────────────────────────────────────── */
const ValueInput = ({ value, min, max, unit, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const clamp = (n) => Math.min(Math.max(Math.round(n), min), max);

  const commit = (raw) => {
    const n = parseInt(raw, 10);
    onChange(isNaN(n) ? value : clamp(n));
    setEditing(false);
  };

  const openEditor = () => {
    setDraft(String(value));
    setEditing(true);
    // Focus after render
    setTimeout(() => inputRef.current?.select(), 0);
  };

  if (editing) {
    return (
      <div className="flex flex-col items-center min-w-[6rem]">
        <input
          ref={inputRef}
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(draft);
            if (e.key === "Escape") setEditing(false);
            if ([".", ",", "e", "E"].includes(e.key)) e.preventDefault();
          }}
          className="w-24 text-center text-4xl font-extrabold tabular-nums text-gray-800
                     border-b-2 border-blue-500 bg-transparent outline-none leading-none py-1"
          aria-label="Enter value"
        />
        <span className="text-sm text-gray-400 mt-1">{unit}</span>
      </div>
    );
  }

  return (
    <button
      className="flex flex-col items-center min-w-[6rem] group cursor-text"
      onClick={openEditor}
      title="Click to type a value"
      aria-label={`Current value: ${value}. Click to edit.`}
    >
      <span
        className="text-5xl font-extrabold tabular-nums text-gray-800 leading-none
                       group-hover:text-blue-600 transition-colors"
      >
        {value}
      </span>
      <span className="text-xs text-gray-400 mt-1 group-hover:text-blue-400 transition-colors">
        {unit} · tap to type
      </span>
    </button>
  );
};

const Histogram = ({ values = [], stats }) => {
  const { min, max, average, median } = stats;

  // --- Normalize incoming votes ---
  const normalized = values
    .map((v) => {
      if (typeof v === "number") return v;
      if (typeof v === "object" && v !== null) return Number(v.value);
      return NaN;
    })
    .filter((v) => !isNaN(v));

  if (normalized.length === 0) {
    return (
      <div className="bg-white p-5 rounded-2xl border border-gray-100 text-sm text-gray-400">
        No data yet
      </div>
    );
  }

  // --- Histogram config ---
  const BIN_COUNT = 12;
  const range = max - min || 1;
  const binSize = range / BIN_COUNT;

  const bins = Array(BIN_COUNT).fill(0);

  normalized.forEach((v) => {
    let idx = Math.floor((v - min) / binSize);

    if (idx >= BIN_COUNT) idx = BIN_COUNT - 1;
    if (idx < 0) idx = 0;

    bins[idx]++;
  });

  const maxCount = Math.max(...bins, 1);

  const getX = (v) => ((v - min) / range) * 100;

  // --- Marker config (fixed Tailwind issue) ---
  const markers = [
    { label: "Avg", value: average, color: "bg-blue-600" },
    { label: "Median", value: median, color: "bg-green-600" },
    { label: "Min", value: min, color: "bg-gray-600" },
    { label: "Max", value: max, color: "bg-red-600" },
  ];

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100">
      <div className="relative h-56 flex items-end gap-1">
        {/* Bars */}
        {bins.map((count, i) => (
          <div
            key={i}
            className="flex-1 bg-blue-500/70 rounded-t-sm"
            style={{
              height: `${(count / maxCount) * 100}%`,
              minHeight: count > 0 ? "4px" : "0px",
            }}
          />
        ))}

        {/* Overlay markers */}
        {markers.map((m, i) => (
          <div
            key={i}
            className="absolute bottom-0 flex flex-col items-center pointer-events-none"
            style={{
              left: `${getX(m.value)}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className={`w-[2px] h-full ${m.color}`} />
            <span className="text-xs mt-1 text-gray-600 whitespace-nowrap">
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {/* Axis */}
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

/* ─── App ───────────────────────────────────────────────────────────────────── */
const App = () => {
  const [data, setData] = useState(null);
  const [inputVal, setInputVal] = useState(null);

  const fetchData = async () => {
    const res = await fetch(`${API_BASE}/api/today`);
    const json = await res.json();
    console.log("fetchData() API response:", json);
    setData(json);

    setInputVal((prev) => {
      if (prev !== null) return prev;
      return Math.round(
        (parseInt(json.today.min) + parseInt(json.today.max)) / 2
      );
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const submitVote = async () => {
    await fetch(`${API_BASE}/api/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: data.today.id, value: inputVal }),
    });
    fetchData();
  };

  if (!data || inputVal === null)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 bg-gray-50">
        Loading...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col items-center font-sans overflow-y-auto">
      {" "}
      {/* ─── QUESTION (FULL WIDTH, DOMINANT) ─── */}
      <div className="w-full bg-gray-50 py-8 mb-6">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.05] tracking-tight">
            How {data.today.x} is too {data.today.x}:{" "}
            <span className="text-blue-600">{data.today.y}</span>?
          </h1>
        </div>
      </div>
      {/* ─── MAIN CONTENT (CONSTRAINED) ─── */}
      <div className="w-full max-w-xl flex flex-col gap-4">
        {/* INPUT */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="space-y-4">
            <Stepper
              value={inputVal}
              min={data.stats.min}
              max={data.stats.max}
              unit={data.today.unit}
              onChange={setInputVal}
            />
            <button
              onClick={submitVote}
              className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition"
            >
              Submit My Answer
            </button>
          </div>
        </section>

        {/* HISTOGRAM */}
        {data.stats && (
          <Histogram values={data.votes || []} stats={data.stats} />
        )}

        {/* FOOTER INFO */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <h3 className="text-xs font-bold text-blue-800 uppercase tracking-tight">
              Up Next
            </h3>
            <p className="text-base font-medium">{data.tomorrow}</p>
          </div>

          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
            <h3 className="text-xs font-bold text-purple-800 uppercase tracking-tight">
              Participation
            </h3>
            <p className="text-base font-medium">
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
    className={`bg-white p-3 rounded-xl border-l-4 border-${color}-500 shadow-sm`}
  >
    <p className="text-xs font-bold text-gray-400 uppercase">{label}</p>
    <p className="text-xl font-bold">{val}</p>
  </div>
);

export default App;
