"use client";

import React, { useEffect, useState, useRef, useCallback, FormEvent, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import PusherClient from "pusher-js";
import ScheduleManager from "@/components/ScheduleManager";
import TerminalTypewriter from "@/components/TerminalTypewriter";
import { products } from "@/lib/products";
import imageCompression from 'browser-image-compression';
import CroppedImage from '@/components/CroppedImage';
import TiptapEditor from '@/components/TiptapEditor';
import { emailTemplates, type EmailTemplate } from '@/lib/email-templates';
import BlogManager from '@/components/BlogManager';
import RescheduleModal from '@/components/RescheduleModal';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CartAnalytics {
  addToCart: number;
  removeFromCart: number;
  checkoutStarted: number;
  totalCartValue: number;
  popularAddOns: Array<{ name: string; count: number }>;
}

interface ProductAnalytics {
  productViews: Array<{ product: string; views: number; revenue: number }>;
  totalViews: number;
}

interface SalesAnalytics {
  totalRevenue: number;
  totalOrders: number;
  allTimeRevenue: number;
  allTimeOrders: number;
  averageOrderValue: number;
  topProducts: Array<{ product: string; revenue: number; quantity: number }>;
  todaysOrders: number;
  todaysRevenue: number;
  recentOrders: Array<{
    id: string;
    customerName: string;
    productName: string;
    amount: number;
    date: string;
    status: string;
  }>;
}

interface AnalyticsData {
  pageviews: { value: number; change: number };
  visitors: { value: number; change: number };
  visits: { value: number; change: number };
  bounceRate: { value: number; change: number };
  avgVisitTime: { value: string; change: number };
  topPages: Array<{ page: string; views: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  devices: { desktop: number; mobile: number; tablet: number };
  countries: Array<{ country: string; countryFlag: string; visitors: number }>;
  cities: Array<{ city: string; visitors: number }>;
  recentVisitors: Array<{
    ip: string;
    city: string;
    state: string;
    country: string;
    countryCode?: string;
    device: string;
    browser: string;
    os: string;
    timestamp: string;
    pageviews: number;
  }>;
  cartAnalytics: CartAnalytics;
  productAnalytics: ProductAnalytics;
  salesAnalytics: SalesAnalytics;
}

export default function DashboardEnhanced() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState("7d");
  const [salesMonth, setSalesMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [analyticsMonth, setAnalyticsMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Initialize activeTab from URL parameter or default to "overview"
  const tabFromUrl = searchParams.get('tab') as "overview" | "sales" | "orders" | "schedule" | "manage-products" | "manage-addons" | "studio" | "email-marketer" | "blog" | "promos" | "terminal" | null;
  const [activeTab, setActiveTab] = useState<"overview" | "sales" | "orders" | "schedule" | "manage-products" | "manage-addons" | "studio" | "email-marketer" | "blog" | "promos" | "terminal">(
    tabFromUrl || "overview"
  );
  const [realtimeVisitors, setRealtimeVisitors] = useState(0);
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
  const [importLibraryMedia, setImportLibraryMedia] = useState<any[]>([]);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarStartDate, setCalendarStartDate] = useState(new Date());
  const [aiSummary, setAiSummary] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [scanInitiated, setScanInitiated] = useState(false);

  // AI Analytics Report state
  const [aiReportOpen, setAiReportOpen] = useState(false);
  const [aiReport, setAiReport] = useState<string>('');
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [aiReportCost, setAiReportCost] = useState<{
    amount: number;
    details: string;
    inputTokens: number;
    outputTokens: number;
  } | null>(null);
  const [aiReportCreatedAt, setAiReportCreatedAt] = useState<Date | null>(null);
  const [abandonedCartsData, setAbandonedCartsData] = useState<{
    count: number;
    value: number;
    carts: Array<{
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      items: Array<{ name: string; price: number; size: string; flavor?: string }>;
      hoursAgo: number;
    }>;
  } | null>(null);
  const [abandonedCartsExpanded, setAbandonedCartsExpanded] = useState(false);
  const [addingToEmailList, setAddingToEmailList] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<string>('');
  const [commandOutput, setCommandOutput] = useState<string>('');
  const [terminalBooted, setTerminalBooted] = useState(false);
  const [bootSequence, setBootSequence] = useState<string[]>([]);
  const [showCommands, setShowCommands] = useState(false);
  const terminalInputRef = useRef<HTMLDivElement>(null);
  const terminalScrollRef = useRef<HTMLDivElement>(null);
  const [welcomeText, setWelcomeText] = useState('');
  const [showOkayImage, setShowOkayImage] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [chatbotToggleLoading, setChatbotToggleLoading] = useState(false);
  const [recentOrdersTab, setRecentOrdersTab] = useState<'recent' | 'highest'>('recent');

  // Reschedule modal state
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<any>(null);

  // Toast notification state
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }>>([]);
  const toastIdCounter = useRef(0);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() * 1000 + (toastIdCounter.current++ % 1000);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Custom cake requests state
  const [ordersSubTab, setOrdersSubTab] = useState<'orders' | 'completed' | 'customs' | 'weddings'>('orders');
  const [customRequests, setCustomRequests] = useState<any[]>([]);
  const [customRequestsLoading, setCustomRequestsLoading] = useState(false);

  // Wedding cake requests state
  const [weddingRequests, setWeddingRequests] = useState<any[]>([]);
  const [weddingRequestsLoading, setWeddingRequestsLoading] = useState(false);
  const [weddingRequestsSearch, setWeddingRequestsSearch] = useState('');

  // Wedding edit state
  const [editingWeddingId, setEditingWeddingId] = useState<string | null>(null);
  const [weddingEditData, setWeddingEditData] = useState({
    eventDate: '',
    eventTime: '',
    venue: '',
    guestCount: '',
    tiers: '1',
    servings: '',
    flavor: '',
    filling: '',
    fulfillmentType: 'pickup' as 'pickup' | 'delivery',
    deliveryAddress: '',
    designNotes: '',
    finalPrice: '',
    isDeposit: false,
    totalPrice: '', // Full price before deposit split
  });
  const [savingWeddingEdit, setSavingWeddingEdit] = useState(false);

  // Design notes edit state
  const [editingDesignNotesId, setEditingDesignNotesId] = useState<string | null>(null);
  const [editedDesignNotes, setEditedDesignNotes] = useState('');
  const [savingDesignNotes, setSavingDesignNotes] = useState(false);

  // Image upload state
  const [uploadingImageFor, setUploadingImageFor] = useState<{ bookingId: string; type: 'reference' | 'edible' } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Quote creation state
  const [quotingRequestId, setQuotingRequestId] = useState<string | null>(null);
  const [quotingRequestType, setQuotingRequestType] = useState<'custom' | 'wedding'>('custom');
  const [quotePrice, setQuotePrice] = useState<string>('');
  const [quoteMessage, setQuoteMessage] = useState<string>('');
  const [creatingPaymentLink, setCreatingPaymentLink] = useState(false);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);
  const [customRequestsSearch, setCustomRequestsSearch] = useState('');
  const [customRequestsFilter, setCustomRequestsFilter] = useState<'active' | 'quoted' | 'converted'>('active');
  const [refreshingSales, setRefreshingSales] = useState(false);

  // Date reschedule modal state (shown when date is unavailable before sending payment link)
  const [dateRescheduleModal, setDateRescheduleModal] = useState<{
    show: boolean;
    requestId: string;
    requestType: 'custom' | 'wedding';
    originalDate: string;
    issue: string;
    reason?: string;
    newDate: string;
    capacityWarning?: boolean; // True when this is a pending payment link warning
  } | null>(null);

  // Filter custom requests based on search and status filter
  const filteredCustomRequests = customRequests.filter((request) => {
    // First filter by status (active = pending only, quoted = quoted/approved/deposit_paid, converted = converted)
    const quotedStatuses = ['quoted', 'approved', 'deposit_paid'];
    if (customRequestsFilter === 'active' && request.status !== 'pending') return false;
    if (customRequestsFilter === 'quoted' && !quotedStatuses.includes(request.status)) return false;
    if (customRequestsFilter === 'converted' && request.status !== 'converted') return false;

    // Then filter by search
    if (!customRequestsSearch.trim()) return true;
    const search = customRequestsSearch.toLowerCase();
    return (
      request.requestNumber?.toLowerCase().includes(search) ||
      request.customerInfo?.name?.toLowerCase().includes(search) ||
      request.customerInfo?.email?.toLowerCase().includes(search) ||
      request.customerInfo?.phone?.toLowerCase().includes(search) ||
      request.cakeDetails?.productName?.toLowerCase().includes(search)
    );
  });

  // Filter wedding requests based on search
  const filteredWeddingRequests = weddingRequests.filter((request) => {
    if (!weddingRequestsSearch.trim()) return true;
    const search = weddingRequestsSearch.toLowerCase();
    return (
      request.requestNumber?.toLowerCase().includes(search) ||
      request.customerInfo?.name?.toLowerCase().includes(search) ||
      request.customerInfo?.email?.toLowerCase().includes(search) ||
      request.customerInfo?.phone?.toLowerCase().includes(search) ||
      request.eventDetails?.venue?.toLowerCase().includes(search)
    );
  });

  useEffect(() => {
    fetchAnalytics(analyticsMonth);
  }, [dateRange, analyticsMonth]);

  // Fetch chatbot setting when help modal opens
  useEffect(() => {
    if (showHelpModal) {
      fetch('/api/admin/settings')
        .then(res => res.json())
        .then(data => {
          setChatbotEnabled(data.chatbotEnabled ?? true);
        })
        .catch(err => console.error('Failed to fetch settings:', err));
    }
  }, [showHelpModal]);

  // Toggle chatbot enabled/disabled
  const toggleChatbot = async () => {
    setChatbotToggleLoading(true);
    try {
      const newValue = !chatbotEnabled;
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatbotEnabled: newValue }),
      });
      if (res.ok) {
        setChatbotEnabled(newValue);
        showToast(newValue ? 'Chatbot enabled' : 'Chatbot disabled', 'success');
      } else {
        showToast('Failed to update setting', 'error');
      }
    } catch (err) {
      console.error('Failed to toggle chatbot:', err);
      showToast('Failed to update setting', 'error');
    } finally {
      setChatbotToggleLoading(false);
    }
  };

  // Sync activeTab with URL parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  // Format phone number with dashes (e.g., 469-690-3182)
  const formatPhone = (phone: string | undefined | null): string => {
    if (!phone) return '';
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    // Format as XXX-XXX-XXXX for 10 digits
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    // Format as X-XXX-XXX-XXXX for 11 digits (with country code)
    if (digits.length === 11 && digits[0] === '1') {
      return `${digits[0]}-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    // Return original if doesn't match expected format
    return phone;
  };

  // Function to change tab and update URL
  const changeTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.push(`/kassycakes/dashboard?${params.toString()}`, { scroll: false });
  };

  // Typewriter effect for welcome message
  useEffect(() => {
    if (activeTab === 'overview' && data) {
      setWelcomeText('');
      setShowOkayImage(false);
      const hasZeroOrders = data?.salesAnalytics?.todaysOrders === 0;
      const mainText = `Here's what's happening with your store today. You have ${realtimeVisitors} active visitors right now${data?.salesAnalytics?.todaysOrders !== undefined ? ` and ${data.salesAnalytics.todaysOrders} new orders today` : ''}.`;
      const zeroOrdersText = ' Zero orders...';

      let index = 0;
      const interval = setInterval(() => {
        if (index < mainText.length) {
          setWelcomeText(mainText.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);

          // If zero orders, pause for 2 seconds then type additional message
          if (hasZeroOrders) {
            setTimeout(() => {
              let zeroIndex = 0;
              const zeroInterval = setInterval(() => {
                if (zeroIndex < zeroOrdersText.length) {
                  setWelcomeText(mainText + zeroOrdersText.slice(0, zeroIndex + 1));
                  zeroIndex++;
                } else {
                  clearInterval(zeroInterval);
                  setShowOkayImage(true);
                }
              }, 20);
            }, 2000);
          }
        }
      }, 20);

      return () => clearInterval(interval);
    }
  }, [activeTab, data, realtimeVisitors]);

  useEffect(() => {
    // Initialize Pusher client
    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
    });

    // Subscribe to presence channel
    const channel = pusher.subscribe('presence-website-visitors');

    // Update visitor count when subscription succeeds
    channel.bind('pusher:subscription_succeeded', (members: any) => {
      setRealtimeVisitors(members.count);
    });

    // Update when someone joins
    channel.bind('pusher:member_added', (member: any) => {
      setRealtimeVisitors((prev) => prev + 1);
    });

    // Update when someone leaves
    channel.bind('pusher:member_removed', (member: any) => {
      setRealtimeVisitors((prev) => Math.max(0, prev - 1));
    });

    // Cleanup on unmount
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, []);

  // Refresh AI summary periodically (every 5 minutes) - only if already initiated
  useEffect(() => {
    if (!data || !scanInitiated) return;

    const interval = setInterval(() => {
      if (data && activeTab === 'terminal' && scanInitiated) {
        fetchAISummary({
          ...data,
          activeVisitors: realtimeVisitors,
        });
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [data, realtimeVisitors, activeTab, scanInitiated]);

  // Handle initiating the analytics scan
  const initiateScan = () => {
    if (!data || scanInitiated || summaryLoading) return;

    setScanInitiated(true);
    fetchAISummary({
      ...data,
      activeVisitors: realtimeVisitors,
    });
  };

  // Handle keyboard events for terminal
  useEffect(() => {
    if (activeTab !== 'terminal' || scanInitiated) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        initiateScan();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeTab, scanInitiated, data, realtimeVisitors]);

  // Reset scan when switching tabs
  useEffect(() => {
    if (activeTab !== 'terminal') {
      setScanInitiated(false);
      setAiSummary('');
      setSelectedCommand('');
      setCommandOutput('');
    }
  }, [activeTab]);

  // Terminal boot sequence (Fallout-style)
  useEffect(() => {
    if (activeTab === 'terminal' && !terminalBooted) {
      const bootLines = [
        'JAMESWEB.DEV (TM) TERMLINK',
        'ENTER PASSWORD NOW',
        '',
        '> ********',
        '',
        'PASSWORD ACCEPTED',
        'INITIALIZING DASHBOARD TERMINAL...',
        'LOADING SYSTEM MODULES...',
        'CONNECTING TO DATABASE...',
        'ESTABLISHING SECURE CONNECTION...',
        '',
        'KASSYCAKES ADMIN TERMINAL v2.0.1',
        'COPYRIGHT 2025 JAMESWEB.DEV',
        '',
        'TERMINAL READY',
        'AVAILABLE COMMANDS LOADED',
        '',
      ];

      let currentLine = 0;
      const interval = setInterval(() => {
        if (currentLine < bootLines.length) {
          setBootSequence(prev => {
            const newSeq = [...prev, bootLines[currentLine]];
            // Auto-scroll to bottom
            setTimeout(() => {
              if (terminalScrollRef.current) {
                terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
              }
            }, 0);
            return newSeq;
          });
          currentLine++;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            setTerminalBooted(true);
            // Show commands after a short delay
            setTimeout(() => {
              setShowCommands(true);
            }, 300);
          }, 500);
        }
      }, 100);

      return () => clearInterval(interval);
    } else if (activeTab !== 'terminal') {
      // Reset boot sequence when leaving terminal
      setTerminalBooted(false);
      setBootSequence([]);
      setShowCommands(false);
    }
  }, [activeTab, terminalBooted]);

  // Auto-scroll when commands appear
  useEffect(() => {
    if (showCommands && terminalScrollRef.current) {
      setTimeout(() => {
        terminalScrollRef.current?.scrollTo({
          top: terminalScrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [showCommands]);

  // Execute terminal command
  const executeCommand = (command: string) => {
    setSelectedCommand(command);
    setScanInitiated(true);
    setSummaryLoading(true);

    // Handle different commands
    if (command === 'analytics-scan.sh') {
      fetchAISummary({
        ...data,
        activeVisitors: realtimeVisitors,
      });
    } else if (command === 'what-is.sh') {
      setTimeout(() => {
        setCommandOutput(`>> TERMINAL DASHBOARD v2.0.1

This is an AI-powered terminal interface for your admin dashboard.

→ PURPOSE: Provides intelligent insights and help through preset commands
→ POWERED BY AI: same engine as Ask Kassy chatbot
→ FEATURES:
  • Natural language analytics summaries
  • Interactive command system
  • Real-time data analysis
  • Multi-site compatibility

→ BUILT FOR: JamesWeb.dev client dashboards
→ DEVELOPER: ¥ames

Type a command or click a preset to get started.`);
        setSummaryLoading(false);
      }, 800);
    } else if (command === 'how-to.sh') {
      setTimeout(() => {
        setCommandOutput(`>> DASHBOARD USAGE GUIDE

NAVIGATION:
→ Use tabs at the top to switch between different sections
→ Analytics: View traffic, sales, and performance metrics
→ Terminal: Run AI-powered commands (you are here!)
→ Sales: Detailed revenue and order analytics
→ Orders: Manage customer orders and bookings
→ Schedule: View and manage your calendar
→ Manage Cakes: Add, edit, or remove products
→ Studio: AI-powered photo editing with lighting presets
→ Email Marketer: Send campaigns to customers

TERMINAL COMMANDS:
→ analytics-scan.sh: AI analyzes your data and provides insights
→ what-is.sh: Learn about the terminal interface
→ how-to.sh: View this help guide

QUICK TIPS:
• Click any command or press Enter to execute
• Data auto-refreshes every 5 minutes
• All changes are saved automatically
• Need help? Contact@jamesweb.dev

Happy managing!`);
        setSummaryLoading(false);
      }, 800);
    }
  };

  const fetchAnalytics = async (month?: string) => {
    setLoading(true);
    setError("");

    try {
      // Use month-based date range if provided
      const selectedMonth = month || analyticsMonth;
      const [year, monthNum] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59); // Last day of month

      const res = await fetch(`/api/admin/analytics?range=${dateRange}&startAt=${startDate.getTime()}&endAt=${endDate.getTime()}`);

      if (!res.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const analyticsData = await res.json();
      setData(analyticsData);

      // Don't auto-fetch AI summary - wait for user to initiate
      // fetchAISummary(analyticsData);
    } catch (err) {
      setError("Failed to load analytics data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh sales data from Stripe (dedicated function for the refresh button)
  const refreshSalesData = async () => {
    setRefreshingSales(true);
    try {
      const res = await fetch(`/api/admin/analytics?range=${dateRange}&refresh=true`);
      if (!res.ok) {
        throw new Error("Failed to refresh analytics");
      }
      const analyticsData = await res.json();
      setData(analyticsData);
      showToast('Sales data refreshed from Stripe!', 'success');
    } catch (err) {
      console.error('Failed to refresh sales:', err);
      showToast('Failed to refresh sales data', 'error');
    } finally {
      setRefreshingSales(false);
    }
  };

  const fetchAISummary = async (analyticsData: any) => {
    setSummaryLoading(true);
    try {
      const res = await fetch('/api/admin/analytics/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analyticsData: {
            ...analyticsData,
            activeVisitors: realtimeVisitors,
          }
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch AI summary");
      }

      const data = await res.json();
      setAiSummary(data.summary);
    } catch (err) {
      console.error('Failed to load AI summary:', err);
      // Set a fallback message
      setAiSummary('>> ANALYTICS DASHBOARD ONLINE\n→ Data loading complete. Check stats below.');
    } finally {
      setSummaryLoading(false);
    }
  };

  // Open AI Report modal - fetches last saved report
  const openAIReport = async () => {
    setAiReportOpen(true);
    setAiReportLoading(true);
    setAbandonedCartsExpanded(false);

    try {
      // Fetch last saved report for the selected month
      const res = await fetch(`/api/admin/analytics/ai-report?month=${analyticsMonth}`);

      if (!res.ok) {
        throw new Error("Failed to fetch report");
      }

      const result = await res.json();

      if (result.report) {
        setAiReport(result.report);
        setAbandonedCartsData(result.abandonedCarts);
        setAiReportCost(result.cost);
        setAiReportCreatedAt(result.createdAt ? new Date(result.createdAt) : null);
      } else {
        // No saved report for this month - show message
        setAiReport('No report found for this month. Click "Generate New Report" to create one.');
        setAiReportCreatedAt(null);
      }
    } catch (err) {
      console.error('Failed to fetch AI report:', err);
      setAiReport('No report found. Click "Generate New Report" to create one.');
    } finally {
      setAiReportLoading(false);
    }
  };

  // Generate a new AI analytics report
  const regenerateAIReport = async () => {
    if (!data) return;

    setAiReportLoading(true);
    setAiReport('');
    setAbandonedCartsExpanded(false);

    try {
      const res = await fetch('/api/admin/analytics/ai-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analyticsData: {
            ...data,
            activeVisitors: realtimeVisitors,
          },
          dateRange,
          month: analyticsMonth,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate AI report");
      }

      const result = await res.json();
      setAiReport(result.report);
      setAbandonedCartsData(result.abandonedCarts);
      setAiReportCost(result.cost);
      setAiReportCreatedAt(result.createdAt ? new Date(result.createdAt) : new Date());
    } catch (err) {
      console.error('Failed to generate AI report:', err);
      setAiReport('Failed to generate report. Please try again.');
    } finally {
      setAiReportLoading(false);
    }
  };

  // Add abandoned cart emails to marketing list
  const addAbandonedCartsToEmailList = async () => {
    if (!abandonedCartsData || abandonedCartsData.carts.length === 0) return;

    setAddingToEmailList(true);
    try {
      const emails = abandonedCartsData.carts
        .filter(cart => cart.customerEmail && cart.customerEmail.includes('@'))
        .map(cart => ({
          email: cart.customerEmail,
          name: cart.customerName
        }));

      if (emails.length === 0) {
        showToast('No valid emails found in abandoned carts', 'error');
        return;
      }

      const res = await fetch('/api/admin/email-list/add-abandoned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails })
      });

      const result = await res.json();

      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.error || 'Failed to add emails', 'error');
      }
    } catch (err) {
      console.error('Failed to add emails to list:', err);
      showToast('Failed to add emails to list', 'error');
    } finally {
      setAddingToEmailList(false);
    }
  };

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/bookings?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      // Sort by urgency - orders due sooner appear first
      const sortedBookings = (data.bookings || []).sort((a: any, b: any) => {
        const daysUntilA = Math.ceil((new Date(a.orderDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const daysUntilB = Math.ceil((new Date(b.orderDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        // Orders due sooner (lower days) come first
        return daysUntilA - daysUntilB;
      });
      setBookings(sortedBookings);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  // Handle rescheduling an order
  const handleReschedule = async (bookingId: string, newDate: string, newTime?: string) => {
    try {
      const response = await fetch('/api/admin/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, newDate, newTime })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reschedule');
      }

      showToast('Order rescheduled successfully', 'success');
      await fetchBookings(); // Refresh bookings list
    } catch (error: any) {
      showToast(error.message || 'Failed to reschedule order', 'error');
      throw error;
    }
  };

  const fetchProductsForOrders = async () => {
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/products?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setDbProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setDbProducts([]);
    }
  };

  const fetchCustomRequests = async () => {
    setCustomRequestsLoading(true);
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/custom-cake-request?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch custom requests');
      const data = await response.json();
      setCustomRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to load custom requests:', err);
    } finally {
      setCustomRequestsLoading(false);
    }
  };

  const fetchWeddingRequests = async () => {
    setWeddingRequestsLoading(true);
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/wedding-cake-request?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch wedding requests');
      const data = await response.json();
      setWeddingRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to load wedding requests:', err);
    } finally {
      setWeddingRequestsLoading(false);
    }
  };

  const startEditingWedding = (request: any) => {
    setEditingWeddingId(request._id);
    const eventDate = request.eventDetails?.eventDate
      ? new Date(request.eventDetails.eventDate).toISOString().split('T')[0]
      : '';
    const estimatedPrice = request.cakeDetails?.estimatedPrice?.toString() || '';
    setWeddingEditData({
      eventDate: eventDate,
      eventTime: request.eventDetails?.eventTime || '',
      venue: request.eventDetails?.venue || '',
      guestCount: request.eventDetails?.guestCount?.toString() || '',
      tiers: request.cakeDetails?.tiers?.toString() || '1',
      servings: request.cakeDetails?.servings?.toString() || '',
      flavor: request.cakeDetails?.flavor || '',
      filling: request.cakeDetails?.filling || '',
      fulfillmentType: request.cakeDetails?.fulfillmentType || 'pickup',
      deliveryAddress: request.cakeDetails?.deliveryAddress || '',
      designNotes: request.cakeDetails?.designNotes || '',
      finalPrice: estimatedPrice,
      isDeposit: false,
      totalPrice: estimatedPrice,
    });
  };

  const saveWeddingEdit = async (requestId: string) => {
    if (!weddingEditData.finalPrice || parseFloat(weddingEditData.finalPrice) <= 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }

    setSavingWeddingEdit(true);
    try {
      const response = await fetch(`/api/wedding-cake-request/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventDetails: {
            eventDate: weddingEditData.eventDate ? new Date(weddingEditData.eventDate) : undefined,
            eventTime: weddingEditData.eventTime || undefined,
            venue: weddingEditData.venue || undefined,
            guestCount: weddingEditData.guestCount ? parseInt(weddingEditData.guestCount) : undefined,
            eventType: 'wedding',
          },
          cakeDetails: {
            tiers: parseInt(weddingEditData.tiers) || 1,
            servings: weddingEditData.servings ? parseInt(weddingEditData.servings) : undefined,
            flavor: weddingEditData.flavor || undefined,
            filling: weddingEditData.filling || undefined,
            fulfillmentType: weddingEditData.fulfillmentType,
            deliveryAddress: weddingEditData.deliveryAddress || undefined,
            designNotes: weddingEditData.designNotes || undefined,
            estimatedPrice: parseFloat(weddingEditData.finalPrice),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update wedding request');
      }

      showToast('Wedding request updated!', 'success');
      setEditingWeddingId(null);
      await fetchWeddingRequests();
    } catch (err) {
      console.error('Failed to save wedding edit:', err);
      showToast('Failed to update wedding request', 'error');
    } finally {
      setSavingWeddingEdit(false);
    }
  };

  const saveAndSendWeddingPaymentLink = async (requestId: string) => {
    if (!weddingEditData.finalPrice || parseFloat(weddingEditData.finalPrice) <= 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }

    setSavingWeddingEdit(true);
    try {
      // First save the edits
      const updateResponse = await fetch(`/api/wedding-cake-request/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventDetails: {
            eventDate: weddingEditData.eventDate ? new Date(weddingEditData.eventDate) : undefined,
            eventTime: weddingEditData.eventTime || undefined,
            venue: weddingEditData.venue || undefined,
            guestCount: weddingEditData.guestCount ? parseInt(weddingEditData.guestCount) : undefined,
            eventType: 'wedding',
          },
          cakeDetails: {
            tiers: parseInt(weddingEditData.tiers) || 1,
            servings: weddingEditData.servings ? parseInt(weddingEditData.servings) : undefined,
            flavor: weddingEditData.flavor || undefined,
            filling: weddingEditData.filling || undefined,
            fulfillmentType: weddingEditData.fulfillmentType,
            deliveryAddress: weddingEditData.deliveryAddress || undefined,
            designNotes: weddingEditData.designNotes || undefined,
            estimatedPrice: parseFloat(weddingEditData.finalPrice),
          },
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update wedding request');
      }

      // Then create payment link
      const paymentResponse = await fetch('/api/wedding-cake-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingRequestId: requestId,
          finalPrice: parseFloat(weddingEditData.finalPrice),
          message: quoteMessage || undefined,
          isDeposit: weddingEditData.isDeposit,
          totalPrice: weddingEditData.isDeposit ? parseFloat(weddingEditData.totalPrice) || (parseFloat(weddingEditData.finalPrice) * 2) : undefined,
        }),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(paymentData.error || 'Failed to create payment link');
      }

      showToast('Payment link created and sent!', 'success');
      setEditingWeddingId(null);
      setQuoteMessage('');
      await fetchWeddingRequests();
    } catch (err) {
      console.error('Failed to save and send payment link:', err);
      showToast(err instanceof Error ? err.message : 'Failed to process', 'error');
    } finally {
      setSavingWeddingEdit(false);
    }
  };

  // Check date availability and capacity before sending payment link
  const createPaymentLink = async (requestId: string, type: 'custom' | 'wedding' = 'custom') => {
    const price = parseFloat(quotePrice);
    if (isNaN(price) || price <= 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }

    // Get the request to check its date
    const request = type === 'wedding'
      ? weddingRequests.find(r => r._id === requestId)
      : customRequests.find(r => r._id === requestId);

    if (!request) {
      showToast('Request not found', 'error');
      return;
    }

    const requestedDate = type === 'wedding'
      ? request.eventDetails?.eventDate
      : request.cakeDetails?.requestedDate;

    if (!requestedDate) {
      // No date specified, proceed directly
      await sendPaymentLink(requestId, type);
      return;
    }

    // First check basic availability (closed days, too soon, etc.)
    try {
      const availabilityRes = await fetch(`/api/availability/check?date=${encodeURIComponent(requestedDate)}`);
      const availability = await availabilityRes.json();

      if (!availability.available) {
        // Date has an issue - show modal to let Kassy decide
        setDateRescheduleModal({
          show: true,
          requestId,
          requestType: type,
          originalDate: requestedDate,
          issue: availability.message || 'Date is not available',
          reason: availability.reason || 'unknown',
          newDate: requestedDate,
        });
        return;
      }

      // Now check capacity including pending payment links
      const capacityRes = await fetch(`/api/admin/check-date-capacity?date=${encodeURIComponent(requestedDate)}&excludeRequestId=${requestId}`);
      const capacity = await capacityRes.json();

      if (capacity.wouldExceedLimit) {
        // Show warning about potential overbooking
        const pendingNames = capacity.pendingCustomerNames?.length > 0
          ? ` (${capacity.pendingCustomerNames.join(', ')})`
          : '';

        setDateRescheduleModal({
          show: true,
          requestId,
          requestType: type,
          originalDate: requestedDate,
          issue: `⚠️ Potential overbooking warning!\n\nYou have ${capacity.confirmedOrders} confirmed order${capacity.confirmedOrders !== 1 ? 's' : ''} and ${capacity.pendingPaymentLinks} pending payment link${capacity.pendingPaymentLinks !== 1 ? 's' : ''}${pendingNames} for ${new Date(requestedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}.\n\nIf all customers pay, you'll have ${capacity.totalPotential} orders which exceeds your ${capacity.maxPerDay}/day limit.`,
          reason: 'capacity_warning',
          newDate: requestedDate,
          capacityWarning: true,
        });
        return;
      }

      // All good, proceed
      await sendPaymentLink(requestId, type);
    } catch (err) {
      console.error('Failed to check availability:', err);
      // If check fails, proceed anyway
      await sendPaymentLink(requestId, type);
    }
  };

  // Actually send the payment link (called after availability check or modal confirmation)
  const sendPaymentLink = async (
    requestId: string,
    type: 'custom' | 'wedding' = 'custom',
    options?: {
      newDate?: string;
      dateChanged?: boolean;
      overrideCapacity?: boolean;
    }
  ) => {
    const price = parseFloat(quotePrice);

    setCreatingPaymentLink(true);
    try {
      const endpoint = type === 'wedding' ? '/api/wedding-cake-payment' : '/api/custom-cake-payment';
      const bodyKey = type === 'wedding' ? 'weddingRequestId' : 'customRequestId';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [bodyKey]: requestId,
          finalPrice: price,
          message: quoteMessage || undefined,
          // Pass date change info to API
          ...(options?.newDate && { updatedDate: options.newDate }),
          ...(options?.dateChanged && { dateWasChanged: true }),
          ...(options?.overrideCapacity && { overrideCapacity: true }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment link');
      }

      // Refresh the appropriate requests list
      if (type === 'wedding') {
        await fetchWeddingRequests();
      } else {
        await fetchCustomRequests();
      }

      // Reset quote state
      setQuotingRequestId(null);
      setQuotingRequestType('custom');
      setQuotePrice('');
      setQuoteMessage('');
      setDateRescheduleModal(null);

      const successMsg = options?.dateChanged
        ? 'Payment link sent! Customer notified of the new date.'
        : 'Payment link created and sent to customer!';
      showToast(successMsg, 'success');
    } catch (err) {
      console.error('Failed to create payment link:', err);
      showToast(err instanceof Error ? err.message : 'Failed to create payment link', 'error');
    } finally {
      setCreatingPaymentLink(false);
    }
  };

  const checkAndProcessPayment = async (requestId: string) => {
    setProcessingPaymentId(requestId);
    try {
      const response = await fetch('/api/custom-cake-payment/check-and-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customRequestId: requestId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check payment');
      }

      if (data.paid) {
        if (data.alreadyProcessed) {
          showToast(`Payment found! Order #${data.orderNumber} already exists.`, 'success');
        } else {
          showToast(`Payment found! Order #${data.orderNumber} created successfully!`, 'success');
        }
        // Refresh the requests list to show updated status
        await fetchCustomRequests();
        await fetchBookings();
      } else {
        showToast(data.message || 'Payment not found', 'info');
      }
    } catch (err) {
      console.error('Failed to check payment:', err);
      showToast(err instanceof Error ? err.message : 'Failed to check payment', 'error');
    } finally {
      setProcessingPaymentId(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchBookings();
      fetchProductsForOrders();
    }
    // Fetch products for Sales tab too (for Top Selling Products images)
    if (activeTab === 'sales') {
      fetchProductsForOrders();
    }
    // Always fetch custom and wedding requests for badge counts
    fetchCustomRequests();
    fetchWeddingRequests();
  }, [activeTab]);

  // Scroll to highlighted order when navigating from schedule
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (activeTab === 'orders' && highlightId && bookings.length > 0) {
      // Small delay to ensure the order is rendered
      setTimeout(() => {
        const element = document.getElementById(`order-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add temporary highlight animation
          element.classList.add('ring-4', 'ring-pink-500', 'ring-opacity-50');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-pink-500', 'ring-opacity-50');
          }, 3000);

          // Remove the highlight parameter from URL after scrolling
          const params = new URLSearchParams(searchParams);
          params.delete('highlight');
          router.push(`/kassycakes/dashboard?${params.toString()}`, { scroll: false });
        }
      }, 100);
    }
  }, [activeTab, searchParams, bookings]);

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  const markOrderComplete = async (bookingId: string) => {
    if (completingOrderId) {
      console.log('Already processing an order, please wait...');
      return;
    }

    try {
      console.log('Marking order complete:', bookingId);
      setCompletingOrderId(bookingId);

      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' })
      });

      if (!response.ok) throw new Error('Failed to update status');

      console.log('Order marked complete successfully:', bookingId);

      // Update local state instead of full refresh
      setBookings(prev => prev.map(booking =>
        booking._id === bookingId
          ? { ...booking, status: 'confirmed' }
          : booking
      ));

      showToast('Order marked as complete', 'success');
    } catch (err) {
      console.error('Error marking order complete:', err);
      showToast('Failed to mark order as complete', 'error');
    } finally {
      setCompletingOrderId(null);
    }
  };

  const undoOrderComplete = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' })
      });

      if (!response.ok) throw new Error('Failed to update status');

      // Update local state
      setBookings(prev => prev.map(booking =>
        booking._id === bookingId
          ? { ...booking, status: 'pending' }
          : booking
      ));

      showToast('Order moved back to Paid Orders', 'success');
    } catch (err) {
      console.error('Error undoing order completion:', err);
      showToast('Failed to undo order completion', 'error');
    }
  };

  const saveDesignNotes = async (bookingId: string) => {
    if (savingDesignNotes) return;

    try {
      setSavingDesignNotes(true);

      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designNotes: editedDesignNotes })
      });

      if (!response.ok) throw new Error('Failed to update design notes');

      // Update the local bookings state
      setBookings(prev => prev.map(booking =>
        booking._id === bookingId
          ? { ...booking, cakeDetails: { ...booking.cakeDetails, designNotes: editedDesignNotes } }
          : booking
      ));

      showToast('Design notes updated', 'success');
      setEditingDesignNotesId(null);
      setEditedDesignNotes('');
    } catch (err) {
      console.error('Error updating design notes:', err);
      showToast('Failed to update design notes', 'error');
    } finally {
      setSavingDesignNotes(false);
    }
  };

  const saveCustomRequestDesignNotes = async (requestId: string) => {
    if (savingDesignNotes) return;

    try {
      setSavingDesignNotes(true);

      const response = await fetch(`/api/custom-cake-request?id=${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designNotes: editedDesignNotes })
      });

      if (!response.ok) throw new Error('Failed to update design notes');

      // Update the local customRequests state
      setCustomRequests(prev => prev.map(request =>
        request._id === requestId
          ? { ...request, cakeDetails: { ...request.cakeDetails, designNotes: editedDesignNotes } }
          : request
      ));

      showToast('Design notes updated', 'success');
      setEditingDesignNotesId(null);
      setEditedDesignNotes('');
    } catch (err) {
      console.error('Error updating design notes:', err);
      showToast('Failed to update design notes', 'error');
    } finally {
      setSavingDesignNotes(false);
    }
  };

  // Handle image upload for bookings
  const handleImageUpload = async (bookingId: string, file: File, imageType: 'reference' | 'edible') => {
    if (uploadingImage) return;

    try {
      setUploadingImage(true);
      setUploadingImageFor({ bookingId, type: imageType });

      // First, upload the image to Bunny storage
      const formData = new FormData();
      formData.append('file', file);
      formData.append('productName', `order-${bookingId}`);

      const uploadResponse = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      const uploadResult = await uploadResponse.json();
      const imageUrl = uploadResult.url;

      // Then update the booking with the new image URL
      const updateBody = imageType === 'reference'
        ? { referenceImageUrl: imageUrl }
        : { edibleImageUrl: imageUrl };

      const updateResponse = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody)
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update booking with new image');
      }

      // Update local state - add to arrays
      setBookings(prev => prev.map(booking => {
        if (booking._id !== bookingId) return booking;

        const cakeDetails = { ...booking.cakeDetails };

        if (imageType === 'reference') {
          // Build array of all reference images
          const existingUrls = cakeDetails.referenceImageUrls || [];
          const legacyUrl = cakeDetails.referenceImageUrl;
          let allUrls: string[] = [];
          if (legacyUrl && !existingUrls.includes(legacyUrl)) {
            allUrls.push(legacyUrl);
          }
          allUrls = [...allUrls, ...existingUrls];
          if (!allUrls.includes(imageUrl)) {
            allUrls.push(imageUrl);
          }
          cakeDetails.referenceImageUrls = allUrls;
          if (!legacyUrl) {
            cakeDetails.referenceImageUrl = imageUrl;
          }
        } else {
          // Build array of all edible images
          const existingUrls = cakeDetails.edibleImageUrls || [];
          const legacyUrl = cakeDetails.edibleImageUrl;
          let allUrls: string[] = [];
          if (legacyUrl && !existingUrls.includes(legacyUrl)) {
            allUrls.push(legacyUrl);
          }
          allUrls = [...allUrls, ...existingUrls];
          if (!allUrls.includes(imageUrl)) {
            allUrls.push(imageUrl);
          }
          cakeDetails.edibleImageUrls = allUrls;
          if (!legacyUrl) {
            cakeDetails.edibleImageUrl = imageUrl;
          }
        }

        return { ...booking, cakeDetails };
      }));

      showToast(`${imageType === 'reference' ? 'Reference' : 'Edible'} photo added`, 'success');
    } catch (err) {
      console.error('Error uploading image:', err);
      showToast('Failed to upload image', 'error');
    } finally {
      setUploadingImage(false);
      setUploadingImageFor(null);
    }
  };

  const navigateCalendar = (direction: 'prev' | 'next') => {
    const newDate = new Date(calendarStartDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCalendarStartDate(newDate);
  };


  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white mx-auto"></div>
          <p className="mt-4 text-slate-400 text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-rose-400 mb-4">{error}</p>
          <button
            onClick={() => fetchAnalytics()}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/15 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const conversionRate = data?.visitors.value
    ? ((data.cartAnalytics.checkoutStarted / data.visitors.value) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      {/* CSS for gradient borders */}
      <style jsx global>{`
        .border-gradient {
          position: relative;
        }
        .border-gradient::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 24px;
          padding: 1px;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          background: linear-gradient(225deg, rgba(255, 255, 255, 0.0) 0%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.0) 100%);
          pointer-events: none;
        }
        .border-gradient-inner::before {
          border-radius: 16px;
        }
        .border-gradient-sm::before {
          border-radius: 10px;
        }
        .border-gradient-xs::before {
          border-radius: 8px;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-white/10 px-2 py-2 safe-area-pb">
        <div className="flex justify-around items-center">
          {[
            { id: "overview", label: "Analytics", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg> },
            { id: "sales", label: "Sales", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> },
            { id: "orders", label: "Orders", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> },
            { id: "schedule", label: "Schedule", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> },
            { id: "manage-products", label: "Cakes", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg> },
          ].map((tab) => {
            const pendingRequestsCount = customRequests.filter(r => r.status === 'pending').length;
            const showBadge = tab.id === 'orders' && pendingRequestsCount > 0;

            return (
              <button
                key={tab.id}
                onClick={() => changeTab(tab.id as any)}
                className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition ${
                  activeTab === tab.id
                    ? "text-white"
                    : "text-white/50"
                }`}
              >
                {tab.icon}
                <span className="text-[10px] font-medium">{tab.label}</span>
                {showBadge && (
                  <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            );
          })}
          {/* More menu for remaining tabs */}
          <div className="relative group">
            <button
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition ${
                ["manage-addons", "studio", "email-marketer", "blog", "promos", "terminal"].includes(activeTab)
                  ? "text-white"
                  : "text-white/50"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
              </svg>
              <span className="text-[10px] font-medium">More</span>
            </button>
            {/* Dropdown menu */}
            <div className="absolute bottom-full right-0 mb-2 bg-zinc-900 border border-white/10 rounded-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[120px]">
              {[
                { id: "manage-addons", label: "Add-Ons", icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg> },
                { id: "studio", label: "Media", icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg> },
                { id: "email-marketer", label: "Email", icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg> },
                { id: "blog", label: "Blog", icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg> },
                { id: "promos", label: "Promos", icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42z"/><circle cx="6.5" cy="6.5" r="1.5"/></svg> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => changeTab(tab.id as any)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                    activeTab === tab.id
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {tab.icon}
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              ))}
              {/* Divider */}
              <div className="border-t border-white/10 my-2"></div>
              {/* View Website Link */}
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition text-white/70 hover:bg-white/5 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                <span className="text-xs font-medium">View Website</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto p-3 w-full pb-20 md:pb-3">
        <div className="border-gradient rounded-3xl overflow-hidden bg-zinc-950">
          <div className="grid grid-cols-12">
            {/* Sidebar - Hidden on mobile */}
            <aside className="hidden md:flex md:col-span-3 xl:col-span-2 text-slate-200 bg-zinc-950 flex-col p-3">
              <div className="border-gradient-inner rounded-2xl bg-zinc-950/50 backdrop-blur flex-1 flex flex-col">
                <div className="flex-1">
                  {/* Logo */}
                  <div className="relative p-4 md:p-6">
                    <div className="flex items-center gap-3">
                      <img
                        src="https://kassy.b-cdn.net/imgi_1_90edba91829d58aeb8304f77936ef407.webp"
                        alt="Kassycakes"
                        className="h-9 w-9 rounded-xl object-cover"
                      />
                      <a href="https://www.kassycakes.com/" target="_blank" rel="noopener noreferrer" className="hidden md:block text-base font-semibold tracking-tight text-white hover:text-white/80 transition">Kassycakes.com</a>
                    </div>
                    {/* Live visitor badge - positioned top right */}
                    <div className="absolute top-2 right-2 md:top-3 md:right-3 flex items-center gap-1.5 bg-zinc-900/80 backdrop-blur-sm rounded-full px-2 py-1">
                      <div className="relative">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <div className="absolute inset-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
                      </div>
                      <span className="text-xs text-slate-400">{realtimeVisitors}</span>
                    </div>
                  </div>

                  {/* Navigation */}
                  <nav className="px-3 md:px-4 space-y-1">
                    {[
                      { id: "overview", label: "Analytics", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg> },
                      { id: "sales", label: "Sales", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> },
                      { id: "orders", label: "Orders", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> },
                      { id: "schedule", label: "Schedule", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> },
                      { id: "manage-products", label: "Cakes", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg> },
                      { id: "manage-addons", label: "Add-Ons", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg> },
                      { id: "promos", label: "Promos", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42z"/><circle cx="6.5" cy="6.5" r="1.5"/></svg> },
                      { id: "studio", label: "Media", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg> },
                      { id: "email-marketer", label: "Email", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg> },
                      { id: "blog", label: "Blog", icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg> },
                    ].map((tab) => {
                      const pendingRequestsCount = customRequests.filter(r => r.status === 'pending').length;
                      const showBadge = tab.id === 'orders' && pendingRequestsCount > 0;

                      return (
                        <button
                          key={tab.id}
                          onClick={() => changeTab(tab.id as any)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition ${
                            activeTab === tab.id
                              ? "border-gradient border-gradient-sm bg-white/5 text-white"
                              : "hover:bg-white/5 text-white/70 hover:text-white"
                          }`}
                        >
                          {tab.icon}
                          <span className="hidden md:inline text-sm font-medium">{tab.label}</span>
                          {showBadge && (
                            <span className="ml-auto bg-pink-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                              {pendingRequestsCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {/* Help Button */}
                    <button
                      onClick={() => setShowHelpModal(true)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition hover:bg-white/5 text-white/70 hover:text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 -960 960 960" fill="currentColor">
                        <path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
                      </svg>
                      <span className="hidden md:inline text-sm font-medium">Help</span>
                    </button>
                  </nav>
                </div>

                {/* Sidebar Footer */}
                <div className="border-t border-white/10">
                  <div className="p-4 md:p-6">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white font-semibold text-sm">
                        K
                      </div>
                      <div className="hidden md:flex flex-1 items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white/90">Admin</p>
                          <p className="text-xs text-white/60">Kassycakes</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="hidden md:flex items-center gap-2 mt-4 text-xs text-white/60 hover:text-white transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Log out
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content Area - Full width on mobile */}
            <main className="col-span-12 md:col-span-9 xl:col-span-10 bg-black">
              <div className="p-3 h-full">
                <div className="border-gradient-inner rounded-2xl bg-zinc-950/50 backdrop-blur h-full overflow-auto">
                  <div className="p-4 sm:p-6">
            {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Analytics Header with Month Selector */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Analytics</h2>
              <div className="flex items-center gap-3">
                <input
                  type="month"
                  value={analyticsMonth}
                  onChange={(e) => setAnalyticsMonth(e.target.value)}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500"
                />
                <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-sm rounded-full px-3 py-1.5">
                  <div className="relative">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <div className="absolute inset-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
                  </div>
                  <span className="text-sm text-white font-medium">{realtimeVisitors}</span>
                  <span className="text-xs text-slate-400">live</span>
                </div>
              </div>
            </div>

            {/* Mobile Live Visitors Badge */}
            <div className="md:hidden flex items-center justify-between">
              <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-sm rounded-full px-3 py-1.5">
                <div className="relative">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="text-sm text-white font-medium">{realtimeVisitors}</span>
                <span className="text-xs text-slate-400">live</span>
              </div>
            </div>

            {/* Overview Stats with Sparklines */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Visits"
                value={data?.visits.value.toLocaleString() || "0"}
                change={data?.visits.change || 0}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF">
                    <path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/>
                  </svg>
                }
                variant="primary"
                trendData={[40, 35, 55, 60, 45, 70, 65]} // Mock trend
              />
              <StatCard
                title="Unique Visitors"
                value={data?.visitors.value.toLocaleString() || "0"}
                change={data?.visitors.change || 0}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF">
                    <path d="m280-40 112-564-72 28v136h-80v-188l202-86q14-6 29.5-7t29.5 4q14 5 26.5 14t20.5 23l40 64q26 42 70.5 69T760-520v80q-70 0-125-29t-94-74l-25 123 84 80v300h-80v-260l-84-64-72 324h-84Zm260-700q-33 0-56.5-23.5T460-820q0-33 23.5-56.5T540-900q33 0 56.5 23.5T620-820q0 33-23.5 56.5T540-740Z"/>
                  </svg>
                }
                variant="secondary"
                trendData={[20, 25, 30, 28, 35, 40, 38]} // Mock trend
              />
              <StatCard
                title="Page Views"
                value={data?.pageviews.value.toLocaleString() || "0"}
                change={data?.pageviews.change || 0}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                    <path d="M313-40q-24 0-46-9t-39-26L24-280l33-34q14-14 34-19t40 0l69 20v-327q0-17 11.5-28.5T240-680q17 0 28.5 11.5T280-640v433l-98-28 103 103q6 6 13 9t15 3h167q33 0 56.5-23.5T560-200v-160q0-17 11.5-28.5T600-400q17 0 28.5 11.5T640-360v160q0 66-47 113T480-40H313Zm7-280v-160q0-17 11.5-28.5T360-520q17 0 28.5 11.5T400-480v160h-80Zm120 0v-120q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440v120h-80Zm40 200H285h195Zm160-400q-91 0-168-48T360-700q35-84 112-132t168-48q91 0 168 48t112 132q-35 84-112 132t-168 48Zm0-80q57 0 107.5-26t82.5-74q-32-48-82.5-74T640-800q-57 0-107.5 26T450-700q32 48 82.5 74T640-600Zm0-40q-25 0-42.5-17.5T580-700q0-25 17.5-42.5T640-760q25 0 42.5 17.5T700-700q0 25-17.5 42.5T640-640Z"/>
                  </svg>
                }
                variant="accent"
                trendData={[100, 120, 115, 140, 130, 160, 150]} // Mock trend
              />
              {/* AI Analytics Report Button */}
              <button
                onClick={openAIReport}
                disabled={aiReportLoading}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-600/20 via-rose-600/20 to-pink-600/20 border border-pink-500/30 p-5 text-left transition-all duration-300 hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/10 to-pink-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
                      {aiReportLoading ? (
                        <svg className="w-5 h-5 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="white">
                          <path d="M400-280h160v-80H400v80Zm0-160h280v-80H400v80ZM280-600h400v-80H280v80Zm200 120ZM265-80q-79 0-134.5-55.5T75-270q0-57 29.5-102t77.5-68H80v-80h240v240h-80v-97q-37 8-61 38t-24 69q0 46 32.5 78t77.5 32v80Zm135-40v-80h360v-560H200v160h-80v-160q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H400Z"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="text-xl font-bold text-white mb-1 group-hover:text-pink-200 transition-colors">
                    {aiReportLoading ? 'Analyzing...' : 'AI Report'}
                  </div>
                  <div className="text-xs text-white/50 group-hover:text-white/70 transition-colors">
                    {aiReportLoading ? 'Generating insights' : 'Understand your analytics'}
                  </div>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-12 gap-4 sm:gap-6">
              {/* Main Content Column */}
              <div className="col-span-12 xl:col-span-8 space-y-4 sm:space-y-6">
                {/* Top Viewed Cakes - Redesigned */}
                <div className="border-gradient-inner rounded-2xl bg-zinc-900/50 overflow-hidden">
                  <div className="px-4 sm:px-5 py-3 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Trending Cakes</h3>
                      <p className="text-xs text-slate-500">
                        Most popular products in {(() => {
                          const [year, month] = analyticsMonth.split('-').map(Number);
                          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                          return `${monthNames[month - 1]} ${year}`;
                        })()}
                      </p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/20">Live</span>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {data?.productAnalytics?.productViews && data.productAnalytics.productViews.length > 0 ? (
                        data.productAnalytics.productViews.slice(0, 4).map((product: any, index: number) => {
                          const imageUrl = product.imageUrl || 'https://kassy.b-cdn.net/placeholder-cake.webp';

                          return (
                            <div key={index} className="group relative flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300">
                              <div className="relative w-16 h-16 flex-shrink-0">
                                <img
                                  src={imageUrl}
                                  alt={product.product}
                                  className="w-full h-full object-cover rounded-lg ring-2 ring-white/10"
                                />
                                <div className="absolute -top-1 -left-1 w-5 h-5 bg-zinc-800 rounded-full flex items-center justify-center ring-1 ring-white/20 text-[10px] font-bold text-white">
                                  {index + 1}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-white truncate text-sm">{product.product}</h4>
                                <div className="flex items-center gap-2 text-xs mt-1">
                                  <span className="text-emerald-400 font-medium">{product.views.toLocaleString()} views</span>
                                  {index === 0 && <span className="text-rose-400">Hot</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-2 text-center py-8 text-slate-500">
                          No trending data available yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <TopPagesCard data={data?.topPages || []} />
                  <DeviceBreakdownCard data={data?.devices || { desktop: 0, mobile: 0, tablet: 0 }} />
                </div>

                {/* Recent Visitors Table */}
                <VisitorIPsCard data={data?.recentVisitors || []} />
              </div>

              {/* Sidebar Stats */}
              <div className="col-span-12 xl:col-span-4 space-y-4 sm:space-y-6">
                <TopCountriesCard data={data?.countries || []} />
                <TopReferrersCard data={data?.topReferrers || []} />
                <TopCitiesCard data={data?.cities || []} />
              </div>
            </div>
          </div>
        )}

        {activeTab === "terminal" && (
          <div className="space-y-6">
            {/* Terminal Interface */}
            <div className="relative overflow-hidden rounded-2xl bg-black border-2 border-green-500/30 p-8 shadow-2xl">
              <div className="relative z-10">
                {/* Terminal Header */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-green-500/20">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="text-green-400 font-mono text-sm ml-2">kassycakes@terminal:~$</span>
                </div>

                {/* Terminal Content - Scrollable */}
                <div
                  ref={terminalScrollRef}
                  className="space-y-4 max-h-[600px] overflow-y-auto pr-2 terminal-scroll"
                >
                  {/* Boot Sequence - Always visible */}
                  <div className="font-mono text-sm text-green-400 space-y-1">
                    {bootSequence.map((line, index) => (
                      <div key={index}>
                        {line || '\u00A0'}
                      </div>
                    ))}
                    {/* Blinking cursor - always show */}
                    {bootSequence.length > 0 && !showCommands && (
                      <div>
                        <span className="animate-pulse">▊</span>
                      </div>
                    )}
                  </div>

                  {/* Commands appear after boot */}
                  {terminalBooted && showCommands && !scanInitiated && (
                    <>
                      {/* Command Presets */}
                      <div className="space-y-2 animate-fadeIn">
                        {[
                          { cmd: 'analytics-scan.sh' },
                          { cmd: 'what-is.sh' },
                          { cmd: 'how-to.sh' },
                        ].map((preset, index) => (
                          <div
                            key={preset.cmd}
                            onClick={() => executeCommand(preset.cmd)}
                            className="group cursor-pointer hover:bg-green-500/10 rounded px-3 py-2 transition-colors border border-green-500/20 hover:border-green-500/40"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-green-500">→</span>
                              <span className="text-green-400 font-mono">./{preset.cmd}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Blinking cursor after commands */}
                      <div className="font-mono text-sm text-green-400">
                        <span className="animate-pulse">▊</span>
                      </div>
                    </>
                  )}

                  {/* Command execution output */}
                  {scanInitiated && (
                    <>
                      <div className="text-green-400 font-mono">
                        <span className="text-green-500/60">kassy@terminal</span>
                        <span className="text-white">:</span>
                        <span className="text-blue-400">~</span>
                        <span className="text-white">$ </span>
                        <span className="text-green-400">./{selectedCommand}</span>
                      </div>

                      {summaryLoading && (
                        <>
                          <div className="text-green-400 font-mono text-sm space-y-1">
                            <p>Executing {selectedCommand}...</p>
                            {selectedCommand === 'analytics-scan.sh' && (
                              <>
                                <p className="text-green-400/60">→ Initializing analytics engine...</p>
                                <p className="text-green-400/60">→ Fetching data streams...</p>
                                <p className="text-green-400/60">→ Running pattern analysis...</p>
                                <p className="text-green-400/60">→ Generating insights...</p>
                              </>
                            )}
                            {selectedCommand !== 'analytics-scan.sh' && (
                              <p className="text-green-400/60">→ Loading...</p>
                            )}
                          </div>
                          <div className="font-mono text-sm text-green-400">
                            <span className="animate-pulse">▊</span>
                          </div>
                        </>
                      )}

                      {!summaryLoading && selectedCommand === 'analytics-scan.sh' && aiSummary && (
                        <>
                          <TerminalTypewriter
                            text={aiSummary}
                            speed={15}
                            className="text-green-400"
                          />
                          <div className="font-mono text-sm text-green-400">
                            <span className="animate-pulse">▊</span>
                          </div>
                        </>
                      )}

                      {!summaryLoading && selectedCommand !== 'analytics-scan.sh' && commandOutput && (
                        <>
                          <TerminalTypewriter
                            text={commandOutput}
                            speed={15}
                            className="text-green-400"
                          />
                          <div className="font-mono text-sm text-green-400">
                            <span className="animate-pulse">▊</span>
                          </div>
                        </>
                      )}

                      {!summaryLoading && (
                        <div className="mt-6 pt-4 border-t border-green-500/20">
                          <button
                            onClick={() => {
                              setScanInitiated(false);
                              setSelectedCommand('');
                              setCommandOutput('');
                              setAiSummary('');
                            }}
                            className="text-green-400 hover:text-green-300 font-mono text-sm hover:bg-green-500/10 px-3 py-1 rounded transition-colors"
                          >
                            ← Run another command
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Scanline Effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/5 to-transparent opacity-20 pointer-events-none animate-pulse"></div>

              {/* CRT Glow */}
              <div className="absolute inset-0 bg-green-500/5 blur-xl pointer-events-none"></div>
            </div>
          </div>
        )}

        {activeTab === "sales" && (
          <>
            {/* Sales Header with Refresh Button */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Sales Analytics</h2>
              <button
                type="button"
                onClick={async () => {
                  setRefreshingSales(true);
                  try {
                    const timestamp = Date.now();
                    const res = await fetch(`/api/admin/analytics?range=${dateRange}&_t=${timestamp}`, {
                      cache: 'no-store',
                      headers: { 'Cache-Control': 'no-cache' }
                    });
                    if (!res.ok) throw new Error("Failed to refresh");
                    const analyticsData = await res.json();
                    setData(analyticsData);
                    showToast('Sales data refreshed!', 'success');
                  } catch (err) {
                    console.error(err);
                    showToast('Failed to refresh', 'error');
                  } finally {
                    setRefreshingSales(false);
                  }
                }}
                disabled={refreshingSales}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-lg text-sm transition disabled:opacity-50"
              >
                {refreshingSales ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                      <path d="M3 3v5h5"></path>
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                      <path d="M21 21v-5h-5"></path>
                    </svg>
                    Refresh from Stripe
                  </>
                )}
              </button>
            </div>

            {/* All-Time Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <StatCard
                title="All-Time Revenue"
                value={`$${data?.salesAnalytics.allTimeRevenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}`}
                change={0}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                }
              />
              <StatCard
                title="All-Time Orders"
                value={data?.salesAnalytics.allTimeOrders?.toLocaleString() || "0"}
                change={0}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                }
              />
              <StatCard
                title="Avg. Order Value"
                value={`$${data?.salesAnalytics.averageOrderValue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}`}
                change={0}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="20" x2="12" y2="10"></line>
                    <line x1="18" y1="20" x2="18" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="16"></line>
                  </svg>
                }
              />
            </div>

            {/* Monthly Stats with Month Selector */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Monthly Sales</h3>
                <input
                  type="month"
                  value={salesMonth}
                  onChange={(e) => setSalesMonth(e.target.value)}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                  <h3 className="text-sm font-medium text-slate-400 mb-1">
                    {(() => {
                      const parts = salesMonth.split('-');
                      const year = parseInt(parts[0]);
                      const month = parseInt(parts[1]);
                      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                      return `${monthNames[month - 1]} ${year} Orders`;
                    })()}
                  </h3>
                  <p className="text-3xl font-bold text-white">
                    {(() => {
                      const parts = salesMonth.split('-');
                      const year = parseInt(parts[0]);
                      const month = parseInt(parts[1]);
                      return data?.salesAnalytics.recentOrders?.filter((order: any) => {
                        const orderDate = new Date(order.date);
                        return orderDate.getFullYear() === year && (orderDate.getMonth() + 1) === month;
                      }).length || 0;
                    })()}
                  </p>
                </div>
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                  <h3 className="text-sm font-medium text-slate-400 mb-1">
                    {(() => {
                      const parts = salesMonth.split('-');
                      const year = parseInt(parts[0]);
                      const month = parseInt(parts[1]);
                      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                      return `${monthNames[month - 1]} ${year} Revenue`;
                    })()}
                  </h3>
                  <p className="text-3xl font-bold text-emerald-400">
                    ${(() => {
                      const parts = salesMonth.split('-');
                      const year = parseInt(parts[0]);
                      const month = parseInt(parts[1]);
                      const monthRevenue = data?.salesAnalytics.recentOrders?.filter((order: any) => {
                        const orderDate = new Date(order.date);
                        return orderDate.getFullYear() === year && (orderDate.getMonth() + 1) === month;
                      }).reduce((sum: number, order: any) => sum + (order.amount || 0), 0) || 0;
                      return monthRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    })()}
                  </p>
                </div>
              </div>
            </div>

            {/* This Week's Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                <h3 className="text-sm font-medium text-slate-400 mb-1">This Week&apos;s Orders</h3>
                <p className="text-3xl font-bold text-white">
                  {(() => {
                    const now = new Date();
                    const dayOfWeek = now.getDay();
                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - dayOfWeek);
                    weekStart.setHours(0, 0, 0, 0);
                    return data?.salesAnalytics.recentOrders?.filter((order: any) => {
                      const orderDate = new Date(order.date);
                      return orderDate >= weekStart && orderDate <= now;
                    }).length || 0;
                  })()}
                </p>
              </div>
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                <h3 className="text-sm font-medium text-slate-400 mb-1">This Week&apos;s Revenue</h3>
                <p className="text-3xl font-bold text-emerald-400">
                  ${(() => {
                    const now = new Date();
                    const dayOfWeek = now.getDay();
                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - dayOfWeek);
                    weekStart.setHours(0, 0, 0, 0);
                    const weekRevenue = data?.salesAnalytics.recentOrders?.filter((order: any) => {
                      const orderDate = new Date(order.date);
                      return orderDate >= weekStart && orderDate <= now;
                    }).reduce((sum: number, order: any) => sum + (order.amount || 0), 0) || 0;
                    return weekRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  })()}
                </p>
              </div>
            </div>

            {/* Top Selling Products & Recent Orders Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Top Selling Products - takes 3 columns on desktop */}
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 lg:col-span-3">
                <h3 className="text-sm font-semibold text-white mb-4">Top Selling Products</h3>
                {data?.salesAnalytics.topProducts && data.salesAnalytics.topProducts.length > 0 ? (
                  <div className="space-y-3">
                    {data.salesAnalytics.topProducts.slice(0, 5).map((product: any, idx: number) => {
                      // Manual mapping for renamed products
                      const productRenames: { [key: string]: string } = {
                        'death to my youth': 'black dahlia',
                      };
                      const productNameLower = product.product.toLowerCase();
                      const mappedName = productRenames[productNameLower] || productNameLower;

                      // Find matching product - try multiple matching strategies
                      const dbProduct = dbProducts.find(p => {
                        const dbNameLower = p.name.toLowerCase();
                        // Exact match
                        if (dbNameLower === mappedName || dbNameLower === productNameLower) return true;
                        // Mapped name contains or is contained
                        if (dbNameLower.includes(mappedName) || mappedName.includes(dbNameLower)) return true;
                        // For "Custom Circle Cake" match "Circle Cake"
                        const stripped = mappedName.replace('custom ', '');
                        if (dbNameLower === stripped || dbNameLower.includes(stripped)) return true;
                        return false;
                      });

                      // Get image same way as Orders tab
                      const imageMedia = dbProduct?.media?.find((m: any) => m.type === 'image') || dbProduct?.media?.[0];
                      const productImage = imageMedia?.url || 'https://kassy.b-cdn.net/placeholder-cake.webp';

                      return (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0 gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <span className="text-xs text-slate-500 w-4 flex-shrink-0">{idx + 1}.</span>
                            <img
                              src={productImage}
                              alt={product.product}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
                            />
                            <span
                              className="text-sm text-slate-300 truncate cursor-pointer"
                              title={product.product}
                              onClick={() => showToast(product.product, 'info')}
                            >{product.product}</span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                            <span className="text-xs text-slate-500 hidden sm:inline">{product.quantity} sold</span>
                            <span className="text-sm font-medium text-emerald-400 text-right">${product.revenue.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm text-center py-4">No sales data yet</p>
                )}
              </div>

              {/* Recent Orders - takes 2 columns on desktop */}
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">Recent Orders</h3>
                  <div className="flex gap-1 bg-zinc-800 rounded-lg p-0.5">
                    <button
                      onClick={() => setRecentOrdersTab('recent')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        recentOrdersTab === 'recent'
                          ? 'bg-pink-500 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Recent
                    </button>
                    <button
                      onClick={() => setRecentOrdersTab('highest')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        recentOrdersTab === 'highest'
                          ? 'bg-pink-500 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Highest Paid
                    </button>
                  </div>
                </div>
                {data?.salesAnalytics.recentOrders && data.salesAnalytics.recentOrders.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    {[...data.salesAnalytics.recentOrders]
                      .sort((a: any, b: any) => {
                        if (recentOrdersTab === 'highest') {
                          return b.amount - a.amount;
                        }
                        return new Date(b.date).getTime() - new Date(a.date).getTime();
                      })
                      .map((order: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                        <div>
                          <p className="text-sm text-white">{order.customerName}</p>
                          <p className="text-xs text-slate-500">{order.productName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-emerald-400">${order.amount.toFixed(2)}</p>
                          <p className="text-xs text-slate-500">{new Date(order.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm text-center py-4">No recent orders</p>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "orders" && (
          <>
            {/* Orders Header */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-white">
                    {ordersSubTab === 'orders' ? 'Orders' : ordersSubTab === 'completed' ? 'Completed Orders' : ordersSubTab === 'customs' ? 'Custom Cake Requests' : 'Wedding Cake Requests'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {ordersSubTab === 'orders'
                      ? `${bookings.filter(b => b.status !== 'confirmed').length} pending orders`
                      : ordersSubTab === 'completed'
                      ? `${bookings.filter(b => b.status === 'confirmed').length} completed orders`
                      : ordersSubTab === 'customs'
                      ? `${customRequests.length} pending requests`
                      : `${weddingRequests.length} pending requests`}
                  </p>
                </div>
                <button
                  onClick={ordersSubTab === 'orders' || ordersSubTab === 'completed' ? fetchBookings : ordersSubTab === 'customs' ? fetchCustomRequests : fetchWeddingRequests}
                  disabled={ordersSubTab === 'orders' || ordersSubTab === 'completed' ? bookingsLoading : ordersSubTab === 'customs' ? customRequestsLoading : weddingRequestsLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/15 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                    <path d="M16 21h5v-5"/>
                  </svg>
                  {(ordersSubTab === 'orders' || ordersSubTab === 'completed' ? bookingsLoading : ordersSubTab === 'customs' ? customRequestsLoading : weddingRequestsLoading) ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {/* Sub-tabs for Orders/Custom Requests/Wedding Requests */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setOrdersSubTab('orders')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    ordersSubTab === 'orders'
                      ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Paid Orders
                  {bookings.filter(b => b.status !== 'confirmed').length > 0 && (
                    <span className="bg-pink-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {bookings.filter(b => b.status !== 'confirmed').length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setOrdersSubTab('completed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    ordersSubTab === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Completed
                  {bookings.filter(b => b.status === 'confirmed').length > 0 && (
                    <span className="bg-emerald-500/20 text-emerald-400 text-xs px-1.5 py-0.5 rounded-full">
                      {bookings.filter(b => b.status === 'confirmed').length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setOrdersSubTab('customs')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    ordersSubTab === 'customs'
                      ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Custom Requests
                  {customRequests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="bg-pink-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {customRequests.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setOrdersSubTab('weddings')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    ordersSubTab === 'weddings'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Wedding Requests
                  {weddingRequests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {weddingRequests.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </button>
              </div>

              {/* Horizontal Calendar - Only show for paid orders */}
              {ordersSubTab === 'orders' && (
              <div className="border-gradient-inner rounded-2xl bg-zinc-900/50 p-4 pb-5">
                <div className="flex items-center justify-between mb-3 min-h-[40px]">
                  <div className="flex items-center gap-4 flex-wrap">
                    <button
                      onClick={() => {
                        setSelectedDate(null);
                        setOrderSearchQuery('');
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedDate === null
                        ? 'bg-white/10 text-white border-gradient border-gradient-xs'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                      All Orders
                    </button>
                    <div className={`text-sm transition-opacity ${selectedDate ? 'opacity-100' : 'opacity-0 invisible'}`}>
                      <span className="font-semibold text-white">
                        {selectedDate?.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <span className="text-slate-500 ml-2">
                        {selectedDate && (() => {
                          const daysFromNow = Math.ceil((selectedDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          if (daysFromNow === 0) return '(Today)';
                          if (daysFromNow === 1) return '(Tomorrow)';
                          if (daysFromNow === -1) return '(Yesterday)';
                          if (daysFromNow > 0) return `(${daysFromNow} days from now)`;
                          return `(${Math.abs(daysFromNow)} days ago)`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => navigateCalendar('prev')}
                    className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex-1">
                    <div className="grid grid-cols-5 sm:grid-cols-7 gap-1 sm:gap-2">
                      {Array.from({ length: 7 }, (_, i) => {
                        const date = new Date(calendarStartDate);
                        date.setDate(calendarStartDate.getDate() + i);
                        const isToday = new Date().toDateString() === date.toDateString();
                        const isSelected = selectedDate && selectedDate.toDateString() === date.toDateString();

                        // Count orders for this date
                        const ordersOnDate = bookings.filter(booking => {
                          const orderDate = new Date(booking.orderDate);
                          return orderDate.toDateString() === date.toDateString();
                        }).length;

                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedDate(date)}
                            className={`p-1 sm:p-2 rounded-lg sm:rounded-xl text-center transition-all h-[56px] sm:h-[80px] flex flex-col justify-center ${i >= 5 ? 'hidden sm:flex' : ''} ${isSelected
                              ? 'bg-white/10 text-white border-gradient border-gradient-xs'
                              : isToday
                                ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                              }`}
                          >
                            <div className="text-[9px] sm:text-xs font-medium opacity-70">
                              {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                            <div className="text-sm sm:text-lg font-bold">
                              {date.getDate()}
                            </div>
                            <div className="text-[8px] sm:text-xs h-3 sm:h-4">
                              {ordersOnDate > 0 && (
                                <span className="text-emerald-400">
                                  {ordersOnDate}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => navigateCalendar('next')}
                    className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              )}

              {/* Search Bar - Only for paid orders */}
              {ordersSubTab === 'orders' && (
              <div className="relative">
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="Search by customer name or order ID..."
                  className="w-full px-4 py-3 pl-11 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-white/20 transition"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              )}
            </div>

            {/* Orders List - Only for paid orders */}
            {ordersSubTab === 'orders' && (
              bookingsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white mx-auto mb-4"></div>
                <p className="text-slate-400">Loading orders...</p>
              </div>
            ) : (() => {
              // Filter bookings based on selected date, search query, and exclude completed orders
              const filteredBookings = bookings.filter((booking) => {
                // Exclude completed orders from this tab
                if (booking.status === 'confirmed') {
                  return false;
                }

                // Date filter
                if (selectedDate) {
                  const orderDate = new Date(booking.orderDate);
                  if (orderDate.toDateString() !== selectedDate.toDateString()) {
                    return false;
                  }
                }

                // Search query filter
                if (orderSearchQuery.trim()) {
                  const query = orderSearchQuery.toLowerCase().replace('#', ''); // Remove # if present
                  const customerName = booking.customerInfo.name.toLowerCase();
                  const orderId = booking._id.toLowerCase();
                  const email = booking.customerInfo.email.toLowerCase();
                  const orderNumber = (booking.orderNumber || '').toLowerCase();
                  const productName = (booking.cakeDetails?.productName || '').toLowerCase();

                  return customerName.includes(query) ||
                    orderId.includes(query) ||
                    email.includes(query) ||
                    orderNumber.includes(query) ||
                    productName.includes(query);
                }

                return true;
              });

              return filteredBookings.length === 0 ? (
                <div className="border-gradient-inner rounded-2xl bg-zinc-900/50 p-12 text-center">
                  <p className="text-slate-400">
                    {selectedDate
                      ? `No orders found for ${selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
                      : orderSearchQuery
                        ? `No orders found matching "${orderSearchQuery}"`
                        : 'No orders found'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBookings.map((booking) => {
                    // Use actual amount paid from Stripe if available, otherwise fall back to calculated price
                    const calculatedTotal = booking.cakeDetails.price +
                      booking.cakeDetails.addOns.reduce((sum: number, a: any) => sum + a.price, 0);
                    const total = booking.paymentInfo?.amountPaid || calculatedTotal;

                    const formatDate = (dateString: string) => {
                      return new Date(dateString).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      });
                    };

                    // Match product by ID first (survives product renames), fall back to name for legacy orders
                    const product = dbProducts.find(p =>
                      p._id === booking.cakeDetails.productId ||
                      p._id?.toString() === booking.cakeDetails.productId?.toString()
                    ) || dbProducts.find(p => p.name === booking.cakeDetails.productName);

                    // Use saved image from booking (includes color variant if selected),
                    // otherwise fall back to product media from database
                    const imageMedia = product?.media?.find((m: any) => m.type === 'image');

                    // For legacy orders without saved image, try to find color variant from design notes
                    let productImage = booking.cakeDetails.image;
                    if (!productImage && booking.cakeDetails.designNotes) {
                      const colorMatch = booking.cakeDetails.designNotes.match(/Color:\s*(.+)/i);
                      if (colorMatch && product?.colorVariants) {
                        const colorName = colorMatch[1].trim().toLowerCase();
                        const colorVariant = product.colorVariants.find((cv: any) =>
                          cv.name?.toLowerCase().trim() === colorName
                        );
                        if (colorVariant?.media?.[0]?.url) {
                          productImage = colorVariant.media[0].url;
                        }
                      }
                    }
                    productImage = productImage || imageMedia?.url || 'https://kassy.b-cdn.net/placeholder-cake.webp';

                    return (
                      <div
                        key={booking._id}
                        id={`order-${booking._id}`}
                        className="border-gradient-inner rounded-2xl bg-zinc-900/50 p-4 sm:p-5 hover:bg-zinc-900/70 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                          {/* Cake Image */}
                          <div className="flex-shrink-0 w-full sm:w-28">
                            <img
                              src={productImage}
                              alt={booking.cakeDetails.productName}
                              className="w-full sm:w-28 h-40 sm:h-28 rounded-xl object-cover ring-2 ring-white/10"
                            />
                          </div>

                          {/* Order Details */}
                          <div className="flex-grow min-w-0">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <h3 className="text-lg font-semibold text-white break-words">
                                    {booking.cakeDetails.productName}
                                  </h3>
                                  {/* Fulfillment Type Badge */}
                                  {booking.cakeDetails.fulfillmentType && (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${booking.cakeDetails.fulfillmentType === 'delivery'
                                      ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                                      : 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30'
                                      }`}>
                                      {booking.cakeDetails.fulfillmentType === 'delivery' ? 'DELIVERY' : 'PICKUP'}
                                    </span>
                                  )}
                                  {/* Countdown Timer */}
                                  {(() => {
                                    const daysUntil = Math.ceil((new Date(booking.orderDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                    const isPast = daysUntil < 0;
                                    const isToday = daysUntil === 0;

                                    // Color coding
                                    let classes = 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30';

                                    if (isPast) {
                                      classes = 'bg-white/10 text-slate-400 ring-1 ring-white/10';
                                    } else if (isToday || daysUntil <= 3) {
                                      classes = 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30';
                                    } else if (daysUntil <= 7) {
                                      classes = 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30';
                                    }

                                    return (
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${classes}`}>
                                        {isPast ? `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago` :
                                          isToday ? 'TODAY!' :
                                            `${daysUntil} day${daysUntil !== 1 ? 's' : ''} left`}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <p className="text-xs text-slate-500">
                                  Order #{typeof booking.orderNumber === 'string' ? booking.orderNumber : String(booking.orderNumber || 0).padStart(5, '0')}
                                </p>
                              </div>
                              <div className="text-left sm:text-right w-full sm:w-auto">
                                <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                                  ${total.toFixed(2)}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 mb-4">
                              {/* Customer Info */}
                              <div>
                                <h4 className="font-medium text-slate-400 mb-1.5 text-xs uppercase tracking-wider">
                                  Customer
                                </h4>
                                <p className="text-white text-sm font-medium">
                                  {booking.customerInfo.name}
                                </p>
                                <p className="text-slate-400 text-xs">
                                  {booking.customerInfo.email}
                                </p>
                                {booking.customerInfo.phone && (
                                  <p className="text-slate-400 text-xs">
                                    {formatPhone(booking.customerInfo.phone)}
                                  </p>
                                )}
                              </div>

                              {/* Dates & Fulfillment */}
                              <div>
                                <h4 className="font-medium text-slate-400 mb-1.5 text-xs uppercase tracking-wider">
                                  Date
                                </h4>

                                {/* Date with Reschedule Button */}
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-white text-sm font-medium">
                                    {booking.cakeDetails.fulfillmentType === 'delivery' ? 'Delivery: ' : 'Pickup: '}
                                    {formatDate(booking.cakeDetails.pickupDate || booking.orderDate)}
                                  </p>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRescheduleBooking(booking);
                                      setRescheduleModalOpen(true);
                                    }}
                                    className="p-1 rounded-md bg-white/10 hover:bg-pink-500/20 text-slate-400 hover:text-pink-400 transition-colors"
                                    title="Reschedule order"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                </div>

                                {/* Time */}
                                {(booking.cakeDetails.deliveryTime || booking.cakeDetails.pickupTime) && (
                                  <p className="text-slate-300 text-sm mb-1">
                                    <span className="text-slate-400">Time:</span> <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-xs font-semibold">{booking.cakeDetails.deliveryTime || booking.cakeDetails.pickupTime}</span>
                                  </p>
                                )}

                                {/* Delivery Address */}
                                {booking.cakeDetails.fulfillmentType === 'delivery' && booking.cakeDetails.deliveryAddress && (
                                  <p className="text-slate-300 text-sm mb-1">
                                    <span className="text-slate-400">Address:</span>{' '}
                                    <span className="text-amber-400">
                                      {typeof booking.cakeDetails.deliveryAddress === 'object'
                                        ? booking.cakeDetails.deliveryAddress.fullAddress || booking.cakeDetails.deliveryAddress.street
                                        : booking.cakeDetails.deliveryAddress}
                                    </span>
                                  </p>
                                )}

                                {/* Order Created Date */}
                                <p className="text-slate-500 text-xs">
                                  Ordered {formatDate(booking.createdAt)}
                                </p>
                              </div>

                              {/* Cake Details - Size, Flavor, Filling */}
                              {(booking.cakeDetails.size || booking.cakeDetails.flavor || booking.cakeDetails.filling) && (
                                <div>
                                  <h4 className="font-medium text-slate-400 mb-1.5 text-xs uppercase tracking-wider">
                                    Cake Details
                                  </h4>
                                  {booking.cakeDetails.size && (
                                    <p className="text-slate-300 text-sm">
                                      <span className="text-slate-400">Size:</span> {booking.cakeDetails.size}
                                    </p>
                                  )}
                                  {booking.cakeDetails.shape && (
                                    <p className="text-slate-300 text-sm">
                                      <span className="text-slate-400">Shape:</span> {booking.cakeDetails.shape}
                                    </p>
                                  )}
                                  {booking.cakeDetails.flavor && (
                                    <p className="text-slate-300 text-sm">
                                      <span className="text-slate-400">Flavor:</span> {booking.cakeDetails.flavor}
                                    </p>
                                  )}
                                  {booking.cakeDetails.filling && (
                                    <p className="text-slate-300 text-sm">
                                      <span className="text-slate-400">Filling:</span> {booking.cakeDetails.filling}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Design Notes */}
                            {(booking.cakeDetails.designNotes || editingDesignNotesId === booking._id) && (
                              <div className="bg-white/5 rounded-xl p-4 mb-4">
                                <div className="flex items-center justify-between mb-1.5">
                                  <h4 className="font-medium text-slate-400 text-xs uppercase tracking-wider">
                                    Design Notes
                                  </h4>
                                  {editingDesignNotesId !== booking._id ? (
                                    <button
                                      onClick={() => {
                                        setEditingDesignNotesId(booking._id);
                                        setEditedDesignNotes(booking.cakeDetails.designNotes || '');
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                      title="Edit design notes"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          setEditingDesignNotesId(null);
                                          setEditedDesignNotes('');
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                        title="Cancel"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => saveDesignNotes(booking._id)}
                                        disabled={savingDesignNotes}
                                        className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
                                        title="Save"
                                      >
                                        {savingDesignNotes ? (
                                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                        ) : (
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {editingDesignNotesId === booking._id ? (
                                  <textarea
                                    value={editedDesignNotes}
                                    onChange={(e) => setEditedDesignNotes(e.target.value)}
                                    className="w-full bg-black/30 text-slate-300 text-sm rounded-lg p-3 border border-white/10 focus:border-pink-500/50 focus:outline-none resize-none"
                                    rows={4}
                                    placeholder="Enter design notes..."
                                    autoFocus
                                  />
                                ) : (
                                  <p className="text-slate-300 text-sm whitespace-pre-wrap">
                                    {booking.cakeDetails.designNotes}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Reference Images / Customer Photos for Cake - show all */}
                            {(() => {
                              // Get all reference images (legacy + array)
                              const refUrls: string[] = [];
                              if (booking.cakeDetails.referenceImageUrl) {
                                refUrls.push(booking.cakeDetails.referenceImageUrl);
                              }
                              if (booking.cakeDetails.referenceImageUrls) {
                                booking.cakeDetails.referenceImageUrls.forEach((url: string) => {
                                  if (!refUrls.includes(url)) refUrls.push(url);
                                });
                              }
                              if (refUrls.length === 0) return null;

                              return (
                                <div className="bg-pink-500/10 rounded-xl p-4 mb-4 ring-1 ring-pink-500/30">
                                  <h4 className="font-medium text-pink-400 mb-3 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {booking.cakeDetails.isEditablePhoto ? 'Customer Photos for Cake' : 'Reference Photos'}
                                    <span className="text-pink-300/70">({refUrls.length})</span>
                                  </h4>
                                  <div className="flex flex-wrap gap-3">
                                    {refUrls.map((url, idx) => (
                                      <div key={idx} className="relative">
                                        {url.match(/\.(mp4|webm|mov)$/i) ? (
                                          <video
                                            src={url}
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            className="w-[140px] h-[140px] object-cover rounded-lg border-2 border-white/20 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => {
                                              setImageModalUrl(url);
                                              setImageModalOpen(true);
                                            }}
                                          />
                                        ) : (
                                          <img
                                            src={url}
                                            alt={`Reference photo ${idx + 1}`}
                                            className="w-[140px] h-[140px] object-cover rounded-lg border-2 border-white/20 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => {
                                              setImageModalUrl(url);
                                              setImageModalOpen(true);
                                            }}
                                          />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  <p className="text-xs text-gray-400 mt-2 italic">
                                    Click image to view full size
                                  </p>
                                </div>
                              );
                            })()}

                            {/* Edible Images - show all */}
                            {(() => {
                              // Get all edible images (legacy + array)
                              const edibleUrls: string[] = [];
                              if (booking.cakeDetails.edibleImageUrl) {
                                edibleUrls.push(booking.cakeDetails.edibleImageUrl);
                              }
                              if (booking.cakeDetails.edibleImageUrls) {
                                booking.cakeDetails.edibleImageUrls.forEach((url: string) => {
                                  if (!edibleUrls.includes(url)) edibleUrls.push(url);
                                });
                              }
                              if (edibleUrls.length === 0) return null;

                              return (
                                <div className="bg-blue-500/10 rounded-xl p-4 mb-4 ring-1 ring-blue-500/30">
                                  <h4 className="font-medium text-blue-400 mb-3 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Edible Printed Images
                                    <span className="text-blue-300/70">({edibleUrls.length})</span>
                                  </h4>
                                  <div className="flex flex-wrap gap-3">
                                    {edibleUrls.map((url, idx) => (
                                      <img
                                        key={idx}
                                        src={url}
                                        alt={`Edible image ${idx + 1}`}
                                        className="w-[140px] h-[140px] object-cover rounded-lg border-2 border-white/20 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => {
                                          setImageModalUrl(url);
                                          setImageModalOpen(true);
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <p className="text-xs text-gray-400 mt-2 italic">
                                    Click image to view full size
                                  </p>
                                </div>
                              );
                            })()}

                            {/* Add Photos Button - shows dropdown to add reference or edible photo */}
                            <div className="relative mb-4">
                              <button
                                onClick={() => setUploadingImageFor(
                                  uploadingImageFor?.bookingId === booking._id && !uploadingImage
                                    ? null
                                    : { bookingId: booking._id, type: 'reference' }
                                )}
                                disabled={uploadingImage}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50 rounded-lg hover:bg-emerald-500/30 transition-colors font-medium text-sm disabled:opacity-50"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Photos
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              {uploadingImageFor?.bookingId === booking._id && !uploadingImage && (
                                <div className="absolute top-full left-0 mt-1 bg-zinc-800 ring-1 ring-white/20 rounded-lg shadow-xl z-50 py-1 min-w-[180px]">
                                  <label className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/*,video/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleImageUpload(booking._id, file, 'reference');
                                      }}
                                    />
                                    <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Reference Photo
                                  </label>
                                  <label className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleImageUpload(booking._id, file, 'edible');
                                      }}
                                    />
                                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Edible Image
                                  </label>
                                </div>
                              )}
                            </div>

                            {/* Mark Complete Button */}
                            {booking.status !== 'confirmed' && (
                              <div className="pt-4 border-t border-gray-200 dark:border-zinc-800">
                                <button
                                  onClick={() => markOrderComplete(booking._id)}
                                  disabled={completingOrderId === booking._id}
                                  className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {completingOrderId === booking._id ? (
                                    <>
                                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Mark This Order Complete
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {booking.status === 'confirmed' && (
                              <div className="pt-4 border-t border-gray-200 dark:border-zinc-800">
                                <div className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2">
                                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Order Completed
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
            )}

            {/* Completed Orders - Only for completed sub-tab */}
            {ordersSubTab === 'completed' && (
              bookingsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white mx-auto mb-4"></div>
                  <p className="text-slate-400">Loading completed orders...</p>
                </div>
              ) : (() => {
                const completedBookings = bookings.filter(b => b.status === 'confirmed');

                return completedBookings.length === 0 ? (
                  <div className="border-gradient-inner rounded-2xl bg-zinc-900/50 p-12 text-center">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-slate-400">No completed orders yet</p>
                    <p className="text-slate-500 text-sm mt-1">Orders will appear here after you mark them as complete</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedBookings.map((booking) => {
                      const total = booking.cakeDetails.price +
                        booking.cakeDetails.addOns.reduce((sum: number, a: any) => sum + a.price, 0);

                      const formatDate = (dateString: string) => {
                        return new Date(dateString).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        });
                      };

                      // Match product by ID first (survives product renames), fall back to name for legacy orders
                      const product = dbProducts.find(p =>
                        p._id === booking.cakeDetails.productId ||
                        p._id?.toString() === booking.cakeDetails.productId?.toString()
                      ) || dbProducts.find(p => p.name === booking.cakeDetails.productName);
                      // Use saved image from booking (includes color variant if selected)
                      const imageMedia = product?.media?.find((m: any) => m.type === 'image');

                      // For legacy orders without saved image, try to find color variant from design notes
                      let productImage = booking.cakeDetails.image;
                      if (!productImage && booking.cakeDetails.designNotes) {
                        const colorMatch = booking.cakeDetails.designNotes.match(/Color:\s*(.+)/i);
                        if (colorMatch && product?.colorVariants) {
                          const colorName = colorMatch[1].trim().toLowerCase();
                          const colorVariant = product.colorVariants.find((cv: any) =>
                            cv.name?.toLowerCase().trim() === colorName
                          );
                          if (colorVariant?.media?.[0]?.url) {
                            productImage = colorVariant.media[0].url;
                          }
                        }
                      }
                      productImage = productImage || imageMedia?.url || 'https://kassy.b-cdn.net/placeholder-cake.webp';

                      return (
                        <div
                          key={booking._id}
                          className="border-gradient-inner rounded-2xl bg-zinc-900/50 p-4 sm:p-5 hover:bg-zinc-900/70 transition-all opacity-75 hover:opacity-100"
                        >
                          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                            {/* Cake Image */}
                            <div className="flex-shrink-0 w-full sm:w-28 relative">
                              <img
                                src={productImage}
                                alt={booking.cakeDetails.productName}
                                className="w-full sm:w-28 h-40 sm:h-28 rounded-xl object-cover ring-2 ring-emerald-500/30"
                              />
                              <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Done
                              </div>
                            </div>

                            {/* Order Details */}
                            <div className="flex-grow min-w-0">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-3">
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-lg font-semibold text-white break-words">
                                    {booking.cakeDetails.productName}
                                  </h3>
                                  <p className="text-slate-500 text-xs mt-1">
                                    {booking.orderNumber ? `#${booking.orderNumber}` : `Order #${booking._id.slice(-8)}`}
                                  </p>
                                </div>
                                <p className="text-emerald-400 font-bold text-xl">
                                  ${(booking.paymentInfo?.amountPaid || total).toFixed(2)}
                                </p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-slate-500 text-xs">Customer</p>
                                  <p className="text-white font-medium">{booking.customerInfo.name}</p>
                                  <p className="text-slate-400 text-xs">{booking.customerInfo.email}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500 text-xs">Pickup/Delivery Date</p>
                                  <p className="text-white font-medium">{formatDate(booking.orderDate)}</p>
                                </div>
                              </div>

                              {/* Undo Button */}
                              <div className="mt-4 pt-3 border-t border-white/5">
                                <button
                                  onClick={() => undoOrderComplete(booking._id)}
                                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                  </svg>
                                  Move Back to Paid Orders
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}

            {/* Custom Cake Requests - Only for customs sub-tab */}
            {ordersSubTab === 'customs' && (
              customRequestsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white mx-auto mb-4"></div>
                  <p className="text-slate-400">Loading custom requests...</p>
                </div>
              ) : customRequests.length > 0 ? (
                <div className="space-y-4">
                  {/* Active/Quoted/Converted Tabs */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCustomRequestsFilter('active')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                        customRequestsFilter === 'active'
                          ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      Active
                      {customRequests.filter(r => r.status === 'pending').length > 0 && (
                        <span className="bg-pink-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {customRequests.filter(r => r.status === 'pending').length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setCustomRequestsFilter('quoted')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                        customRequestsFilter === 'quoted'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      Quoted
                      {customRequests.filter(r => ['quoted', 'approved', 'deposit_paid'].includes(r.status)).length > 0 && (
                        <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {customRequests.filter(r => ['quoted', 'approved', 'deposit_paid'].includes(r.status)).length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setCustomRequestsFilter('converted')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                        customRequestsFilter === 'converted'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      Converted
                      {customRequests.filter(r => r.status === 'converted').length > 0 && (
                        <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {customRequests.filter(r => r.status === 'converted').length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by request #, name, email, phone..."
                      value={customRequestsSearch}
                      onChange={(e) => setCustomRequestsSearch(e.target.value)}
                      className="w-full px-4 py-3 pl-10 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {customRequestsSearch && (
                      <button
                        onClick={() => setCustomRequestsSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {filteredCustomRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-400">
                        {customRequestsSearch
                          ? `No requests match "${customRequestsSearch}"`
                          : customRequestsFilter === 'converted'
                            ? 'No converted requests yet'
                            : customRequestsFilter === 'quoted'
                              ? 'No quoted requests yet'
                              : 'No active requests'
                        }
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">{filteredCustomRequests.length} request{filteredCustomRequests.length !== 1 ? 's' : ''} found</p>
                  )}

                  {filteredCustomRequests.map((request) => (
                    <div
                      key={request._id}
                      className="border-gradient-inner rounded-2xl bg-zinc-900/50 p-6"
                    >
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Customer & Cake Info */}
                        <div className="flex-1 space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-white">
                                {request.customerInfo.name}
                              </h3>
                              <p className="text-sm text-slate-400">{request.customerInfo.email}</p>
                              {request.customerInfo.phone && (
                                <p className="text-sm text-slate-400">{formatPhone(request.customerInfo.phone)}</p>
                              )}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              request.status === 'quoted' ? 'bg-blue-500/20 text-blue-400' :
                              request.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                              request.status === 'converted' ? 'bg-green-500/20 text-green-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {request.status === 'converted' ? 'Converted $$$' : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500">Cake</p>
                              <p className="text-white">{request.cakeDetails.productName}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Size</p>
                              <p className="text-white">{request.cakeDetails.size}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Flavor</p>
                              <p className="text-white">{request.cakeDetails.flavor}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Filling</p>
                              <p className="text-white">{request.cakeDetails.filling}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Requested Date</p>
                              <p className="text-white">
                                {new Date(request.cakeDetails.requestedDate).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Fulfillment</p>
                              <p className="text-white capitalize">{request.cakeDetails.fulfillmentType}</p>
                            </div>
                          </div>

                          {/* Add-ons */}
                          {request.cakeDetails.addOns && request.cakeDetails.addOns.length > 0 && (
                            <div>
                              <p className="text-slate-500 text-sm mb-2">Add-ons</p>
                              <div className="flex flex-wrap gap-2">
                                {request.cakeDetails.addOns.map((addon: any) => (
                                  <span
                                    key={addon.id}
                                    className="px-2 py-1 bg-pink-500/20 text-pink-400 rounded text-xs"
                                  >
                                    {addon.name} (+${addon.price})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Design Notes */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-slate-500 text-sm">Design Notes</p>
                              {editingDesignNotesId !== request._id ? (
                                <button
                                  onClick={() => {
                                    setEditingDesignNotesId(request._id);
                                    setEditedDesignNotes(request.cakeDetails.designNotes || '');
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-pink-400 hover:bg-pink-500/10 rounded-lg transition-colors"
                                  title="Edit design notes"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingDesignNotesId(null);
                                      setEditedDesignNotes('');
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Cancel"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => saveCustomRequestDesignNotes(request._id)}
                                    disabled={savingDesignNotes}
                                    className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
                                    title="Save"
                                  >
                                    {savingDesignNotes ? (
                                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                            {editingDesignNotesId === request._id ? (
                              <textarea
                                value={editedDesignNotes}
                                onChange={(e) => setEditedDesignNotes(e.target.value)}
                                className="w-full bg-black/30 text-slate-300 text-sm rounded-lg p-3 border border-white/10 focus:border-pink-500/50 focus:outline-none resize-none"
                                rows={4}
                                placeholder="Enter design notes..."
                              />
                            ) : (
                              <div className="bg-white/5 rounded-lg p-3 text-sm text-white/80 whitespace-pre-wrap">
                                {request.cakeDetails.designNotes || <span className="text-slate-500 italic">No design notes</span>}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Images & Price */}
                        <div className="lg:w-64 space-y-4">
                          {/* Reference Image */}
                          {request.cakeDetails.referenceImageUrl && (
                            <div>
                              <p className="text-slate-500 text-sm mb-2">Reference Image</p>
                              <img
                                src={request.cakeDetails.referenceImageUrl}
                                alt="Reference"
                                className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                                onClick={() => {
                                  setImageModalUrl(request.cakeDetails.referenceImageUrl);
                                  setImageModalOpen(true);
                                }}
                              />
                            </div>
                          )}

                          {/* Edible Image */}
                          {request.cakeDetails.edibleImageUrl && (
                            <div>
                              <p className="text-slate-500 text-sm mb-2">Edible Image</p>
                              <img
                                src={request.cakeDetails.edibleImageUrl}
                                alt="Edible image"
                                className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                                onClick={() => {
                                  setImageModalUrl(request.cakeDetails.edibleImageUrl);
                                  setImageModalOpen(true);
                                }}
                              />
                            </div>
                          )}

                          {/* Estimated Price */}
                          <div className="bg-pink-500/10 rounded-lg p-4 text-center">
                            <p className="text-slate-400 text-sm">Estimated Price</p>
                            <p className="text-2xl font-bold text-pink-400">
                              ${request.cakeDetails.estimatedPrice?.toFixed(2) || '0.00'}
                            </p>
                          </div>

                          {/* Request Number & Date */}
                          <div className="text-center text-sm text-slate-500">
                            <p>Request #{request.requestNumber}</p>
                            <p>{new Date(request.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}</p>
                          </div>

                          {/* Actions based on status */}
                          {request.status === 'pending' && quotingRequestId !== request._id && (
                            <button
                              onClick={() => {
                                setQuotingRequestId(request._id);
                                setQuotingRequestType('custom');
                                setQuotePrice(request.cakeDetails.estimatedPrice?.toFixed(2) || '');
                                setQuoteMessage('');
                              }}
                              className="w-full px-4 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition"
                            >
                              Create Payment Link
                            </button>
                          )}

                          {/* Quote Form */}
                          {quotingRequestId === request._id && quotingRequestType === 'custom' && (
                            <div className="space-y-3 bg-white/5 rounded-lg p-4">
                              {/* Edit Date Section */}
                              <div className="bg-zinc-800/50 rounded-lg p-3 border border-white/5">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs text-slate-400 font-medium">📅 Order Date</p>
                                    <p className="text-sm text-white mt-1">
                                      {new Date(request.cakeDetails.requestedDate).toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setDateRescheduleModal({
                                      show: true,
                                      requestId: request._id,
                                      requestType: 'custom',
                                      originalDate: request.cakeDetails.requestedDate,
                                      newDate: request.cakeDetails.requestedDate?.split('T')[0] || '',
                                      issue: 'Change the date before sending payment link',
                                    })}
                                    className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded-lg transition"
                                  >
                                    Edit Date
                                  </button>
                                </div>
                              </div>

                              {/* Price Breakdown Helper */}
                              {(() => {
                                const addOnsTotal = (request.cakeDetails.addOns || []).reduce((sum: number, addon: any) => sum + (addon.price || 0), 0);
                                const deliveryFee = request.cakeDetails.fulfillmentType === 'delivery' ? 40 : 0;
                                const basePrice = (request.cakeDetails.estimatedPrice || 0) - addOnsTotal;
                                const suggestedTotal = basePrice + addOnsTotal + deliveryFee;
                                const enteredPrice = parseFloat(quotePrice) || 0;
                                const tax = enteredPrice * 0.0825;
                                const customerPays = enteredPrice + tax;

                                return (
                                  <div className="bg-zinc-800/50 rounded-lg p-3 border border-white/5">
                                    <p className="text-xs text-slate-400 font-medium mb-2">💡 Price Breakdown Helper</p>
                                    <div className="space-y-1 text-xs">
                                      <div className="flex justify-between text-slate-400">
                                        <span>Base cake price:</span>
                                        <span>${basePrice.toFixed(2)}</span>
                                      </div>
                                      {addOnsTotal > 0 && (
                                        <div className="flex justify-between text-slate-400">
                                          <span>+ Add-ons ({(request.cakeDetails.addOns || []).length}):</span>
                                          <span>${addOnsTotal.toFixed(2)}</span>
                                        </div>
                                      )}
                                      {deliveryFee > 0 && (
                                        <div className="flex justify-between text-orange-400">
                                          <span>+ Delivery fee:</span>
                                          <span>${deliveryFee.toFixed(2)}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between text-white font-medium pt-1 border-t border-white/10">
                                        <span>Suggested subtotal:</span>
                                        <span>${suggestedTotal.toFixed(2)}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setQuotePrice(suggestedTotal.toFixed(2))}
                                        className="w-full mt-2 px-2 py-1 bg-pink-500/20 text-pink-400 rounded text-xs hover:bg-pink-500/30 transition"
                                      >
                                        Use suggested price
                                      </button>
                                    </div>
                                    {enteredPrice > 0 && (
                                      <div className="mt-3 pt-2 border-t border-white/10 space-y-1 text-xs">
                                        <div className="flex justify-between text-slate-500">
                                          <span>Your price:</span>
                                          <span>${enteredPrice.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-500">
                                          <span>+ Tax (8.25%):</span>
                                          <span>${tax.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-green-400 font-medium">
                                          <span>Customer pays:</span>
                                          <span>${customerPays.toFixed(2)}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              <div>
                                <label className="text-slate-400 text-sm mb-1 block">Final Price ($)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={quotePrice}
                                  onChange={(e) => setQuotePrice(e.target.value)}
                                  placeholder="Enter final price"
                                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                                />
                              </div>
                              <div>
                                <label className="text-slate-400 text-sm mb-1 block">Message (optional)</label>
                                <textarea
                                  value={quoteMessage}
                                  onChange={(e) => setQuoteMessage(e.target.value)}
                                  placeholder="Add a note for the customer..."
                                  rows={2}
                                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500 resize-none"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => createPaymentLink(request._id, 'custom')}
                                  disabled={creatingPaymentLink}
                                  className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {creatingPaymentLink ? 'Creating...' : 'Send Payment Link'}
                                </button>
                                <button
                                  onClick={() => {
                                    setQuotingRequestId(null);
                                    setQuotingRequestType('custom');
                                    setQuotePrice('');
                                    setQuoteMessage('');
                                  }}
                                  className="px-4 py-2 bg-white/10 text-slate-400 rounded-lg hover:bg-white/20 transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Quoted status - payment link sent */}
                          {request.status === 'quoted' && quotingRequestId !== request._id && (
                            <div className="space-y-2">
                              <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                                <p className="text-blue-400 text-sm font-medium">Payment link sent</p>
                                <p className="text-slate-500 text-xs mt-1">
                                  Quoted ${request.quoteInfo?.finalPrice?.toFixed(2)} on{' '}
                                  {new Date(request.quoteInfo?.quotedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                                </p>
                                <p className="text-yellow-500/80 text-xs mt-1">
                                  Link expires 24hrs after creation
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {request.quoteInfo?.paymentUrl && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(request.quoteInfo.paymentUrl);
                                      showToast('Payment link copied!', 'success');
                                    }}
                                    className="flex-1 px-4 py-2 bg-white/10 text-slate-300 rounded-lg text-sm hover:bg-white/20 transition"
                                  >
                                    Copy Link
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setQuotingRequestId(request._id);
                                    setQuotingRequestType('custom');
                                    setQuotePrice(request.quoteInfo?.finalPrice?.toFixed(2) || '');
                                    setQuoteMessage('');
                                  }}
                                  className="flex-1 px-4 py-2 bg-pink-500/20 text-pink-400 rounded-lg text-sm hover:bg-pink-500/30 transition"
                                >
                                  Send New Payment Link
                                </button>
                              </div>
                              <button
                                onClick={() => checkAndProcessPayment(request._id)}
                                disabled={processingPaymentId === request._id}
                                className="w-full mt-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                {processingPaymentId === request._id ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Checking Stripe...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Check if Paid
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {/* Quoting form for quoted requests (resend) */}
                          {request.status === 'quoted' && quotingRequestId === request._id && (
                            <div className="space-y-3 bg-white/5 rounded-lg p-4">
                              <p className="text-sm text-slate-400 font-medium">Resend Payment Link</p>
                              <p className="text-xs text-slate-500">Adjust the price or date if needed. A new payment link will be created and emailed to the customer.</p>

                              {/* Edit Date Section */}
                              <div className="bg-zinc-800/50 rounded-lg p-3 border border-white/5">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs text-slate-400 font-medium">📅 Order Date</p>
                                    <p className="text-sm text-white mt-1">
                                      {new Date(request.cakeDetails.requestedDate).toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setDateRescheduleModal({
                                      show: true,
                                      requestId: request._id,
                                      requestType: 'custom',
                                      originalDate: request.cakeDetails.requestedDate,
                                      newDate: request.cakeDetails.requestedDate?.split('T')[0] || '',
                                      issue: 'Change the date before resending payment link',
                                    })}
                                    className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded-lg transition"
                                  >
                                    Edit Date
                                  </button>
                                </div>
                              </div>

                              {/* Price Breakdown Helper */}
                              {(() => {
                                const addOnsTotal = (request.cakeDetails.addOns || []).reduce((sum: number, addon: any) => sum + (addon.price || 0), 0);
                                const deliveryFee = request.cakeDetails.fulfillmentType === 'delivery' ? 40 : 0;
                                const basePrice = (request.cakeDetails.estimatedPrice || 0) - addOnsTotal;
                                const suggestedTotal = basePrice + addOnsTotal + deliveryFee;
                                const enteredPrice = parseFloat(quotePrice) || 0;
                                const tax = enteredPrice * 0.0825;
                                const customerPays = enteredPrice + tax;

                                return (
                                  <div className="bg-zinc-800/50 rounded-lg p-3 border border-white/5">
                                    <p className="text-xs text-slate-400 font-medium mb-2">💡 Price Breakdown</p>
                                    <div className="space-y-1 text-xs">
                                      <div className="flex justify-between text-slate-400">
                                        <span>Base cake:</span>
                                        <span>${basePrice.toFixed(2)}</span>
                                      </div>
                                      {addOnsTotal > 0 && (
                                        <div className="flex justify-between text-slate-400">
                                          <span>+ Add-ons:</span>
                                          <span>${addOnsTotal.toFixed(2)}</span>
                                        </div>
                                      )}
                                      {deliveryFee > 0 && (
                                        <div className="flex justify-between text-orange-400">
                                          <span>+ Delivery:</span>
                                          <span>${deliveryFee.toFixed(2)}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between text-white font-medium pt-1 border-t border-white/10">
                                        <span>Suggested:</span>
                                        <span>${suggestedTotal.toFixed(2)}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setQuotePrice(suggestedTotal.toFixed(2))}
                                        className="w-full mt-2 px-2 py-1 bg-pink-500/20 text-pink-400 rounded text-xs hover:bg-pink-500/30 transition"
                                      >
                                        Use suggested
                                      </button>
                                    </div>
                                    {enteredPrice > 0 && (
                                      <div className="mt-2 pt-2 border-t border-white/10 text-xs">
                                        <div className="flex justify-between text-green-400 font-medium">
                                          <span>Customer pays:</span>
                                          <span>${customerPays.toFixed(2)}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              <div>
                                <label className="block text-xs text-slate-500 mb-1">New Price ($)</label>
                                <input
                                  type="number"
                                  value={quotePrice}
                                  onChange={(e) => setQuotePrice(e.target.value)}
                                  placeholder="Enter final price"
                                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                                  step="0.01"
                                  min="0"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Message to Customer (optional)</label>
                                <textarea
                                  value={quoteMessage}
                                  onChange={(e) => setQuoteMessage(e.target.value)}
                                  placeholder="Add a note about the price change..."
                                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm resize-none"
                                  rows={2}
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setQuotingRequestId(null);
                                    setQuotePrice('');
                                    setQuoteMessage('');
                                  }}
                                  className="flex-1 px-4 py-2 bg-white/10 text-slate-300 rounded-lg text-sm hover:bg-white/20 transition"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => createPaymentLink(request._id, 'custom')}
                                  disabled={creatingPaymentLink}
                                  className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600 transition disabled:opacity-50"
                                >
                                  {creatingPaymentLink ? 'Sending...' : 'Send New Link'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Converted status - now a paid order */}
                          {request.status === 'converted' && (
                            <div className="bg-green-500/10 rounded-lg p-3 text-center">
                              <p className="text-green-400 text-sm font-medium">Paid & Converted to Order</p>
                              {request.orderNumber && (
                                <p className="text-slate-500 text-xs mt-1">
                                  Order #{request.orderNumber}
                                </p>
                              )}
                              <button
                                onClick={() => {
                                  setOrdersSubTab('orders');
                                }}
                                className="mt-2 px-4 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition"
                              >
                                View in Orders
                              </button>
                            </div>
                          )}

                          {/* Declined status */}
                          {request.status === 'declined' && (
                            <div className="bg-red-500/10 rounded-lg p-3 text-center">
                              <p className="text-red-400 text-sm font-medium">Declined</p>
                            </div>
                          )}

                          {/* Contact Buttons - always visible */}
                          <div className="flex gap-2 pt-2 border-t border-white/5">
                            <a
                              href={`mailto:${request.customerInfo.email}?subject=Re: Custom Cake Request ${request.requestNumber}`}
                              className="flex-1 px-4 py-2 bg-pink-500/20 text-pink-400 rounded-lg text-sm font-medium text-center hover:bg-pink-500/30 transition"
                            >
                              Email
                            </a>
                            {request.customerInfo.phone && (
                              <a
                                href={`tel:${request.customerInfo.phone}`}
                                className="flex-1 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium text-center hover:bg-green-500/30 transition"
                              >
                                Call
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-slate-400 text-lg mb-2">No custom cake requests yet</p>
                  <p className="text-slate-500 text-sm">Custom cake requests will appear here when customers submit them.</p>
                </div>
              )
            )}

            {/* Wedding Cake Requests - Only for weddings sub-tab */}
            {ordersSubTab === 'weddings' && (
              weddingRequestsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white mx-auto mb-4"></div>
                  <p className="text-slate-400">Loading wedding requests...</p>
                </div>
              ) : weddingRequests.length > 0 ? (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by request #, name, email, venue..."
                      value={weddingRequestsSearch}
                      onChange={(e) => setWeddingRequestsSearch(e.target.value)}
                      className="w-full px-4 py-3 pl-10 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {weddingRequestsSearch && (
                      <button
                        onClick={() => setWeddingRequestsSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Wedding Requests List */}
                  {filteredWeddingRequests.map((request) => (
                    <div
                      key={request._id}
                      className="bg-zinc-900 border border-white/10 rounded-xl p-6 hover:border-amber-500/30 transition"
                    >
                      {/* Header - Always visible */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {request.customerInfo.name}
                          </h3>
                          <p className="text-slate-400 text-sm">
                            {request.customerInfo.email}
                            {request.customerInfo.phone && ` • ${formatPhone(request.customerInfo.phone)}`}
                          </p>
                          <p className="text-slate-500 text-xs mt-1">
                            Request #{request.requestNumber} • {new Date(request.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          request.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-400'
                            : request.status === 'quoted'
                            ? 'bg-blue-500/20 text-blue-400'
                            : request.status === 'deposit_paid'
                            ? 'bg-violet-500/20 text-violet-400'
                            : request.status === 'converted'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {request.status === 'deposit_paid' ? 'Deposit Paid' : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>

                      {/* Customer's Original Notes */}
                      {request.cakeDetails?.designNotes && (
                        <div className="mb-4 bg-white/5 rounded-lg p-3">
                          <p className="text-slate-500 text-xs mb-1">Customer's Request</p>
                          <p className="text-sm text-white/80 whitespace-pre-wrap">{request.cakeDetails.designNotes}</p>
                        </div>
                      )}

                      {/* Reference Image if exists */}
                      {request.cakeDetails?.referenceImageUrl && (
                        <div className="mb-4">
                          <p className="text-slate-500 text-xs mb-2">Reference Image</p>
                          <img
                            src={request.cakeDetails.referenceImageUrl}
                            alt="Reference"
                            className="h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                            onClick={() => {
                              setImageModalUrl(request.cakeDetails.referenceImageUrl);
                              setImageModalOpen(true);
                            }}
                          />
                        </div>
                      )}

                      {/* Edit Form - Show when editing */}
                      {editingWeddingId === request._id ? (
                        <div className="space-y-4 border-t border-white/10 pt-4">
                          <p className="text-amber-400 font-medium text-sm">Fill in the agreed details:</p>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div>
                              <label className="text-slate-400 text-xs mb-1 block">Event Date *</label>
                              <input
                                type="date"
                                value={weddingEditData.eventDate}
                                onChange={(e) => setWeddingEditData(prev => ({ ...prev, eventDate: e.target.value }))}
                                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div>
                              <label className="text-slate-400 text-xs mb-1 block">Event Time</label>
                              <input
                                type="time"
                                value={weddingEditData.eventTime}
                                onChange={(e) => setWeddingEditData(prev => ({ ...prev, eventTime: e.target.value }))}
                                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div>
                              <label className="text-slate-400 text-xs mb-1 block">Guest Count</label>
                              <input
                                type="number"
                                value={weddingEditData.guestCount}
                                onChange={(e) => setWeddingEditData(prev => ({ ...prev, guestCount: e.target.value }))}
                                placeholder="100"
                                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div className="col-span-2 md:col-span-3">
                              <label className="text-slate-400 text-xs mb-1 block">Venue</label>
                              <input
                                type="text"
                                value={weddingEditData.venue}
                                onChange={(e) => setWeddingEditData(prev => ({ ...prev, venue: e.target.value }))}
                                placeholder="Venue name or address"
                                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <label className="text-slate-400 text-xs mb-1 block">Tiers</label>
                              <select
                                value={weddingEditData.tiers}
                                onChange={(e) => setWeddingEditData(prev => ({ ...prev, tiers: e.target.value }))}
                                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                              >
                                {[1, 2, 3, 4, 5, 6].map(n => (
                                  <option key={n} value={n}>{n} tier{n > 1 ? 's' : ''}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-slate-400 text-xs mb-1 block">Servings</label>
                              <input
                                type="number"
                                value={weddingEditData.servings}
                                onChange={(e) => setWeddingEditData(prev => ({ ...prev, servings: e.target.value }))}
                                placeholder="50"
                                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div>
                              <label className="text-slate-400 text-xs mb-1 block">Flavor</label>
                              <input
                                type="text"
                                value={weddingEditData.flavor}
                                onChange={(e) => setWeddingEditData(prev => ({ ...prev, flavor: e.target.value }))}
                                placeholder="Vanilla, Chocolate..."
                                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div>
                              <label className="text-slate-400 text-xs mb-1 block">Filling</label>
                              <input
                                type="text"
                                value={weddingEditData.filling}
                                onChange={(e) => setWeddingEditData(prev => ({ ...prev, filling: e.target.value }))}
                                placeholder="Buttercream, Fondant..."
                                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-slate-400 text-xs mb-1 block">Fulfillment</label>
                              <select
                                value={weddingEditData.fulfillmentType}
                                onChange={(e) => setWeddingEditData(prev => ({ ...prev, fulfillmentType: e.target.value as 'pickup' | 'delivery' }))}
                                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                              >
                                <option value="pickup">Pickup</option>
                                <option value="delivery">Delivery</option>
                              </select>
                            </div>
                            {weddingEditData.fulfillmentType === 'delivery' && (
                              <div>
                                <label className="text-slate-400 text-xs mb-1 block">Delivery Address</label>
                                <input
                                  type="text"
                                  value={weddingEditData.deliveryAddress}
                                  onChange={(e) => setWeddingEditData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                                  placeholder="Delivery address"
                                  className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="text-slate-400 text-xs mb-1 block">Design Notes (update if needed)</label>
                            <textarea
                              value={weddingEditData.designNotes}
                              onChange={(e) => setWeddingEditData(prev => ({ ...prev, designNotes: e.target.value }))}
                              rows={2}
                              className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500 resize-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-amber-400 text-xs mb-1 block font-medium">Payment Amount ($) *</label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={weddingEditData.finalPrice}
                                  onChange={(e) => setWeddingEditData(prev => ({ ...prev, finalPrice: e.target.value }))}
                                  placeholder="Enter amount"
                                  className="flex-1 px-3 py-2 bg-zinc-800 border border-amber-500/50 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentPrice = parseFloat(weddingEditData.finalPrice) || 0;
                                    const fullPrice = request.cakeDetails?.estimatedPrice || currentPrice;
                                    const halfPrice = (fullPrice / 2).toFixed(2);
                                    setWeddingEditData(prev => ({ ...prev, finalPrice: halfPrice, isDeposit: true, totalPrice: fullPrice.toString() }));
                                  }}
                                  className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition whitespace-nowrap"
                                >
                                  50%
                                </button>
                              </div>
                              {weddingEditData.isDeposit && (
                                <div className="flex items-center justify-between mt-1">
                                  <p className="text-emerald-400 text-xs">
                                    50% Deposit (Total: ${parseFloat(weddingEditData.totalPrice || '0').toFixed(2)}) - Remaining ${(parseFloat(weddingEditData.totalPrice || '0') - parseFloat(weddingEditData.finalPrice || '0')).toFixed(2)} can be sent later
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setWeddingEditData(prev => ({ ...prev, isDeposit: false, totalPrice: '' }))}
                                    className="text-xs text-red-400 hover:text-red-300"
                                  >
                                    Clear
                                  </button>
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="text-slate-400 text-xs mb-1 block">Message to Customer (optional)</label>
                              <input
                                type="text"
                                value={quoteMessage}
                                onChange={(e) => setQuoteMessage(e.target.value)}
                                placeholder="e.g., 50% deposit - remaining due before event"
                                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => saveAndSendWeddingPaymentLink(request._id)}
                              disabled={savingWeddingEdit}
                              className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {savingWeddingEdit ? 'Processing...' : 'Save & Send Payment Link'}
                            </button>
                            <button
                              onClick={() => saveWeddingEdit(request._id)}
                              disabled={savingWeddingEdit}
                              className="px-4 py-2.5 bg-white/10 text-slate-300 rounded-lg font-medium hover:bg-white/20 transition disabled:opacity-50"
                            >
                              Save Only
                            </button>
                            <button
                              onClick={() => {
                                setEditingWeddingId(null);
                                setQuoteMessage('');
                              }}
                              className="px-4 py-2.5 bg-white/5 text-slate-400 rounded-lg hover:bg-white/10 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* View Mode - Show current details */}
                          {(request.cakeDetails?.estimatedPrice > 0 || request.eventDetails?.eventDate) && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm border-t border-white/10 pt-4 mb-4">
                              {request.eventDetails?.eventDate && new Date(request.eventDetails.eventDate).getFullYear() > 1970 && (
                                <div>
                                  <p className="text-slate-500 text-xs">Event Date</p>
                                  <p className="text-white">{new Date(request.eventDetails.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                              )}
                              {request.eventDetails?.guestCount && (
                                <div>
                                  <p className="text-slate-500 text-xs">Guests</p>
                                  <p className="text-white">{request.eventDetails.guestCount}</p>
                                </div>
                              )}
                              {request.cakeDetails?.tiers > 0 && (
                                <div>
                                  <p className="text-slate-500 text-xs">Tiers</p>
                                  <p className="text-white">{request.cakeDetails.tiers}</p>
                                </div>
                              )}
                              {request.cakeDetails?.flavor && (
                                <div>
                                  <p className="text-slate-500 text-xs">Flavor</p>
                                  <p className="text-white">{request.cakeDetails.flavor}</p>
                                </div>
                              )}
                              {request.cakeDetails?.filling && (
                                <div>
                                  <p className="text-slate-500 text-xs">Filling</p>
                                  <p className="text-white">{request.cakeDetails.filling}</p>
                                </div>
                              )}
                              {request.cakeDetails?.estimatedPrice > 0 && (
                                <div>
                                  <p className="text-slate-500 text-xs">Price</p>
                                  <p className="text-amber-400 font-semibold">${request.cakeDetails.estimatedPrice.toFixed(2)}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 border-t border-white/10 pt-4">
                            {request.status === 'pending' && (
                              <button
                                onClick={() => startEditingWedding(request)}
                                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition"
                              >
                                Fill Details & Send Payment Link
                              </button>
                            )}

                            {request.status === 'quoted' && (
                              <div className="flex-1 space-y-2">
                                <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                                  <p className="text-blue-400 text-sm font-medium">Payment link sent</p>
                                  <p className="text-slate-500 text-xs mt-1">
                                    ${request.quoteInfo?.finalPrice?.toFixed(2)} • {new Date(request.quoteInfo?.quotedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </p>
                                  <p className="text-yellow-500/80 text-xs mt-1">
                                    Link expires 24hrs after creation
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  {request.quoteInfo?.paymentUrl && (
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(request.quoteInfo.paymentUrl);
                                        showToast('Payment link copied!', 'success');
                                      }}
                                      className="flex-1 px-4 py-2 bg-white/10 text-slate-300 rounded-lg text-sm hover:bg-white/20 transition"
                                    >
                                      Copy Link
                                    </button>
                                  )}
                                  <button
                                    onClick={() => startEditingWedding(request)}
                                    className="flex-1 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm hover:bg-amber-500/30 transition"
                                  >
                                    Send New Payment Link
                                  </button>
                                </div>
                              </div>
                            )}

                            {request.status === 'deposit_paid' && editingWeddingId !== request._id && (
                              <div className="flex-1 space-y-2">
                                <div className="bg-violet-500/10 rounded-lg p-3 text-center">
                                  <p className="text-violet-400 text-sm font-medium">Deposit Paid</p>
                                  <p className="text-slate-500 text-xs mt-1">
                                    Deposit: ${request.paymentHistory?.[0]?.amount?.toFixed(2) || 'N/A'}
                                  </p>
                                  <p className="text-amber-400 text-sm font-medium mt-2">
                                    Remaining: ${((request.remainingBalance || 0) + (request.remainingBalance || 0) * 0.0825).toFixed(2)}
                                  </p>
                                  <p className="text-slate-500 text-xs">(incl. tax)</p>
                                </div>
                                <button
                                  onClick={() => {
                                    // Set up for remaining balance payment
                                    setEditingWeddingId(request._id);
                                    setWeddingEditData({
                                      eventDate: request.eventDetails?.eventDate?.split('T')[0] || '',
                                      eventTime: request.eventDetails?.eventTime || '',
                                      venue: request.eventDetails?.venue || '',
                                      guestCount: request.eventDetails?.guestCount?.toString() || '',
                                      tiers: request.cakeDetails?.tiers?.toString() || '1',
                                      servings: request.cakeDetails?.servings?.toString() || '',
                                      flavor: request.cakeDetails?.flavor || '',
                                      filling: request.cakeDetails?.filling || '',
                                      fulfillmentType: request.cakeDetails?.fulfillmentType || 'pickup',
                                      deliveryAddress: request.cakeDetails?.deliveryAddress || '',
                                      designNotes: request.cakeDetails?.designNotes || '',
                                      finalPrice: (request.remainingBalance || 0).toString(),
                                      isDeposit: false,
                                      totalPrice: '',
                                    });
                                    setQuoteMessage('Final balance payment for your wedding cake');
                                  }}
                                  className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition"
                                >
                                  Send Remaining Balance
                                </button>
                              </div>
                            )}

                            {request.status === 'deposit_paid' && editingWeddingId === request._id && (
                              <div className="flex-1 space-y-3 bg-white/5 rounded-lg p-4">
                                <p className="text-sm text-violet-400 font-medium">Send Remaining Balance Payment</p>
                                <p className="text-xs text-slate-500">Send the final payment link for the remaining balance.</p>

                                <div>
                                  <label className="text-amber-400 text-xs mb-1 block font-medium">Remaining Amount ($) *</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={weddingEditData.finalPrice}
                                    onChange={(e) => setWeddingEditData(prev => ({ ...prev, finalPrice: e.target.value }))}
                                    placeholder="Remaining amount"
                                    className="w-full px-3 py-2 bg-zinc-800 border border-amber-500/50 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                                  />
                                </div>

                                <div>
                                  <label className="text-slate-400 text-xs mb-1 block">Message (optional)</label>
                                  <input
                                    type="text"
                                    value={quoteMessage}
                                    onChange={(e) => setQuoteMessage(e.target.value)}
                                    placeholder="e.g., Final balance due before event"
                                    className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                                  />
                                </div>

                                <div className="flex gap-2 pt-2">
                                  <button
                                    onClick={() => saveAndSendWeddingPaymentLink(request._id)}
                                    disabled={savingWeddingEdit}
                                    className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition disabled:opacity-50"
                                  >
                                    {savingWeddingEdit ? 'Sending...' : 'Send Payment Link'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingWeddingId(null);
                                      setQuoteMessage('');
                                    }}
                                    className="px-4 py-2.5 bg-white/10 text-slate-300 rounded-lg font-medium hover:bg-white/20 transition"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {request.status === 'converted' && (
                              <div className="flex-1 bg-emerald-500/10 rounded-lg p-3 text-center">
                                <p className="text-emerald-400 text-sm font-medium">Order Confirmed</p>
                                <p className="text-slate-500 text-xs mt-1">Order #{request.orderNumber}</p>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 text-lg mb-2">No wedding cake requests yet</p>
                  <p className="text-slate-500 text-sm">Wedding cake requests will appear here when customers submit them.</p>
                </div>
              )
            )}
          </>
        )}

        {activeTab === "schedule" && (
          <ScheduleManager />
        )}

        {activeTab === "manage-products" && (
          <ManageProductsTab
            importLibraryMedia={importLibraryMedia}
            onClearImportMedia={() => setImportLibraryMedia([])}
            showToast={showToast}
          />
        )}

        {activeTab === "manage-addons" && (
          <ManageAddOnsTab showToast={showToast} />
        )}

        {activeTab === "studio" && (
          <StudioTab showToast={showToast} setImportLibraryMedia={setImportLibraryMedia} changeTab={changeTab} />
        )}

                    {activeTab === "email-marketer" && (
                      <EmailMarketerTab showToast={showToast} />
                    )}

                    {activeTab === "blog" && (
                      <BlogManager />
                    )}

                    {activeTab === "promos" && (
                      <PromosTab showToast={showToast} />
                    )}
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {imageModalOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setImageModalOpen(false)}
              className="absolute top-4 right-4 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {imageModalUrl.match(/\.(mp4|webm|mov)$/i) ? (
              <video
                src={imageModalUrl}
                controls
                autoPlay
                loop
                className="max-w-full max-h-full rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={imageModalUrl}
                alt="Full size view"
                className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      )}

      {/* Date Reschedule Modal - shown when date is unavailable before sending payment link */}
      {dateRescheduleModal?.show && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setDateRescheduleModal(null)}
        >
          <div
            className="bg-zinc-900 border border-white/10 rounded-2xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={dateRescheduleModal.capacityWarning ? "text-orange-500" : "text-yellow-500"}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                {dateRescheduleModal.capacityWarning ? 'Overbooking Warning' : 'Date Issue Detected'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Warning message */}
              <div className={`${dateRescheduleModal.capacityWarning ? 'bg-orange-500/10 border-orange-500/30' : 'bg-yellow-500/10 border-yellow-500/30'} border rounded-lg p-4`}>
                <p className={`${dateRescheduleModal.capacityWarning ? 'text-orange-400' : 'text-yellow-400'} text-sm font-medium whitespace-pre-wrap`}>
                  {dateRescheduleModal.issue}
                </p>
                {!dateRescheduleModal.capacityWarning && (
                  <p className="text-slate-400 text-xs mt-2">
                    Originally requested: {new Date(dateRescheduleModal.originalDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                <p className="text-sm text-white font-medium">What would you like to do?</p>

                {/* Option 1: Pick a new date */}
                <div className="bg-white/5 rounded-lg p-4 space-y-3">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    Select a new date:
                  </label>
                  <input
                    type="date"
                    value={dateRescheduleModal.newDate?.split('T')[0] || ''}
                    onChange={(e) => setDateRescheduleModal({
                      ...dateRescheduleModal,
                      newDate: e.target.value
                    })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-pink-500"
                  />
                  <button
                    onClick={() => {
                      const dateChanged = dateRescheduleModal.newDate !== dateRescheduleModal.originalDate.split('T')[0];
                      sendPaymentLink(
                        dateRescheduleModal.requestId,
                        dateRescheduleModal.requestType,
                        {
                          newDate: dateRescheduleModal.newDate,
                          dateChanged,
                        }
                      );
                    }}
                    disabled={creatingPaymentLink}
                    className="w-full px-4 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition disabled:opacity-50"
                  >
                    {creatingPaymentLink ? 'Sending...' : 'Update Date & Send Payment Link'}
                  </button>
                </div>

                {/* Option 2: Override and book anyway */}
                <div className="bg-white/5 rounded-lg p-4">
                  <button
                    onClick={() => {
                      sendPaymentLink(
                        dateRescheduleModal.requestId,
                        dateRescheduleModal.requestType,
                        { overrideCapacity: true }
                      );
                    }}
                    disabled={creatingPaymentLink}
                    className="w-full px-4 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg font-medium hover:bg-orange-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    {creatingPaymentLink ? 'Sending...' : (dateRescheduleModal.capacityWarning ? 'Proceed Anyway (I can handle it)' : 'Override & Send Anyway (I can handle it)')}
                  </button>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    {dateRescheduleModal.capacityWarning
                      ? 'Send the payment link for this date anyway - you may end up with more orders than usual'
                      : 'This will book the original date even if it\'s over capacity'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setDateRescheduleModal(null)}
                className="px-4 py-2 text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="bg-zinc-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960" fill="currentColor">
                  <path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
                </svg>
                Dashboard Help
              </h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-white/60 hover:text-white transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <h3 className="text-lg font-medium text-white mb-3">Navigation Tabs</h3>
                <div className="space-y-3">
                  <div className="bg-white/5 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-pink-400">Analytics</h4>
                    <p className="text-sm text-white/60 mt-1">View your website traffic, visitor statistics, page views, geographic data, and performance metrics.</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-pink-400">Sales</h4>
                    <p className="text-sm text-white/60 mt-1">Track your total revenue, order counts, average order value, top-selling products, and recent transactions.</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-pink-400">Orders</h4>
                    <p className="text-sm text-white/60 mt-1">Manage all your orders with three sub-tabs:</p>
                    <ul className="text-sm text-white/50 mt-2 ml-4 space-y-1 list-disc">
                      <li><span className="text-white/70">Paid Orders</span> - View and manage completed orders, mark as complete</li>
                      <li><span className="text-white/70">Custom Requests</span> - Handle custom cake inquiries, create payment links</li>
                      <li><span className="text-white/70">Wedding Requests</span> - Manage wedding cake consultations, fill in details, send payment links</li>
                    </ul>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-pink-400">Schedule</h4>
                    <p className="text-sm text-white/60 mt-1">Set your availability, manage open/closed dates, block specific dates, and control your booking calendar.</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-pink-400">Cakes</h4>
                    <p className="text-sm text-white/60 mt-1">Add, edit, and manage your cake products including images, galleries, prices, sizes, flavors, and descriptions.</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-pink-400">Add-Ons</h4>
                    <p className="text-sm text-white/60 mt-1">Create and manage add-on options customers can select during checkout (toppers, flowers, writing, etc.).</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-pink-400">Promos</h4>
                    <p className="text-sm text-white/60 mt-1">Manage promotions with two sections:</p>
                    <ul className="text-sm text-white/50 mt-2 ml-4 space-y-1 list-disc">
                      <li><span className="text-white/70">Discount Codes</span> - Create percentage-based discount codes for customers</li>
                      <li><span className="text-white/70">Promo Popup</span> - Configure the website popup to display active promotions</li>
                    </ul>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-pink-400">Import</h4>
                    <p className="text-sm text-white/60 mt-1">Import media and images from Instagram or other sources to use in your cake galleries.</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-pink-400">Email</h4>
                    <p className="text-sm text-white/60 mt-1">Create and send marketing emails to your customers with templates and scheduling options.</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-pink-400">Blog</h4>
                    <p className="text-sm text-white/60 mt-1">Write and publish blog posts to engage with your audience and improve SEO.</p>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-medium text-white mb-3">Contact & Support</h3>
                <div className="space-y-3">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-pink-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Report a Bug
                    </h4>
                    <p className="text-sm text-white/60 mt-1">Something not working? Email <a href="mailto:contact@jamesweb.dev" className="text-pink-400 hover:text-pink-300 transition">contact@jamesweb.dev</a></p>
                    <p className="text-xs text-white/40 mt-1">Critical issues are addressed within 4 hours.</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-pink-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Request a New Feature
                    </h4>
                    <p className="text-sm text-white/60 mt-1">Want to add something new to your site? Email <a href="mailto:features@jamesweb.dev" className="text-pink-400 hover:text-pink-300 transition">features@jamesweb.dev</a> for a quote.</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-pink-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      General Questions
                    </h4>
                    <p className="text-sm text-white/60 mt-1">Check this Help Guide first. If you still need help, email <a href="mailto:support@jamesweb.dev" className="text-pink-400 hover:text-pink-300 transition">support@jamesweb.dev</a></p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 mt-4 border border-white/5">
                    <p className="text-xs text-white/50 text-center">Dashboard created by <a href="https://jamesweb.dev" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 transition">jamesweb.dev</a></p>
                  </div>
                </div>
              </div>
              {/* Site Settings Section */}
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-medium text-white mb-3">Site Settings</h3>
                <div className="space-y-3">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-white">Ask Kassy Chatbot</h4>
                          <p className="text-xs text-white/50 mt-0.5">
                            {chatbotEnabled ? 'Chatbot is visible on your website' : 'Chatbot is hidden from your website'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={toggleChatbot}
                        disabled={chatbotToggleLoading}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                          chatbotEnabled ? 'bg-pink-500' : 'bg-zinc-600'
                        } ${chatbotToggleLoading ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            chatbotEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Analytics Report Modal */}
      {aiReportOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setAiReportOpen(false)}
        >
          <div
            className="bg-zinc-900 border border-pink-500/30 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="white">
                    <path d="M400-280h160v-80H400v80Zm0-160h280v-80H400v80ZM280-600h400v-80H280v80Zm200 120ZM265-80q-79 0-134.5-55.5T75-270q0-57 29.5-102t77.5-68H80v-80h240v240h-80v-97q-37 8-61 38t-24 69q0 46 32.5 78t77.5 32v80Zm135-40v-80h360v-560H200v160h-80v-160q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H400Z"/>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white">AI Analytics Report</h2>
              </div>
              <button
                onClick={() => setAiReportOpen(false)}
                className="text-white/60 hover:text-white transition p-2 hover:bg-white/10 rounded-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {aiReportLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-pink-500/30 rounded-full animate-spin border-t-pink-500"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#f472b6">
                        <path d="M400-280h160v-80H400v80Zm0-160h280v-80H400v80ZM280-600h400v-80H280v80Zm200 120ZM265-80q-79 0-134.5-55.5T75-270q0-57 29.5-102t77.5-68H80v-80h240v240h-80v-97q-37 8-61 38t-24 69q0 46 32.5 78t77.5 32v80Zm135-40v-80h360v-560H200v160h-80v-160q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H400Z"/>
                      </svg>
                    </div>
                  </div>
                  <p className="mt-4 text-white/60">Analyzing your analytics data...</p>
                  <p className="mt-1 text-sm text-white/40">Generating insights</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* AI Report Content */}
                  <div className="prose prose-invert prose-sm max-w-none">
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-white/90 leading-relaxed">
                        {aiReport}
                      </pre>
                    </div>
                  </div>

                  {/* Abandoned Carts Section */}
                  {abandonedCartsData && abandonedCartsData.count > 0 && (
                    <div className="border-t border-white/10 pt-6">
                      <button
                        onClick={() => setAbandonedCartsExpanded(!abandonedCartsExpanded)}
                        className="w-full flex items-center justify-between text-left mb-4 group"
                      >
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#f87171">
                            <path d="M280-80q-33 0-56.5-23.5T200-160q0-33 23.5-56.5T280-240q33 0 56.5 23.5T360-160q0 33-23.5 56.5T280-80Zm400 0q-33 0-56.5-23.5T600-160q0-33 23.5-56.5T680-240q33 0 56.5 23.5T760-160q0 33-23.5 56.5T680-80ZM246-720l96 200h280l110-200H246Zm-38-80h590q23 0 35 20.5t1 41.5L692-482q-11 20-29.5 31T622-440H324l-44 80h480v80H280q-45 0-68-39.5t-2-78.5l54-98-144-304H40v-80h130l38 80Zm134 280h280-280Z"/>
                          </svg>
                          Abandoned Carts
                          <span className="text-sm font-normal text-red-400">
                            ({abandonedCartsData.count} carts, ~${abandonedCartsData.value.toFixed(2)} lost)
                          </span>
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/40 group-hover:text-white/60 transition">
                            {abandonedCartsExpanded ? 'Collapse' : 'Expand all'}
                          </span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            height="20px"
                            viewBox="0 -960 960 960"
                            width="20px"
                            fill="currentColor"
                            className={`text-white/40 group-hover:text-white/60 transition-transform duration-200 ${abandonedCartsExpanded ? 'rotate-180' : ''}`}
                          >
                            <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
                          </svg>
                        </div>
                      </button>
                      <div className="grid gap-3">
                        {(abandonedCartsExpanded ? abandonedCartsData.carts : abandonedCartsData.carts.slice(0, 5)).map((cart, index) => (
                          <div key={index} className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-white">{cart.customerName}</p>
                                <p className="text-sm text-white/60">{cart.customerEmail}</p>
                                {cart.customerPhone && (
                                  <p className="text-sm text-white/50">{cart.customerPhone}</p>
                                )}
                              </div>
                              <span className="text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded-full">
                                {cart.hoursAgo}h ago
                              </span>
                            </div>
                            <div className="mt-2 text-sm text-white/70">
                              <span className="text-white/50">Items: </span>
                              {cart.items.map((item, i) => (
                                <span key={i}>
                                  {item.name} ({item.size}{item.flavor ? `, ${item.flavor}` : ''}) - ${item.price}
                                  {i < cart.items.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {!abandonedCartsExpanded && abandonedCartsData.carts.length > 5 && (
                        <button
                          onClick={() => setAbandonedCartsExpanded(true)}
                          className="mt-3 text-sm text-pink-400 hover:text-pink-300 transition"
                        >
                          Show {abandonedCartsData.carts.length - 5} more abandoned carts...
                        </button>
                      )}
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-sm text-white/50">
                          Add these customers to your email list to send recovery emails.
                        </p>
                        <button
                          onClick={addAbandonedCartsToEmailList}
                          disabled={addingToEmailList}
                          className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 rounded-lg text-sm transition disabled:opacity-50 flex items-center gap-2"
                        >
                          {addingToEmailList ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Adding...
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                                <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z"/>
                              </svg>
                              Add to Email List
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex-shrink-0 bg-zinc-900/50">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  {aiReportCreatedAt && (
                    <p className="text-xs text-white/40">
                      Generated: {new Date(aiReportCreatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={regenerateAIReport}
                    disabled={aiReportLoading || !data}
                    className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 rounded-lg text-sm transition disabled:opacity-50"
                  >
                    {aiReportLoading ? 'Generating...' : 'Generate New Report'}
                  </button>
                  <button
                    onClick={() => setAiReportOpen(false)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      <RescheduleModal
        isOpen={rescheduleModalOpen}
        onClose={() => {
          setRescheduleModalOpen(false);
          setRescheduleBooking(null);
        }}
        booking={rescheduleBooking}
        onReschedule={handleReschedule}
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
        {toasts.map(toast => (
          <div
            key={toast.id}
            onClick={() => dismissToast(toast.id)}
            className={`
              flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl cursor-pointer
              transform transition-all duration-300 ease-out
              backdrop-blur-xl min-w-[320px] max-w-[420px]
              animate-[slideIn_0.3s_ease-out_forwards]
              ${toast.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-100'
                : toast.type === 'error'
                ? 'bg-red-500/20 border border-red-500/30 text-red-100'
                : 'bg-zinc-800/90 border border-zinc-700/50 text-zinc-100'
              }
              hover:scale-[1.02]
            `}
          >
            <div className={`
              flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
              ${toast.type === 'success'
                ? 'bg-emerald-500/30'
                : toast.type === 'error'
                ? 'bg-red-500/30'
                : 'bg-zinc-700/50'
              }
            `}>
              {toast.type === 'success' && (
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className="text-sm font-medium leading-relaxed flex-1">{toast.message}</p>
            <svg className="w-4 h-4 opacity-40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

// Manage Cakes Tab Component
function ManageProductsTab({ importLibraryMedia, onClearImportMedia, showToast }: {
  importLibraryMedia: any[];
  onClearImportMedia: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}) {
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [rearrangeMode, setRearrangeMode] = useState(false);
  const [showCollectionsManager, setShowCollectionsManager] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);
  const [touchDragging, setTouchDragging] = useState(false);
  const productRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Check if we have preselected media from import library
  useEffect(() => {
    if (importLibraryMedia.length > 0) {
      setShowAddForm(true);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [importLibraryMedia]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/admin/products?includeHidden=true&_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      console.log('📦 Fetched products from server:', data.products?.length, 'products');
      setDbProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (productId: string) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleVisibility' })
      });

      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to permanently delete this product?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newProducts = [...dbProducts];
    const draggedItem = newProducts[draggedIndex];
    newProducts.splice(draggedIndex, 1);
    newProducts.splice(index, 0, draggedItem);

    setDbProducts(newProducts);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Touch event handlers for mobile drag and drop
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (!rearrangeMode) return;
    e.preventDefault();
    setDraggedIndex(index);
    setTouchDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!rearrangeMode || draggedIndex === null || !touchDragging) return;
    e.preventDefault();

    const touch = e.touches[0];
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);

    // Find which product card we're over
    for (let i = 0; i < productRefs.current.length; i++) {
      const ref = productRefs.current[i];
      if (ref && (ref === elementUnderTouch || ref.contains(elementUnderTouch as Node))) {
        if (i !== draggedIndex) {
          const newProducts = [...dbProducts];
          const draggedItem = newProducts[draggedIndex];
          newProducts.splice(draggedIndex, 1);
          newProducts.splice(i, 0, draggedItem);
          setDbProducts(newProducts);
          setDraggedIndex(i);
        }
        break;
      }
    }
  };

  const handleTouchEnd = () => {
    setDraggedIndex(null);
    setTouchDragging(false);
  };

  const saveOrder = async () => {
    setSavingOrder(true);
    try {
      const productOrder = dbProducts.map((product, index) => ({
        id: product._id,
        order: index
      }));

      const response = await fetch('/api/admin/products/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: productOrder })
      });

      if (response.ok) {
        setRearrangeMode(false);
        fetchProducts();
      } else {
        showToast('Failed to save order', 'error');
      }
    } catch (error) {
      console.error('Failed to save order:', error);
      showToast('Failed to save order', 'error');
    } finally {
      setSavingOrder(false);
    }
  };

  const cancelRearrange = () => {
    setRearrangeMode(false);
    fetchProducts(); // Reset to original order
  };

  if (showAddForm || editingProduct) {
    return (
      <ProductForm
        product={editingProduct}
        preselectedMedia={importLibraryMedia.length > 0 ? importLibraryMedia : undefined}
        onClose={() => {
          setShowAddForm(false);
          setEditingProduct(null);
          onClearImportMedia();
          window.scrollTo(0, savedScrollPosition);
        }}
        onSuccess={() => {
          setShowAddForm(false);
          setEditingProduct(null);
          onClearImportMedia();
          fetchProducts();
          window.scrollTo(0, savedScrollPosition);
        }}
        showToast={showToast}
      />
    );
  }

  if (showCollectionsManager) {
    return (
      <CollectionsManager
        products={dbProducts}
        onClose={() => {
          setShowCollectionsManager(false);
          window.scrollTo(0, savedScrollPosition);
        }}
        onRefresh={fetchProducts}
        showToast={showToast}
      />
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Manage Cakes ({dbProducts.length})
        </h2>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          {rearrangeMode ? (
            <>
              <button
                onClick={cancelRearrange}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={saveOrder}
                disabled={savingOrder}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
              >
                {savingOrder ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  'Save Order'
                )}
              </button>
            </>
          ) : (
            <>
              <a
                href="/cakes#catalog"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm sm:text-base flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5"><path d="m256-240-56-56 384-384H240v-80h480v480h-80v-344L256-240Z" /></svg>
                View Cakes
              </a>
              <button
                onClick={() => setRearrangeMode(true)}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5"><path d="M320-160q-117 0-198.5-81.5T40-440q0-107 70.5-186.5T287-718l-63-66 56-56 160 160-160 160-56-57 59-59q-71 14-117 69t-46 127q0 83 58.5 141.5T320-240h120v80H320Zm200-360v-280h360v280H520Zm0 360v-280h360v280H520Zm80-80h200v-120H600v120Z" /></svg>
                <span className="hidden sm:inline">Rearrange</span>
                <span className="sm:hidden">Reorder</span>
              </button>
              <button
                onClick={() => {
                  setSavedScrollPosition(window.scrollY);
                  setShowCollectionsManager(true);
                  document.documentElement.scrollTop = 0;
                  document.body.scrollTop = 0;
                }}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5"><path d="m489-460 91-55 91 55-24-104 80-69-105-9-42-98-42 98-105 9 80 69-24 104Zm19 260h224q-7 26-24 42t-44 20L228-85q-33 5-59.5-15.5T138-154L85-591q-4-33 16-59t53-30l46-6v80l-36 5 54 437 290-36Zm-148-80q-33 0-56.5-23.5T280-360v-440q0-33 23.5-56.5T360-880h440q33 0 56.5 23.5T880-800v440q0 33-23.5 56.5T800-280H360Zm0-80h440v-440H360v440Zm220-220ZM218-164Z"/></svg>
                <span className="hidden sm:inline">Collections</span>
                <span className="sm:hidden">Tabs</span>
              </button>
              <button
                onClick={() => {
                  setSavedScrollPosition(window.scrollY);
                  setShowAddForm(true);
                  document.documentElement.scrollTop = 0;
                  document.body.scrollTop = 0;
                }}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5"><path d="M760-640v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80ZM120-80q-17 0-28.5-11.5T80-120v-200q0-33 23.5-56.5T160-400v-160q0-33 23.5-56.5T240-640h160v-58q-18-12-29-29t-11-41q0-15 6-29.5t18-26.5l56-56 56 56q12 12 18 26.5t6 29.5q0 24-11 41t-29 29v58h160q33 0 56.5 23.5T720-560v160q33 0 56.5 23.5T800-320v200q0 17-11.5 28.5T760-80H120Zm120-320h400v-160H240v160Zm-80 240h560v-160H160v160Zm80-240h400-400Zm-80 240h560-560Zm560-240H160h560Z" /></svg>
                Add New Cake
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cakes Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading cakes...</p>
        </div>
      ) : dbProducts.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No cakes yet</p>
          <button
            onClick={() => {
              setSavedScrollPosition(window.scrollY);
              setShowAddForm(true);
              document.documentElement.scrollTop = 0;
              document.body.scrollTop = 0;
            }}
            className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            Add Your First Cake
          </button>
        </div>
      ) : (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3"
          style={{ touchAction: rearrangeMode ? 'none' : 'auto' }}
        >
          {dbProducts.map((product, index) => {
            const thumbnailMedia = product.media?.find((m: any) => m.isThumbnail) || product.media?.[0];
            const thumbnail = thumbnailMedia?.url;
            const isVideo = thumbnailMedia?.type === 'video';

            return (
              <div
                key={product._id}
                ref={(el) => { productRefs.current[index] = el; }}
                draggable={rearrangeMode}
                onDragStart={() => rearrangeMode && handleDragStart(index)}
                onDragOver={(e) => rearrangeMode && handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all ${product.hidden ? 'opacity-50' : ''
                  } ${rearrangeMode ? 'cursor-move' : ''} ${draggedIndex === index && touchDragging ? 'ring-2 ring-pink-500 scale-105 z-10' : ''}`}
                style={{ touchAction: rearrangeMode ? 'none' : 'auto' }}
              >
                {/* Cake Image/Video */}
                {thumbnail && (
                  <div className="relative w-full aspect-square bg-gray-100 dark:bg-zinc-800">
                    {isVideo ? (
                      <video
                        src={thumbnail}
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                        }}
                      />
                    ) : (
                      <CroppedImage
                        src={thumbnail}
                        alt={product.name}
                        cropData={thumbnailMedia?.cropData}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {rearrangeMode && (
                      <div className="absolute top-1 left-1 bg-pink-500 text-white px-2 py-1 rounded-full text-sm font-bold shadow-lg">
                        #{index + 1}
                      </div>
                    )}
                    {product.hidden && !rearrangeMode && (
                      <div className="absolute top-1 right-1 bg-red-500 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                        HIDDEN
                      </div>
                    )}
                  </div>
                )}

                {/* Cake Info */}
                <div className="p-2">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                      {product.name}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                      {product.productType}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {product.category} • {product.sizes?.length || 0} size{product.sizes?.length !== 1 ? 's' : ''}
                  </p>

                  {product.sizes && product.sizes.length > 0 && (
                    <div className="flex gap-1 mb-2 flex-wrap">
                      {product.sizes.map((size: any, index: number) => (
                        <span
                          key={index}
                          className="text-xs bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 px-1.5 py-0.5 rounded font-medium"
                        >
                          {size.size}: ${size.price}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {!rearrangeMode && (
                    <div className="flex flex-col sm:flex-row gap-1 pt-2 border-t border-gray-200 dark:border-zinc-800">
                      <button
                        onClick={() => {
                          setSavedScrollPosition(window.scrollY);
                          setEditingProduct(product);
                          document.documentElement.scrollTop = 0;
                          document.body.scrollTop = 0;
                        }}
                        className="w-full sm:flex-1 bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5q0 15-5.5 29.5T897-728L530-360H360Zm481-424-56-56 56 56ZM440-440h56l232-232-28-28-29-28-231 231v57Zm260-260-29-28 29 28 28 28-28-28Z" /></svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(product._id)}
                        className="w-full sm:flex-1 bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z" /></svg>
                        {product.hidden ? 'Show' : 'Hide'}
                      </button>
                      <button
                        onClick={() => handleDelete(product._id)}
                        className="w-full sm:w-auto bg-gray-700 hover:bg-gray-800 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" /></svg>
                        Delete
                      </button>
                    </div>
                  )}
                  {rearrangeMode && (
                    <div className="pt-2 border-t border-gray-200 dark:border-zinc-800 text-center text-gray-500 dark:text-gray-400 text-xs">
                      <span className="hidden sm:inline">Drag to reorder</span>
                      <span className="sm:hidden">Tap & hold to reorder</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// Studio Tab Component - AI Photo Editing
function StudioTab({ showToast, setImportLibraryMedia, changeTab }: {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  setImportLibraryMedia: (media: any[]) => void;
  changeTab: (tab: any) => void;
}) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customPromptOpen, setCustomPromptOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const customPromptInputRef = useRef<HTMLInputElement>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [addingFunds, setAddingFunds] = useState(false);
  const [isDevUser, setIsDevUser] = useState(false);
  const [devBalanceInput, setDevBalanceInput] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedForProduct, setSelectedForProduct] = useState<string[]>([]);
  const [viewingFile, setViewingFile] = useState<any | null>(null);
  const [deletingMultiple, setDeletingMultiple] = useState(false);

  // Price per image (includes profit margin)
  const SEEDREAM_COST = 0.10;      // Lighting v4.5 - cost: $0.04, profit: $0.06
  const SEEDREAM_V4_COST = 0.08;   // Relight v4 - cost: $0.03, profit: $0.05
  const NANO_BANANA_COST = 0.25;   // AI edits - cost: $0.13, profit: $0.12

  // Lighting presets with their prompts (Seedream - $0.10/image)
  const lightingPresets = [
    {
      id: 'dramatic',
      name: 'Dramatic',
      model: 'v4.5',
      prompt: 'Replace lighting with higher illumination with nicely composed shadows that turns it into an award winning photo, clearly show the cake details while preserving all the decorations. Keep composition and background; improve visibility and reduce shadows. Do not add physical lights or equipment to the scene. Only improve lighting effect. Preserve background.'
    },
    {
      id: 'soft',
      name: 'Soft & Bright',
      model: 'v4.5',
      prompt: 'Apply soft, diffused lighting that eliminates harsh shadows and creates a bright, airy feel. Enhance the cake details with gentle illumination while maintaining natural colors. Keep the composition and background intact. Do not add any physical lights or equipment to the scene.'
    },
    {
      id: 'golden',
      name: 'Golden Hour',
      model: 'v4.5',
      prompt: 'Apply warm golden hour lighting with soft orange and yellow tones that creates a romantic, dreamy atmosphere. Enhance the cake with warm highlights while keeping shadows soft. Preserve all decorations and background. Do not add physical lights or sun to the scene.'
    },
    {
      id: 'studio',
      name: 'Studio Pro',
      model: 'v4.5',
      prompt: 'Apply professional studio lighting with even illumination, crisp details, and minimal shadows. Make the cake look like it was photographed in a professional bakery studio. Enhance clarity and color accuracy. Keep composition and background. Do not add visible lights or equipment.'
    },
  ];

  // Relight presets (Seedream v4 - $0.08/image)
  const relightPresets = [
    {
      id: 'relight-1.4',
      name: 'Relight 1.4',
      model: 'v4',
      prompt: 'Replace lighting with bright, higher illumination with nicely composed shadows that turns it into an award winning photo, clearly show the cake details while preserving all the decorations. Keep composition and background; improve visibility and reduce shadows. Do not add physical lights or equipment to the scene. Only improve lighting effect. Preserve background.'
    },
    {
      id: 'relight-clean',
      name: 'Clean Light',
      model: 'v4',
      prompt: 'Replace the existing lighting with bright, well-balanced illumination and professionally composed shadows, creating an award-winning photograph. Clearly reveal all cake details and textures while preserving every decoration. Maintain the original composition and background. Improve overall visibility and reduce harsh shadows. Do not add any visible light sources or equipment. Adjust lighting effects only.'
    },
    {
      id: 'relight-studio',
      name: 'Studio Shot',
      model: 'v4',
      prompt: 'Enhance the scene with bright, even, professional-grade lighting and refined natural shadows, resulting in an award-quality photo. Fully showcase the cake\'s details, textures, and decorations. Keep the original composition and background unchanged. Increase clarity and visibility while softening shadows. Do not introduce any physical lighting elements—lighting effects only.'
    },
  ];

  // Edit presets for Nano Banana Pro (Google - $0.25/image)
  const editPresets = [
    {
      id: 'remove-bg',
      name: 'White Background',
      prompt: 'Remove the background completely and replace it with a clean, pure white background. Keep the cake exactly as it is with all its details, decorations, and colors preserved. Professional product photography style.'
    },
    {
      id: 'enhance',
      name: 'Pro Enhance',
      prompt: 'Enhance this cake photo to professional quality. Improve sharpness, color vibrancy, and details. Make it look like a high-end bakery advertisement. Keep the cake and all decorations exactly as they are.'
    },
    {
      id: 'clean-plate',
      name: 'Clean Plate',
      prompt: 'Clean up the cake stand/plate area. Remove any crumbs, smudges, or imperfections on the plate or surface around the cake. Keep the cake itself exactly as it is.'
    },
    {
      id: 'marble-bg',
      name: 'Marble Background',
      prompt: 'Replace the background with an elegant white marble surface and soft neutral backdrop. Keep the cake exactly as it is with all decorations preserved. Professional bakery photography style.'
    },
  ];

  useEffect(() => {
    fetchImages();
    fetchWalletBalance();

    // Check for wallet success/cancel from Stripe redirect
    const urlParams = new URLSearchParams(window.location.search);
    const walletStatus = urlParams.get('wallet');
    const amount = urlParams.get('amount');

    if (walletStatus === 'success' && amount) {
      showToast(`$${amount} added to your wallet!`, 'success');
      // Clean up URL
      window.history.replaceState({}, '', '/kassycakes/dashboard?tab=studio');
      // Refresh balance after a short delay (webhook may take a moment)
      setTimeout(fetchWalletBalance, 2000);
    } else if (walletStatus === 'cancelled') {
      showToast('Payment cancelled', 'info');
      window.history.replaceState({}, '', '/kassycakes/dashboard?tab=studio');
    }
  }, []);

  const fetchWalletBalance = async () => {
    try {
      const response = await fetch('/api/admin/wallet');
      const data = await response.json();
      if (data.success) {
        setWalletBalance(data.balance);
        setIsDevUser(data.isDev || false);

        // Show welcome toast for new trial users
        if (data.newTrial) {
          showToast('Welcome! You have $1.00 free credits to try Studio!', 'success');
        }
      }
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
    }
  };

  const setDevBalance = async () => {
    const amount = parseFloat(devBalanceInput);
    if (isNaN(amount) || amount < 0) {
      showToast('Enter a valid amount', 'error');
      return;
    }

    try {
      const response = await fetch('/api/admin/wallet/set-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: amount })
      });

      const data = await response.json();
      if (data.success) {
        setWalletBalance(data.balance);
        setDevBalanceInput('');
        showToast(`Balance set to $${amount.toFixed(2)}`, 'success');
      } else {
        showToast(data.error || 'Failed to set balance', 'error');
      }
    } catch (error) {
      console.error('Failed to set balance:', error);
      showToast('Failed to set balance', 'error');
    }
  };

  const addFunds = async (amount: number) => {
    setAddingFunds(true);
    try {
      const response = await fetch('/api/admin/wallet/add-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      const data = await response.json();

      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout');
      }
    } catch (error: any) {
      console.error('Add funds error:', error);
      showToast(error.message || 'Failed to add funds', 'error');
      setAddingFunds(false);
    }
  };

  const fetchImages = async () => {
    setLoading(true);
    try {
      // Add cache-busting parameter
      const response = await fetch(`/api/admin/import-library?_t=${Date.now()}`);
      const data = await response.json();
      // Show both images and videos
      setFiles(data.files || []);
    } catch (error) {
      console.error('Failed to fetch media:', error);
      showToast('Failed to load media', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        failCount++;
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/admin/studio/upload', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          successCount++;
        } else {
          failCount++;
          console.error('Upload failed:', data.error);
        }
      } catch (error) {
        failCount++;
        console.error('Upload error:', error);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setUploading(false);

    if (successCount > 0) {
      showToast(`${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully!`, 'success');
      fetchImages(); // Refresh the gallery
    }
    if (failCount > 0) {
      showToast(`${failCount} file${failCount > 1 ? 's' : ''} failed to upload`, 'error');
    }
  };

  const selectImage = (file: any) => {
    setSelectedFile(file);
    setEditedImageUrl(null);
    setActivePreset(null);
  };

  const applyPreset = async (preset: typeof lightingPresets[0] | typeof relightPresets[0]) => {
    if (!selectedFile) return;

    // Use different cost for v4 vs v4.5
    const cost = preset.model === 'v4' ? SEEDREAM_V4_COST : SEEDREAM_COST;

    // Check wallet balance before making API call
    if (walletBalance < cost) {
      showToast(`Insufficient balance. You need $${cost.toFixed(2)} for this edit.`, 'error');
      setWalletModalOpen(true);
      return;
    }

    setProcessing(true);
    setActivePreset(preset.id);
    setEditedImageUrl(null);

    try {
      const response = await fetch('/api/admin/studio/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: selectedFile.url,
          prompt: preset.prompt,
          model: preset.model || 'v4.5'
        })
      });

      const data = await response.json();

      if (data.success && data.editedImageUrl) {
        setEditedImageUrl(data.editedImageUrl);

        // Deduct from wallet after successful generation
        const deductResponse = await fetch('/api/admin/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: cost,
            description: `${preset.model === 'v4' ? 'Relight' : 'Lighting'}: ${preset.name}`
          })
        });
        const deductData = await deductResponse.json();
        if (deductData.success) {
          setWalletBalance(deductData.balance);
        }

        showToast('Photo enhanced successfully!', 'success');
      } else {
        throw new Error(data.error || 'Failed to process image');
      }
    } catch (error: any) {
      console.error('Error processing image:', error);
      showToast(error.message || 'Failed to process image', 'error');
      setActivePreset(null);
    } finally {
      setProcessing(false);
    }
  };

  // Apply Nano Banana Pro edit preset
  const applyEditPreset = async (preset: typeof editPresets[0]) => {
    if (!selectedFile) return;

    // Check wallet balance before making API call
    if (walletBalance < NANO_BANANA_COST) {
      showToast(`Insufficient balance. You need $${NANO_BANANA_COST.toFixed(2)} for this edit.`, 'error');
      setWalletModalOpen(true);
      return;
    }

    setProcessing(true);
    setActivePreset(preset.id);
    setEditedImageUrl(null);

    try {
      const response = await fetch('/api/admin/studio/nano-banana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: selectedFile.url,
          prompt: preset.prompt
        })
      });

      const data = await response.json();

      if (data.success && data.editedImageUrl) {
        setEditedImageUrl(data.editedImageUrl);

        // Deduct from wallet after successful generation
        const deductResponse = await fetch('/api/admin/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: NANO_BANANA_COST,
            description: `Edit: ${preset.name}`
          })
        });
        const deductData = await deductResponse.json();
        if (deductData.success) {
          setWalletBalance(deductData.balance);
        }

        showToast('Photo edited successfully!', 'success');
      } else {
        throw new Error(data.error || 'Failed to process image');
      }
    } catch (error: any) {
      console.error('Error processing image:', error);
      showToast(error.message || 'Failed to process image', 'error');
      setActivePreset(null);
    } finally {
      setProcessing(false);
    }
  };

  const downloadImage = async () => {
    if (!editedImageUrl) return;

    try {
      const response = await fetch(editedImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited-cake-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('Image downloaded!', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download image', 'error');
    }
  };

  const saveToLibrary = async () => {
    if (!editedImageUrl) return;

    setSavingToLibrary(true);

    try {
      const response = await fetch('/api/admin/studio/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: editedImageUrl })
      });

      const data = await response.json();

      if (data.success) {
        showToast('Saved to library!', 'success');
        // Add the new image to the files list
        setFiles(prev => [{
          url: data.url,
          name: data.url.split('/').pop(),
          type: 'image',
          date: new Date().toISOString()
        }, ...prev]);
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (error: any) {
      console.error('Save error:', error);
      showToast(error.message || 'Failed to save to library', 'error');
    } finally {
      setSavingToLibrary(false);
    }
  };

  const goBack = () => {
    setSelectedFile(null);
    setEditedImageUrl(null);
    setActivePreset(null);
    setCustomPromptOpen(false);
    setCustomPrompt('');
  };

  // Handle custom prompt submission (Nano Banana Pro)
  const handleCustomPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !customPrompt.trim()) return;

    // Check wallet balance before making API call
    if (walletBalance < NANO_BANANA_COST) {
      showToast(`Insufficient balance. You need $${NANO_BANANA_COST.toFixed(2)} for this edit.`, 'error');
      setWalletModalOpen(true);
      return;
    }

    setProcessing(true);
    setActivePreset('custom');
    setEditedImageUrl(null);
    setCustomPromptOpen(false);

    try {
      const response = await fetch('/api/admin/studio/nano-banana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: selectedFile.url,
          prompt: customPrompt.trim()
        })
      });

      const data = await response.json();

      if (data.success && data.editedImageUrl) {
        setEditedImageUrl(data.editedImageUrl);

        // Deduct from wallet after successful generation
        const deductResponse = await fetch('/api/admin/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: NANO_BANANA_COST,
            description: 'Custom edit'
          })
        });
        const deductData = await deductResponse.json();
        if (deductData.success) {
          setWalletBalance(deductData.balance);
        }

        showToast('Photo edited successfully!', 'success');
      } else {
        throw new Error(data.error || 'Failed to process image');
      }
    } catch (error: any) {
      console.error('Error processing image:', error);
      showToast(error.message || 'Failed to process image', 'error');
      setActivePreset(null);
    } finally {
      setProcessing(false);
      setCustomPrompt('');
    }
  };

  const toggleCustomPrompt = () => {
    setCustomPromptOpen(!customPromptOpen);
    if (!customPromptOpen) {
      setTimeout(() => customPromptInputRef.current?.focus(), 300);
    }
  };

  // Use the enhanced image as the new original for further editing
  const useAsOriginal = () => {
    if (!editedImageUrl) return;
    setSelectedFile({
      url: editedImageUrl,
      name: 'edited-image',
      type: 'image'
    });
    setEditedImageUrl(null);
    setActivePreset(null);
    showToast('Ready for more edits!', 'info');
  };

  // Download a single file from gallery
  const downloadGalleryImage = async (fileUrl: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening editor

    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = fileUrl.split('/').pop() || `cake-${Date.now()}.png`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('Image downloaded!', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download image', 'error');
    }
  };

  const deleteFile = async (fileUrl: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening editor

    if (!confirm('Delete this photo? This cannot be undone.')) return;

    setDeletingFile(fileUrl);

    try {
      const response = await fetch('/api/admin/studio/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl })
      });

      const data = await response.json();

      if (data.success) {
        setFiles(files.filter(f => f.url !== fileUrl));
        showToast('Photo deleted', 'success');
      } else {
        throw new Error(data.error || 'Failed to delete');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      showToast(error.message || 'Failed to delete photo', 'error');
    } finally {
      setDeletingFile(null);
    }
  };

  // Toggle image selection for product creation
  const toggleImageSelection = (fileUrl: string) => {
    setSelectedForProduct(prev =>
      prev.includes(fileUrl)
        ? prev.filter(url => url !== fileUrl)
        : [...prev, fileUrl]
    );
  };

  // Delete multiple selected files
  const deleteMultipleFiles = async () => {
    if (selectedForProduct.length === 0) return;

    if (!confirm(`Delete ${selectedForProduct.length} selected file${selectedForProduct.length > 1 ? 's' : ''}? This cannot be undone.`)) return;

    setDeletingMultiple(true);
    let successCount = 0;
    let failCount = 0;

    for (const fileUrl of selectedForProduct) {
      try {
        const response = await fetch('/api/admin/studio/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl })
        });

        const data = await response.json();
        if (data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    // Remove deleted files from state
    setFiles(prev => prev.filter(f => !selectedForProduct.includes(f.url) || failCount > 0));
    setSelectedForProduct([]);
    setDeletingMultiple(false);

    if (successCount > 0) {
      showToast(`${successCount} file${successCount > 1 ? 's' : ''} deleted`, 'success');
      fetchImages(); // Refresh to get accurate state
    }
    if (failCount > 0) {
      showToast(`${failCount} file${failCount > 1 ? 's' : ''} failed to delete`, 'error');
    }
  };

  // Open file viewer
  const openViewer = (file: any) => {
    setViewingFile(file);
  };

  // Close file viewer
  const closeViewer = () => {
    setViewingFile(null);
  };

  // Open editor from viewer
  const openEditorFromViewer = () => {
    if (viewingFile) {
      setSelectedFile(viewingFile);
      setViewingFile(null);
    }
  };

  // Delete file from viewer
  const deleteFromViewer = async () => {
    if (!viewingFile) return;

    if (!confirm('Delete this file? This cannot be undone.')) return;

    setDeletingFile(viewingFile.url);

    try {
      const response = await fetch('/api/admin/studio/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: viewingFile.url })
      });

      const data = await response.json();

      if (data.success) {
        setFiles(files.filter(f => f.url !== viewingFile.url));
        showToast('File deleted', 'success');
        closeViewer();
      } else {
        throw new Error(data.error || 'Failed to delete');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      showToast(error.message || 'Failed to delete file', 'error');
    } finally {
      setDeletingFile(null);
    }
  };

  // Download file from viewer
  const downloadFromViewer = async () => {
    if (!viewingFile) return;

    try {
      const response = await fetch(viewingFile.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = viewingFile.name || viewingFile.url.split('/').pop() || `file-${Date.now()}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('File downloaded!', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download file', 'error');
    }
  };

  // Create product from selected images
  const createProductFromSelection = () => {
    if (selectedForProduct.length === 0) return;

    // Convert selected URLs to media format expected by ProductForm
    const mediaItems = selectedForProduct.map(url => ({
      url,
      type: 'image' as const,
      publicId: url.split('/').pop() || ''
    }));

    // Set the import library media and navigate to manage products
    setImportLibraryMedia(mediaItems);
    setSelectMode(false);
    setSelectedForProduct([]);
    changeTab('manage-products');
    showToast(`${mediaItems.length} photo${mediaItems.length > 1 ? 's' : ''} ready for new product!`, 'success');
  };

  // Editor View - when an image is selected
  if (selectedFile) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-white/70 hover:text-white transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Gallery
          </button>
          <h2 className="text-xl font-bold text-white">Photo Studio</h2>
          <button
            onClick={() => setWalletModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-white/10 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
              <rect width="20" height="14" x="2" y="5" rx="2"/>
              <line x1="2" x2="22" y1="10" y2="10"/>
            </svg>
            <span className="text-emerald-400 font-semibold">${walletBalance.toFixed(2)}</span>
          </button>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Image */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white/60">Original</h3>
            <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-white/10">
              <img
                src={selectedFile.url}
                alt="Original"
                className="w-full h-full object-contain"
              />

              {/* Custom Prompt Input - Bottom */}
              <div className="absolute bottom-3 left-3 right-3">
                {customPromptOpen ? (
                  <form onSubmit={handleCustomPrompt} className="flex gap-2">
                    <input
                      ref={customPromptInputRef}
                      type="text"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Describe what you want to change..."
                      disabled={processing}
                      className="flex-1 h-11 bg-black/90 backdrop-blur text-white text-sm rounded-lg border border-violet-500 px-4 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={processing || !customPrompt.trim()}
                      className="px-4 h-11 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition"
                    >
                      Go
                    </button>
                    <button
                      type="button"
                      onClick={toggleCustomPrompt}
                      className="px-3 h-11 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={toggleCustomPrompt}
                    disabled={processing}
                    className="w-full h-11 bg-black/80 backdrop-blur hover:bg-black/90 border border-white/20 hover:border-violet-500 rounded-lg text-white text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Custom AI Edit
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Edited/Preview Image */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white/60">
              {processing ? 'Processing...' : editedImageUrl ? 'Enhanced' : 'Preview'}
            </h3>
            <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-white/10">
              {processing ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
                  <p className="text-white/60 text-sm">Enhancing your photo...</p>
                  <p className="text-white/40 text-xs">This may take 15-30 seconds</p>
                </div>
              ) : editedImageUrl ? (
                <>
                  <img
                    src={editedImageUrl}
                    alt="Enhanced"
                    className="w-full h-full object-contain"
                  />
                  {/* Edit Further Button - Top Right */}
                  <button
                    onClick={useAsOriginal}
                    className="absolute top-3 right-3 px-3 py-2 bg-black/80 backdrop-blur rounded-lg border border-white/20 hover:border-pink-500 hover:bg-black/90 transition-all flex items-center gap-2 text-white text-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                    </svg>
                    Edit More
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-white/40 text-sm">Select a preset below</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lighting Presets - Seedream */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white/60 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
              Lighting
            </h3>
            <span className="text-xs text-white/40">Cost per image ~ $0.10</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {lightingPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                disabled={processing}
                className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                  activePreset === preset.id
                    ? 'bg-amber-500 text-white ring-2 ring-amber-400 ring-offset-1 ring-offset-zinc-900'
                    : 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/10'
                } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Relight Presets - Seedream v4 */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white/60 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"/>
                <circle cx="12" cy="12" r="4"/>
              </svg>
              Relight
            </h3>
            <span className="text-xs text-white/40">Cost per image ~ $0.08</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {relightPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                disabled={processing}
                className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                  activePreset === preset.id
                    ? 'bg-cyan-500 text-white ring-2 ring-cyan-400 ring-offset-1 ring-offset-zinc-900'
                    : 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/10'
                } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Edit Presets - Nano Banana Pro */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white/60 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
              </svg>
              Edit
            </h3>
            <span className="text-xs text-white/40">Cost per image ~ $0.25</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {editPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyEditPreset(preset)}
                disabled={processing}
                className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                  activePreset === preset.id
                    ? 'bg-violet-500 text-white ring-2 ring-violet-400 ring-offset-1 ring-offset-zinc-900'
                    : 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/10'
                } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        {editedImageUrl && !processing && (
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={saveToLibrary}
              disabled={savingToLibrary}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
            >
              {savingToLibrary ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Save to Library
                </>
              )}
            </button>
            <button
              onClick={downloadImage}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </button>
          </div>
        )}
      </div>
    );
  }

  // Gallery View - when no image is selected
  return (
    <>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*,video/*"
        multiple
        className="hidden"
      />

      {/* Wallet Modal */}
      {walletModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Add Funds</h3>
              <button
                onClick={() => setWalletModalOpen(false)}
                className="text-white/60 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="text-center mb-6">
              <p className="text-white/60 text-sm">Current Balance</p>
              <p className="text-3xl font-bold text-white">${walletBalance.toFixed(2)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[5, 10, 25, 50].map((amount) => (
                <button
                  key={amount}
                  onClick={() => addFunds(amount)}
                  disabled={addingFunds}
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500 rounded-xl text-white font-medium transition-all disabled:opacity-50"
                >
                  ${amount}
                </button>
              ))}
            </div>

            <p className="text-white/40 text-xs text-center mt-4">
              Secure payment via Stripe
            </p>

            {/* Dev Controls - Only visible to dev users */}
            {isDevUser && (
              <div className="mt-6 pt-4 border-t border-yellow-500/30">
                <p className="text-yellow-500 text-xs font-medium mb-3 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v4M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                  </svg>
                  DEV MODE
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={devBalanceInput}
                    onChange={(e) => setDevBalanceInput(e.target.value)}
                    placeholder="Set balance..."
                    className="flex-1 px-3 py-2 bg-black/50 border border-yellow-500/30 rounded-lg text-white text-sm outline-none focus:border-yellow-500"
                  />
                  <button
                    onClick={setDevBalance}
                    className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg text-yellow-500 text-sm font-medium transition"
                  >
                    Set
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => { setDevBalanceInput('0'); }}
                    className="flex-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs transition"
                  >
                    $0
                  </button>
                  <button
                    onClick={() => { setDevBalanceInput('1'); }}
                    className="flex-1 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs transition"
                  >
                    $1
                  </button>
                  <button
                    onClick={() => { setDevBalanceInput('10'); }}
                    className="flex-1 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-xs transition"
                  >
                    $10
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {viewingFile && (
        <div
          className="fixed inset-0 bg-black z-[100] flex flex-col"
          onClick={closeViewer}
        >
          {/* Close Button - Top Right */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={closeViewer}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Media Display - Centered */}
          <div
            className="flex-1 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {viewingFile.type === 'video' ? (
              <video
                src={viewingFile.url}
                className="max-w-full max-h-full object-contain rounded-lg"
                controls
                autoPlay
                playsInline
              />
            ) : (
              <img
                src={viewingFile.url}
                alt={viewingFile.name}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
          </div>

          {/* Action Buttons - Bottom */}
          <div
            className="p-4 pb-6 bg-gradient-to-t from-black/80 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {/* Edit Button - Only for images */}
              {viewingFile.type !== 'video' && (
                <button
                  onClick={openEditorFromViewer}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-medium transition-colors text-sm sm:text-base"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                  </svg>
                  <span className="hidden sm:inline">Edit with AI</span>
                  <span className="sm:hidden">Edit</span>
                </button>
              )}

              {/* Download Button */}
              <button
                onClick={downloadFromViewer}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors text-sm sm:text-base"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download
              </button>

              {/* Delete Button */}
              <button
                onClick={deleteFromViewer}
                disabled={deletingFile === viewingFile.url}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-xl font-medium transition-colors text-sm sm:text-base"
              >
                {deletingFile === viewingFile.url ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  </svg>
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Media Library ({files.length} {files.length === 1 ? 'file' : 'files'})
          </h2>
          <p className="text-white/60 text-sm mt-1">
            {selectMode
              ? `${selectedForProduct.length} selected - click photos to select for product`
              : 'Upload, edit, and manage your cake photos'
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Action Buttons - Show when items selected */}
          {selectMode && selectedForProduct.length > 0 && (
            <>
              <button
                onClick={createProductFromSelection}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Create Product ({selectedForProduct.length})
              </button>
              <button
                onClick={deleteMultipleFiles}
                disabled={deletingMultiple}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-xl font-medium transition-colors"
              >
                {deletingMultiple ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                    Delete ({selectedForProduct.length})
                  </>
                )}
              </button>
            </>
          )}

          {/* Select Mode Toggle */}
          <button
            onClick={() => {
              setSelectMode(!selectMode);
              if (selectMode) setSelectedForProduct([]);
            }}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl font-medium transition-colors ${
              selectMode
                ? 'bg-violet-500 border-violet-500 text-white'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            {selectMode ? 'Cancel' : 'Select'}
          </button>

          {/* Wallet Balance Button */}
          <button
            onClick={() => setWalletModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M22 10H2"/>
            </svg>
            <span className="text-emerald-400 font-bold">${walletBalance.toFixed(2)}</span>
          </button>

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-500/50 text-white rounded-xl font-medium transition-colors"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Uploading...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/40 text-lg">
              No photos found
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {files.map((file) => {
              const isSelected = selectedForProduct.includes(file.url);
              return (
                <div
                  key={file.url}
                  onClick={() => selectMode ? toggleImageSelection(file.url) : openViewer(file)}
                  className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] group ${
                    deletingFile === file.url ? 'opacity-50 pointer-events-none' : ''
                  } ${isSelected ? 'ring-3 ring-emerald-500' : 'hover:ring-2 hover:ring-pink-500'}`}
                >
                  {file.type === 'video' ? (
                    <>
                      <video
                        src={file.url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      {/* Video Play Icon Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  )}

                  {/* Selection Checkbox - Top Left (only in select mode) */}
                  {selectMode && (
                    <div className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center transition-all z-10 ${
                      isSelected
                        ? 'bg-emerald-500'
                        : 'bg-black/50 border-2 border-white/50'
                    }`}>
                      {isSelected && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                  )}

                  {/* Action Buttons - Top Right (hidden in select mode) */}
                  {!selectMode && (
                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      {/* Download Button */}
                      <button
                        onClick={(e) => downloadGalleryImage(file.url, e)}
                        className="w-7 h-7 bg-blue-500/90 hover:bg-blue-600 rounded-full flex items-center justify-center"
                        title="Download"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                      {/* Delete Button */}
                      <button
                        onClick={(e) => deleteFile(file.url, e)}
                        className="w-7 h-7 bg-red-500/90 hover:bg-red-600 rounded-full flex items-center justify-center"
                        title="Delete"
                      >
                        {deletingFile === file.url ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Hover Overlay - Only show in select mode */}
                  {selectMode && (
                    <div className={`absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none ${
                      isSelected ? 'opacity-30' : ''
                    }`}>
                      <div className="text-white text-sm font-medium">
                        {isSelected ? 'Selected' : 'Click to select'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function ProductForm({ product, onClose, onSuccess, preselectedMedia, showToast }: {
  product: any | null;
  onClose: () => void;
  onSuccess: () => void;
  preselectedMedia?: any[];
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    category: product?.category || 'specialty',
    productType: product?.productType || 'signature',
    shape: product?.shape || 'circle',
    tagline: product?.tagline || '',
    description: product?.description || '',
    detailed_description: product?.detailed_description || '',
    allowEditablePhoto: product?.allowEditablePhoto || false,
  });

  const [sizes, setSizes] = useState(product?.sizes || [
    { size: '6"', price: 150, servings: '8-12 people' },
    { size: '8"', price: 180, servings: '12-20 people' }
  ]);
  const [media, setMedia] = useState<any[]>(product?.media || preselectedMedia || []);
  const [colorVariants, setColorVariants] = useState<Array<{
    color: string;
    name: string;
    media: Array<{ url: string; type: 'image' | 'video' }>;
  }>>(product?.colorVariants || []);
  const [designVariants, setDesignVariants] = useState<Array<{
    name: string;
    media: Array<{ url: string; type: 'image' | 'video' }>;
  }>>(product?.designVariants || []);

  // Per-product option controls
  // For signature cakes, default showAddOnsSection to false (unless explicitly set)
  const getDefaultShowAddOns = () => {
    if (product?.showAddOnsSection !== undefined) return product.showAddOnsSection;
    // For new products or products without explicit setting, default based on product type
    return product?.productType === 'signature' ? false : true;
  };
  const [availableFlavors, setAvailableFlavors] = useState<string[] | null>(product?.availableFlavors ?? null);
  const [availableFillings, setAvailableFillings] = useState<string[] | null>(product?.availableFillings ?? null);
  const [availableAddOns, setAvailableAddOns] = useState<string[] | null>(product?.availableAddOns ?? null);
  const [showFlavorSection, setShowFlavorSection] = useState(product?.showFlavorSection ?? true);
  const [showFillingSection, setShowFillingSection] = useState(product?.showFillingSection ?? true);
  const [showAddOnsSection, setShowAddOnsSection] = useState(getDefaultShowAddOns());
  const [showShapeSection, setShowShapeSection] = useState(product?.showShapeSection ?? true);
  const [availableShapes, setAvailableShapes] = useState<('heart' | 'circle')[] | null>(product?.availableShapes ?? null);

  // Global options from database (for selection UI)
  const [globalFlavors, setGlobalFlavors] = useState<any[]>([]);
  const [globalFillings, setGlobalFillings] = useState<any[]>([]);
  const [globalAddOns, setGlobalAddOns] = useState<any[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [repositioningImage, setRepositioningImage] = useState<{ index: number; url: string; cropData?: any } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Sync state with product prop when it changes
  useEffect(() => {
    if (product) {
      console.log('📥 Product prop changed, resetting form state with:', product);
      console.log('📥 Product sizes:', product.sizes);
      setFormData({
        name: product.name || '',
        category: product.category || 'specialty',
        productType: product.productType || 'signature',
        shape: product.shape || 'circle',
        tagline: product.tagline || '',
        description: product.description || '',
        detailed_description: product.detailed_description || '',
        allowEditablePhoto: product.allowEditablePhoto || false,
      });
      setSizes(product.sizes || [
        { size: '6"', price: 150, servings: '8-12 people' },
        { size: '8"', price: 180, servings: '12-20 people' }
      ]);
      setMedia(product.media || []);
      setColorVariants(product.colorVariants || []);
      setDesignVariants(product.designVariants || []);
      // Sync option controls
      setAvailableFlavors(product.availableFlavors ?? null);
      setAvailableFillings(product.availableFillings ?? null);
      setAvailableAddOns(product.availableAddOns ?? null);
      setShowFlavorSection(product.showFlavorSection ?? true);
      setShowFillingSection(product.showFillingSection ?? true);
      // For signature cakes, default add-ons to disabled unless explicitly enabled
      const showAddOns = product.showAddOnsSection !== undefined
        ? product.showAddOnsSection
        : (product.productType === 'signature' ? false : true);
      setShowAddOnsSection(showAddOns);
      // Sync shape controls
      setShowShapeSection(product.showShapeSection ?? true);
      setAvailableShapes(product.availableShapes ?? null);
    }
  }, [product]);

  // Fetch global options for selection UI
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await fetch('/api/options');
        const data = await response.json();
        if (data.flavors) setGlobalFlavors(data.flavors);
        if (data.fillings) setGlobalFillings(data.fillings);
        if (data.addons) setGlobalAddOns(data.addons);
      } catch (error) {
        console.error('Failed to fetch options:', error);
      } finally {
        setOptionsLoading(false);
      }
    };
    fetchOptions();
  }, []);

  // For NEW products only: when product type changes to 'signature', disable add-ons by default
  useEffect(() => {
    if (!product && formData.productType === 'signature') {
      setShowAddOnsSection(false);
    } else if (!product && formData.productType === 'custom') {
      setShowAddOnsSection(true);
    }
  }, [formData.productType, product]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        let fileToUpload = file;

        // Compress images before uploading (skip videos)
        if (file.type.startsWith('image/')) {
          try {
            const options = {
              maxSizeMB: 1, // Maximum file size in MB
              maxWidthOrHeight: 2000, // Max dimension (maintains aspect ratio)
              useWebWorker: true, // Use web worker for better performance
            };

            const compressedFile = await imageCompression(file, options);
            console.log(`Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

            // Use the compressed file (it should have the correct name already)
            fileToUpload = compressedFile;
          } catch (compressionError) {
            console.error('Image compression failed, uploading original:', compressionError);
            // If compression fails, upload original file
            fileToUpload = file;
          }
        }

        const formDataToUpload = new FormData();
        formDataToUpload.append('file', fileToUpload);
        formDataToUpload.append('productName', formData.name || 'unnamed-product');

        const response = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formDataToUpload
        });

        const data = await response.json();

        if (!response.ok || !data.url) {
          console.error('Upload failed for file:', file.name, 'Response:', data);
          throw new Error(data.error || `Failed to upload ${file.name}`);
        }

        return {
          url: data.url,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          order: media.length,
          isThumbnail: media.length === 0
        };
      });

      const uploadedMedia = await Promise.all(uploadPromises);
      setMedia([...media, ...uploadedMedia]);
    } catch (error) {
      console.error('Upload failed:', error);
      showToast(error instanceof Error ? error.message : 'Failed to upload files', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the actual drop zone, not child elements
    if (e.currentTarget === e.target) {
      setIsDraggingOver(false);
    }
  };

  const handleDragOverUpload = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Set to true while dragging over (this runs continuously)
    if (!isDraggingOver) {
      setIsDraggingOver(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (uploading) return;

    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const payload = {
        ...formData,
        slug,
        sizes,
        media,
        colorVariants,
        designVariants,
        // Per-product option controls
        availableFlavors,
        availableFillings,
        availableAddOns,
        showFlavorSection,
        showFillingSection,
        showAddOnsSection,
        showShapeSection,
        availableShapes
      };

      console.log('🔍 Submitting product update with payload:', JSON.stringify(payload, null, 2));
      console.log('🔍 Sizes being saved:', sizes);

      const url = product
        ? `/api/admin/products/${product._id}`
        : '/api/admin/products';

      const response = await fetch(url, {
        method: product ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      console.log('🔍 Server response:', responseData);

      if (response.ok) {
        console.log('✅ Product saved successfully');
        onSuccess();
      } else {
        console.error('❌ Failed to save:', responseData);
        showToast(responseData.error || 'Failed to save product', 'error');
      }
    } catch (error) {
      console.error('❌ Save failed with error:', error);
      showToast('Failed to save product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addSize = () => {
    setSizes([...sizes, { size: '', price: 0, servings: '' }]);
  };

  const removeSize = (index: number) => {
    setSizes(sizes.filter((_: any, i: number) => i !== index));
  };

  const updateSize = (index: number, field: string, value: any) => {
    const newSizes = [...sizes];
    newSizes[index] = { ...newSizes[index], [field]: value };
    console.log('🔄 updateSize called:', { index, field, value });
    console.log('🔄 Current sizes before update:', sizes);
    console.log('🔄 New sizes after update:', newSizes);
    setSizes(newSizes);
  };

  // Color variant helpers
  const addColorVariant = () => {
    setColorVariants([...colorVariants, { color: '#FF69B4', name: '', media: [] }]);
  };

  const removeColorVariant = (index: number) => {
    setColorVariants(colorVariants.filter((_, i) => i !== index));
  };

  const updateColorVariant = (index: number, field: string, value: any) => {
    const newVariants = [...colorVariants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setColorVariants(newVariants);
  };

  const toggleMediaForColor = (colorIndex: number, mediaUrl: string, mediaType: 'image' | 'video') => {
    const newVariants = [...colorVariants];
    const variant = newVariants[colorIndex];
    const existingIndex = variant.media.findIndex(m => m.url === mediaUrl);

    if (existingIndex >= 0) {
      // Remove if already selected
      variant.media = variant.media.filter(m => m.url !== mediaUrl);
    } else {
      // Add if not selected
      variant.media.push({ url: mediaUrl, type: mediaType });
    }

    setColorVariants(newVariants);
  };

  // Design variant helpers
  const addDesignVariant = () => {
    setDesignVariants([...designVariants, { name: '', media: [] }]);
  };

  const removeDesignVariant = (index: number) => {
    setDesignVariants(designVariants.filter((_, i) => i !== index));
  };

  const updateDesignVariant = (index: number, field: string, value: any) => {
    const newVariants = [...designVariants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setDesignVariants(newVariants);
  };

  const toggleMediaForDesign = (designIndex: number, mediaUrl: string, mediaType: 'image' | 'video') => {
    const newVariants = [...designVariants];
    const variant = newVariants[designIndex];
    const existingIndex = variant.media.findIndex(m => m.url === mediaUrl);

    if (existingIndex >= 0) {
      // Remove if already selected
      variant.media = variant.media.filter(m => m.url !== mediaUrl);
    } else {
      // Add if not selected
      variant.media.push({ url: mediaUrl, type: mediaType });
    }

    setDesignVariants(newVariants);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === index) return;

    const newMedia = [...media];
    const draggedItem = newMedia[draggedIndex];

    // Remove from old position
    newMedia.splice(draggedIndex, 1);
    // Insert at new position
    newMedia.splice(index, 0, draggedItem);

    // Update thumbnail flags - first item is always thumbnail
    const updatedMedia = newMedia.map((item, idx) => ({
      ...item,
      order: idx,
      isThumbnail: idx === 0
    }));

    setMedia(updatedMedia);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          {product ? 'Edit Cake' : 'Add New Cake'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Media Upload */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Photos & Videos</h3>

          <div className="mb-4">
            <label
              className={`block w-full px-6 py-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDraggingOver
                ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                : 'border-gray-300 dark:border-zinc-700 hover:border-pink-500'
                }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOverUpload}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                disabled={uploading}
              />
              <div className="text-gray-600 dark:text-gray-400 pointer-events-none">
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-500"></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <p>{isDraggingOver ? 'Drop files here' : 'Click to upload or drag and drop photos or videos'}</p>
                  </>
                )}
              </div>
            </label>
          </div>

          {media.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {media.map((item, index) => (
                <div
                  key={index}
                  className="relative group cursor-move"
                  draggable="true"
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  {item.type === 'image' ? (
                    <CroppedImage
                      src={item.url}
                      alt=""
                      cropData={item.cropData}
                      className="w-full aspect-square object-cover rounded-lg border border-gray-300 dark:border-zinc-700"
                    />
                  ) : (
                    <video
                      src={item.url}
                      muted
                      playsInline
                      className="w-full aspect-square object-cover rounded-lg border border-gray-300 dark:border-zinc-700"
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => {
                        e.currentTarget.pause();
                        e.currentTarget.currentTime = 0;
                      }}
                    />
                  )}
                  {item.isThumbnail && (
                    <div className="absolute top-2 left-2 bg-pink-500 text-white px-2 py-1 rounded text-xs font-bold">
                      THUMBNAIL
                    </div>
                  )}

                  {/* Action buttons overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    {item.type === 'image' && (
                      <button
                        type="button"
                        onClick={() => setRepositioningImage({ index, url: item.url, cropData: item.cropData })}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        Reposition
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMedia(media.filter((_, i) => i !== index))}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            The first image/video will be used as the thumbnail. Drag to reorder.
          </p>
        </div>

        {/* Basic Info */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
                placeholder="e.g., Smashing Pumpkins"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
              >
                <option value="specialty">Specialty</option>
                <option value="custom">Custom</option>
                <option value="circle">Circle</option>
                <option value="heart">Heart</option>
                <option value="mini">Mini</option>
                <option value="lunchbox">Lunchbox</option>
                <option value="chrome">Chrome</option>
                <option value="cupcakes">Cupcakes</option>
                <option value="bento">Bento</option>
                <option value="tier">Tier</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Type *
              </label>
              <select
                required
                value={formData.productType}
                onChange={(e) => setFormData({ ...formData, productType: e.target.value, allowEditablePhoto: false })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
              >
                <option value="signature">Signature (Fixed Design)</option>
                <option value="custom">Custom (Customizable)</option>
              </select>

              {/* Allow Edible Photo - Only for Signature cakes */}
              {formData.productType === 'signature' && (
                <label className="flex items-center gap-3 mt-3 p-3 bg-pink-50 dark:bg-pink-500/10 rounded-lg cursor-pointer hover:bg-pink-100 dark:hover:bg-pink-500/20 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.allowEditablePhoto}
                    onChange={(e) => setFormData({ ...formData, allowEditablePhoto: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Allow customers to change the edible photo
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Customers can upload their own photo to replace the edible image on this cake
                    </p>
                  </div>
                </label>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Shape
              </label>
              <select
                value={formData.shape}
                onChange={(e) => setFormData({ ...formData, shape: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
              >
                <option value="circle">Circle</option>
                <option value="heart">Heart</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sizes & Pricing */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Sizes & Pricing</h3>
            <button
              type="button"
              onClick={addSize}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 text-sm"
            >
              + Add Size
            </button>
          </div>

          <div className="space-y-3">
            {sizes.map((size: any, index: number) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
                <input
                  type="text"
                  placeholder='e.g., 6"'
                  value={size.size}
                  onChange={(e) => updateSize(index, 'size', e.target.value)}
                  className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none text-sm sm:text-base"
                />
                <div className="flex-1 relative">
                  <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm sm:text-base">$</span>
                  <input
                    type="number"
                    placeholder="Price"
                    value={size.price || ''}
                    onChange={(e) => updateSize(index, 'price', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    className="w-full pl-7 sm:pl-8 pr-3 sm:pr-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none text-sm sm:text-base"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Servings (optional)"
                  value={size.servings || ''}
                  onChange={(e) => updateSize(index, 'servings', e.target.value)}
                  className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none text-sm sm:text-base"
                />
                {sizes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSize(index)}
                    className="text-red-500 hover:text-red-700 self-center sm:self-auto py-2 sm:py-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Colors */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Fixed Colors</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add color options and assign photos to each color</p>
            </div>
            <button
              type="button"
              onClick={addColorVariant}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 text-sm"
            >
              + Add Color
            </button>
          </div>

          {colorVariants.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No color variants added. Click &quot;+ Add Color&quot; to create color options.</p>
          ) : (
            <div className="space-y-4">
              {colorVariants.map((variant, colorIndex) => (
                <div key={colorIndex} className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row gap-3 mb-3">
                    {/* Color picker */}
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={variant.color}
                        onChange={(e) => updateColorVariant(colorIndex, 'color', e.target.value)}
                        className="w-12 h-10 rounded cursor-pointer border border-gray-300 dark:border-zinc-600"
                      />
                      <div
                        className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: variant.color }}
                      />
                    </div>

                    {/* Color name input */}
                    <input
                      type="text"
                      placeholder="Color name (e.g., Pink, Blue)"
                      value={variant.name}
                      onChange={(e) => updateColorVariant(colorIndex, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none text-sm"
                    />

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => removeColorVariant(colorIndex)}
                      className="text-red-500 hover:text-red-700 px-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Media selection */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Select photos for this color ({variant.media.length} selected)
                    </label>
                    {media.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500">Upload photos above first, then assign them to colors here.</p>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {media.filter((m: any) => m.type === 'image').map((mediaItem: any, mediaIndex: number) => {
                          const isSelected = variant.media.some(m => m.url === mediaItem.url);
                          return (
                            <div
                              key={mediaIndex}
                              onClick={() => toggleMediaForColor(colorIndex, mediaItem.url, mediaItem.type)}
                              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                isSelected
                                  ? 'border-pink-500 ring-2 ring-pink-500/50'
                                  : 'border-transparent hover:border-gray-300 dark:hover:border-zinc-600'
                              }`}
                            >
                              <img
                                src={mediaItem.url}
                                alt=""
                                className="w-full aspect-square object-cover"
                              />
                              {isSelected && (
                                <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                                  <svg className="w-6 h-6 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Variants (Design Options) */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-4 sm:p-6">
          <div className="mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Product Variants</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Select photos that customers can choose from (e.g., different cake designs in a set)</p>
          </div>

          {media.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Upload photos above first, then select which ones are variant options.</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {media.filter((m: any) => m.type === 'image').map((mediaItem: any, mediaIndex: number) => {
                const isSelected = designVariants.some(v => v.media[0]?.url === mediaItem.url);
                return (
                  <div
                    key={mediaIndex}
                    onClick={() => {
                      if (isSelected) {
                        // Remove this variant
                        setDesignVariants(designVariants.filter(v => v.media[0]?.url !== mediaItem.url));
                      } else {
                        // Add as new variant
                        setDesignVariants([...designVariants, { name: '', media: [{ url: mediaItem.url, type: mediaItem.type }] }]);
                      }
                    }}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-pink-500 ring-2 ring-pink-500/50'
                        : 'border-transparent hover:border-gray-300 dark:hover:border-zinc-600'
                    }`}
                  >
                    <img
                      src={mediaItem.url}
                      alt=""
                      className="w-full aspect-square object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {designVariants.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">{designVariants.length} variant{designVariants.length !== 1 ? 's' : ''} selected</p>
          )}
        </div>

        {/* Available Options (Per-Product) */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-4 sm:p-6">
          <div className="mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Available Options</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Control which flavors, fillings, and add-ons customers can select for this product</p>
          </div>

          {optionsLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500 mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Flavors Section */}
              <div className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFlavorSection}
                      onChange={(e) => setShowFlavorSection(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Enable Flavor Selection</span>
                  </label>
                  {showFlavorSection && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAvailableFlavors(null)}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded text-gray-700 dark:text-gray-300"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvailableFlavors([])}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded text-gray-700 dark:text-gray-300"
                      >
                        None
                      </button>
                    </div>
                  )}
                </div>
                {showFlavorSection && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {globalFlavors.map((flavor) => {
                        const isSelected = availableFlavors === null || availableFlavors.includes(flavor.id);
                        return (
                          <label key={flavor.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-zinc-800">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (availableFlavors === null) return; // Already all selected
                                  setAvailableFlavors([...availableFlavors, flavor.id]);
                                } else {
                                  if (availableFlavors === null) {
                                    // Switch from "all" to explicit list minus this one
                                    setAvailableFlavors(globalFlavors.filter(f => f.id !== flavor.id).map(f => f.id));
                                  } else {
                                    setAvailableFlavors(availableFlavors.filter(id => id !== flavor.id));
                                  }
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{flavor.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {availableFlavors === null ? `All ${globalFlavors.length} flavors` : `${availableFlavors.length} of ${globalFlavors.length} flavors`} enabled
                    </p>
                  </>
                )}
              </div>

              {/* Fillings Section */}
              <div className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFillingSection}
                      onChange={(e) => setShowFillingSection(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Enable Filling Selection</span>
                  </label>
                  {showFillingSection && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAvailableFillings(null)}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded text-gray-700 dark:text-gray-300"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvailableFillings([])}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded text-gray-700 dark:text-gray-300"
                      >
                        None
                      </button>
                    </div>
                  )}
                </div>
                {showFillingSection && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {globalFillings.map((filling) => {
                        const isSelected = availableFillings === null || availableFillings.includes(filling.id);
                        return (
                          <label key={filling.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-zinc-800">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (availableFillings === null) return;
                                  setAvailableFillings([...availableFillings, filling.id]);
                                } else {
                                  if (availableFillings === null) {
                                    setAvailableFillings(globalFillings.filter(f => f.id !== filling.id).map(f => f.id));
                                  } else {
                                    setAvailableFillings(availableFillings.filter(id => id !== filling.id));
                                  }
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{filling.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {availableFillings === null ? `All ${globalFillings.length} fillings` : `${availableFillings.length} of ${globalFillings.length} fillings`} enabled
                    </p>
                  </>
                )}
              </div>

              {/* Add-ons Section */}
              <div className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAddOnsSection}
                      onChange={(e) => setShowAddOnsSection(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Enable Add-ons</span>
                  </label>
                  {showAddOnsSection && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAvailableAddOns(null)}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded text-gray-700 dark:text-gray-300"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvailableAddOns([])}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded text-gray-700 dark:text-gray-300"
                      >
                        None
                      </button>
                    </div>
                  )}
                </div>
                {showAddOnsSection && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {globalAddOns.map((addon) => {
                        const isSelected = availableAddOns === null || availableAddOns.includes(addon.id);
                        return (
                          <label key={addon.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-zinc-800">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (availableAddOns === null) return;
                                  setAvailableAddOns([...availableAddOns, addon.id]);
                                } else {
                                  if (availableAddOns === null) {
                                    setAvailableAddOns(globalAddOns.filter(a => a.id !== addon.id).map(a => a.id));
                                  } else {
                                    setAvailableAddOns(availableAddOns.filter(id => id !== addon.id));
                                  }
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{addon.name}</span>
                            {addon.price > 0 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">(${addon.price})</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {availableAddOns === null ? `All ${globalAddOns.length} add-ons` : `${availableAddOns.length} of ${globalAddOns.length} add-ons`} enabled
                    </p>
                  </>
                )}
              </div>

              {/* Shape Section */}
              <div className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showShapeSection}
                      onChange={(e) => setShowShapeSection(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Enable Shape Selection</span>
                  </label>
                  {showShapeSection && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAvailableShapes(null)}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded text-gray-700 dark:text-gray-300"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvailableShapes([])}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded text-gray-700 dark:text-gray-300"
                      >
                        None
                      </button>
                    </div>
                  )}
                </div>
                {showShapeSection && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {(['heart', 'circle'] as const).map((shape) => {
                        const isSelected = availableShapes === null || availableShapes.includes(shape);
                        return (
                          <label key={shape} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-zinc-800">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (availableShapes === null) return; // Already all selected
                                  setAvailableShapes([...availableShapes, shape]);
                                } else {
                                  if (availableShapes === null) {
                                    // Switch from "all" to explicit list minus this one
                                    setAvailableShapes(['heart', 'circle'].filter(s => s !== shape) as ('heart' | 'circle')[]);
                                  } else {
                                    setAvailableShapes(availableShapes.filter(s => s !== shape));
                                  }
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{shape}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {availableShapes === null ? 'All 2 shapes' : `${availableShapes.length} of 2 shapes`} enabled
                    </p>
                  </>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Disable this to hide the shape selection for cakes with a fixed shape
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Descriptions */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Descriptions</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tagline (Shows on /cakes page under title)
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
                placeholder="e.g., Festive pumpkin-themed cake perfect for fall"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
                placeholder="Will be displayed on the product page under the cake name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Detailed Description (For Kassy Ai)
              </label>
              <textarea
                value={formData.detailed_description}
                onChange={(e) => setFormData({ ...formData, detailed_description: e.target.value })}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
                placeholder="Detailed description for Kassy AI to understand the cake design, colors, themes, etc."
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sticky bottom-0 sm:static bg-white dark:bg-black sm:bg-transparent pt-4 pb-4 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 border-t sm:border-t-0 border-gray-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors font-medium text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full sm:flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {saving ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>

      {/* Image Repositioning Modal */}
      {repositioningImage && (
        <ImageRepositionModal
          imageUrl={repositioningImage.url}
          existingCropData={repositioningImage.cropData}
          onSave={(cropData) => {
            // Save crop data to the media item
            const newMedia = [...media];
            newMedia[repositioningImage.index] = {
              ...newMedia[repositioningImage.index],
              cropData
            };
            setMedia(newMedia);
            setRepositioningImage(null);
          }}
          onClose={() => setRepositioningImage(null)}
        />
      )}
    </div>
  );
}

// Image Reposition Modal Component
function ImageRepositionModal({ imageUrl, existingCropData, onSave, onClose }: {
  imageUrl: string;
  existingCropData?: { x: number; y: number; scale: number; canvasSize: number };
  onSave: (cropData: { x: number; y: number; scale: number; canvasSize: number }) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const canvasSize = 400;

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      console.log('Image loaded successfully:', imageUrl);
      setImage(img);
      const canvas = canvasRef.current;
      if (canvas) {
        // Calculate scale to fit image in canvas
        const scaleX = canvasSize / img.width;
        const scaleY = canvasSize / img.height;
        const fitScale = Math.min(scaleX, scaleY);

        setMinScale(fitScale);

        // Use existing crop data if available, otherwise start at fit scale
        if (existingCropData) {
          setScale(existingCropData.scale);
          setPosition({ x: existingCropData.x, y: existingCropData.y });
        } else {
          setScale(fitScale);
          setPosition({
            x: (canvasSize - img.width * fitScale) / 2,
            y: (canvasSize - img.height * fitScale) / 2
          });
        }
      }
      setLoading(false);
    };

    img.onerror = (error) => {
      console.error('Failed to load image:', imageUrl, error);
      setLoading(false);
    };

    img.src = imageUrl;
  }, [imageUrl, existingCropData, canvasSize]);

  // Helper function to draw the canvas
  const drawCanvas = useCallback((includeGridLines = true) => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw image with current position and scale
    ctx.drawImage(
      image,
      position.x,
      position.y,
      image.width * scale,
      image.height * scale
    );

    // Draw grid lines only if requested (for display, not for saving)
    if (includeGridLines) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      // Vertical center line
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      // Horizontal center line
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    }
  }, [image, position, scale]);

  // Draw canvas on every change
  useEffect(() => {
    drawCanvas(true);
  }, [drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    setDragStart({ x: canvasX - position.x, y: canvasY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    setPosition({
      x: canvasX - dragStart.x,
      y: canvasY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomChange = (newScale: number) => {
    if (!image) return;

    // Calculate the center point of the canvas
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;

    // Calculate where the center point currently is on the image
    const imgCenterX = (centerX - position.x) / scale;
    const imgCenterY = (centerY - position.y) / scale;

    // Calculate new position to keep the same center point
    const newX = centerX - imgCenterX * newScale;
    const newY = centerY - imgCenterY * newScale;

    setScale(newScale);
    setPosition({ x: newX, y: newY });
  };

  const handleSave = () => {
    // Save crop parameters instead of uploading a new image
    onSave({
      x: position.x,
      y: position.y,
      scale: scale,
      canvasSize: 400
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-2xl w-full p-4 my-auto max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3">
          Reposition Image
        </h2>

        <div className="flex flex-col gap-4">
          {/* Canvas */}
          <div className="flex justify-center relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Loading image...</p>
                </div>
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="border border-gray-300 dark:border-zinc-700 rounded-lg cursor-move max-w-full h-auto"
              style={{ width: '100%', maxWidth: '400px', height: 'auto', aspectRatio: '1/1' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          {/* Controls */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Zoom: {((scale / minScale) * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min={minScale}
                max={minScale * 3}
                step={minScale * 0.01}
                value={scale}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 text-sm"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Components
function StatCard({
  title,
  value,
  change,
  inverse = false,
  icon,
  variant = 'neutral',
  trendData,
}: {
  title: string;
  value: string;
  change: number;
  inverse?: boolean;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'neutral';
  trendData?: number[];
}) {
  const isPositive = inverse ? change < 0 : change > 0;

  // Chart options for sparkline
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false },
      y: { display: false, min: 0 },
    },
    elements: {
      point: { radius: 0 },
      line: { tension: 0.4, borderWidth: 2 },
    },
  };

  const chartData = {
    labels: trendData?.map((_, i) => i.toString()) || [],
    datasets: [
      {
        data: trendData || [],
        borderColor: 'rgba(255, 255, 255, 0.5)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        fill: true,
      },
    ],
  };

  return (
    <div className="border-gradient-inner rounded-2xl bg-zinc-900/50 p-4 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-9 w-9 rounded-full text-white flex items-center justify-center bg-gradient-to-r from-white/10 to-white/5">
            {typeof icon === 'string' ? <span className="text-base">{icon}</span> : icon}
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">{title}</p>
            <p className="text-lg font-semibold tracking-tight tabular-nums text-white">{value}</p>
          </div>
        </div>
        {change !== 0 && (
          <span className={`text-xs inline-flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isPositive ? (
                <path d="M7 17l5-5 5 5M7 7l5 5 5-5" />
              ) : (
                <path d="M7 7l5 5 5-5M7 17l5-5 5 5" />
              )}
            </svg>
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      {trendData && (
        <div className="h-8 mt-3 -mx-1">
          <Line data={chartData} options={chartOptions} />
        </div>
      )}
    </div>
  );
}

function TopPagesCard({ data }: { data: Array<{ page: string; views: number }> }) {
  const chartData = {
    labels: data.slice(0, 5).map(p => p.page.length > 20 ? p.page.substring(0, 20) + '...' : p.page),
    datasets: [
      {
        label: 'Page Views',
        data: data.slice(0, 5).map(p => p.views),
        backgroundColor: 'rgba(236, 72, 153, 0.9)',
        borderColor: 'rgba(236, 72, 153, 1)',
        borderWidth: 0,
        borderRadius: 6,
        barThickness: 32,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: 12,
        borderColor: 'rgba(236, 72, 153, 0.5)',
        borderWidth: 1,
        callbacks: {
          title: (items: any) => {
            const index = items[0].dataIndex;
            return data[index].page;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        border: {
          display: false,
        },
        ticks: {
          color: 'rgb(113, 113, 122)',
          font: {
            size: 11,
          },
        },
        grid: {
          color: 'rgba(113, 113, 122, 0.1)',
        },
      },
      x: {
        border: {
          display: false,
        },
        ticks: {
          color: 'rgb(113, 113, 122)',
          font: {
            size: 11,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="border-gradient-inner rounded-2xl bg-zinc-900/50 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Top Pages</h3>
      {data.length > 0 ? (
        <div style={{ height: '280px' }}>
          <Bar data={chartData} options={options} />
        </div>
      ) : (
        <p className="text-slate-500 text-center py-8 text-sm">No data available</p>
      )}
    </div>
  );
}

function DeviceBreakdownCard({ data }: { data: { desktop: number; mobile: number; tablet: number } }) {
  const total = data.desktop + data.mobile + data.tablet;

  const chartData = {
    labels: ['Desktop', 'Mobile', 'Tablet'],
    datasets: [
      {
        data: [data.desktop, data.mobile, data.tablet],
        backgroundColor: [
          'rgba(59, 130, 246, 0.9)',
          'rgba(34, 197, 94, 0.9)',
          'rgba(168, 85, 247, 0.9)',
        ],
        borderColor: [
          'rgba(0, 0, 0, 0.1)',
          'rgba(0, 0, 0, 0.1)',
          'rgba(0, 0, 0, 0.1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgb(113, 113, 122)',
          padding: 15,
          font: {
            size: 11,
          },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: 12,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const value = context.parsed;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return ` ${context.label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="border-gradient-inner rounded-2xl bg-zinc-900/50 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Device Breakdown</h3>
      {total > 0 ? (
        <div style={{ height: '280px' }} className="flex items-center justify-center">
          <Doughnut data={chartData} options={options} />
        </div>
      ) : (
        <p className="text-slate-500 text-center py-8 text-sm">No data available</p>
      )}
    </div>
  );
}

function TopReferrersCard({ data }: { data: Array<{ referrer: string; count: number }> }) {
  return (
    <div className="border-gradient-inner rounded-2xl bg-zinc-900/50 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Top Referrers</h3>
      <div className="space-y-2">
        {data.length > 0 ? (
          data.map((referrer, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-white/40"></span>
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300 truncate">{referrer.referrer || "Direct"}</span>
                  <span className="tabular-nums text-slate-400">{referrer.count.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-slate-500 text-center py-8 text-sm">No data available</p>
        )}
      </div>
    </div>
  );
}

function TopCountriesCard({ data }: { data: Array<{ country: string; countryFlag: string; visitors: number }> }) {
  return (
    <div className="border-gradient-inner rounded-2xl bg-zinc-900/50 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Top Countries</h3>
      <div className="space-y-2">
        {data.length > 0 ? (
          data.map((country, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-base" role="img" aria-label={country.country}>
                {country.countryFlag}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{country.country}</span>
                  <span className="tabular-nums text-slate-400">{country.visitors.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-slate-500 text-center py-8 text-sm">No data available</p>
        )}
      </div>
    </div>
  );
}

function TopCitiesCard({ data }: { data: Array<{ city: string; visitors: number }> }) {
  return (
    <div className="border-gradient-inner rounded-2xl bg-zinc-900/50 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Top Cities</h3>
      <div className="space-y-2">
        {data.length > 0 ? (
          data.map((city, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-white/30"></span>
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{city.city}</span>
                  <span className="tabular-nums text-slate-400">{city.visitors.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-slate-500 text-center py-8 text-sm">No data available</p>
        )}
      </div>
    </div>
  );
}

function VisitorIPsCard({ data }: {
  data: Array<{
    ip: string;
    city: string;
    state: string;
    country: string;
    device: string;
    browser: string;
    os: string;
    timestamp: string;
    pageviews: number;
  }>
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const formatLocation = (city: string, state: string, country: string) => {
    if (state) {
      return `${city}, ${state}, ${country}`;
    }
    return `${city}, ${country}`;
  };

  return (
    <div className="border-gradient-inner rounded-2xl bg-zinc-900/50 overflow-hidden lg:col-span-2">
      <div className="px-4 sm:px-5 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white">Recent Visitors</h3>
        <p className="text-xs text-slate-500">Latest visitor activity</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-slate-400">
            <tr>
              <th className="text-left font-medium px-4 sm:px-5 py-3 hidden sm:table-cell">Visitor</th>
              <th className="text-left font-medium px-4 sm:px-5 py-3">Location</th>
              <th className="text-left font-medium px-4 sm:px-5 py-3">Device</th>
              <th className="text-left font-medium px-4 sm:px-5 py-3 hidden md:table-cell">Browser</th>
              <th className="text-left font-medium px-4 sm:px-5 py-3 hidden lg:table-cell">Pages</th>
              <th className="text-right font-medium px-4 sm:px-5 py-3">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {currentData.length > 0 ? (
              currentData.map((visitor, index) => (
                <tr key={index} className="hover:bg-white/5">
                  <td className="px-4 sm:px-5 py-3 tabular-nums text-slate-300 font-mono text-xs hidden sm:table-cell">{visitor.ip}</td>
                  <td className="px-4 sm:px-5 py-3 text-slate-300 text-xs sm:text-sm">
                    {formatLocation(visitor.city, visitor.state, visitor.country)}
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-slate-400 text-xs sm:text-sm">{visitor.device}</td>
                  <td className="px-4 sm:px-5 py-3 text-slate-400 hidden md:table-cell">{visitor.browser}</td>
                  <td className="px-4 sm:px-5 py-3 text-white font-medium hidden lg:table-cell">{visitor.pageviews}</td>
                  <td className="px-4 sm:px-5 py-3 text-right text-slate-500 text-xs whitespace-nowrap">{formatTimestamp(visitor.timestamp)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">No visitor data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-white/5">
          <div className="text-sm text-slate-500">
            Showing {startIndex + 1}-{Math.min(endIndex, data.length)} of {data.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-xs text-slate-400">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductViewsChart({ data }: { data: Array<{ product: string; views: number; revenue: number }> }) {
  const chartData = {
    labels: data.slice(0, 8).map(p => {
      const name = p.product.length > 25 ? p.product.substring(0, 25) + '...' : p.product;
      return name;
    }),
    datasets: [
      {
        label: 'Product Views',
        data: data.slice(0, 8).map(p => p.views),
        backgroundColor: 'rgba(168, 85, 247, 0.9)',
        borderColor: 'rgba(168, 85, 247, 1)',
        borderWidth: 0,
        borderRadius: 6,
        barThickness: 24,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: 12,
        borderColor: 'rgba(168, 85, 247, 0.5)',
        borderWidth: 1,
        callbacks: {
          title: (items: any) => {
            const index = items[0].dataIndex;
            return data[index].product;
          },
          label: (context: any) => {
            return ` ${context.parsed.x} views`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        border: {
          display: false,
        },
        ticks: {
          color: 'rgb(113, 113, 122)',
          font: {
            size: 11,
          },
        },
        grid: {
          color: 'rgba(113, 113, 122, 0.1)',
        },
      },
      y: {
        border: {
          display: false,
        },
        ticks: {
          color: 'rgb(113, 113, 122)',
          font: {
            size: 11,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-6">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-6 uppercase tracking-wide">Most Viewed Products</h3>
      {data.length > 0 ? (
        <div style={{ height: '400px' }}>
          <Bar data={chartData} options={options} />
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">No product views yet</p>
      )}
    </div>
  );
}

// Email Marketer Tab Component
function EmailMarketerTab({ showToast }: { showToast: (message: string, type: 'success' | 'error' | 'info') => void }) {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailContent, setEmailContent] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emailComposerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/email-list');
      const data = await response.json();
      if (data.success) {
        setSubscribers(data.subscribers);
      }
    } catch (error) {
      console.error('Failed to fetch subscribers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    try {
      const response = await fetch('/api/admin/email-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, name: newName, source: 'manual' })
      });

      const data = await response.json();

      if (data.success) {
        setNewEmail('');
        setNewName('');
        fetchSubscribers();
        showToast('Email added successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to add email', 'error');
      }
    } catch (error) {
      console.error('Failed to add email:', error);
      showToast('Failed to add email', 'error');
    }
  };

  const handleDeleteEmail = async (id: string) => {
    if (!confirm('Remove this email from the list?')) return;

    try {
      const response = await fetch(`/api/admin/email-list?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchSubscribers();
      }
    } catch (error) {
      console.error('Failed to delete email:', error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return null;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedImage);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.url) {
        return data.url;
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setUploading(false);
    }
    return null;
  };

  const handleExportEmails = () => {
    const emailList = subscribers.map(s => `${s.name || ''} <${s.email}>`).join(', ');
    const blob = new Blob([emailList], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'email-list.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyEmails = () => {
    const emailList = subscribers.map(s => s.email).join(', ');
    navigator.clipboard.writeText(emailList);
    showToast('Emails copied to clipboard!', 'success');
  };

  const handleImportFromOrders = async () => {
    if (!confirm('Import all customer emails from existing orders? This will add any emails not already in your list.')) {
      return;
    }

    setImporting(true);
    try {
      const response = await fetch('/api/admin/email-list/import', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        showToast(`Imported ${data.imported} emails (${data.skipped} already existed)`, 'success');
        fetchSubscribers(); // Refresh the list
      } else {
        showToast(data.error || 'Failed to import emails', 'error');
      }
    } catch (error) {
      console.error('Failed to import emails:', error);
      showToast('Failed to import emails from orders', 'error');
    } finally {
      setImporting(false);
    }
  };

  const loadTemplate = (template: EmailTemplate) => {
    setEmailSubject(template.subject);
    setEmailContent(template.content);
    setShowTemplates(false);
    setTimeout(() => {
      emailComposerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div className="space-y-8">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleImportFromOrders}
          disabled={importing}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-xl disabled:shadow-none flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
            <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
          </svg>
          {importing ? 'Importing...' : 'Import from Orders'}
        </button>
        <button
          onClick={handleCopyEmails}
          className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
            <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/>
          </svg>
          Copy All Emails
        </button>
        <button
          onClick={handleExportEmails}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
            <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
          </svg>
          Export List
        </button>
      </div>

      {/* Template Selector */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-950 rounded-2xl border border-gray-200 dark:border-zinc-800 p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="white">
              <path d="M320-240 80-480l240-240 57 57-184 184 183 183-56 56Zm320 0-57-57 184-184-183-183 56-56 240 240-240 240Z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Email Templates</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Choose a template to get started quickly</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {emailTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => loadTemplate(template)}
              className="relative text-left p-6 border-2 rounded-2xl hover:shadow-2xl transition-all duration-300 group bg-gradient-to-br from-pink-50 to-white dark:from-pink-900/10 dark:to-zinc-900 border-pink-100 dark:border-pink-900/30 hover:border-pink-500 hover:scale-105 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-400/10 to-purple-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 text-center transform group-hover:scale-110 transition-transform duration-300">{template.thumbnail}</div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2 group-hover:text-pink-500 transition-colors text-lg">
                  {template.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                  {template.description}
                </p>
                {template.subject && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-zinc-700">
                    <p className="text-xs text-gray-500 dark:text-gray-500 italic truncate font-medium">
                      Subject: "{template.subject}"
                    </p>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Email Composer */}
      <div ref={emailComposerRef} className="bg-gradient-to-br from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-950 rounded-2xl border border-gray-200 dark:border-zinc-800 p-8 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="white">
                <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Compose Email</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Create your email campaign</p>
            </div>
          </div>
          {emailContent && (
            <button
              onClick={() => {
                if (confirm('Clear current email and start fresh?')) {
                  setEmailSubject('');
                  setEmailContent('');
                  setSelectedImage(null);
                  setImagePreview(null);
                }
              }}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Subject */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Subject Line
          </label>
          <input
            type="text"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Enter a compelling subject line..."
            className="w-full px-5 py-3 border-2 border-gray-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 focus:outline-none transition-all text-base font-medium"
          />
        </div>

        {/* Image Upload */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <span className="text-pink-500">🖼️</span>
            Promotional Image (Optional)
          </label>
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                <path d="M480-260q75 0 127.5-52.5T660-440q0-75-52.5-127.5T480-620q-75 0-127.5 52.5T300-440q0 75 52.5 127.5T480-260Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29ZM160-120q-33 0-56.5-23.5T80-200v-480q0-33 23.5-56.5T160-760h126l74-80h240l74 80h126q33 0 56.5 23.5T880-680v480q0 33-23.5 56.5T800-120H160Z"/>
              </svg>
              Choose Image
            </button>
            {selectedImage && (
              <span className="text-sm text-gray-600 dark:text-gray-400 self-center font-medium flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                  <path d="m424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>
                </svg>
                {selectedImage.name}
              </span>
            )}
          </div>
          {imagePreview && (
            <div className="mt-4 p-4 bg-white dark:bg-zinc-800 rounded-xl border-2 border-gray-200 dark:border-zinc-700">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-md rounded-lg shadow-lg"
              />
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
                className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
              >
                Remove Image
              </button>
            </div>
          )}
        </div>

        {/* Message Body */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Email Message
          </label>
          <div className="bg-white dark:bg-zinc-800 rounded-xl border-2 border-gray-300 dark:border-zinc-700 p-2 focus-within:border-pink-500 focus-within:ring-2 focus-within:ring-pink-500/20 transition-all">
            <TiptapEditor
              content={emailContent}
              onChange={setEmailContent}
              placeholder="Write your email message here..."
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor" className="mt-0.5">
              <path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>
            </svg>
            Rich text formatting is supported. You can copy this HTML content to your email service provider.
          </p>
        </div>
      </div>

      {/* Add New Email */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-950 rounded-2xl border border-gray-200 dark:border-zinc-800 p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="white">
              <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Subscriber Manually</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manually add a new subscriber to your list</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name (optional)"
            className="flex-1 px-5 py-3 border-2 border-gray-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 focus:outline-none transition-all font-medium"
          />
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@example.com"
            className="flex-1 px-5 py-3 border-2 border-gray-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 focus:outline-none transition-all font-medium"
          />
          <button
            onClick={handleAddEmail}
            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl whitespace-nowrap flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
              <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
            </svg>
            Add Email
          </button>
        </div>
        <div className="mt-4 flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-900/30">
          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" className="text-blue-600 dark:text-blue-400 mt-0.5">
            <path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>
          </svg>
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            Customer emails are automatically added when they place orders
          </p>
        </div>
      </div>

      {/* Subscriber List */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-950 rounded-2xl border border-gray-200 dark:border-zinc-800 p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="white">
              <path d="M0-240v-63q0-43 44-70t116-27q13 0 25 .5t23 2.5q-14 21-21 44t-7 48v65H0Zm240 0v-65q0-32 17.5-58.5T307-410q32-20 76.5-30t96.5-10q53 0 97.5 10t76.5 30q32 20 49 46.5t17 58.5v65H240Zm540 0v-65q0-26-6.5-49T754-397q11-2 22.5-2.5t23.5-.5q72 0 116 26.5t44 70.5v63H780Zm-455-80h311q-10-20-55.5-35T480-370q-55 0-100.5 15T325-320ZM160-440q-33 0-56.5-23.5T80-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T160-440Zm640 0q-33 0-56.5-23.5T720-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T800-440Zm-320-40q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-600q0 50-34.5 85T480-480Z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Subscriber List</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your email subscribers</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Loading subscribers...</p>
          </div>
        ) : subscribers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex p-6 bg-gray-100 dark:bg-zinc-800 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px" fill="currentColor" className="text-gray-400">
                <path d="M0-240v-63q0-43 44-70t116-27q13 0 25 .5t23 2.5q-14 21-21 44t-7 48v65H0Zm240 0v-65q0-32 17.5-58.5T307-410q32-20 76.5-30t96.5-10q53 0 97.5 10t76.5 30q32 20 49 46.5t17 58.5v65H240Zm540 0v-65q0-26-6.5-49T754-397q11-2 22.5-2.5t23.5-.5q72 0 116 26.5t44 70.5v63H780ZM160-440q-33 0-56.5-23.5T80-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T160-440Zm640 0q-33 0-56.5-23.5T720-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T800-440Zm-320-40q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-600q0 50-34.5 85T480-480Z"/>
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold mb-2">
              No subscribers yet
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              Emails will be added automatically when customers place orders, or you can add them manually above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-zinc-700">
                  <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Name</th>
                  <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Email</th>
                  <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Source</th>
                  <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Added</th>
                  <th className="text-right py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber, index) => (
                  <tr
                    key={subscriber._id}
                    className={`border-b border-gray-100 dark:border-zinc-800 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800/50 ${
                      index % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50/50 dark:bg-zinc-900/50'
                    }`}
                  >
                    <td className="py-4 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      {subscriber.name || (
                        <span className="text-gray-400 dark:text-gray-600 italic">No name</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900 dark:text-white font-mono">
                      {subscriber.email}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${subscriber.source === 'order'
                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50'
                        : 'bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50'
                        }`}>
                        <span className="text-base">{subscriber.source === 'order' ? '🛒' : '✋'}</span>
                        {subscriber.source === 'order' ? 'Order' : 'Manual'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {new Date(subscriber.addedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleDeleteEmail(subscriber._id)}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 ml-auto"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                          <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                        </svg>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Manage Add-Ons Tab Component
function ManageAddOnsTab({ showToast }: { showToast: (message: string, type: 'success' | 'error' | 'info') => void }) {
  const [activeSection, setActiveSection] = useState<'addons' | 'flavors' | 'fillings'>('addons');
  const [addons, setAddons] = useState<any[]>([]);
  const [flavors, setFlavors] = useState<any[]>([]);
  const [fillings, setFillings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchAllOptions();
  }, []);

  const fetchAllOptions = async () => {
    setLoading(true);
    try {
      const [addonsRes, flavorsRes, fillingsRes] = await Promise.all([
        fetch('/api/admin/addons?includeHidden=true'),
        fetch('/api/admin/flavors?includeHidden=true'),
        fetch('/api/admin/fillings?includeHidden=true')
      ]);

      const [addonsData, flavorsData, fillingsData] = await Promise.all([
        addonsRes.json(),
        flavorsRes.json(),
        fillingsRes.json()
      ]);

      setAddons(addonsData.addons || []);
      setFlavors(flavorsData.flavors || []);
      setFillings(fillingsData.fillings || []);
    } catch (error) {
      console.error('Failed to fetch options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    if (!confirm('This will populate the database with default add-ons, flavors, and fillings. Continue?')) return;

    setSeeding(true);
    try {
      const response = await fetch('/api/admin/seed-options', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        showToast(`Seeded: ${data.seeded.addons} add-ons, ${data.seeded.flavors} flavors, ${data.seeded.fillings} fillings`, 'success');
        fetchAllOptions();
      }
    } catch (error) {
      console.error('Failed to seed:', error);
      showToast('Failed to seed data', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleToggleVisibility = async (id: string, type: 'addons' | 'flavors' | 'fillings') => {
    try {
      const response = await fetch(`/api/admin/${type}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleVisibility' })
      });

      if (response.ok) {
        fetchAllOptions();
      }
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  };

  const handleDelete = async (id: string, type: 'addons' | 'flavors' | 'fillings') => {
    if (!confirm('Are you sure you want to permanently delete this item?')) return;

    try {
      const response = await fetch(`/api/admin/${type}/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchAllOptions();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const getCurrentItems = () => {
    switch (activeSection) {
      case 'addons': return addons;
      case 'flavors': return flavors;
      case 'fillings': return fillings;
    }
  };

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'addons': return 'Add-Ons';
      case 'flavors': return 'Flavors';
      case 'fillings': return 'Fillings';
    }
  };

  if (showAddForm || editingItem) {
    return (
      <OptionForm
        item={editingItem}
        type={activeSection}
        onClose={() => {
          setShowAddForm(false);
          setEditingItem(null);
        }}
        onSuccess={() => {
          setShowAddForm(false);
          setEditingItem(null);
          fetchAllOptions();
        }}
        showToast={showToast}
      />
    );
  }

  const items = getCurrentItems();
  const isEmpty = addons.length === 0 && flavors.length === 0 && fillings.length === 0;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Manage {getSectionTitle()} ({items.length})
        </h2>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          {isEmpty && (
            <button
              onClick={handleSeedData}
              disabled={seeding}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50"
            >
              {seeding ? 'Seeding...' : 'Seed Default Data'}
            </button>
          )}
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
            Add New {activeSection === 'addons' ? 'Add-On' : activeSection === 'flavors' ? 'Flavor' : 'Filling'}
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'addons', label: 'Add-Ons', count: addons.length },
          { id: 'flavors', label: 'Flavors', count: flavors.length },
          { id: 'fillings', label: 'Fillings', count: fillings.length }
        ].map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSection === section.id
                ? 'bg-pink-500 text-white'
                : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-700'
            }`}
          >
            {section.label} ({section.count})
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No {getSectionTitle().toLowerCase()} yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            Add Your First {activeSection === 'addons' ? 'Add-On' : activeSection === 'flavors' ? 'Flavor' : 'Filling'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {items.map((item) => (
            <div
              key={item._id}
              className={`bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all ${
                item.hidden ? 'opacity-50' : ''
              }`}
            >
              {/* Image */}
              <div className="relative w-full aspect-square bg-gray-100 dark:bg-zinc-800">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                )}
                {item.hidden && (
                  <div className="absolute top-1 right-1 bg-red-500 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                    HIDDEN
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1 capitalize">
                  {item.name}
                </h3>
                {activeSection === 'addons' && (
                  <p className="text-sm text-pink-500 font-semibold mb-2">
                    ${item.price?.toFixed(2)}
                  </p>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-1 pt-2 border-t border-gray-200 dark:border-zinc-800">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="w-full sm:flex-1 bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5q0 15-5.5 29.5T897-728L530-360H360Zm481-424-56-56 56 56ZM440-440h56l232-232-28-28-29-28-231 231v57Zm260-260-29-28 29 28 28 28-28-28Z"/></svg>
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleVisibility(item._id, activeSection)}
                    className="w-full sm:flex-1 bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z"/></svg>
                    {item.hidden ? 'Show' : 'Hide'}
                  </button>
                  <button
                    onClick={() => handleDelete(item._id, activeSection)}
                    className="w-full sm:w-auto bg-gray-700 hover:bg-gray-800 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Option Form Component (for Add-Ons, Flavors, Fillings)
function OptionForm({ item, type, onClose, onSuccess, showToast }: {
  item: any | null;
  type: 'addons' | 'flavors' | 'fillings';
  onClose: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    price: item?.price || 0,
    image: item?.image || ''
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const typeLabel = type === 'addons' ? 'Add-On' : type === 'flavors' ? 'Flavor' : 'Filling';

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const file = files[0];
      const formDataToUpload = new FormData();
      formDataToUpload.append('file', file);
      formDataToUpload.append('productName', `${type}-${formData.name || 'unnamed'}`);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formDataToUpload
      });

      const data = await response.json();
      setFormData({ ...formData, image: data.url });
    } catch (error) {
      console.error('Upload failed:', error);
      showToast('Failed to upload image', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: formData.name,
        image: formData.image,
        ...(type === 'addons' ? { price: parseFloat(formData.price.toString()) } : {})
      };

      const url = item
        ? `/api/admin/${type}/${item._id}`
        : `/api/admin/${type}`;

      const response = await fetch(url, {
        method: item ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to save', 'error');
      }
    } catch (error) {
      console.error('Save failed:', error);
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          {item ? `Edit ${typeLabel}` : `Add New ${typeLabel}`}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Image</h3>

          <div className="mb-4">
            <label className="block w-full px-6 py-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors border-gray-300 dark:border-zinc-700 hover:border-pink-500">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                disabled={uploading}
              />
              <div className="text-gray-600 dark:text-gray-400">
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-500"></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <p>Click to upload image</p>
                  </>
                )}
              </div>
            </label>
          </div>

          {formData.image && (
            <div className="relative w-32 h-32">
              <img
                src={formData.image}
                alt="Preview"
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, image: '' })}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Details</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
                placeholder={`e.g., ${type === 'addons' ? 'Cherries' : type === 'flavors' ? 'Vanilla' : 'Strawberry Compote'}`}
              />
            </div>

            {type === 'addons' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
                    placeholder="10.00"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors font-medium text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full sm:flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {saving ? 'Saving...' : item ? `Update ${typeLabel}` : `Create ${typeLabel}`}
          </button>
        </div>
      </form>
    </div>
  );
}

// Promos Tab Component - Discount Codes & Popup Management
function PromosTab({ showToast }: { showToast: (message: string, type: 'success' | 'error' | 'info') => void }) {
  const [activeSection, setActiveSection] = useState<'codes' | 'popup'>('codes');
  const [discountCodes, setDiscountCodes] = useState<any[]>([]);
  const [popupSettings, setPopupSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCode, setEditingCode] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [codesRes, popupRes] = await Promise.all([
        fetch('/api/admin/discount-codes?includeInactive=true'),
        fetch('/api/admin/promo-popup')
      ]);

      const [codesData, popupData] = await Promise.all([
        codesRes.json(),
        popupRes.json()
      ]);

      setDiscountCodes(codesData.codes || []);
      setPopupSettings(popupData.settings || { enabled: false });
    } catch (error) {
      console.error('Failed to fetch promo data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/discount-codes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleActive' })
      });

      if (response.ok) {
        fetchData();
        showToast('Discount code status updated', 'success');
      }
    } catch (error) {
      console.error('Failed to toggle active:', error);
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this discount code?')) return;

    try {
      const response = await fetch(`/api/admin/discount-codes/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchData();
        showToast('Discount code deleted', 'success');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      showToast('Failed to delete discount code', 'error');
    }
  };

  const handlePopupToggle = async () => {
    try {
      const response = await fetch('/api/admin/promo-popup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...popupSettings,
          enabled: !popupSettings.enabled
        })
      });

      if (response.ok) {
        setPopupSettings({ ...popupSettings, enabled: !popupSettings.enabled });
        showToast(popupSettings.enabled ? 'Popup disabled' : 'Popup enabled', 'success');
      }
    } catch (error) {
      console.error('Failed to toggle popup:', error);
      showToast('Failed to update popup settings', 'error');
    }
  };

  const handlePopupCodeChange = async (codeId: string) => {
    try {
      const response = await fetch('/api/admin/promo-popup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...popupSettings,
          discountCodeId: codeId || null
        })
      });

      if (response.ok) {
        setPopupSettings({ ...popupSettings, discountCodeId: codeId || null });
        showToast('Popup code updated', 'success');
      }
    } catch (error) {
      console.error('Failed to update popup code:', error);
      showToast('Failed to update popup settings', 'error');
    }
  };

  const handlePopupMessageChange = async (message: string) => {
    try {
      const response = await fetch('/api/admin/promo-popup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...popupSettings,
          customMessage: message
        })
      });

      if (response.ok) {
        setPopupSettings({ ...popupSettings, customMessage: message });
        showToast('Popup message updated', 'success');
      }
    } catch (error) {
      console.error('Failed to update message:', error);
      showToast('Failed to update message', 'error');
    }
  };

  if (showAddForm || editingCode) {
    return (
      <DiscountCodeForm
        code={editingCode}
        onClose={() => {
          setShowAddForm(false);
          setEditingCode(null);
        }}
        onSuccess={() => {
          setShowAddForm(false);
          setEditingCode(null);
          fetchData();
          showToast(editingCode ? 'Discount code updated' : 'Discount code created', 'success');
        }}
        showToast={showToast}
      />
    );
  }

  const selectedPopupCode = discountCodes.find(c => c._id === popupSettings?.discountCodeId);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Promotions & Discount Codes
        </h2>
        {activeSection === 'codes' && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
            Create Discount Code
          </button>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'codes', label: 'Discount Codes', count: discountCodes.length },
          { id: 'popup', label: 'Promo Popup' }
        ].map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSection === section.id
                ? 'bg-pink-500 text-white'
                : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-700'
            }`}
          >
            {section.label} {section.count !== undefined && `(${section.count})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      ) : activeSection === 'codes' ? (
        <>
          {/* Discount Codes List */}
          {discountCodes.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-12 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4 text-gray-400">
                <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42z"/>
                <circle cx="6.5" cy="6.5" r="1.5"/>
              </svg>
              <p className="text-gray-500 dark:text-gray-400 mb-4">No discount codes yet</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
              >
                Create Your First Discount Code
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {discountCodes.map((code) => (
                <div
                  key={code._id}
                  className={`bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-4 ${
                    !code.active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="text-lg font-bold text-pink-500 bg-pink-50 dark:bg-pink-900/20 px-3 py-1 rounded">
                          {code.code}
                        </code>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {code.percentage}% OFF
                        </span>
                        {!code.active && (
                          <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold px-2 py-1 rounded">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Used: {code.usageCount} times</span>
                        {code.maxUses && <span>Max uses: {code.maxUses}</span>}
                        {code.expiresAt && (
                          <span>
                            Expires: {new Date(code.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingCode(code)}
                        className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(code._id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          code.active
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        {code.active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDelete(code._id)}
                        className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Popup Settings */
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-6">
          <div className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Promo Popup</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Show a promotional popup to website visitors with a discount code
                </p>
              </div>
              <button
                onClick={handlePopupToggle}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  popupSettings?.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                    popupSettings?.enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Select Discount Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Discount Code to Display
              </label>
              <select
                value={popupSettings?.discountCodeId || ''}
                onChange={(e) => handlePopupCodeChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
              >
                <option value="">-- Select a discount code --</option>
                {discountCodes.filter(c => c.active).map((code) => (
                  <option key={code._id} value={code._id}>
                    {code.code} - {code.percentage}% OFF
                  </option>
                ))}
              </select>
              {discountCodes.filter(c => c.active).length === 0 && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                  No active discount codes. Create one in the Discount Codes tab first.
                </p>
              )}
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Custom Message (optional)
              </label>
              <input
                type="text"
                value={popupSettings?.customMessage || ''}
                onChange={(e) => setPopupSettings({ ...popupSettings, customMessage: e.target.value })}
                onBlur={(e) => handlePopupMessageChange(e.target.value)}
                placeholder="e.g., Sweet treats deserve sweet savings!"
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
              />
            </div>

            {/* Preview */}
            {popupSettings?.enabled && selectedPopupCode && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-zinc-800">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Preview</h4>
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl p-6 text-center max-w-sm mx-auto border border-pink-200 dark:border-pink-800">
                  <p className="text-pink-600 dark:text-pink-400 text-sm font-medium mb-2">
                    {popupSettings.customMessage || "Sweet treats deserve sweet savings!"}
                  </p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                    {selectedPopupCode.percentage}% OFF
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Use code at checkout:</p>
                  <code className="text-xl font-bold text-pink-500 bg-white dark:bg-zinc-800 px-4 py-2 rounded-lg inline-block">
                    {selectedPopupCode.code}
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Discount Code Form Component
function DiscountCodeForm({ code, onClose, onSuccess, showToast }: {
  code: any | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}) {
  const [formData, setFormData] = useState({
    code: code?.code || '',
    percentage: code?.percentage || 10,
    maxUses: code?.maxUses || '',
    expiresAt: code?.expiresAt ? new Date(code.expiresAt).toISOString().split('T')[0] : ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        code: formData.code.trim(),
        percentage: parseFloat(formData.percentage.toString()),
        maxUses: formData.maxUses ? parseInt(formData.maxUses.toString()) : undefined,
        expiresAt: formData.expiresAt || undefined
      };

      const url = code
        ? `/api/admin/discount-codes/${code._id}`
        : '/api/admin/discount-codes';

      const response = await fetch(url, {
        method: code ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to save', 'error');
      }
    } catch (error) {
      console.error('Save failed:', error);
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          {code ? 'Edit Discount Code' : 'Create Discount Code'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Code Details</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Discount Code *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none font-mono"
                placeholder="e.g., KASSY20, SUMMER2024"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Case-sensitive. Customers must enter this exactly.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Discount Percentage *
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={formData.percentage}
                  onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
                  placeholder="10"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maximum Uses (optional)
              </label>
              <input
                type="number"
                min="0"
                value={formData.maxUses}
                onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
                placeholder="Leave blank for unlimited"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expiration Date (optional)
              </label>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors font-medium text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {saving ? 'Saving...' : code ? 'Update Code' : 'Create Code'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Collections Manager Component
function CollectionsManager({ products, onClose, onRefresh, showToast }: {
  products: any[];
  onClose: () => void;
  onRefresh: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}) {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [editingCollection, setEditingCollection] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/collections?_t=' + Date.now());
      const data = await response.json();
      setCollections(data.collections || []);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      showToast('Failed to load collections', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;
    setCreating(true);
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollectionName.trim() }),
      });

      if (response.ok) {
        showToast('Collection created!', 'success');
        setNewCollectionName('');
        fetchCollections();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to create collection', 'error');
      }
    } catch (error) {
      showToast('Failed to create collection', 'error');
    } finally {
      setCreating(false);
    }
  };

  const deleteCollection = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" collection? Products in this collection will be untagged.`)) return;
    try {
      const response = await fetch(`/api/collections?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        showToast('Collection deleted', 'success');
        fetchCollections();
        onRefresh();
        if (selectedCollection === name) setSelectedCollection(null);
      } else {
        showToast('Failed to delete collection', 'error');
      }
    } catch (error) {
      showToast('Failed to delete collection', 'error');
    }
  };

  const renameCollection = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const response = await fetch('/api/collections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editName.trim() }),
      });
      if (response.ok) {
        showToast('Collection renamed', 'success');
        setEditingCollection(null);
        fetchCollections();
        onRefresh();
      } else {
        showToast('Failed to rename collection', 'error');
      }
    } catch (error) {
      showToast('Failed to rename collection', 'error');
    }
  };

  const toggleProductInCollection = async (productId: string, collectionName: string, isInCollection: boolean) => {
    try {
      if (isInCollection) {
        await fetch(`/api/collections/products?productId=${productId}&collection=${encodeURIComponent(collectionName)}`, {
          method: 'DELETE'
        });
      } else {
        await fetch('/api/collections/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, collectionName }),
        });
      }
      onRefresh();
      showToast(isInCollection ? 'Removed from collection' : 'Added to collection', 'success');
    } catch (error) {
      showToast('Failed to update collection', 'error');
    }
  };

  const getProductsInCollection = (collectionName: string) => {
    return products.filter(p => p.collections?.includes(collectionName));
  };

  const moveCollection = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === collections.length - 1) return;

    const newCollections = [...collections];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;

    // Swap the items
    [newCollections[index], newCollections[swapIndex]] = [newCollections[swapIndex], newCollections[index]];

    // Update local state immediately for responsiveness
    setCollections(newCollections);

    // Save new order to server
    try {
      const updatedCollections = newCollections.map((col, idx) => ({
        _id: col._id,
        order: idx
      }));

      await fetch('/api/collections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collections: updatedCollections }),
      });
    } catch (error) {
      showToast('Failed to save order', 'error');
      fetchCollections(); // Revert on error
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Manage Collections
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Create New Collection */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4 sm:p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Collection</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="e.g., Top Sellers, Birthday Cakes, Valentine's..."
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            onKeyDown={(e) => e.key === 'Enter' && createCollection()}
          />
          <button
            onClick={createCollection}
            disabled={creating || !newCollectionName.trim()}
            className="px-6 py-2.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                  <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
                </svg>
                Create
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collections List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Collections */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Collections ({collections.length})
          </h3>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent mx-auto" />
            </div>
          ) : collections.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No collections yet. Create one above!
            </p>
          ) : (
            <div className="space-y-2">
              {collections.map((collection, index) => {
                const productCount = getProductsInCollection(collection.name).length;
                const isSelected = selectedCollection === collection.name;
                const isEditing = editingCollection === collection._id;
                const isFirst = index === 0;
                const isLast = index === collections.length - 1;

                return (
                  <div
                    key={collection._id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-300 dark:border-pink-700'
                        : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-700'
                    }`}
                    onClick={() => !isEditing && setSelectedCollection(isSelected ? null : collection.name)}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') renameCollection(collection._id);
                            if (e.key === 'Escape') setEditingCollection(null);
                          }}
                        />
                        <button
                          onClick={() => renameCollection(collection._id)}
                          className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setEditingCollection(null)}
                          className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          {/* Reorder buttons */}
                          <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => moveCollection(index, 'up')}
                              disabled={isFirst}
                              className={`p-0.5 rounded transition-colors ${
                                isFirst
                                  ? 'text-gray-300 dark:text-zinc-600 cursor-not-allowed'
                                  : 'text-gray-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/30'
                              }`}
                              title="Move up"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => moveCollection(index, 'down')}
                              disabled={isLast}
                              className={`p-0.5 rounded transition-colors ${
                                isLast
                                  ? 'text-gray-300 dark:text-zinc-600 cursor-not-allowed'
                                  : 'text-gray-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/30'
                              }`}
                              title="Move down"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                          <span className="text-gray-900 dark:text-white font-medium">{collection.name}</span>
                          <span className="text-xs bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                            {productCount} cake{productCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setEditingCollection(collection._id);
                              setEditName(collection.name);
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title="Rename"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteCollection(collection._id, collection.name)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Products in Selected Collection / Add to Collection */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4 sm:p-6">
          {selectedCollection ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  "{selectedCollection}" Cakes
                </h3>
                <button
                  onClick={() => setSelectedCollection(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  Clear
                </button>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Click cakes to add/remove from this collection
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                {products.map((product) => {
                  const isInCollection = product.collections?.includes(selectedCollection);
                  const thumbnail = product.media?.find((m: any) => m.isThumbnail)?.url || product.media?.[0]?.url;

                  return (
                    <div
                      key={product._id}
                      onClick={() => toggleProductInCollection(product._id, selectedCollection, isInCollection)}
                      className={`relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        isInCollection
                          ? 'border-pink-500 ring-2 ring-pink-500/20'
                          : 'border-transparent hover:border-gray-300 dark:hover:border-zinc-600'
                      }`}
                    >
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={product.name}
                          className="w-full aspect-square object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-gray-200 dark:bg-zinc-700 flex items-center justify-center">
                          <span className="text-4xl">🎂</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-2">
                        <span className="text-white text-xs font-medium line-clamp-2">{product.name}</span>
                      </div>
                      {isInCollection && (
                        <div className="absolute top-2 right-2 bg-pink-500 text-white rounded-full p-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👈</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Select a Collection
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Click a collection to manage which cakes appear in it
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Back Button */}
      <div className="mt-6">
        <button
          onClick={onClose}
          className="px-6 py-3 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors font-medium"
        >
          ← Back to Manage Cakes
        </button>
      </div>
    </div>
  );
}
