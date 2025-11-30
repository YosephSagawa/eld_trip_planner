import { useState } from "react";
import Map from "./components/Map";
import LogSheets from "./components/LogSheets";
import axios from "axios";

function App() {
  const [form, setForm] = useState({
    current_location: "Chicago, IL",
    pickup_location: "Dallas, TX",
    dropoff_location: "Los Angeles, CA",
    cycle_used: "20",
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(
        "https://eld-trip-backend-6lpw.onrender.com/api/plan-trip/",
        form
      );
      setResult(res.data);
      console.log("API Response:", res.data);
    } catch (err) {
      alert("Error: Check locations or backend URL");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-10 mt-8">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            ELD Trip Planner
          </h1>
          <p className="text-xl text-gray-600 mt-3">
            Property-Carrying • 70hr/8day Rule
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-2xl p-10 mb-12 border border-gray-200"
        >
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current Location
              </label>
              <input
                required
                type="text"
                value={form.current_location}
                onChange={(e) =>
                  setForm({ ...form, current_location: e.target.value })
                }
                className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-lg"
                placeholder="e.g. Chicago, IL"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Pickup Location
              </label>
              <input
                required
                type="text"
                value={form.pickup_location}
                onChange={(e) =>
                  setForm({ ...form, pickup_location: e.target.value })
                }
                className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-lg"
                placeholder="e.g. Dallas, TX"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Dropoff Location
              </label>
              <input
                required
                type="text"
                value={form.dropoff_location}
                onChange={(e) =>
                  setForm({ ...form, dropoff_location: e.target.value })
                }
                className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-lg"
                placeholder="e.g. Los Angeles, CA"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cycle Hours Used
              </label>
              <input
                required
                type="number"
                min="0"
                max="70"
                value={form.cycle_used}
                onChange={(e) =>
                  setForm({ ...form, cycle_used: e.target.value })
                }
                className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-lg"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-10 w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xl py-5 rounded-xl shadow-lg transform transition hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Planning Route & Logs..." : "Generate Trip Plan"}
          </button>
        </form>

        {/* Results */}
        {result && (
          <>
            <div className="bg-white rounded-2xl shadow-2xl p-8 mb-12 overflow-hidden">
              <h2 className="text-3xl font-bold text-center text-indigo-700 mb-6">
                Route Map
              </h2>
              <Map route={result.route} />
            </div>

            <LogSheets logs={result.daily_logs} summary={result.summary} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
