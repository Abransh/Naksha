
// apps/consulatant-dashboard/src/app/dashboard/page.tsx
"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/app/providers";
import { useDashboardMetrics, useRecentSessions } from "@/hooks/useDashboard";
import { useClientSummary } from "@/hooks/useClients";
import Navigator from "@/components/navigation/Navigator";
import { Timeline } from "@/components/ui/timeline";
import { RevenueSplitChart } from "@/components/charts/revenue-split-chart";
import {
  BarChart3,
  ShoppingBag,
  Users,
  FolderOpen,
  ChevronDown,
  Home,
  Bell,
  Plus,
} from "lucide-react";

// Removed SidebarContent - now using Navigator component

export default function Dashboard() {
  const { user } = useAuth();
  const {
    revenue,
    clients,
    sessions,
    services,
    revenueSplit,
    chartData,
    isLoading,
    error,
    timeframe,
    setTimeframe
  } = useDashboardMetrics();
  
  const { sessions: recentSessions, hasData: hasRecentSessions } = useRecentSessions();
  
  // Get more detailed client statistics
  const { 
    summaryStats: clientStats, 
    isLoading: clientStatsLoading,
    formatCurrency: formatClientCurrency 
  } = useClientSummary();

  // Helper function to format currency
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
  
  // Helper function to format percentage change
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  return (
    <ProtectedRoute requireAdminApproval={true}>
      <div className="min-h-screen bg-[var(--main-background)] flex">
        {/* Loading State */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary-100)]"></div>
              <span className="text-[var(--black-60)]">Loading dashboard...</span>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 z-50 max-w-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          </div>
        )}
        {/* Navigation Sidebar */}
        <Navigator />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[88px]">
        {/* Top Navigation */}
        <div className="bg-white">
          <div className="px-4 lg:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Mobile menu handled by Navigator */}
                <div className="lg:hidden">
                  <Navigator />
                </div>
                <h1 className="text-[var(--black-60)] font-poppins text-lg lg:text-xl font-medium">
                  Dashboard
                </h1>
              </div>
              <div className="flex items-center gap-3 lg:gap-5">
                <div className="hidden sm:flex bg-[var(--secondary-20)] rounded-lg px-3 lg:px-4 py-2 items-center gap-2 lg:gap-3">
                  <span className="text-[var(--black-100)] font-inter text-xs lg:text-sm">
                    {user ? `${user.firstName} ${user.lastName}` : "Consultant"}
                  </span>
                  <ChevronDown size={14} className="text-[var(--black-100)]" />
                </div>
                <div className="relative">
                  <Bell size={18} className="text-[var(--primary-100)]" />
                </div>
                <div className="w-7 h-7 lg:w-8 lg:h-8 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
          {/* Breadcrumbs */}
          <div className="hidden sm:block px-4 lg:px-6 py-2 border-t border-[var(--stroke)]">
            <div className="flex items-center gap-2 lg:gap-3 text-xs overflow-x-auto">
              <Home
                size={12}
                className="text-[var(--primary-100)] flex-shrink-0"
              />
              <span className="text-[var(--black-30)] flex-shrink-0">/</span>
              <span className="text-[var(--black-30)] flex-shrink-0">Page</span>
              <span className="text-[var(--black-30)] flex-shrink-0">/</span>
              <span className="text-[var(--black-30)] flex-shrink-0">Page</span>
              <span className="text-[var(--black-30)] flex-shrink-0">/</span>
              <span className="text-[var(--black-30)] flex-shrink-0">Page</span>
              <span className="text-[var(--black-30)] flex-shrink-0">/</span>
              <span className="text-[var(--black-30)] flex-shrink-0">Page</span>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 p-4 lg:p-5 space-y-4 lg:space-y-5">
          {/* Summary Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {/* Sessions Card */}
            <Card className="bg-white border-0 shadow-sm rounded-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                    <BarChart3
                      size={20}
                      className="text-[var(--primary-100)]"
                    />
                  </div>
                  <Timeline 
                    value={timeframe || 'month'} 
                    onChange={setTimeframe || (() => {})} 
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[var(--black-30)] text-sm">Revenue</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        {formatCurrency(revenue.amount)}
                      </span>
                      <span className={`text-xs ${revenue.change >= 0 ? 'text-[var(--action-green)]' : 'text-[var(--action-red)]'}`}>
                        {formatChange(revenue.change)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[var(--black-30)] text-sm">Amount withdrawn</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        {formatCurrency(revenue.withdrawn)}
                      </span>
                      <span className="text-[var(--action-green)] text-xs">
                        +0.00%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clients Card */}
            <Card className="bg-white border-0 shadow-sm rounded-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
                    <Users size={20} className="text-[var(--black-100)]" />
                  </div>
                  <Timeline 
                    value={timeframe || 'month'} 
                    onChange={setTimeframe || (() => {})} 
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[var(--black-30)] text-sm">Total Clients</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        {clientStatsLoading ? '...' : clientStats.totalClients}
                      </span>
                      <span className={`text-xs ${clients.change >= 0 ? 'text-[var(--action-green)]' : 'text-[var(--action-red)]'}`}>
                        {formatChange(clients.change)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[var(--black-30)] text-sm">Active Clients</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        {clientStatsLoading ? '...' : clientStats.activeClients}
                      </span>
                      <span className="text-[var(--black-10)] text-xs">
                        {clientStats.totalClients > 0 ? 
                          `${Math.round((clientStats.activeClients / clientStats.totalClients) * 100)}%` : 
                          '0%'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* All Sessions Card */}
            <Card className="bg-white border-0 shadow-sm rounded-xl md:col-span-2 lg:col-span-1">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
                    <ShoppingBag
                      size={20}
                      className="text-[var(--black-100)]"
                    />
                  </div>
                  <Timeline 
                    value={timeframe || 'month'} 
                    onChange={setTimeframe || (() => {})} 
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[var(--black-30)] text-sm">
                      All Sessions
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        {sessions.all}
                      </span>
                      <span className={`text-xs ${sessions.change >= 0 ? 'text-[var(--action-green)]' : 'text-[var(--action-red)]'}`}>
                        {formatChange(sessions.change)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[var(--black-30)] text-sm">Pending</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        {sessions.pending}
                      </span>
                      <span className="text-[var(--black-10)] text-xs">
                        {sessions.all > 0 ? `${Math.round((sessions.pending / sessions.all) * 100)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[var(--black-30)] text-sm">Completed</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        {sessions.completed}
                      </span>
                      <span className="text-[var(--action-green)] text-xs">
                        {sessions.all > 0 ? `${Math.round((sessions.completed / sessions.all) * 100)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5">
            {/* Left Section */}
            <div className="xl:col-span-2 space-y-4 lg:space-y-5">
              {/* Top Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
                {/* Marketing Chart */}
                <Card className="bg-white border-0 shadow-sm rounded-xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="text-[var(--black-60)] font-inter text-base font-medium">
                        REVENUE SPLIT
                      </h3>
                      <Timeline 
                        value={timeframe || 'month'} 
                        onChange={setTimeframe || (() => {})} 
                      />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--primary-100)]"></div>
                        <span className="text-[var(--black-20)] text-xs">
                          FROM NAKSHA ({formatCurrency(revenueSplit.fromNaksha)})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--primary-50)]"></div>
                        <span className="text-[var(--black-20)] text-xs">
                          MANUALLY ADDED ({formatCurrency(revenueSplit.manuallyAdded)})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--secondary-100)]"></div>
                        <span className="text-[var(--black-20)] text-xs">
                          TOTAL ({formatCurrency(revenueSplit.total)})
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center">
                    <RevenueSplitChart
                      fromNaksha={revenueSplit.fromNaksha}
                      manuallyAdded={revenueSplit.manuallyAdded}
                      total={revenueSplit.total}
                      formatCurrency={formatCurrency}
                    />
                  </CardContent>
                </Card>

                {/* Right Column */}
                <div className="space-y-4 lg:space-y-5">
                  {/* All Services Card */}
                  <Card className="bg-[var(--primary-100)] border-0 shadow-sm rounded-xl text-white">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                          <FolderOpen size={20} className="text-white" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white/70 text-xs">
                            {"{Timeline}"}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <p className="text-white text-sm">All Services</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-white font-poppins text-xl font-medium">
                              {services.all}
                            </span>
                            <span className="text-white/70 text-xs">
                              {formatChange(services.change)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-white text-sm">Active</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-white font-poppins text-xl font-medium">
                              {services.active}
                            </span>
                            <span className="text-white/70 text-xs">
                              {services.all > 0 ? `${Math.round((services.active / services.all) * 100)}%` : '0%'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Abandoned Sessions Card */}
                  <Card className="bg-white border-0 shadow-sm rounded-xl">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
                          <ShoppingBag
                            size={20}
                            className="text-[var(--black-100)]"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--black-10)] text-xs">
                            {"{Timeline}"}
                          </span>
                          <ChevronDown
                            size={12}
                            className="text-[var(--black-10)]"
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <p className="text-[var(--action-red)] text-sm">
                            Abandoned Sessions
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                              {sessions.abandonedPercentage.toFixed(1)}%
                            </span>
                            <span className={`text-xs ${sessions.abandonedPercentage <= 10 ? 'text-[var(--action-green)]' : 'text-[var(--action-red)]'}`}>
                              {sessions.abandonedPercentage <= 10 ? 'Good' : 'High'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[var(--black-30)] text-sm">
                            Client Revenue
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                              {clientStatsLoading ? '...' : formatClientCurrency(clientStats.totalRevenue)}
                            </span>
                            <span className="text-[var(--black-10)] text-xs">
                              {clientStats.totalClients > 0 ? 
                                `Avg: ${formatClientCurrency(clientStats.averageRevenuePerClient)}` : 
                                'No revenue'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Summary Chart */}
              <Card className="bg-white border-0 shadow-sm rounded-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <h3 className="text-[var(--black-60)] font-inter text-base font-medium">
                        Summary
                      </h3>
                      <div className="bg-blue-50 rounded-lg px-3 py-1 flex items-center gap-4">
                        <span className="text-[var(--primary-100)] font-inter text-sm">
                          Sessions
                        </span>
                        <ChevronDown
                          size={16}
                          className="text-[var(--primary-100)]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--black-100)] text-xs">
                        {"{Timeline}"}
                      </span>
                      <ChevronDown
                        size={12}
                        className="text-[var(--black-100)]"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <div className="flex justify-between items-end h-60 min-w-[500px]">
                    <div className="flex flex-col justify-end h-full text-right space-y-9 text-xs text-[var(--black-20)]">
                      <span>10</span>
                      <span>8</span>
                      <span>6</span>
                      <span>4</span>
                      <span>2</span>
                    </div>
                    <div className="flex-1 flex justify-between items-end h-full ml-8">
                      {chartData.length > 0 ? chartData.map((day) => (
                        <div
                          key={day.date}
                          className="flex flex-col items-center gap-4"
                        >
                          <div className="w-3 h-60 bg-gray-100 rounded-full relative">
                            <div
                              className="w-3 bg-[var(--primary-100)] rounded-full absolute bottom-0"
                              style={{
                                height: `${Math.min((day.sessions / 10) * 100, 100)}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-[var(--black-10)]">
                            {day.date}
                          </span>
                        </div>
                      )) : Array.from({ length: 7 }, (_, index) => (
                        <div
                          key={index}
                          className="flex flex-col items-center gap-4"
                        >
                          <div className="w-3 h-60 bg-gray-100 rounded-full relative">
                            <div className="w-3 bg-gray-200 rounded-full absolute bottom-0 h-2"></div>
                          </div>
                          <span className="text-xs text-[var(--black-10)]">
                            Day {index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Sessions */}
            <Card className="bg-white border-0 shadow-sm rounded-xl">
              <CardHeader>
                <h3 className="text-[var(--black-60)] font-inter text-base font-medium">
                  Recent Sessions
                </h3>
              </CardHeader>
              <CardContent>
                {hasRecentSessions ? (
                  <div className="space-y-4">
                    {recentSessions.slice(0, 5).map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-4 border border-[var(--stroke)] rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[var(--primary-100)] rounded-lg flex items-center justify-center">
                              <ShoppingBag size={16} className="text-white" />
                            </div>
                            <div>
                              <h4 className="text-[var(--black-60)] font-medium text-sm">
                                {session.title}
                              </h4>
                              <p className="text-[var(--black-30)] text-xs">
                                {session.clientName}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[var(--black-60)] font-medium text-sm">
                            {formatCurrency(session.amount)}
                          </div>
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            session.status === 'COMPLETED' 
                              ? 'bg-green-100 text-green-800'
                              : session.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {session.status.toLowerCase()}
                          </div>
                        </div>
                      </div>
                    ))}
                    {recentSessions.length > 5 && (
                      <div className="text-center pt-4">
                        <Button variant="outline" className="text-[var(--primary-100)]">
                          View All Sessions
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 lg:py-20">
                    <div className="w-28 h-28 lg:w-35 lg:h-35 bg-[var(--main-background)] rounded-full border border-[var(--grey)] flex items-center justify-center mb-8 lg:mb-10">
                      <ShoppingBag size={40} className="text-[var(--black-10)]" />
                    </div>
                    <div className="text-center space-y-6">
                      <div>
                        <h4 className="text-[var(--black-100)] font-poppins text-lg lg:text-xl font-medium mb-3">
                          No Sessions Yet?
                        </h4>
                        <p className="text-[var(--black-30)] font-inter text-sm max-w-[280px]">
                          Add services to your page and start getting bookings to
                          see here.
                        </p>
                      </div>
                      <Button className="bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white rounded-xl px-6 py-4 font-inter text-base">
                        <Plus size={20} className="mr-2" />
                        New Client
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
