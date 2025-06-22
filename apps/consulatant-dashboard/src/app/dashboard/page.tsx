"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/app/providers";
import {
  BarChart3,
  ShoppingBag,
  Users,
  FolderOpen,
  MessageCircle,
  Settings,
  LogOut,
  Headphones,
  Gift,
  ChevronDown,
  ChevronRight,
  Home,
  Bell,
  Plus,
  Menu,
} from "lucide-react";

const SidebarContent = () => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      {/* Logo */}
      <div className="p-8">
        <div className="w-[179px] h-[74px] bg-gray-200 rounded-lg flex items-center justify-center">
          <span className="text-sm text-gray-500">Company Logo</span>
        </div>
      </div>

    {/* Navigation Menu */}
    <div className="flex-1 px-8">
      <nav className="space-y-6">
        {/* Active Dashboard Item */}
        <div className="bg-[var(--primary-100)] rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 text-white">
              <BarChart3 size={20} />
            </div>
            <span className="text-white font-inter text-sm">Dashboard</span>
          </div>
        </div>

        {/* Sessions */}
        <div className="flex items-center gap-4 pl-5 py-2">
          <ShoppingBag size={20} className="text-[var(--black-50)]" />
          <span className="text-[var(--black-50)] font-inter text-sm flex-1">
            Sessions
          </span>
          <Badge className="bg-[var(--secondary-100)] text-[var(--black-100)] text-xs px-2 py-1 rounded-full">
            3
          </Badge>
        </div>

        {/* Clients */}
        <div className="flex items-center gap-4 pl-5 py-2">
          <Users size={20} className="text-[var(--black-50)]" />
          <span className="text-[var(--black-50)] font-inter text-sm">
            Clients
          </span>
        </div>

        {/* Quotations */}
        <div className="flex items-center gap-4 pl-5 py-2">
          <FolderOpen size={20} className="text-[var(--black-50)]" />
          <span className="text-[var(--black-50)] font-inter text-sm">
            Quotations
          </span>
        </div>

        {/* Conversations */}
        <div className="flex items-center gap-4 pl-5 py-2">
          <MessageCircle size={20} className="text-[var(--black-50)]" />
          <span className="text-[var(--black-50)] font-inter text-sm flex-1">
            Conversations
          </span>
          <Badge className="bg-[var(--secondary-100)] text-[var(--black-100)] text-xs px-2 py-1 rounded-full">
            16
          </Badge>
        </div>

        {/* Settings */}
        <div className="flex items-center gap-4 pl-5 py-2">
          <Settings size={20} className="text-[var(--black-50)]" />
          <span className="text-[var(--black-50)] font-inter text-sm">
            Settings
          </span>
        </div>
      </nav>

      {/* Contact Support */}
      <div className="mt-8 bg-gray-100 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <Headphones size={20} className="text-[var(--black-100)]" />
          <span className="text-[var(--black-100)] font-inter text-sm">
            Contact Support
          </span>
        </div>
      </div>

      {/* Gift Banner */}
      <div className="mt-5 bg-[var(--secondary-20)] rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Gift size={20} className="text-[var(--black-100)] mt-1" />
          <div className="flex-1">
            <p className="text-[var(--black-100)] font-inter text-sm font-medium">
              Free Gift Awaits You!
            </p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[var(--black-40)] font-inter text-xs">
                Upgrade your account
              </p>
              <ChevronRight size={12} className="text-[var(--black-40)]" />
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Logout */}
      <div className="p-8">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 hover:bg-red-50 rounded-lg transition-colors w-full"
        >
          <LogOut size={20} className="text-[var(--action-red)]" />
          <span className="text-[var(--action-red)] font-inter text-sm">
            Logout
          </span>
        </button>
      </div>
    </>
  );
};

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <ProtectedRoute requireAdminApproval={true}>
      <div className="min-h-screen bg-[var(--main-background)] flex">
        {/* Desktop Sidebar */}
        <div className="w-80 lg:w-72 xl:w-80 bg-white min-h-screen flex-shrink-0 flex flex-col hidden lg:flex">
          <SidebarContent />
        </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation */}
        <div className="bg-white">
          <div className="px-4 lg:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Mobile menu button */}
                <Sheet>
                  <SheetTrigger asChild>
                    <button className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                      <Menu size={20} className="text-[var(--black-60)]" />
                    </button>
                  </SheetTrigger>
             
                  <SheetContent side="left" className="w-80 p-0 bg-white">
                    <div className="flex flex-col h-full">
                      <SidebarContent />
                    </div>
                  </SheetContent>
                </Sheet>
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
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--black-10)] text-xs">
                      {"{Timeline}"}
                    </span>
                    <ChevronDown size={12} className="text-[var(--black-10)]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[var(--black-30)] text-sm">Sessions</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        {"{Amount}"}
                      </span>
                      <span className="text-[var(--action-green)] text-xs">
                        +0.00%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[var(--black-30)] text-sm">Clients</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        0
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
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--black-10)] text-xs">
                      {"{Timeline}"}
                    </span>
                    <ChevronDown size={12} className="text-[var(--black-10)]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[var(--black-30)] text-sm">Clients</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        0
                      </span>
                      <span className="text-[var(--action-green)] text-xs">
                        +0.00%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[var(--black-30)] text-sm">Active</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        0
                      </span>
                      <span className="text-[var(--action-green)] text-xs">
                        +0.00%
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
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--black-10)] text-xs">
                      {"{Timeline}"}
                    </span>
                    <ChevronDown size={12} className="text-[var(--black-10)]" />
                  </div>
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
                        0
                      </span>
                      <span className="text-[var(--action-green)] text-xs">
                        +0.00%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[var(--black-30)] text-sm">Pending</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        0
                      </span>
                      <span className="text-[var(--action-green)] text-xs">
                        +0.00%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[var(--black-30)] text-sm">Completed</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        0
                      </span>
                      <span className="text-[var(--action-green)] text-xs">
                        +0.00%
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
                        Marketing
                      </h3>
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
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--primary-100)]"></div>
                        <span className="text-[var(--black-20)] text-xs">
                          Acquisition
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--primary-50)]"></div>
                        <span className="text-[var(--black-20)] text-xs">
                          Bookings
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--secondary-100)]"></div>
                        <span className="text-[var(--black-20)] text-xs">
                          Retention
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center">
                    <div className="w-40 h-40 lg:w-52 lg:h-52 rounded-full border-[24px] lg:border-[32px] border-gray-100 flex items-center justify-center">
                      <span className="text-[var(--black-30)] text-sm">
                        No data
                      </span>
                    </div>
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
                              0
                            </span>
                            <span className="text-white/70 text-xs">
                              +0.00%
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-white text-sm">Active</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-white font-poppins text-xl font-medium">
                              0
                            </span>
                            <span className="text-white/70 text-xs">
                              +0.00%
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
                              0%
                            </span>
                            <span className="text-[var(--action-green)] text-xs">
                              +0.00%
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[var(--black-30)] text-sm">
                            Clients
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                              0
                            </span>
                            <span className="text-[var(--action-green)] text-xs">
                              +0.00%
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
                      <span>100k</span>
                      <span>80k</span>
                      <span>60k</span>
                      <span>40k</span>
                      <span>20k</span>
                    </div>
                    <div className="flex-1 flex justify-between items-end h-full ml-8">
                      {[
                        "Sept 10",
                        "Sept 11",
                        "Sept 12",
                        "Sept 13",
                        "Sept 14",
                        "Sept 15",
                        "Sept 16",
                      ].map((date, index) => (
                        <div
                          key={date}
                          className="flex flex-col items-center gap-4"
                        >
                          <div className="w-3 h-60 bg-gray-100 rounded-full relative">
                            <div
                              className="w-3 bg-transparent rounded-full absolute bottom-0"
                              style={{
                                height: `${[15, 35, 60, 20, 80, 45, 80][index]}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-[var(--black-10)]">
                            {date}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Sessions - Empty State */}
            <Card className="bg-white border-0 shadow-sm rounded-xl">
              <CardHeader>
                <h3 className="text-[var(--black-60)] font-inter text-base font-medium">
                  Recent Sessions
                </h3>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12 lg:py-20">
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
