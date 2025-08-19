"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  CheckSquare, 
  Square,
  ChevronDown,
  UserCheck,
  UserX,
  Mail,
  Loader2,
  Download,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import { ConsultantData } from "@/lib/adminApi";

interface BulkOperationsProps {
  consultants: ConsultantData[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onBulkAction: (action: string, consultantIds: string[]) => Promise<void>;
  isLoading?: boolean;
}

type BulkAction = {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: "default" | "destructive";
  requireConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationDescription?: string;
};

const BulkOperations: React.FC<BulkOperationsProps> = ({
  consultants,
  selectedIds,
  onSelectionChange,
  onBulkAction,
  isLoading = false
}) => {
  const [actionLoading, setActionLoading] = useState(false);

  const bulkActions: BulkAction[] = [
    {
      id: "approve_all",
      label: "Approve Selected",
      icon: <UserCheck className="h-4 w-4" />,
      requireConfirmation: true,
      confirmationTitle: "Approve Selected Consultants",
      confirmationDescription: `Are you sure you want to approve ${selectedIds.length} consultant(s)? They will gain access to the dashboard.`
    },
    {
      id: "reject_all",
      label: "Reject Selected",
      icon: <UserX className="h-4 w-4" />,
      variant: "destructive",
      requireConfirmation: true,
      confirmationTitle: "Reject Selected Consultants",
      confirmationDescription: `Are you sure you want to reject ${selectedIds.length} consultant(s)? They will lose access to the platform.`
    },
    {
      id: "verify_emails",
      label: "Verify Emails",
      icon: <Mail className="h-4 w-4" />
    },
    {
      id: "export_selected",
      label: "Export Selected",
      icon: <Download className="h-4 w-4" />
    },
    {
      id: "deactivate_all",
      label: "Deactivate Selected",
      icon: <Trash2 className="h-4 w-4" />,
      variant: "destructive",
      requireConfirmation: true,
      confirmationTitle: "Deactivate Selected Consultants",
      confirmationDescription: `Are you sure you want to deactivate ${selectedIds.length} consultant(s)? This action can be reversed later.`
    }
  ];

  const isAllSelected = consultants.length > 0 && selectedIds.length === consultants.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < consultants.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(consultants.map(c => c.id));
    }
  };

  const handleAction = async (action: BulkAction) => {
    if (selectedIds.length === 0) return;

    setActionLoading(true);
    try {
      await onBulkAction(action.id, selectedIds);
      // Clear selection after successful action
      onSelectionChange([]);
    } catch (error) {
      console.error(`Failed to execute bulk action ${action.id}:`, error);
    } finally {
      setActionLoading(false);
    }
  };

  const getSelectionIcon = () => {
    if (isAllSelected) {
      return <CheckSquare className="h-4 w-4" />;
    } else if (isPartiallySelected) {
      return <CheckSquare className="h-4 w-4 opacity-50" />;
    } else {
      return <Square className="h-4 w-4" />;
    }
  };

  if (consultants.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
      {/* Selection Controls */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSelectAll}
          className="flex items-center space-x-2"
        >
          {getSelectionIcon()}
          <span>
            {isAllSelected ? "Deselect All" : "Select All"}
          </span>
        </Button>

        {selectedIds.length > 0 && (
          <Badge variant="secondary" className="text-sm">
            {selectedIds.length} selected
          </Badge>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center space-x-2">
          {/* Quick Actions */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="default" 
                size="sm"
                disabled={actionLoading || isLoading}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Approve ({selectedIds.length})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve Selected Consultants</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to approve {selectedIds.length} consultant(s)? 
                  They will gain access to the dashboard and can start offering their services.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => handleAction(bulkActions[0])}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    "Approve All"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                disabled={actionLoading || isLoading}
              >
                <MoreHorizontal className="h-4 w-4" />
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {bulkActions.map((action) => {
                if (action.requireConfirmation) {
                  return (
                    <AlertDialog key={action.id}>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem 
                          onSelect={(e) => e.preventDefault()}
                          className={action.variant === "destructive" ? "text-red-600" : ""}
                        >
                          {action.icon}
                          <span className="ml-2">{action.label}</span>
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{action.confirmationTitle}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {action.confirmationDescription}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleAction(action)}
                            disabled={actionLoading}
                            className={action.variant === "destructive" ? "bg-red-600 hover:bg-red-700" : ""}
                          >
                            {actionLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                {action.icon}
                                <span className="ml-2">Confirm</span>
                              </>
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  );
                } else {
                  return (
                    <DropdownMenuItem 
                      key={action.id}
                      onClick={() => handleAction(action)}
                      disabled={actionLoading}
                      className={action.variant === "destructive" ? "text-red-600" : ""}
                    >
                      {action.icon}
                      <span className="ml-2">{action.label}</span>
                    </DropdownMenuItem>
                  );
                }
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};

export default BulkOperations;