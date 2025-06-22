"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CreateSessionModal } from "@/components/modals/create-session-modal";
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
  Search,
  Filter,
  Calendar,
  Send,
  Copy,
  ChevronLeft,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

const SidebarContent = () => (
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
        {/* Dashboard Item */}
        <div className="flex items-center gap-4 pl-5 py-2">
          <BarChart3 size={20} className="text-[var(--black-50)]" />
          <span className="text-[var(--black-50)] font-inter text-sm">
            Dashboard
          </span>
        </div>

        {/* Active Sessions Item */}
        <div className="bg-[var(--primary-100)] rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 text-white">
              <ShoppingBag size={20} />
            </div>
            <span className="text-white font-inter text-sm">Sessions</span>
          </div>
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
      <div className="flex items-center gap-3 p-3">
        <LogOut size={20} className="text-[var(--action-red)]" />
        <span className="text-[var(--action-red)] font-inter text-sm">
          Logout
        </span>
      </div>
    </div>
  </>
);

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-50 text-green-600";
      case "In-Progress":
        return "bg-blue-50 text-blue-600";
      case "Pending":
        return "bg-orange-50 text-orange-600";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  return (
    <div
      className={`inline-flex px-3 py-1 rounded-lg text-xs font-medium ${getStatusStyle(status)}`}
    >
      {status}
    </div>
  );
};

const ActionDropdown = ({ action }: { action: string }) => {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg text-xs">
      <span className="text-gray-600">{action}</span>
      <ChevronDown size={12} className="text-gray-600" />
    </div>
  );
};

export default function SessionsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const sessionData = [
    {
      clientName: "John Doe",
      sessionDate: "Dec 20, 2023",
      sessionType: "Consultation",
      zoomId: "123-456-789",
      amount: "$150",
      action: "Completed",
      status: "Completed",
    },
    {
      clientName: "Jane Smith",
      sessionDate: "Dec 21, 2023",
      sessionType: "Follow-up",
      zoomId: "987-654-321",
      amount: "$100",
      action: "In-Progress",
      status: "In-Progress",
    },
    {
      clientName: "Mike Johnson",
      sessionDate: "Dec 22, 2023",
      sessionType: "Initial",
      zoomId: "456-789-123",
      amount: "$200",
      action: "Pending",
      status: "Pending",
    },
    {
      clientName: "Sarah Wilson",
      sessionDate: "Dec 23, 2023",
      sessionType: "Consultation",
      zoomId: "789-123-456",
      amount: "$150",
      action: "Completed",
      status: "Completed",
    },
    {
      clientName: "David Brown",
      sessionDate: "Dec 24, 2023",
      sessionType: "Follow-up",
      zoomId: "321-654-987",
      amount: "$100",
      action: "Completed",
      status: "Completed",
    },
    {
      clientName: "Emily Davis",
      sessionDate: "Dec 25, 2023",
      sessionType: "Initial",
      zoomId: "654-987-321",
      amount: "$200",
      action: "Completed",
      status: "Completed",
    },
    {
      clientName: "Alex Thompson",
      sessionDate: "Dec 26, 2023",
      sessionType: "Consultation",
      zoomId: "852-741-963",
      amount: "$150",
      action: "In-Progress",
      status: "In-Progress",
    },
    {
      clientName: "Lisa Garcia",
      sessionDate: "Dec 27, 2023",
      sessionType: "Follow-up",
      zoomId: "963-852-741",
      amount: "$100",
      action: "Pending",
      status: "Pending",
    },
    {
      clientName: "Robert Miller",
      sessionDate: "Dec 28, 2023",
      sessionType: "Initial",
      zoomId: "741-963-852",
      amount: "$200",
      action: "Completed",
      status: "Completed",
    },
    {
      clientName: "Jennifer Taylor",
      sessionDate: "Dec 29, 2023",
      sessionType: "Consultation",
      zoomId: "159-753-486",
      amount: "$150",
      action: "Completed",
      status: "Completed",
    },
  ];

  return (
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
                  Sessions
                </h1>
              </div>
              <div className="flex items-center gap-3 lg:gap-5">
                <div className="hidden sm:flex bg-[var(--secondary-20)] rounded-lg px-3 lg:px-4 py-2 items-center gap-2 lg:gap-3">
                  <span className="text-[var(--black-100)] font-inter text-xs lg:text-sm">
                    {"{Consultant's Name}"}
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
              <span className="text-[var(--black-30)] flex-shrink-0">
                Sessions
              </span>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-5 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-[var(--black-60)] font-inter text-base font-medium">
              Sessions Summary
            </h2>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[var(--primary-100)] hover:bg-[var(--primary-100)]/90 text-white rounded-xl px-4 py-2 font-inter text-sm"
            >
              <Plus size={16} className="mr-2" />
              Add a Session
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {/* Total Sessions Card */}
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
                    <ChevronDown size={12} className="text-[var(--black-10)]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[var(--black-30)] text-sm">
                      Total Sessions
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        30
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
                        5
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
                        25
                      </span>
                      <span className="text-[var(--action-green)] text-xs">
                        +0.00%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Statistics Card */}
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
                    <ChevronDown size={12} className="text-[var(--black-10)]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[var(--black-30)] text-sm">Canceled</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        1
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[var(--black-30)] text-sm">
                      Repeat Clients
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        2
                      </span>
                      <span className="text-[var(--action-green)] text-xs">
                        +0.00%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[var(--action-red)] text-sm">
                      Client Didn't Join
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        2
                      </span>
                      <span className="text-[var(--action-green)] text-xs">
                        +0.00%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Abandoned Sessions Card */}
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
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[var(--action-red)] text-sm">
                      Abandoned Sessions
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        2
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[var(--black-30)] text-sm">Clients</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[var(--black-60)] font-poppins text-xl font-medium">
                        30
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

          {/* Sessions Table */}
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-[var(--black-60)] font-inter text-base font-medium">
                  Client Sessions
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Search"
                      className="pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {/* Action Buttons */}
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter size={14} />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar size={14} />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Send size={14} />
                    Share
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    Bulk Action
                    <ChevronDown size={14} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Table Header */}
              <div className="border-t border-b border-gray-200 px-6 py-4">
                <div className="grid grid-cols-7 gap-4 items-center text-sm font-medium text-[var(--black-90)]">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                    />
                    <span>Client Name</span>
                  </div>
                  <div>Session Date</div>
                  <div>Session Type</div>
                  <div>Zoom Link</div>
                  <div>Session Charges</div>
                  <div>Action</div>
                  <div>Status</div>
                </div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-gray-100">
                {sessionData.map((session, index) => (
                  <div key={index} className="px-6 py-4">
                    <div className="grid grid-cols-7 gap-4 items-center text-sm">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                        />
                        <span className="text-[var(--black-40)]">
                          {session.clientName}
                        </span>
                      </div>
                      <div className="text-[var(--black-40)]">
                        {session.sessionDate}
                      </div>
                      <div className="text-[var(--black-40)]">
                        {session.sessionType}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--black-40)]">
                          {session.zoomId}
                        </span>
                        <Copy
                          size={14}
                          className="text-gray-400 cursor-pointer hover:text-gray-600"
                        />
                      </div>
                      <div className="text-[var(--black-40)]">
                        {session.amount}
                      </div>
                      <div>
                        <ActionDropdown action={session.action} />
                      </div>
                      <div>
                        <StatusBadge status={session.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="border-t border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <select className="px-3 py-1 border border-gray-200 rounded-md text-sm">
                        <option>10</option>
                        <option>25</option>
                        <option>50</option>
                      </select>
                      <span className="text-sm text-gray-500">
                        Items per page
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">
                      1-10 of 200 items
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <select className="px-3 py-1 border border-gray-200 rounded-md text-sm">
                        <option>1</option>
                        <option>2</option>
                        <option>3</option>
                      </select>
                      <span className="text-sm text-gray-600">of 44 pages</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <ArrowLeft size={14} />
                      </Button>
                      <Button variant="outline" size="sm">
                        <ArrowRight size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Session Modal */}
      <CreateSessionModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
