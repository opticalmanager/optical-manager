"use client";

import React, { useState } from "react";
import { 
  Search, 
  Rocket, 
  Package, 
  Receipt, 
  Mail, 
  ChevronDown, 
  Send, 
  Headphones, 
  PhoneCall, 
  Clock, 
  CheckCircle2, 
  ThumbsUp, 
  ThumbsDown,
  Sparkles,
  HelpCircle,
  AlertCircle,
  Shield,
  FileSpreadsheet,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SupportClientProps {
  initialName?: string;
  initialEmail?: string;
}

interface FAQItem {
  id: string;
  category: "getting-started" | "inventory" | "billing" | "email";
  categoryLabel: string;
  question: string;
  answer: string;
}

const faqsData: FAQItem[] = [
  // Getting Started
  {
    id: "faq-1",
    category: "getting-started",
    categoryLabel: "Getting Started",
    question: "How do I reset my administrative password?",
    answer: "You can reset your administrative password by clicking 'Forgot Password' on the login screen or navigating to Owner Settings > Security & Password inside your dashboard. A secure OTP / reset link will be dispatched to your registered email address."
  },
  {
    id: "faq-2",
    category: "getting-started",
    categoryLabel: "Getting Started",
    question: "How do I add or assign a new shop manager?",
    answer: "System Owners can invite or assign store managers under Owner Settings > Shop Managers. Assign their operating store location, full name, email, and mobile number to grant them POS checkout, billing, and inventory access for that store."
  },
  {
    id: "faq-3",
    category: "getting-started",
    categoryLabel: "Getting Started",
    question: "Can I access Optical Manager from mobile devices or tablets?",
    answer: "Yes! Optical Manager is 100% responsive across mobile phones, iPad / Android tablets, and desktop POS terminals. All features including billing, prescription tracking, and telemetry charts adjust dynamically to your screen size."
  },

  // Inventory Management
  {
    id: "faq-4",
    category: "inventory",
    categoryLabel: "Inventory Management",
    question: "How does low stock alert & replenishment tracking work?",
    answer: "Each optical product in your store (frames, lenses, contact lenses, solutions, accessories) tracks a minimum threshold quantity (minQuantity). Whenever an item's stock drops below this limit, automatic amber badges appear on your Store Dashboard and Analytics page with a 1-click 'Order Now' replenishment link."
  },
  {
    id: "faq-5",
    category: "inventory",
    categoryLabel: "Inventory Management",
    question: "How do I bulk import or update inventory SKUs?",
    answer: "Navigate to Inventory Management > Actions and download the standardized CSV template. Fill in your product names, categories (FRAME, LENS, CONTACT_LENS, ACCESSORY), brand, model, selling price, cost price, and stock quantity, then upload the CSV for instant bulk ingestion."
  },
  {
    id: "faq-6",
    category: "inventory",
    categoryLabel: "Inventory Management",
    question: "Can I track frame dimensions and lens optical powers separately?",
    answer: "Yes! Spectacle frames can be tagged with brand names, model numbers, and dimensions (e.g. 52-18-140), while lenses support Spherical (SPH), Cylindrical (CYL), Axis, and Addition (ADD) specifications linked directly to patient orders."
  },

  // Billing & GST
  {
    id: "faq-7",
    category: "billing",
    categoryLabel: "Billing & GST",
    question: "How do I configure GST invoices and HSN codes?",
    answer: "Go to Shop Settings > Billing & Taxes to enter your 15-digit GSTIN, state code, default tax rates (12% for spectacles/lenses, 18% for solutions), and default HSN codes (e.g. 9004 for spectacle frames, 9001 for optical lenses). HSN codes are mapped automatically during checkout."
  },
  {
    id: "faq-8",
    category: "billing",
    categoryLabel: "Billing & GST",
    question: "Can I record partial payments and track pending customer dues?",
    answer: "Yes. On invoice checkout, select 'PARTIALLY_PAID' and enter the advance deposit collected. The system automatically tracks the remaining balance under 'Pending Receivables' on your dashboard and billing tabs until full settlement."
  },
  {
    id: "faq-9",
    category: "billing",
    categoryLabel: "Billing & GST",
    question: "Can I export patient history and billing reports into CSV format?",
    answer: "Yes! Navigate to Reports or Analytics, select your desired date timeframe (Daily, Weekly, Monthly, YTD), and click 'Export Report' in the top right header to download an optimized CSV spreadsheet for accounting and GST filing."
  },

  // Email Templates
  {
    id: "faq-10",
    category: "email",
    categoryLabel: "Email Templates",
    question: "Can I customize automated prescription and invoice email templates?",
    answer: "Yes, store managers can configure custom email headers, shop logos, terms & conditions, and automated appointment reminder SMS/Email templates under Settings > Communication Settings."
  },
  {
    id: "faq-11",
    category: "email",
    categoryLabel: "Email Templates",
    question: "How do automated patient appointment reminders work?",
    answer: "When a patient schedules an eye examination or frame pickup, automated notification workflows send email/SMS reminders 24 hours prior to the appointment date with 1-click confirmation links."
  },
  {
    id: "faq-12",
    category: "email",
    categoryLabel: "Email Templates",
    question: "How do I send digital optical invoices directly to patients via email?",
    answer: "Once an invoice is generated, click 'Share Invoice' or 'Send Email' on the invoice detail page. The patient receives a secure digital invoice link (/share/invoice/[id]) with a printable PDF view."
  }
];

export default function SupportClient({ initialName = "", initialEmail = "" }: SupportClientProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Accordion state
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>("faq-1");

  // Form state
  const [fullName, setFullName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Technical Glitch");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // Feedback state
  const [feedbackGiven, setFeedbackGiven] = useState<"yes" | "no" | null>(null);

  // Filter FAQs
  const filteredFaqs = faqsData.filter((faq) => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !activeCategory || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSearchTagClick = (tag: string) => {
    setSearchQuery(tag);
  };

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(activeCategory === cat ? null : cat);
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !subject || !message) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setTicketSuccess(true);
      setSubject("");
      setMessage("");
      setTimeout(() => setTicketSuccess(false), 5000);
    }, 800);
  };

  const categoryBadgeColors: Record<string, string> = {
    "getting-started": "bg-blue-50 text-blue-700 border-blue-100",
    "inventory": "bg-amber-50 text-amber-700 border-amber-100",
    "billing": "bg-[#2563eb]/10 text-[#2563eb] border-blue-200/60",
    "email": "bg-purple-50 text-purple-700 border-purple-100",
  };

  return (
    <div className="space-y-8 select-none max-w-[1300px] mx-auto pb-16">
      {/* 1. Header Hero Section */}
      <div className="text-center space-y-4 pt-4 pb-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1a365d] tracking-tight">
          Help Center
        </h1>
        <p className="text-xs sm:text-sm font-medium text-slate-500 max-w-2xl mx-auto">
          Empowering clinical administrators with rapid technical support and extensive knowledge resources.
        </p>

        {/* Hero Search Bar */}
        <div className="max-w-2xl mx-auto relative pt-2">
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="How can we help you today?"
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563eb] shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Popular Tag Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-[11px] font-semibold text-slate-400">
            <span>Popular:</span>
            <button
              onClick={() => handleSearchTagClick("GST Integration")}
              className="hover:text-[#2563eb] hover:underline cursor-pointer"
            >
              GST Integration
            </button>
            <span>•</span>
            <button
              onClick={() => handleSearchTagClick("User Permissions")}
              className="hover:text-[#2563eb] hover:underline cursor-pointer"
            >
              User Permissions
            </button>
            <span>•</span>
            <button
              onClick={() => handleSearchTagClick("API Docs")}
              className="hover:text-[#2563eb] hover:underline cursor-pointer"
            >
              API Docs
            </button>
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column (2 cols): Knowledge Categories, FAQs & Issue Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section: Frequently Asked Questions & Categories */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-[#2563eb]" />
                <h2 className="text-lg font-bold text-slate-900">
                  Frequently Asked Questions
                </h2>
              </div>
              {activeCategory && (
                <button
                  onClick={() => setActiveCategory(null)}
                  className="text-xs font-bold text-[#2563eb] hover:underline cursor-pointer"
                >
                  Show All Categories ({faqsData.length})
                </button>
              )}
            </div>

            {/* 4 Knowledge Category Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Card 1: Getting Started */}
              <div
                onClick={() => handleCategoryClick("getting-started")}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  activeCategory === "getting-started"
                    ? "border-[#2563eb] bg-blue-50/50 shadow-xs"
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                }`}
              >
                <div className="p-2 w-fit rounded-lg bg-blue-50 text-[#2563eb] border border-blue-100 mb-3">
                  <Rocket className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Getting Started</h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">
                    Quick setup guides, login issues, and profile customization.
                  </p>
                </div>
              </div>

              {/* Card 2: Inventory Management */}
              <div
                onClick={() => handleCategoryClick("inventory")}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  activeCategory === "inventory"
                    ? "border-[#2563eb] bg-blue-50/50 shadow-xs"
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                }`}
              >
                <div className="p-2 w-fit rounded-lg bg-amber-50 text-amber-700 border border-amber-100 mb-3">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Inventory Management</h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">
                    Tracking stock, batch updates, and supplier management protocols.
                  </p>
                </div>
              </div>

              {/* Card 3: Billing & GST */}
              <div
                onClick={() => handleCategoryClick("billing")}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  activeCategory === "billing"
                    ? "border-[#2563eb] bg-blue-50/50 shadow-xs"
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                }`}
              >
                <div className="p-2 w-fit rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 mb-3">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Billing & GST</h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">
                    Invoice generation, GST filing, and payment gateway setup.
                  </p>
                </div>
              </div>

              {/* Card 4: Email Templates */}
              <div
                onClick={() => handleCategoryClick("email")}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  activeCategory === "email"
                    ? "border-[#2563eb] bg-blue-50/50 shadow-xs"
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                }`}
              >
                <div className="p-2 w-fit rounded-lg bg-purple-50 text-purple-600 border border-purple-100 mb-3">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Email Templates</h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">
                    Creating patient reminders and automated follow-up workflows.
                  </p>
                </div>
              </div>
            </div>

            {/* Accordion List */}
            <div className="space-y-2.5 pt-2">
              {filteredFaqs.length === 0 ? (
                <div className="p-6 text-center bg-white border border-dashed border-slate-200 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-slate-500">
                    No matching FAQ questions found for your query.
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Try searching for another topic or submit an issue ticket below.
                  </p>
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  const isExpanded = expandedFaqId === faq.id;
                  const badgeColor = categoryBadgeColors[faq.category] || "bg-slate-100 text-slate-600 border-slate-200";

                  return (
                    <div
                      key={faq.id}
                      className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                        className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeColor}`}>
                            {faq.categoryLabel}
                          </span>
                          <span className="text-xs font-extrabold text-slate-800 truncate">
                            {faq.question}
                          </span>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 text-xs font-medium text-slate-600 leading-relaxed border-t border-slate-100 pt-3 bg-slate-50/30">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section: Report an Issue Form */}
          <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Report an Issue
              </h3>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Need specific assistance? Submit a support ticket and our clinical team will respond within 2 hours.
              </p>
            </div>

            {ticketSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Ticket submitted successfully! Support ID #OPT-8492 assigned.</span>
              </div>
            )}

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563eb]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@clinic.com"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563eb]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief issue title"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563eb]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563eb]"
                  >
                    <option value="Technical Glitch">Technical Glitch</option>
                    <option value="Billing & GST">Billing & GST</option>
                    <option value="Inventory Sync">Inventory Sync</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Message / Description</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or request in detail..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563eb] resize-none"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 px-6 text-xs font-bold bg-[#1d65c4] hover:bg-[#154f9b] text-white rounded-xl cursor-pointer shadow-xs"
                >
                  {isSubmitting ? "Submitting..." : "Submit Ticket"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (1 col): Direct Support Contact Card */}
        <div className="space-y-4">
          <div className="bg-[#1e70bf] text-white p-6 rounded-2xl shadow-md space-y-6">
            <h3 className="text-xs font-extrabold tracking-wider uppercase opacity-90">
              DIRECT SUPPORT
            </h3>

            <div className="space-y-5">
              {/* Item 1: Email */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white/10 shrink-0">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold opacity-80 block">Email us</span>
                  <a 
                    href="mailto:support@opticalmanager.in" 
                    className="text-xs font-bold hover:underline"
                  >
                    support@opticalmanager.in
                  </a>
                </div>
              </div>

              {/* Item 2: Call Us */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white/10 shrink-0">
                  <PhoneCall className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold opacity-80 block">Call us</span>
                  <div className="space-y-0.5">
                    <a href="tel:+918178962366" className="text-xs font-bold block hover:underline">
                      Gaurav: +91 81789 62366
                    </a>
                    <a href="tel:+917678106554" className="text-xs font-bold block hover:underline">
                      Deepak: +91 76781 06554
                    </a>
                  </div>
                </div>
              </div>

              {/* Item 3: Support Hours */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white/10 shrink-0">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold opacity-80 block">Support Hours</span>
                  <span className="text-xs font-bold block">Mon - Sat, 9AM - 8PM IST</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Feedback Banner */}
      <div className="bg-[#e0ecfc]/80 border border-blue-100 p-6 rounded-2xl text-center space-y-3">
        <h4 className="text-sm font-extrabold text-slate-800">
          Was this helpful?
        </h4>

        {feedbackGiven ? (
          <p className="text-xs font-bold text-[#1d65c4] animate-in fade-in">
            Thank you for your feedback! We continuously refine our knowledge base.
          </p>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              onClick={() => setFeedbackGiven("yes")}
              variant="outline"
              className="h-9 px-5 text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center gap-1.5"
            >
              <ThumbsUp className="h-3.5 w-3.5 text-slate-600" /> Yes
            </Button>

            <Button
              type="button"
              onClick={() => setFeedbackGiven("no")}
              variant="outline"
              className="h-9 px-5 text-xs font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center gap-1.5"
            >
              <ThumbsDown className="h-3.5 w-3.5 text-slate-600" /> No
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
