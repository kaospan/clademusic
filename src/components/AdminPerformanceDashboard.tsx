/**
 * Admin Dashboard - Performance Reports
 * 
 * Displays automated performance test results with charts and analytics.
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ChartErrorBoundary } from '@/components/ui/ChartErrorBoundary';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PerformanceSummary {
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  warning_tests: number;
  avg_duration: number;
  pass_rate: number;
  last_test_run: string;
}

interface SlowFeature {
  test_name: string;
  test_suite: string;
  avg_duration: number;
  last_tested: string;
  failure_count: number;
}

interface TestHistory {
  tested_at: string;
  duration_ms: number;
  status: string;
  threshold_ms: number;
}

interface PerformanceTrend {
  test_name: string;
  avg_duration: number;
  min_duration: number;
  max_duration: number;
  test_count: number;
  pass_rate: number;
}

export default function AdminPerformanceDashboard() {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [slowFeatures, setSlowFeatures] = useState<SlowFeature[]>([]);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [featureHistory, setFeatureHistory] = useState<TestHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const safeTrends = trends.filter(
    (t) =>
      Number.isFinite(t.avg_duration) &&
      Number.isFinite(t.max_duration) &&
      typeof t.test_name === 'string' &&
      t.test_name.trim().length > 0
  );
  const hasTrends = safeTrends.length > 0;

  const safeHistory = featureHistory.filter(
    (h) =>
      Number.isFinite(h.duration_ms) &&
      Number.isFinite(h.threshold_ms) &&
      typeof h.tested_at === 'string' &&
      h.tested_at.trim().length > 0
  );

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const toNumber = (value: unknown): number => {
    const n = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(n as number) ? (n as number) : 0;
  };

  const sanitizeTrends = (rows: PerformanceTrend[] | null | undefined): PerformanceTrend[] => {
    if (!rows) return [];
    return rows
      .filter((row) => row && typeof row.test_name === 'string' && row.test_name.trim().length > 0)
      .map((row) => ({
        ...row,
        avg_duration: toNumber(row.avg_duration),
        min_duration: toNumber(row.min_duration),
        max_duration: toNumber(row.max_duration),
        test_count: toNumber(row.test_count),
        pass_rate: toNumber(row.pass_rate),
      }))
      .filter((row) => Number.isFinite(row.avg_duration) && Number.isFinite(row.max_duration));
  };

  const sanitizeHistory = (rows: TestHistory[] | null | undefined): TestHistory[] => {
    if (!rows) return [];
    return rows
      .filter((row) => row && typeof row.tested_at === 'string' && row.tested_at.trim().length > 0)
      .map((row) => ({
        ...row,
        duration_ms: toNumber(row.duration_ms),
        threshold_ms: toNumber(row.threshold_ms),
      }))
      .filter((row) => Number.isFinite(row.duration_ms) && Number.isFinite(row.threshold_ms));
  };

  const loadPerformanceData = async () => {
    setLoading(true);

    try {
      // Get summary
      const { data: summaryData } = await supabase.rpc('get_performance_summary');
      if (summaryData && summaryData.length > 0) {
        setSummary(summaryData[0]);
      }

      // Get slowest features
      const { data: slowData } = await supabase.rpc('get_slowest_features', { p_limit: 10 });
      setSlowFeatures(slowData || []);

      // Get trends
      const { data: trendsData } = await supabase.rpc('get_performance_trends', { p_days: 30 });
      setTrends(sanitizeTrends(trendsData));
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeatureHistory = async (featureName: string) => {
    const { data } = await supabase.rpc('get_test_history', {
      p_test_name: featureName,
      p_days: 7,
    });
    setFeatureHistory(sanitizeHistory(data));
    setSelectedFeature(featureName);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPerformanceData();
    setRefreshing(false);
  };

  const exportReport = () => {
    const report = {
      summary,
      slowFeatures,
      trends,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="w-8 h-8" />
            Performance Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Automated performance monitoring and analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportReport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.pass_rate}%</div>
              <p className="text-xs text-muted-foreground">
                {summary.passed_tests} / {summary.total_tests} tests passed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.avg_duration}ms</div>
              <p className="text-xs text-muted-foreground">Average response time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Tests</CardTitle>
              <XCircle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{summary.failed_tests}</div>
              <p className="text-xs text-muted-foreground">Require immediate attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Warnings</CardTitle>
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{summary.warning_tests}</div>
              <p className="text-xs text-muted-foreground">Approaching thresholds</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="slowest" className="space-y-4">
        <TabsList>
          <TabsTrigger value="slowest">Slowest Features</TabsTrigger>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="history">Test History</TabsTrigger>
        </TabsList>

        {/* Slowest Features Tab */}
        <TabsContent value="slowest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Top 10 Slowest Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {slowFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => loadFeatureHistory(feature.test_name)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{feature.test_name}</span>
                        <Badge variant="outline">{feature.test_suite}</Badge>
                        {feature.failure_count > 0 && (
                          <Badge variant="destructive">{feature.failure_count} failures</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Last tested: {new Date(feature.last_tested).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{feature.avg_duration}ms</div>
                      <p className="text-xs text-muted-foreground">avg duration</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                30-Day Performance Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasTrends ? (
                <ChartErrorBoundary>
                  <div className="w-full" role="presentation" aria-hidden>
                    <ResponsiveContainer width="100%" height={420}>
                      <BarChart data={safeTrends.slice(0, 15)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="test_name"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          interval={0}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis label={{ value: 'Duration (ms)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="avg_duration" fill="#8884d8" name="Avg Duration" />
                        <Bar dataKey="max_duration" fill="#82ca9d" name="Max Duration" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartErrorBoundary>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No trend data available
                </div>
              )}

              {/* Detailed Table */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Test Name</th>
                      <th className="text-right p-2">Avg</th>
                      <th className="text-right p-2">Min</th>
                      <th className="text-right p-2">Max</th>
                      <th className="text-right p-2">Tests</th>
                      <th className="text-right p-2">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeTrends.map((trend, index) => (
                      <tr key={index} className="border-b hover:bg-accent">
                        <td className="p-2">{trend.test_name}</td>
                        <td className="text-right p-2">{trend.avg_duration}ms</td>
                        <td className="text-right p-2">{trend.min_duration}ms</td>
                        <td className="text-right p-2">{trend.max_duration}ms</td>
                        <td className="text-right p-2">{trend.test_count}</td>
                        <td className="text-right p-2">
                          <Badge variant={trend.pass_rate >= 90 ? 'default' : 'destructive'}>
                            {trend.pass_rate}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Test History</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedFeature
                  ? `Showing 7-day history for: ${selectedFeature}`
                  : 'Click on a feature in "Slowest Features" to view history'}
              </p>
            </CardHeader>
            <CardContent>
              {safeHistory.length > 0 ? (
                <ChartErrorBoundary>
                  <>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={safeHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="tested_at"
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis label={{ value: 'Duration (ms)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value: number) => [`${value}ms`, 'Duration']}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="duration_ms"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name="Duration"
                      />
                      <Line
                        type="monotone"
                        dataKey="threshold_ms"
                        stroke="#ff7300"
                        strokeDasharray="5 5"
                        name="Threshold"
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">
                        {Math.min(...safeHistory.map((h) => h.duration_ms))}ms
                      </p>
                      <p className="text-sm text-muted-foreground">Best Time</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {Math.round(
                          safeHistory.reduce((sum, h) => sum + h.duration_ms, 0) /
                            safeHistory.length
                        )}
                        ms
                      </p>
                      <p className="text-sm text-muted-foreground">Average</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {Math.max(...safeHistory.map((h) => h.duration_ms))}ms
                      </p>
                      <p className="text-sm text-muted-foreground">Worst Time</p>
                    </div>
                  </div>
                  </>
                </ChartErrorBoundary>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No feature selected</p>
                  <p className="text-sm mt-2">
                    Click on a feature in the "Slowest Features" tab to view its history
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
