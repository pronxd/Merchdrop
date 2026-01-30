"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AnalyticsData {
  pageviews: { value: number; change: number };
  visitors: { value: number; change: number };
  visits: { value: number; change: number };
  bounceRate: { value: number; change: number };
  avgVisitTime: { value: string; change: number };
  topPages: Array<{ page: string; views: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  devices: { desktop: number; mobile: number; tablet: number };
  countries: Array<{ country: string; visitors: number }>;
}

export default function DashboardClient() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState("7d");

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/analytics?range=${dateRange}`);

      if (!res.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const analyticsData = await res.json();
      setData(analyticsData);
    } catch (err) {
      setError("Failed to load analytics data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/kassycakes");
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Kassy Cakes Analytics
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Your website performance at a glance
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Page Views"
            value={data?.pageviews.value.toLocaleString() || "0"}
            change={data?.pageviews.change || 0}
            icon="📊"
          />
          <StatCard
            title="Unique Visitors"
            value={data?.visitors.value.toLocaleString() || "0"}
            change={data?.visitors.change || 0}
            icon="👥"
          />
          <StatCard
            title="Total Visits"
            value={data?.visits.value.toLocaleString() || "0"}
            change={data?.visits.change || 0}
            icon="🔄"
          />
          <StatCard
            title="Bounce Rate"
            value={`${data?.bounceRate.value || 0}%`}
            change={data?.bounceRate.change || 0}
            icon="⚡"
            inverse
          />
          <StatCard
            title="Avg. Visit Time"
            value={data?.avgVisitTime.value || "0m"}
            change={data?.avgVisitTime.change || 0}
            icon="⏱️"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Pages */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Pages
            </h3>
            <div className="space-y-3">
              {data?.topPages && data.topPages.length > 0 ? (
                data.topPages.map((page, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl">{index + 1}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {page.page}
                      </span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white ml-4">
                      {page.views.toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No data available
                </p>
              )}
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Device Breakdown
            </h3>
            <div className="space-y-4">
              <DeviceBar
                label="Desktop"
                value={data?.devices.desktop || 0}
                total={
                  (data?.devices.desktop || 0) +
                  (data?.devices.mobile || 0) +
                  (data?.devices.tablet || 0)
                }
                icon="💻"
                color="bg-blue-500"
              />
              <DeviceBar
                label="Mobile"
                value={data?.devices.mobile || 0}
                total={
                  (data?.devices.desktop || 0) +
                  (data?.devices.mobile || 0) +
                  (data?.devices.tablet || 0)
                }
                icon="📱"
                color="bg-green-500"
              />
              <DeviceBar
                label="Tablet"
                value={data?.devices.tablet || 0}
                total={
                  (data?.devices.desktop || 0) +
                  (data?.devices.mobile || 0) +
                  (data?.devices.tablet || 0)
                }
                icon="📲"
                color="bg-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Referrers */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Referrers
            </h3>
            <div className="space-y-3">
              {data?.topReferrers && data.topReferrers.length > 0 ? (
                data.topReferrers.map((referrer, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1">
                      {referrer.referrer || "Direct"}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white ml-4">
                      {referrer.count.toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No data available
                </p>
              )}
            </div>
          </div>

          {/* Top Countries */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Countries
            </h3>
            <div className="space-y-3">
              {data?.countries && data.countries.length > 0 ? (
                data.countries.map((country, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {country.country}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {country.visitors.toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No data available
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon,
  inverse = false,
}: {
  title: string;
  value: string;
  change: number;
  icon: string;
  inverse?: boolean;
}) {
  const isPositive = inverse ? change < 0 : change > 0;
  const changeColor = isPositive
    ? "text-green-600 dark:text-green-400"
    : change < 0
    ? "text-red-600 dark:text-red-400"
    : "text-gray-600 dark:text-gray-400";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {change !== 0 && (
          <span className={`text-xs font-medium ${changeColor}`}>
            {change > 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{title}</div>
    </div>
  );
}

function DeviceBar({
  label,
  value,
  total,
  icon,
  color,
}: {
  label: string;
  value: number;
  total: number;
  icon: string;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
        </div>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div
          className={`${color} h-2.5 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
