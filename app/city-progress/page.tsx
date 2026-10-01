import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "City progress",
  description:
    "Track The Loo York Times published restroom inventory against New York City's goal of 2,100 public restrooms by 2035.",
};

type ProgressPoint = {
  count: number;
  label: string;
  year: number;
};

const targetPoint: ProgressPoint = {
  count: 2_100,
  label: "Proposal target",
  year: 2035,
};

const chart = {
  height: 430,
  left: 72,
  right: 736,
  top: 42,
  bottom: 360,
} as const;

function chartX(year: number, firstYear: number, lastYear: number) {
  return chart.left + ((year - firstYear) / (lastYear - firstYear)) * (chart.right - chart.left);
}

function chartY(count: number, maxCount: number) {
  return chart.bottom - (count / maxCount) * (chart.bottom - chart.top);
}

function formatCount(count: number) {
  return new Intl.NumberFormat("en-US").format(count);
}

function inventoryPoints(publicationDates: string[]): ProgressPoint[] {
  const countByYear = new Map<number, number>();

  for (const publishedAt of publicationDates) {
    const year = new Date(publishedAt).getUTCFullYear();
    if (Number.isFinite(year)) countByYear.set(year, (countByYear.get(year) ?? 0) + 1);
  }

  let cumulativeCount = 0;
  return [...countByYear.entries()]
    .sort(([yearA], [yearB]) => yearA - yearB)
    .map(([year, count]) => {
      cumulativeCount += count;
      return { count: cumulativeCount, label: "Published inventory", year };
    });
}

export default async function CityProgressPage() {
  let publicationDates: string[] | null = null;

  try {
    const supabase = await createClient();
    const pageSize = 1_000;
    const records: { published_at: string }[] = [];

    for (let start = 0; ; start += pageSize) {
      const { data, error } = await supabase
        .from("restrooms")
        .select("published_at")
        .eq("publication_status", "published")
        .order("published_at")
        .range(start, start + pageSize - 1);

      if (error) throw error;
      records.push(...((data ?? []) as { published_at: string }[]));
      if (!data || data.length < pageSize) break;
    }

    publicationDates = records.map(({ published_at }) => published_at);
  } catch {
    publicationDates = null;
  }

  const currentYear = new Date().getUTCFullYear();
  const historicalPoints = publicationDates === null
    ? []
    : inventoryPoints(publicationDates);
  const plottedInventoryPoints = historicalPoints.length > 0
    ? historicalPoints
    : [{ count: 0, label: "Published inventory", year: currentYear }];
  const progressPoints = [...plottedInventoryPoints, targetPoint];
  const firstYear = Math.min(plottedInventoryPoints[0].year, targetPoint.year - 1);
  const lastYear = Math.max(targetPoint.year, plottedInventoryPoints.at(-1)!.year);
  const maxCount = Math.ceil(
    Math.max(targetPoint.count, plottedInventoryPoints.at(-1)!.count) / 500,
  ) * 500;
  const yTicks = Array.from({ length: maxCount / 500 + 1 }, (_, index) => index * 500);
  const historicalLine = plottedInventoryPoints
    .map(({ count, year }) => `${chartX(year, firstYear, lastYear)},${chartY(count, maxCount)}`)
    .join(" ");
  const latestInventoryPoint = plottedInventoryPoints.at(-1)!;
  const targetLine = `${chartX(latestInventoryPoint.year, firstYear, lastYear)},${chartY(
    latestInventoryPoint.count,
    maxCount,
  )} ${chartX(targetPoint.year, firstYear, lastYear)},${chartY(targetPoint.count, maxCount)}`;

  return (
    <main id="main-content" className="site-main progress-page">
      <header className="progress-header">
        <div>
          <p className="kicker">The public record</p>
          <h1>Following the city&apos;s promise</h1>
          <p className="dek">
            The Loo York Times published restroom inventory, measured against the
            proposal&apos;s goal of 2,100 public restrooms by 2035.
          </p>
        </div>

        <aside className="progress-goal" aria-label="2035 proposal target">
          <p className="progress-goal-label">Proposal target</p>
          <p className="progress-goal-number">2,100</p>
          <p>public restrooms by 2035</p>
        </aside>
      </header>

      {publicationDates === null ? (
        <p className="data-error" role="status">
          The published restroom inventory is temporarily unavailable. Please try again shortly.
        </p>
      ) : (
        <>
          <section className="progress-section" aria-labelledby="progress-chart-heading">
            <div className="progress-section-heading">
              <div>
                <p className="kicker">Published inventory</p>
                <h2 id="progress-chart-heading">The path to 2,100</h2>
              </div>
              <div className="progress-legend" aria-label="Chart legend">
                <span><i className="legend-line legend-history" />Loo York Times inventory</span>
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
                    Published restroom inventory and the 2035 target
                  </title>
                  <desc id="progress-chart-description">
                    The Loo York Times inventory contains {formatCount(latestInventoryPoint.count)}
                    {" published "}{latestInventoryPoint.count === 1 ? "listing" : "listings"} through {latestInventoryPoint.year}.
                    A dashed line continues to the proposal target of 2,100 in 2035.
                    The same values appear in the table below.
                  </desc>

                  {yTicks.map((tick) => {
                    const y = chartY(tick, maxCount);
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
                    const x = chartX(point.year, firstYear, lastYear);
                    const y = chartY(point.count, maxCount);
                    const isTarget = point === targetPoint;
                    return (
                      <g key={`${point.label}-${point.year}`}>
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
                    Published listings
                  </text>
                </svg>
              </div>
              <figcaption>
                Solid line: cumulative listings in The Loo York Times inventory by publication year.
                Dashed line: the distance from the current inventory to the proposal&apos;s 2035 target.
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
                <caption>Published restroom inventory and proposal target</caption>
                <thead>
                  <tr>
                    <th scope="col">Year</th>
                    <th scope="col">Restrooms</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {progressPoints.map((point) => (
                    <tr key={`${point.label}-${point.year}`}>
                      <th scope="row">{point.year}</th>
                      <td>{formatCount(point.count)}</td>
                      <td>{point.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
