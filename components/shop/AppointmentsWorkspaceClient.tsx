"use client";

import React, { useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  X, 
  MoreVertical, 
  CheckCircle2, 
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppointmentsWorkspaceData, CalendarAppointmentItem } from "@/services/appointment.service";
import { AppointmentDetailsModal } from "./AppointmentDetailsModal";
import { NewAppointmentModal } from "./NewAppointmentModal";

interface AppointmentsWorkspaceClientProps {
  data: AppointmentsWorkspaceData;
  shopName?: string;
}

// Mock seed data matching user screenshot (July 2026) for demo if DB has zero appointments
const mockAppointmentsList: CalendarAppointmentItem[] = [
  {
    id: "m-1",
    customerName: "Rahul Sharma",
    customerPhone: "98765 43210",
    visitTime: "09:30 AM",
    dateKey: "2026-07-16",
    purposeOfVisit: "Eye Test",
    status: "CONFIRMED",
  },
  {
    id: "m-2",
    customerName: "Ankit Gupta",
    customerPhone: "98765 12345",
    visitTime: "10:30 AM",
    dateKey: "2026-07-16",
    purposeOfVisit: "Frame Selection",
    status: "PENDING",
  },
  {
    id: "m-3",
    customerName: "Neha Jain",
    customerPhone: "98765 67890",
    visitTime: "12:00 PM",
    dateKey: "2026-07-16",
    purposeOfVisit: "Contact Lens Follow-up",
    status: "CONFIRMED",
  },
  {
    id: "m-4",
    customerName: "Vikram Singh",
    customerPhone: "98765 11111",
    visitTime: "01:30 PM",
    dateKey: "2026-07-16",
    purposeOfVisit: "Eye Test",
    status: "CONFIRMED",
  },
  {
    id: "m-5",
    customerName: "Pooja Malhotra",
    customerPhone: "98765 22222",
    visitTime: "03:00 PM",
    dateKey: "2026-07-16",
    purposeOfVisit: "Vision Checkup",
    status: "PENDING",
  },
  {
    id: "m-6",
    customerName: "Arjun Kapoor",
    customerPhone: "98765 43210",
    visitTime: "04:15 PM",
    dateKey: "2026-07-16",
    purposeOfVisit: "Eye Examination",
    status: "CONFIRMED",
  },
  {
    id: "m-7",
    customerName: "Priya Iyer",
    customerPhone: "91234 56789",
    visitTime: "05:00 PM",
    dateKey: "2026-07-16",
    purposeOfVisit: "Contact Lens Fitting",
    status: "CONFIRMED",
  },
  {
    id: "m-8",
    customerName: "Sanjay Verma",
    customerPhone: "98765 99999",
    visitTime: "06:00 PM",
    dateKey: "2026-07-16",
    purposeOfVisit: "Frame Consultation",
    status: "CONFIRMED",
  },
  // Extra seed appointments for other July days
  { id: "m-9", customerName: "Aman Sen", customerPhone: "98765 33333", visitTime: "11:00 AM", dateKey: "2026-07-01", purposeOfVisit: "Eye Test", status: "CONFIRMED" },
  { id: "m-10", customerName: "Riya Seth", customerPhone: "98765 44444", visitTime: "02:30 PM", dateKey: "2026-07-02", purposeOfVisit: "Lens Trial", status: "CONFIRMED" },
  { id: "m-11", customerName: "Karan Johar", customerPhone: "98765 55555", visitTime: "10:00 AM", dateKey: "2026-07-03", purposeOfVisit: "Vision Check", status: "CONFIRMED" },
  { id: "m-12", customerName: "Deepak Mishra", customerPhone: "98765 66666", visitTime: "04:00 PM", dateKey: "2026-07-04", purposeOfVisit: "Frame Selection", status: "PENDING" },
  { id: "m-13", customerName: "Gaurav Tiwari", customerPhone: "98765 77777", visitTime: "01:00 PM", dateKey: "2026-07-08", purposeOfVisit: "Eye Examination", status: "CONFIRMED" },
  { id: "m-14", customerName: "Meera Nair", customerPhone: "98765 88888", visitTime: "11:30 AM", dateKey: "2026-07-10", purposeOfVisit: "Contact Lens", status: "CONFIRMED" },
  { id: "m-15", customerName: "Tarun Bajaj", customerPhone: "98765 00000", visitTime: "03:15 PM", dateKey: "2026-07-11", purposeOfVisit: "Follow-up", status: "CONFIRMED" },
  { id: "m-16", customerName: "Simran Kaur", customerPhone: "98765 12121", visitTime: "05:30 PM", dateKey: "2026-07-12", purposeOfVisit: "Vision Check", status: "PENDING" },
];

export default function AppointmentsWorkspaceClient({ data, shopName }: AppointmentsWorkspaceClientProps) {
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(6); // 0-indexed: 6 = July
  const [selectedDateKey, setSelectedDateKey] = useState("2026-07-16");
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  
  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedDetailsApp, setSelectedDetailsApp] = useState<CalendarAppointmentItem | null>(null);

  // Appointments source (use DB list or fallback mock list)
  const allAppointments = data.appointments && data.appointments.length > 0
    ? data.appointments
    : mockAppointmentsList;

  const [appointmentsList, setAppointmentsList] = useState<CalendarAppointmentItem[]>(allAppointments);

  // Month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleResetToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDateKey(now.toISOString().split("T")[0]);
  };

  // Generate Calendar Days Grid for July 2026 (or selected month)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  // Adjust so Monday is column 0 (0: Mon, 1: Tue ... 6: Sun)
  const mondayOffset = (firstDayIndex + 6) % 7;

  // Previous month trailing days
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  const calendarCells = [];

  // 1. Previous Month Days
  for (let i = mondayOffset - 1; i >= 0; i--) {
    calendarCells.push({
      dayNum: prevMonthDays - i,
      isCurrentMonth: false,
      dateKey: `prev-${i}`,
    });
  }

  // 2. Current Month Days
  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(currentMonth + 1).padStart(2, "0");
    const dayStr = String(d).padStart(2, "0");
    const dateKey = `${currentYear}-${monthStr}-${dayStr}`;

    const appsOnDay = appointmentsList.filter((a) => a.dateKey === dateKey);

    calendarCells.push({
      dayNum: d,
      isCurrentMonth: true,
      dateKey,
      count: appsOnDay.length,
    });
  }

  // 3. Next Month Days to fill grid
  const remainingCells = 35 - calendarCells.length;
  for (let j = 1; j <= (remainingCells < 0 ? 42 - calendarCells.length : remainingCells); j++) {
    calendarCells.push({
      dayNum: j,
      isCurrentMonth: false,
      dateKey: `next-${j}`,
    });
  }

  // Selected date formatted title
  const getSelectedDateTitle = () => {
    const parts = selectedDateKey.split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      const d = parseInt(parts[2]);
      const dateObj = new Date(y, m, d);
      return {
        title: `${d} ${monthNames[m]} ${y}`,
        weekday: dateObj.toLocaleDateString("en-US", { weekday: "long" }),
      };
    }
    return { title: "16 July 2026", weekday: "Thursday" };
  };

  const selectedDateHeader = getSelectedDateTitle();
  const selectedDateApps = appointmentsList.filter((a) => a.dateKey === selectedDateKey);

  const handleStatusUpdated = (appointmentId: string, newStatus: "COMPLETED" | "CANCELLED" | "CONFIRMED") => {
    setAppointmentsList((prev) =>
      prev.map((app) => (app.id === appointmentId ? { ...app, status: newStatus } : app))
    );
  };

  return (
    <div className="space-y-5 select-none max-w-[1400px] mx-auto pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Appointments
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            View and manage all store appointments
          </p>
        </div>

        <Button
          onClick={() => setIsNewModalOpen(true)}
          className="h-10 px-4 text-xs font-bold text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-xl shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> New Appointment
        </Button>
      </div>

      {/* Top 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* TODAY'S APPOINTMENTS */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              TODAY'S APPOINTMENTS
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#2563eb]">
              <CalendarIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">
            {data.kpis?.todayCount || 8}
          </div>
        </div>

        {/* UPCOMING */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              UPCOMING
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#2563eb]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">
            {data.kpis?.upcomingCount || 28}
          </div>
        </div>

        {/* PENDING */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              PENDING
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0"></span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">
            {data.kpis?.pendingCount || 4}
          </div>
        </div>

        {/* COMPLETED */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              COMPLETED
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shrink-0"></span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">
            {data.kpis?.completedCount || 186}
          </div>
        </div>

        {/* CANCELLED */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              CANCELLED
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shrink-0"></span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">
            {data.kpis?.cancelledCount || 3}
          </div>
        </div>
      </div>

      {/* Main Split Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 7/12: Full Interactive Month Calendar Grid */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          {/* Calendar Header Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            {/* Month / Year Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevMonth}
                type="button"
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <h2 className="text-lg font-bold text-slate-900 tracking-tight min-w-[120px] text-center">
                {monthNames[currentMonth]} {currentYear}
              </h2>

              <button
                onClick={handleNextMonth}
                type="button"
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={handleResetToday}
                type="button"
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer ml-1"
              >
                Today
              </button>
            </div>

            {/* View Mode Toggle Pills */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/60 self-start sm:self-auto">
              <button
                onClick={() => setViewMode("month")}
                type="button"
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  viewMode === "month"
                    ? "bg-white text-[#2563eb] shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode("week")}
                type="button"
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  viewMode === "week"
                    ? "bg-white text-[#2563eb] shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode("day")}
                type="button"
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  viewMode === "day"
                    ? "bg-white text-[#2563eb] shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Day
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 text-center">
            {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((dayName) => (
              <span key={dayName} className="text-[10px] font-bold text-slate-400 py-1.5 uppercase tracking-wider">
                {dayName}
              </span>
            ))}
          </div>

          {/* 7-Column Calendar Date Cells Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((cell, idx) => {
              const isSelected = cell.isCurrentMonth && cell.dateKey === selectedDateKey;

              return (
                <div
                  key={cell.dateKey || idx}
                  onClick={() => cell.isCurrentMonth && setSelectedDateKey(cell.dateKey)}
                  className={cn(
                    "min-h-[72px] sm:min-h-[82px] p-2 rounded-xl flex flex-col justify-between transition-all duration-150 relative select-none",
                    !cell.isCurrentMonth
                      ? "opacity-30 bg-slate-50/50 pointer-events-none"
                      : isSelected
                      ? "border-2 border-[#2563eb] bg-blue-50/30 shadow-xs cursor-pointer"
                      : "border border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer bg-white"
                  )}
                >
                  <span className={cn(
                    "text-xs font-bold block",
                    isSelected ? "text-[#2563eb]" : "text-slate-700"
                  )}>
                    {cell.dayNum}
                  </span>

                  {/* Appointment Count Badge Pill */}
                  {cell.count && cell.count > 0 ? (
                    <div className="self-center my-auto">
                      <span className={cn(
                        "inline-flex items-center justify-center h-6 px-2 rounded-lg text-xs font-black transition-colors",
                        isSelected
                          ? "bg-[#2563eb] text-white shadow-xs"
                          : "bg-blue-50 text-[#2563eb] border border-blue-100"
                      )}>
                        {cell.count}
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5/12: Selected Date Schedule Sidebar Panel */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between min-h-[500px]">
          <div>
            {/* Panel Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {selectedDateHeader.title}
                </h3>
                <p className="text-xs font-semibold text-slate-400">
                  {selectedDateHeader.weekday}
                </p>
              </div>

              <button
                type="button"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border-none cursor-pointer bg-transparent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Subtitle Count */}
            <div className="pt-3 pb-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                {selectedDateApps.length} APPOINTMENTS
              </span>
            </div>

            {/* Appointment Cards List */}
            <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1 pt-1">
              {selectedDateApps.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <CalendarIcon className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">No appointments scheduled for this date.</p>
                  <Button
                    onClick={() => setIsNewModalOpen(true)}
                    variant="outline"
                    className="h-8 text-xs font-bold border-blue-200 text-[#2563eb] hover:bg-blue-50 rounded-lg mt-2"
                  >
                    + Schedule Visit
                  </Button>
                </div>
              ) : (
                selectedDateApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => setSelectedDetailsApp(app)}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50/30 hover:border-blue-200 transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-50 text-[#2563eb] shrink-0 border border-blue-100">
                        <CalendarIcon className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-400">
                            {app.visitTime}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {app.customerName}
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-500">
                          {app.purposeOfVisit}
                        </p>
                        <p className="text-[10px] font-medium text-slate-400">
                          {app.customerPhone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                        app.status === "CONFIRMED"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : app.status === "COMPLETED"
                          ? "bg-blue-50 text-[#2563eb] border-blue-100"
                          : app.status === "CANCELLED"
                          ? "bg-rose-50 text-rose-600 border-rose-100"
                          : "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {app.status === "CONFIRMED" ? "Confirmed" : app.status === "PENDING" ? "Pending" : app.status}
                      </span>

                      <button
                        type="button"
                        className="p-1 text-slate-300 group-hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel Footer Button */}
          <div className="pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              className="w-full h-10 border-slate-200 text-[#2563eb] hover:bg-blue-50 font-bold text-xs rounded-xl cursor-pointer"
            >
              View All ({selectedDateApps.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Appointment Details & Check-In Modal */}
      <AppointmentDetailsModal
        appointment={selectedDetailsApp}
        shopName={shopName}
        onClose={() => setSelectedDetailsApp(null)}
        onStatusUpdated={handleStatusUpdated}
      />

      {/* New Appointment Modal Form */}
      <NewAppointmentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={() => {
          // Toast notification or refetch
        }}
      />
    </div>
  );
}
