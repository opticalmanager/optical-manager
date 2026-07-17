"use client";

import React, { useState, useMemo } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  X, 
  MoreVertical, 
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  Stethoscope
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

export default function AppointmentsWorkspaceClient({ data, shopName }: AppointmentsWorkspaceClientProps) {
  const now = new Date();
  const todayKey = now.toISOString().split("T")[0];

  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  
  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CONFIRMED" | "PENDING" | "COMPLETED" | "CANCELLED">("ALL");

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedDetailsApp, setSelectedDetailsApp] = useState<CalendarAppointmentItem | null>(null);

  // Appointments source (100% database records)
  const [appointmentsList, setAppointmentsList] = useState<CalendarAppointmentItem[]>(data.appointments || []);

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
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDateKey(today.toISOString().split("T")[0]);
  };

  // Filter appointments by search & status
  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const cleanQueryPhone = query.replace(/[\s\-\+\(\)]/g, "");

    return appointmentsList.filter((app) => {
      const cleanAppPhone = app.customerPhone.replace(/[\s\-\+\(\)]/g, "");
      const matchesSearch =
        !query ||
        app.customerName.toLowerCase().includes(query) ||
        app.purposeOfVisit.toLowerCase().includes(query) ||
        (app.notes && app.notes.toLowerCase().includes(query)) ||
        app.customerPhone.toLowerCase().includes(query) ||
        (cleanQueryPhone.length > 0 && cleanAppPhone.includes(cleanQueryPhone));

      const matchesStatus = statusFilter === "ALL" || app.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [appointmentsList, searchQuery, statusFilter]);

  // Selected date header formatting
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
    return { title: selectedDateKey, weekday: "" };
  };

  const selectedDateHeader = getSelectedDateTitle();

  // If searching, show all search matches in the side panel across dates; otherwise filter by selected date
  const isSearchActive = Boolean(searchQuery.trim());
  const selectedDateApps = isSearchActive
    ? filteredAppointments
    : filteredAppointments.filter((a) => a.dateKey === selectedDateKey);

  // Dynamic KPI Counts live from DB
  const kpiCounts = useMemo(() => {
    let todayCount = 0;
    let upcomingCount = 0;
    let pendingCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    appointmentsList.forEach((app) => {
      if (app.dateKey === todayKey) todayCount++;
      if (app.status === "PENDING") pendingCount++;
      else if (app.status === "COMPLETED") completedCount++;
      else if (app.status === "CANCELLED") cancelledCount++;
      
      const appDate = new Date(app.rawVisitTime || app.dateKey);
      if (appDate > now && (app.status === "PENDING" || app.status === "CONFIRMED")) {
        upcomingCount++;
      }
    });

    return { todayCount, upcomingCount, pendingCount, completedCount, cancelledCount };
  }, [appointmentsList, todayKey, now]);

  // Generate Calendar Days Grid for Month View
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const mondayOffset = (firstDayIndex + 6) % 7;
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  const calendarCells = [];

  for (let i = mondayOffset - 1; i >= 0; i--) {
    calendarCells.push({
      dayNum: prevMonthDays - i,
      isCurrentMonth: false,
      dateKey: `prev-${i}`,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(currentMonth + 1).padStart(2, "0");
    const dayStr = String(d).padStart(2, "0");
    const dateKey = `${currentYear}-${monthStr}-${dayStr}`;

    const appsOnDay = filteredAppointments.filter((a) => a.dateKey === dateKey);

    calendarCells.push({
      dayNum: d,
      isCurrentMonth: true,
      dateKey,
      count: appsOnDay.length,
    });
  }

  const remainingCells = 35 - calendarCells.length;
  for (let j = 1; j <= (remainingCells < 0 ? 42 - calendarCells.length : remainingCells); j++) {
    calendarCells.push({
      dayNum: j,
      isCurrentMonth: false,
      dateKey: `next-${j}`,
    });
  }

  const handleStatusUpdated = (appointmentId: string, newStatus: "COMPLETED" | "CANCELLED" | "CONFIRMED") => {
    setAppointmentsList((prev) =>
      prev.map((app) => (app.id === appointmentId ? { ...app, status: newStatus } : app))
    );
  };

  // Week View Days Calculation (7 days centered around selected date)
  const weekDays = useMemo(() => {
    const parts = selectedDateKey.split("-");
    if (parts.length !== 3) return [];
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayOfWeek = (dateObj.getDay() + 6) % 7; // Mon = 0
    const monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const k = d.toISOString().split("T")[0];
      days.push({
        date: d,
        dateKey: k,
        dayNum: d.getDate(),
        weekday: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
        apps: filteredAppointments.filter((a) => a.dateKey === k),
      });
    }
    return days;
  }, [selectedDateKey, filteredAppointments]);

  // Hourly slots for Day View (09:00 AM to 07:00 PM)
  const hourSlots = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"];

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
        <div 
          onClick={() => {
            setSelectedDateKey(todayKey);
            setStatusFilter("ALL");
          }}
          className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between shadow-xs hover:border-[#2563eb] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              TODAY'S APPOINTMENTS
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#2563eb]">
              <CalendarIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">
            {kpiCounts.todayCount}
          </div>
        </div>

        {/* UPCOMING */}
        <div 
          onClick={() => setStatusFilter("CONFIRMED")}
          className={cn(
            "bg-white border rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all cursor-pointer",
            statusFilter === "CONFIRMED" ? "border-2 border-[#2563eb] bg-blue-50/20 shadow-md scale-[1.01]" : "border-slate-200/80 hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              UPCOMING
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#2563eb]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">
            {kpiCounts.upcomingCount}
          </div>
        </div>

        {/* PENDING */}
        <div 
          onClick={() => setStatusFilter("PENDING")}
          className={cn(
            "bg-white border rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all cursor-pointer",
            statusFilter === "PENDING" ? "border-2 border-amber-500 bg-amber-50/20 shadow-md scale-[1.01]" : "border-slate-200/80 hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              PENDING
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0"></span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">
            {kpiCounts.pendingCount}
          </div>
        </div>

        {/* COMPLETED */}
        <div 
          onClick={() => setStatusFilter("COMPLETED")}
          className={cn(
            "bg-white border rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all cursor-pointer",
            statusFilter === "COMPLETED" ? "border-2 border-emerald-500 bg-emerald-50/20 shadow-md scale-[1.01]" : "border-slate-200/80 hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              COMPLETED
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shrink-0"></span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">
            {kpiCounts.completedCount}
          </div>
        </div>

        {/* CANCELLED */}
        <div 
          onClick={() => setStatusFilter("CANCELLED")}
          className={cn(
            "bg-white border rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all cursor-pointer",
            statusFilter === "CANCELLED" ? "border-2 border-rose-500 bg-rose-50/20 shadow-md scale-[1.01]" : "border-slate-200/80 hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              CANCELLED
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shrink-0"></span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">
            {kpiCounts.cancelledCount}
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient name, phone, or purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#2563eb]"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-[#2563eb]"
          >
            <option value="ALL">ALL STATUSES</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PENDING">PENDING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          {statusFilter !== "ALL" || searchQuery ? (
            <Button
              variant="ghost"
              onClick={() => {
                setStatusFilter("ALL");
                setSearchQuery("");
              }}
              className="h-9 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl"
            >
              Clear Filters
            </Button>
          ) : null}
        </div>
      </div>

      {/* Main Split Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 7/12: Interactive Calendar View Container */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          {/* Calendar Header Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            {/* Month / Year Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                type="button"
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1.5">
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(Number(e.target.value))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-extrabold text-slate-900 bg-white focus:outline-none focus:border-[#2563eb] cursor-pointer shadow-2xs"
                >
                  {monthNames.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(Number(e.target.value))}
                  className="px-2 rounded-lg border border-slate-200 text-xs font-extrabold text-slate-900 bg-white focus:outline-none focus:border-[#2563eb] cursor-pointer py-1 shadow-2xs"
                >
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

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
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer ml-0.5"
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

          {/* VIEW 1: MONTH VIEW */}
          {viewMode === "month" && (
            <>
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
                  const isToday = cell.isCurrentMonth && cell.dateKey === todayKey;

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
                      {/* Day Number / Today Badge */}
                      <div className="flex items-center justify-between">
                        {isToday ? (
                          <span className="h-6 w-6 rounded-full bg-[#2563eb] text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                            {cell.dayNum}
                          </span>
                        ) : (
                          <span className={cn(
                            "text-xs font-bold block",
                            isSelected ? "text-[#2563eb]" : "text-slate-700"
                          )}>
                            {cell.dayNum}
                          </span>
                        )}
                      </div>

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
            </>
          )}

          {/* VIEW 2: WEEK VIEW */}
          {viewMode === "week" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-slate-900">
                  Weekly Schedule ({weekDays[0]?.weekday} {weekDays[0]?.dayNum} - {weekDays[6]?.weekday} {weekDays[6]?.dayNum})
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  7 Days Breakdown
                </span>
              </div>
              <div className="grid grid-cols-7 gap-2 overflow-x-auto min-h-[360px] pb-2">
                {weekDays.map((wDay) => {
                  const isSelected = wDay.dateKey === selectedDateKey;
                  const isToday = wDay.dateKey === todayKey;

                  return (
                    <div
                      key={wDay.dateKey}
                      onClick={() => setSelectedDateKey(wDay.dateKey)}
                      className={cn(
                        "p-2.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer min-w-[95px] select-none",
                        isSelected
                          ? "border-2 border-[#2563eb] bg-blue-50/20 shadow-xs"
                          : "border-slate-200/80 bg-white hover:border-slate-300"
                      )}
                    >
                      <div className="text-center space-y-1 pb-2 border-b border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {wDay.weekday}
                        </span>
                        {isToday ? (
                          <span className="h-6 w-6 rounded-full bg-[#2563eb] text-white font-extrabold text-xs flex items-center justify-center mx-auto shadow-xs">
                            {wDay.dayNum}
                          </span>
                        ) : (
                          <span className="text-sm font-extrabold text-slate-900 block">
                            {wDay.dayNum}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 my-2 flex-1 overflow-y-auto max-h-[240px] pr-0.5">
                        {wDay.apps.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-[10px] font-semibold text-slate-300 text-center py-6">
                            No visits
                          </div>
                        ) : (
                          wDay.apps.map((app) => (
                            <div
                              key={app.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDetailsApp(app);
                              }}
                              className="p-2 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-900 shadow-2xs hover:border-[#2563eb] transition-colors"
                            >
                              <p className="truncate text-slate-900 font-extrabold">{app.customerName}</p>
                              <p className="text-[#2563eb] text-[9px] font-semibold">{app.visitTime}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="text-center pt-1.5 border-t border-slate-100">
                        <span className="text-[10px] font-extrabold text-slate-400">
                          {wDay.apps.length} Visits
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 3: DAY VIEW (HOURLY TIMELINE) */}
          {viewMode === "day" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">
                  Hourly Schedule ({selectedDateHeader.title})
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {selectedDateApps.length} Bookings
                </span>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM"].map((slot) => {
                  const slotApps = selectedDateApps.filter((a) => {
                    const slotHour = slot.slice(0, 2);
                    return a.visitTime.includes(slotHour) || a.visitTime.toLowerCase().includes(slot.toLowerCase());
                  });

                  return (
                    <div key={slot} className="flex items-start gap-4 py-2 border-b border-slate-100">
                      <span className="text-xs font-extrabold text-slate-400 w-16 shrink-0 pt-1">
                        {slot}
                      </span>
                      <div className="flex-1 space-y-1.5">
                        {slotApps.length === 0 ? (
                          <div className="h-8 rounded-xl border border-dashed border-slate-200/80 flex items-center px-3 text-[11px] font-medium text-slate-300">
                            Available Slot
                          </div>
                        ) : (
                          slotApps.map((app) => (
                            <div
                              key={app.id}
                              onClick={() => setSelectedDetailsApp(app)}
                              className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-colors"
                            >
                              <div>
                                <p className="text-xs font-extrabold text-slate-900">{app.customerName}</p>
                                <p className="text-[10px] font-semibold text-slate-500">{app.purposeOfVisit} • {app.customerPhone}</p>
                              </div>
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-[#2563eb] border border-blue-200">
                                {app.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right 5/12: Selected Date Schedule Sidebar Panel */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between min-h-[500px]">
          <div>
            {/* Panel Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {isSearchActive ? `Search Results` : selectedDateHeader.title}
                </h3>
                <p className="text-xs font-semibold text-slate-400">
                  {isSearchActive ? `Matching "${searchQuery}"` : selectedDateHeader.weekday}
                </p>
              </div>

              {isSearchActive && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border-none cursor-pointer bg-transparent"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Subtitle Count */}
            <div className="pt-3 pb-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                {selectedDateApps.length} {isSearchActive ? "MATCHING RESULTS" : "APPOINTMENTS"}
              </span>
            </div>

            {/* Appointment Cards List */}
            <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1 pt-1">
              {selectedDateApps.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <CalendarIcon className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">
                    {isSearchActive
                      ? `No appointments found matching "${searchQuery}".`
                      : selectedDateKey < todayKey
                      ? "No appointments scheduled for this date. (Past Date)"
                      : "No appointments scheduled for this date."}
                  </p>
                  {!isSearchActive && selectedDateKey >= todayKey && (
                    <Button
                      onClick={() => setIsNewModalOpen(true)}
                      variant="outline"
                      className="h-8 text-xs font-bold border-blue-200 text-[#2563eb] hover:bg-blue-50 rounded-lg mt-2 cursor-pointer"
                    >
                      + Schedule Visit
                    </Button>
                  )}
                </div>
              ) : (
                selectedDateApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => {
                      setSelectedDetailsApp(app);
                      if (app.dateKey) {
                        setSelectedDateKey(app.dateKey);
                      }
                    }}
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
                          {isSearchActive && (
                            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                              {app.dateKey}
                            </span>
                          )}
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
        initialDate={selectedDateKey >= todayKey ? selectedDateKey : todayKey}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={(createdApp) => {
          if (createdApp) {
            setAppointmentsList((prev) => [createdApp, ...prev]);
            if (createdApp.dateKey) {
              setSelectedDateKey(createdApp.dateKey);
            }
          }
        }}
      />
    </div>
  );
}


