import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "City progress",
  description:
    "An illustrative demonstration of how New York City's public-restroom goal could be tracked through 2035.",
};

const progressPoints = [
  { count: 500, label: "Illustrative historical count", year: 2010 },
  { count: 620, label: "Illustrative historical count", year: 2015 },
  { count: 760, label: "Illustrative historical count", year: 2020 },
  { count: 950, label: "Illustrative historical count", year: 2025 },
  { count: 2_100, label: "Proposal target", year: 2035 },
] as const;

const chart = {
  height: 430,
  left: 72,
  right: 736,
  top: 42,
  bottom: 360,
  maxCount: 2_200,
} as const;

const historicalPoints = progressPoints.slice(0, -1);
const targetPoint = progressPoints.at(-1)!;
const firstYear = progressPoints[0].year;
const lastYear = targetPoint.year;

function chartX(year: number) {
  return chart.left + ((year - firstYear) / (lastYear - firstYear)) * (chart.right - chart.left);
}

function chartY(count: number) {
  return chart.bottom - (count / chart.maxCount) * (chart.bottom - chart.top);
}

function formatCount(count: number) {
  return new Intl.NumberFormat("en-US").format(count);
}

export default function CityProgressPage() {
  const historicalLine = historicalPoints
    .map(({ count, year }) => `${chartX(year)},${chartY(count)}`)
    .join(" ");
  const targetLine = `${chartX(historicalPoints.at(-1)!.year)},${chartY(
    historicalPoints.at(-1)!.count,
  )} ${chartX(targetPoint.year)},${chartY(targetPoint.count)}`;
  const yTicks = [0, 500, 1_000, 1_500, 2_000];

  return (
    <main id="main-content" className="site-main progress-page">
      <header className="progress-header">
        <div>
          <p className="kicker">The public record · Demonstration</p>
          <h1>Following the city&apos;s promise</h1>
          <p className="dek">
            A sample view of how progress toward the proposal&apos;s goal of 2,100
            public restrooms by 2035 could be reported over time.
          </p>
        </div>

        <aside className="progress-goal" aria-label="2035 proposal target">
          <p className="progress-goal-label">Proposal target</p>
          <p className="progress-goal-number">2,100</p>
          <p>public restrooms by 2035</p>
        </aside>
      </header>

      <aside className="sample-warning" aria-labelledby="sample-warning-title">
        <p id="sample-warning-title">Illustrative figures - not city statistics</p>
        <p>
          The historical counts below are invented sample data for this working
          demonstration. They have not been verified against official New York
          City records. Only the proposal&apos;s stated target of 2,100 restrooms by
          2035 is presented as a goal.
        </p>
      </aside>

      <section className="progress-section" aria-labelledby="progress-chart-heading">
        <div className="progress-section-heading">
          <div>
            <p className="kicker">Illustrative timeline</p>
            <h2 id="progress-chart-heading">The path to 2,100</h2>
          </div>
          <div className="progress-legend" aria-label="Chart legend">
            <span><i className="legend-line legend-history" />Sample history</span>
            <span><i className="legend-line legend-target" />Path to target</span>
          </div>
        </div>

        <figure className="progress-figure">
          <div className="progress-chart-scroll" tabIndex={0} aria-label="Scrollable chart area">
            <svg
              className="progress-chart"
              role="img"
              viewBox={`0 0 800 ${chart.height}`}
              aria-labelledby="progress-chart-title progress-chart-description"
            >
              <title id="progress-chart-title">
                Illustrative public-restroom counts from 2010 to the 2035 target
              </title>
              <desc id="progress-chart-description">
                Sample historical counts rise from 500 in 2010 to 950 in 2025.
                A dashed line continues to the proposal target of 2,100 in 2035.
                The same values appear in the table below.
              </desc>

              {yTicks.map((tick) => {
                const y = chartY(tick);
                return (
                  <g key={tick}>
                    <line className="chart-grid-line" x1={chart.left} x2={chart.right} y1={y} y2={y} />
                    <text className="chart-axis-label" x={chart.left - 14} y={y + 4} textAnchor="end">
                      {formatCount(tick)}
                    </text>
                  </g>
                );
              })}

              <line className="chart-axis" x1={chart.left} x2={chart.left} y1={chart.top} y2={chart.bottom} />
              <line className="chart-axis" x1={chart.left} x2={chart.right} y1={chart.bottom} y2={chart.bottom} />

              <polyline className="chart-history-line" points={historicalLine} />
              <polyline className="chart-target-line" points={targetLine} />

              {progressPoints.map((point) => {
                const x = chartX(point.year);
                const y = chartY(point.count);
                const isTarget = point === targetPoint;
                return (
                  <g key={point.year}>
                    <circle className={isTarget ? "chart-point chart-point-target" : "chart-point"} cx={x} cy={y} r={isTarget ? 8 : 6} />
                    <text className={isTarget ? "chart-value chart-target-value" : "chart-value"} x={x} y={y - 17} textAnchor={isTarget ? "end" : "middle"}>
                      {formatCount(point.count)}
                    </text>
                    <text className="chart-year" x={x} y={chart.bottom + 30} textAnchor="middle">
                      {point.year}
                    </text>
                    {isTarget ? (
                      <text className="chart-target-label" x={x} y={y + 27} textAnchor="end">
                        proposal target
                      </text>
                    ) : null}
                  </g>
                );
              })}

              <text className="chart-y-title" transform="rotate(-90 18 201)" x={18} y={201} textAnchor="middle">
                Public restrooms
              </text>
            </svg>
          </div>
          <figcaption>
            Solid line: illustrative historical counts. Dashed line: the distance
            from the final sample count to the proposal&apos;s 2035 target.
          </figcaption>
        </figure>
      </section>

      <section className="progress-table-section" aria-labelledby="progress-table-heading">
        <div>
          <p className="kicker">Text equivalent</p>
          <h2 id="progress-table-heading">Chart data</h2>
          <p>
            This table repeats every value shown in the chart for readers who
            prefer a text view.
          </p>
        </div>

        <div className="progress-table-wrap">
          <table className="progress-table">
            <caption>Illustrative public-restroom timeline and proposal target</caption>
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Restrooms</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {progressPoints.map((point) => (
                <tr key={point.year}>
                  <th scope="row">{point.year}</th>
                  <td>{formatCount(point.count)}</td>
                  <td>{point.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="inventory-boundary" aria-labelledby="inventory-boundary-title">
        <p className="brief-label" id="inventory-boundary-title">A separate measure</p>
        <p>
          These fixtures are independent of The Loo York Times restroom inventory.
          Adding or approving a listing does not change this chart or imply progress
          toward the citywide target.
        </p>
      </aside>
    </main>
  );
}
