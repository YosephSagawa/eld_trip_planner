interface LogSheetsProps {
  logs: any[]
  summary: any
}

export default function LogSheets({ logs, summary }: LogSheetsProps) {
  return (
    <div className="space-y-12">
      <div className="text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-8 rounded-2xl shadow-xl">
        <h2 className="text-4xl font-extrabold">ELD Daily Log Sheets</h2>
        <p className="text-xl mt-3 opacity-90">
          {summary.total_driving_hours} hrs driving • {summary.total_days} days • {summary.fuel_stops} fuel stops
        </p>
      </div>

      {logs.map((log: any, i: number) => (
        <div key={i} className="bg-white border-4 border-black rounded-lg shadow-2xl overflow-hidden print:shadow-none print:border-2">
          <div className="p-8 font-mono text-sm">
            <div className="grid grid-cols-3 border-b-4 border-black pb-4 mb-6">
              <div>
                <strong>Driver:</strong> John Doe<br />
                <strong>License:</strong> 123456789
              </div>
              <div className="text-center">
                <div className="text-2xl font-black">RODS - DAILY LOG</div>
                <div className="text-lg">Date: Day {i + 1}</div>
              </div>
              <div className="text-right">
                <strong>Truck:</strong> 12345<br />
                <strong>Trailer:</strong> 67890
              </div>
            </div>

            {/* Graph */}
            <div className="mb-8">
              <div className="grid grid-cols-24 gap-0 border-4 border-black h-40 relative bg-gray-50">
                {[...Array(24)].map((_, h) => (
                  <div key={h} className="border-r border-gray-500 text-xs text-center pt-1 font-bold">{h}</div>
                ))}
                {log.graph.map((hour: any, j: number) => {
                  const color = hour.status === 'D' ? 'bg-green-600' :
                               hour.status === 'ON' ? 'bg-yellow-500' :
                               hour.status === 'SB' ? 'bg-blue-800' : 'bg-gray-400'
                  return (
                    <div
                      key={j}
                      className={`absolute bottom-0 ${color} h-24 border-r-2 border-white`}
                      style={{ left: `${j * 4.1666}%`, width: '4.1666%' }}
                    />
                  )
                })}
              </div>
              <div className="flex justify-around text-xs mt-2 font-bold">
                <span className="text-green-600">D = Driving</span>
                <span className="text-yellow-600">ON = On Duty</span>
                <span className="text-blue-800">SB = Sleeper</span>
                <span className="text-gray-600">OFF = Off Duty</span>
              </div>
            </div>

            <div className="border-t-4 border-black pt-4">
              <strong className="text-lg">Remarks:</strong>
              <ul className="mt-3 space-y-2 text-sm">
                {log.events.map((e: any, k: number) => (
                  <li key={k}>• {e.remarks} {e.miles && `• ${e.miles} mi`} {e.duration_hours && `• ${e.duration_hours}h`}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}

      <div className="text-center mt-12 print:hidden">
        <button
          onClick={() => window.print()}
          className="bg-black text-white px-12 py-5 rounded-xl text-xl font-bold hover:bg-gray-800 transition shadow-xl"
        >
          Print All Log Sheets
        </button>
      </div>
    </div>
  )
}