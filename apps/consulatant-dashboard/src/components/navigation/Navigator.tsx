/**
 * Navigator Component - Dynamic Sidebar Navigation
 * 
 * Features:
 * - Hover to expand/collapse
 * - Active route highlighting
 * - Badge support for notifications
 * - Responsive design
 * - Clean animations
 */

"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  ChevronRight,
  Menu,
} from "lucide-react";

interface NavigationItem {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  href: string;
  badge?: number;
  isActive?: boolean;
}

interface NavigatorProps {
  className?: string;
}

const Navigator: React.FC<NavigatorProps> = ({ className = "" }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  // Navigation items configuration
  const navigationItems: NavigationItem[] = [
    {
      id: "dashboard",
      icon: BarChart3,
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      id: "sessions",
      icon: ShoppingBag,
      label: "Sessions",
      href: "/dashboard/sessions",
      badge: 3,
    },
    {
      id: "clients",
      icon: Users,
      label: "Clients",
      href: "/dashboard/clients",
    },
    {
      id: "quotations",
      icon: FolderOpen,
      label: "Quotations",
      href: "/dashboard/quotations",
    },
   
    {
      id: "settings",
      icon: Settings,
      label: "Settings",
      href: "/dashboard/settings",
    },
  ];

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isRouteActive = (href: string): boolean => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  // Desktop Sidebar Content
  const DesktopSidebarContent = () => (
    <div
      className={`fixed left-0 top-0 h-full bg-white z-10 flex flex-col transition-all duration-300 ease-in-out shadow-sm border-r border-[var(--stroke)] ${
        isExpanded ? "w-80" : "w-[88px]"
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo */}
      <div className={`p-4 ${isExpanded ? "p-8" : "p-4"} transition-all duration-300`}>
        {isExpanded ? (
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2Ff8a06de2181a491da294e9d2e5f35408%2F9cb11a3e7881422da58cb120ef3645b2?format=webp&width=800"
            alt="Logo"
            className="w-[179px] h-[74px] rounded-lg"
          />
        ) : (
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2Ff8a06de2181a491da294e9d2e5f35408%2F9cb11a3e7881422da58cb120ef3645b2?format=webp&width=800"
            alt="Logo"
            className="w-14 h-14 rounded-lg"
          />
        )}
      </div>

      {/* Navigation Menu */}
      <div className={`flex-1 ${isExpanded ? "px-8" : "px-4"} transition-all duration-300`}>
        <nav className={`space-y-${isExpanded ? "6" : "3"} transition-all duration-300`}>
          {navigationItems.map((item) => {
            const isActive = isRouteActive(item.href);
            const IconComponent = item.icon;

            return (
              <div key={item.id}>
                {isExpanded ? (
                  // Expanded state
                  <div
                    onClick={() => handleNavigation(item.href)}
                    className={`cursor-pointer rounded-xl p-4 transition-all duration-200 ${
                      isActive
                        ? "bg-[var(--primary-100)] text-white"
                        : "hover:bg-gray-100 text-[var(--black-50)]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <IconComponent
                        size={20}
                        className={isActive ? "text-white" : "text-[var(--black-50)]"}
                      />
                      <span
                        className={`font-inter text-sm ${
                          isActive ? "text-white" : "text-[var(--black-50)]"
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.badge && (
                        <Badge className="bg-[var(--secondary-100)] text-[var(--black-100)] text-xs px-2 py-1 rounded-full ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  // Collapsed state
                  <div
                    onClick={() => handleNavigation(item.href)}
                    className={`relative flex items-center justify-center w-14 h-14 rounded-xl cursor-pointer transition-all duration-200 ${
                      isActive
                        ? "bg-[var(--primary-100)]"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <IconComponent
                      size={24}
                      className={isActive ? "text-white" : "text-[var(--black-50)]"}
                    />
                    {item.badge && (
                      <Badge className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[var(--secondary-100)] text-[var(--black-100)] text-xs flex items-center justify-center p-0">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Contact Support */}
        <div className={`${isExpanded ? "mt-8" : "mt-12"} transition-all duration-300`}>
          {isExpanded ? (
            <div className="bg-gray-100 rounded-2xl p-4 cursor-pointer hover:bg-gray-200 transition-colors">
              <div className="flex items-center gap-3">
                <Headphones size={20} className="text-[var(--black-100)]" />
                <span className="text-[var(--black-100)] font-inter text-sm">
                  Contact Support
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center w-14 h-12 rounded-2xl bg-[rgba(94,99,102,0.1)] hover:bg-gray-200 cursor-pointer transition-colors">
              <Headphones size={24} className="text-black" />
            </div>
          )}
        </div>

        {/* Gift Banner */}
        <div className={`${isExpanded ? "mt-5" : "mt-3"} transition-all duration-300`}>
          {isExpanded ? (
            <div className="bg-[var(--secondary-20)] rounded-2xl p-4 cursor-pointer hover:bg-[var(--secondary-30)] transition-colors">
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
          ) : (
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[rgba(255,204,145,0.2)] hover:bg-[rgba(255,204,145,0.3)] cursor-pointer transition-colors">
              <Gift size={24} className="text-black" />
            </div>
          )}
        </div>
      </div>

      {/* Logout */}
      <div className={`${isExpanded ? "p-8" : "p-4"} transition-all duration-300`}>
        {isExpanded ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 hover:bg-red-50 rounded-lg transition-colors w-full text-left"
          >
            <LogOut size={20} className="text-[var(--action-red)]" />
            <span className="text-[var(--action-red)] font-inter text-sm">
              Logout
            </span>
          </button>
        ) : (
          <div
            onClick={handleLogout}
            className="flex items-center justify-center w-12 h-12 rounded-2xl hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <LogOut size={24} className="text-[var(--action-red)]" />
          </div>
        )}
      </div>
    </div>
  );

  // Mobile Sidebar Content
  const MobileSidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-8">
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2Ff8a06de2181a491da294e9d2e5f35408%2F9cb11a3e7881422da58cb120ef3645b2?format=webp&width=800"
          alt="Logo"
          className="w-[179px] h-[74px] rounded-lg"
        />
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 px-8">
        <nav className="space-y-6">
          {navigationItems.map((item) => {
            const isActive = isRouteActive(item.href);
            const IconComponent = item.icon;

            return (
              <div
                key={item.id}
                onClick={() => handleNavigation(item.href)}
                className={`cursor-pointer rounded-xl p-4 transition-all duration-200 ${
                  isActive
                    ? "bg-[var(--primary-100)] text-white"
                    : "hover:bg-gray-100 text-[var(--black-50)]"
                }`}
              >
                <div className="flex items-center gap-4">
                  <IconComponent
                    size={20}
                    className={isActive ? "text-white" : "text-[var(--black-50)]"}
                  />
                  <span
                    className={`font-inter text-sm flex-1 ${
                      isActive ? "text-white" : "text-[var(--black-50)]"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.badge && (
                    <Badge className="bg-[var(--secondary-100)] text-[var(--black-100)] text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Contact Support */}
        <div className="mt-8 bg-gray-100 rounded-2xl p-4 cursor-pointer hover:bg-gray-200 transition-colors">
          <div className="flex items-center gap-3">
            <Headphones size={20} className="text-[var(--black-100)]" />
            <span className="text-[var(--black-100)] font-inter text-sm">
              Contact Support
            </span>
          </div>
        </div>

        {/* Gift Banner */}
        <div className="mt-5 bg-[var(--secondary-20)] rounded-2xl p-4 cursor-pointer hover:bg-[var(--secondary-30)] transition-colors">
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
          className="flex items-center gap-3 p-3 hover:bg-red-50 rounded-lg transition-colors w-full text-left"
        >
          <LogOut size={20} className="text-[var(--action-red)]" />
          <span className="text-[var(--action-red)] font-inter text-sm">
            Logout
          </span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:block">
        <DesktopSidebarContent />
      </div>

      {/* Mobile Navigation Trigger */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Menu size={20} className="text-[var(--black-60)]" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0 bg-white">
            <div className="flex flex-col h-full">
              <MobileSidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default Navigator;