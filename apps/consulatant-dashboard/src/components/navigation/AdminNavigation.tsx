"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Settings, 
  LogOut,
  Menu,
  X,
  UserCheck,
  Shield,
  BarChart3,
  Bell,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AdminNavigationProps {
  adminUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  pendingApprovalsCount?: number;
}

const AdminNavigation: React.FC<AdminNavigationProps> = ({ 
  adminUser, 
  pendingApprovalsCount = 0 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      description: "Overview and statistics"
    },
    {
      name: "Consultants",
      href: "/admin/consultants", 
      icon: Users,
      description: "Manage consultant accounts",
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined
    },
    {
      name: "Sessions",
      href: "/admin/sessions",
      icon: Calendar,
      description: "View all sessions"
    },
    {
      name: "Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
      description: "Platform analytics"
    }
  ];

  // Only show admin management for super admins
  if (adminUser?.role === 'super_admin') {
    navigationItems.push({
      name: "Admin Users",
      href: "/admin/users",
      icon: Shield,
      description: "Manage admin accounts"
    });
  }

  const handleLogout = () => {
    // TODO: Implement logout functionality
    localStorage.clear();
    router.push('/admin/login');
  };

  const isActivePath = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main navigation */}
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/admin" className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-xl font-bold text-gray-900">Nakksha</div>
                  <div className="text-xs text-gray-500 -mt-1">Admin Panel</div>
                </div>
              </Link>
            </div>

            {/* Desktop navigation */}
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.href);
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-blue-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                    {item.badge && (
                      <Badge variant="destructive" className="ml-2">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side - notifications and user menu */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              {pendingApprovalsCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {pendingApprovalsCount > 9 ? "9+" : pendingApprovalsCount}
                </Badge>
              )}
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 px-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={`${adminUser?.firstName} ${adminUser?.lastName}`} />
                    <AvatarFallback>
                      {adminUser?.firstName?.charAt(0)}{adminUser?.lastName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:block text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {adminUser?.firstName} {adminUser?.lastName}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {adminUser?.role?.replace('_', ' ')}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-200">
          <div className="pt-2 pb-3 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.href);
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                    {item.badge && (
                      <Badge variant="destructive" className="ml-2">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 ml-8">{item.description}</div>
                </Link>
              );
            })}
          </div>
          
          {/* Mobile user section */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src="" alt={`${adminUser?.firstName} ${adminUser?.lastName}`} />
                <AvatarFallback>
                  {adminUser?.firstName?.charAt(0)}{adminUser?.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">
                  {adminUser?.firstName} {adminUser?.lastName}
                </div>
                <div className="text-sm text-gray-500">{adminUser?.email}</div>
                <div className="text-xs text-gray-400 capitalize">
                  {adminUser?.role?.replace('_', ' ')}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Button
                variant="ghost"
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 w-full text-left"
              >
                <Settings className="mr-2 h-4 w-4 inline" />
                Settings
              </Button>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="block px-4 py-2 text-base font-medium text-red-600 hover:text-red-800 hover:bg-red-50 w-full text-left"
              >
                <LogOut className="mr-2 h-4 w-4 inline" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default AdminNavigation;