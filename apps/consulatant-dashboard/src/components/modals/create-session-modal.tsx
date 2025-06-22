"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  X,
  ChevronDown,
  Calendar,
  Clock,
  Search,
  ShoppingBag,
} from "lucide-react";

interface CreateSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSessionModal({
  open,
  onOpenChange,
}: CreateSessionModalProps) {
  const [isNewClient, setIsNewClient] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[850px] w-[850px] h-[739px] p-7 bg-white rounded-xl border-0 shadow-lg">
        {/* Custom header to match design */}
        <div className="flex items-center justify-between h-8 mb-7">
          <DialogTitle className="text-xl font-medium text-black font-poppins">
            Create New Session
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--secondary-30)] hover:bg-[var(--secondary-30)]/80"
          >
            <X size={16} className="text-[var(--black-100)]" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-col items-center gap-11">
          <div className="flex items-start gap-[52px] w-full">
            {/* Left Side - Session Details */}
            <div className="flex flex-col items-start gap-[27px] w-[375px]">
              {/* Section Header with Toggle */}
              <div className="flex items-start gap-[115px] w-full">
                <h3 className="text-base font-medium text-[var(--black-30)] font-inter">
                  Session Details
                </h3>
                <div className="flex items-center gap-[151px]">
                  <div className="flex items-center gap-5">
                    <span className="text-sm text-[var(--black-3)] font-inter text-right">
                      New Client
                    </span>
                    <Switch
                      checked={isNewClient}
                      onCheckedChange={setIsNewClient}
                      className="w-10 h-5"
                    />
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="flex flex-col items-start gap-6 w-full">
                {/* Client Selection */}
                <div className="w-full">
                  <Select>
                    <SelectTrigger className="w-full h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4 text-base">
                      <SelectValue
                        placeholder="{Select Client}"
                        className="text-[var(--black-2)] font-inter"
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client1">John Doe</SelectItem>
                      <SelectItem value="client2">Jane Smith</SelectItem>
                      <SelectItem value="client3">Mike Johnson</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Type & Session Type */}
                <div className="flex items-start gap-3 w-full">
                  <Select>
                    <SelectTrigger className="flex-1 h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4 text-base">
                      <SelectValue
                        placeholder="Payment Type"
                        className="text-[var(--black-2)] font-inter"
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="flex-1 h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4 text-base">
                      <SelectValue
                        placeholder="{Session Type}"
                        className="text-[var(--black-2)] font-inter"
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="followup">Follow-up</SelectItem>
                      <SelectItem value="initial">Initial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date & Time */}
                <div className="flex flex-col gap-2 w-full">
                  <span className="text-xs text-[var(--black-50)] font-inter">
                    Order Time & Date
                  </span>
                  <div className="flex items-start gap-2 w-full">
                    <div className="flex-1 relative">
                      <Calendar
                        size={20}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--black-4)]"
                      />
                      <Input
                        type="date"
                        defaultValue="2020-12-12"
                        className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg pl-12 text-base text-[var(--black-2)] font-inter"
                      />
                    </div>
                    <div className="flex-1 relative">
                      <Clock
                        size={20}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--black-4)]"
                      />
                      <Input
                        type="time"
                        defaultValue="12:00"
                        className="h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg pl-12 text-base text-[var(--black-2)] font-inter"
                      />
                    </div>
                  </div>
                </div>

                {/* Order Status */}
                <div className="w-full">
                  <div className="mb-2">
                    <span className="text-xs text-[var(--black-4)] font-inter">
                      Order Status
                    </span>
                  </div>
                  <Select defaultValue="pending">
                    <SelectTrigger className="w-full h-[52px] bg-[var(--input-defaultBackground)] border-0 rounded-lg px-4 text-base">
                      <SelectValue className="text-[var(--black-4)] font-inter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Order Note */}
                <div className="w-full">
                  <Textarea
                    placeholder="Order Note"
                    className="min-h-[124px] bg-[var(--input-defaultBackground)] border-0 rounded-lg p-4 text-base text-[var(--black-2)] font-inter resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Right Side - Items */}
            <div className="flex flex-col items-center gap-[79px] w-[375px]">
              <div className="flex flex-col items-start gap-7 w-full">
                <h3 className="text-base font-medium text-[var(--black-30)] font-inter">
                  Items
                </h3>

                {/* Search */}
                <div className="relative w-full">
                  <Search
                    size={16}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--black-100)]"
                  />
                  <Input
                    placeholder="Search Quotation name"
                    className="h-[45px] border border-[var(--black-1)] rounded-lg pl-12 text-base text-[var(--black-2)] font-inter"
                  />
                </div>
              </div>

              {/* Empty State */}
              <div className="flex flex-col items-center gap-10">
                <div className="w-[140px] h-[140px] rounded-full border border-[var(--grey)] bg-[var(--main-background)] flex items-center justify-center">
                  <div className="w-[60px] h-[60px] flex items-center justify-center">
                    <ShoppingBag size={45} className="text-[var(--black-10)]" />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-6">
                  <div className="flex flex-col items-center gap-3">
                    <h4 className="text-xl font-medium text-black font-poppins">
                      Add Services to Your Order
                    </h4>
                    <p className="w-[282px] text-sm text-[var(--black-30)] text-center font-inter">
                      Search and add Services to this order.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-start w-[400px]">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-[180px] h-[54px] px-4 rounded-xl border-2 border-[var(--primary-100)] bg-transparent text-[var(--primary-100)] text-xl font-inter hover:bg-[var(--primary-100)]/5"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Handle create order logic here
                onOpenChange(false);
              }}
              className="w-[180px] h-[54px] px-4 rounded-xl bg-[var(--primary-100)] text-white text-xl font-inter hover:bg-[var(--primary-100)]/90"
            >
              Create Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
