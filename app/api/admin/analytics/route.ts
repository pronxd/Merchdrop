import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { isAdminAuthenticated } from "@/lib/auth";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

// Convert URL paths to friendly names
function getFriendlyPageName(url: string): string {
  // Remove query parameters
  const path = url.split('?')[0];

  // Map paths to friendly names
  if (path === '/') return 'Homepage';
  if (path === '/cakes') return 'Cakes Gallery';
  if (path === '/cart') return 'Shopping Cart';
  if (path === '/blog') return 'Blog';
  if (path.startsWith('/cakes/product/')) return 'Product Page';
  if (path.startsWith('/cakes/customize/')) return 'Customize Cake';
  if (path.startsWith('/cakes/')) return 'Cake Category';
  if (path.startsWith('/blog/')) return 'Blog Post';

  // Return the path itself if no mapping found
  return path;
}

// Convert country code to flag emoji
function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';

  // Convert country code to flag emoji
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Decode URL-encoded strings (fixes %20 to spaces, etc.)
function decodeUrlString(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

// Umami API helper
async function fetchUmamiData(endpoint: string, options: any = {}) {
  const UMAMI_API_URL = process.env.UMAMI_API_URL || "https://censorly-analytics.vercel.app/api";
  const UMAMI_API_TOKEN = process.env.UMAMI_API_TOKEN;

  if (!UMAMI_API_TOKEN) {
    throw new Error("UMAMI_API_TOKEN is not configured");
  }

  const response = await fetch(`${UMAMI_API_URL}${endpoint}`, {
    headers: {
      "Authorization": `Bearer ${UMAMI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Umami API error: ${response.statusText}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    // Check auth
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "7d";
    const customStartAt = searchParams.get("startAt");
    const customEndAt = searchParams.get("endAt");
    const websiteId = process.env.UMAMI_WEBSITE_ID;

    if (!websiteId) {
      return NextResponse.json(
        { error: "UMAMI_WEBSITE_ID not configured" },
        { status: 500 }
      );
    }

    // Calculate date range - use custom dates if provided, otherwise use range preset
    let startDate: Date;
    let endDate: Date;

    if (customStartAt && customEndAt) {
      startDate = new Date(parseInt(customStartAt));
      endDate = new Date(parseInt(customEndAt));
    } else {
      endDate = new Date();
      startDate = new Date();

      switch (range) {
        case "24h":
          startDate.setHours(startDate.getHours() - 24);
          break;
        case "7d":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }
    }

    const startAt = startDate.getTime();
    const endAt = endDate.getTime();

    // Fetch data from Umami API and MongoDB
    try {
      const [stats, pages, referrers, devices, countries, cities, events, mongoVisitors, mongoProducts, stripeSales] = await Promise.allSettled([
        fetchUmamiData(`/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}`),
        fetchUmamiData(`/websites/${websiteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=url`),
        fetchUmamiData(`/websites/${websiteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=referrer`),
        fetchUmamiData(`/websites/${websiteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=device`),
        fetchUmamiData(`/websites/${websiteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=country`),
        fetchUmamiData(`/websites/${websiteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=city`),
        fetchUmamiData(`/websites/${websiteId}/events?startAt=${startAt}&endAt=${endAt}`),
        fetchMongoVisitors(startDate, endDate),
        fetchMongoProducts(),
        fetchStripeSalesData(startDate, endDate),
      ]);

      // Process stats
      const statsData = stats.status === "fulfilled" ? stats.value : {};
      const pagesData = pages.status === "fulfilled" ? pages.value : [];
      const referrersData = referrers.status === "fulfilled" ? referrers.value : [];
      const devicesData = devices.status === "fulfilled" ? devices.value : [];
      const countriesData = countries.status === "fulfilled" ? countries.value : [];
      const citiesData = cities.status === "fulfilled" ? cities.value : [];
      const eventsData = events.status === "fulfilled" ? events.value : [];
      const mongoVisitorsData = mongoVisitors.status === "fulfilled" ? mongoVisitors.value : [];
      const mongoProductsData = mongoProducts.status === "fulfilled" ? mongoProducts.value : [];
      const stripeSalesData = stripeSales.status === "fulfilled" ? stripeSales.value : {
        totalRevenue: 0,
        totalOrders: 0,
        allTimeRevenue: 0,
        allTimeOrders: 0,
        averageOrderValue: 0,
        topProducts: [],
        todaysOrders: 0,
        todaysRevenue: 0,
        recentOrders: []
      };

      // Process events for cart and product analytics
      const processedEvents = processEventsData(eventsData);

      // Process product page views from Umami
      const trendingCakes = processTrendingCakes(pagesData, mongoProductsData);

      // Format the response
      const analyticsData = {
        pageviews: {
          value: statsData.pageviews?.value || 0,
          change: statsData.pageviews?.change || 0,
        },
        visitors: {
          value: statsData.visitors?.value || 0,
          change: statsData.visitors?.change || 0,
        },
        visits: {
          value: statsData.visits?.value || 0,
          change: statsData.visits?.change || 0,
        },
        bounceRate: {
          value: statsData.bounceRate || 0,
          change: 0,
        },
        avgVisitTime: {
          // Calculate average per visit (totaltime is sum of all visit durations)
          value: formatTime(
            statsData.visits?.value > 0
              ? (statsData.totaltime?.value || 0) / statsData.visits.value
              : 0
          ),
          change: statsData.totaltime?.change || 0,
        },
        topPages: Array.isArray(pagesData)
          ? pagesData
            .filter((page: any) => {
              const url = page.x || page.url || "";
              // Filter out admin pages and localhost
              return !url.startsWith('/kassyadmin') && !url.includes('localhost');
            })
            .slice(0, 10)
            .map((page: any) => ({
              page: getFriendlyPageName(page.x || page.url || "Unknown"),
              views: page.y || page.pageviews || 0,
            }))
          : [],
        topReferrers: Array.isArray(referrersData)
          ? referrersData
            .filter((ref: any) => {
              const referrer = ref.x || ref.referrer || "";
              // Filter out localhost referrers
              return !referrer.includes('localhost') && !referrer.includes('127.0.0.1');
            })
            .slice(0, 10)
            .map((ref: any) => ({
              referrer: ref.x || ref.referrer || "Direct",
              count: ref.y || ref.pageviews || 0,
            }))
          : [],
        devices: {
          desktop:
            devicesData.find?.((d: any) => d.x?.toLowerCase() === "desktop")?.y || 0,
          mobile:
            devicesData.find?.((d: any) => d.x?.toLowerCase() === "mobile")?.y || 0,
          tablet:
            devicesData.find?.((d: any) => d.x?.toLowerCase() === "tablet")?.y || 0,
        },
        countries: Array.isArray(countriesData)
          ? countriesData.slice(0, 10).map((country: any) => {
            const countryCode = country.x || country.country || "Unknown";
            return {
              country: countryCode,
              countryFlag: getCountryFlag(countryCode),
              visitors: country.y || country.visitors || 0,
            };
          })
          : [],
        cities: Array.isArray(citiesData)
          ? citiesData.slice(0, 10).map((city: any) => ({
            city: decodeUrlString(city.x || city.city || "Unknown"),
            visitors: city.y || city.visitors || 0,
          }))
          : [],
        // Recent Visitors with IP and Location (from MongoDB)
        recentVisitors: mongoVisitorsData,
        // Cart & Product Analytics
        cartAnalytics: processedEvents.cartAnalytics,
        productAnalytics: {
          ...processedEvents.productAnalytics,
          productViews: trendingCakes, // Use page view data instead of custom events
        },
        salesAnalytics: {
          totalRevenue: stripeSalesData.totalRevenue,
          totalOrders: stripeSalesData.totalOrders,
          allTimeRevenue: stripeSalesData.allTimeRevenue,
          allTimeOrders: stripeSalesData.allTimeOrders,
          averageOrderValue: stripeSalesData.averageOrderValue,
          topProducts: stripeSalesData.topProducts,
          todaysOrders: stripeSalesData.todaysOrders,
          todaysRevenue: stripeSalesData.todaysRevenue,
          recentOrders: stripeSalesData.recentOrders,
        },
      };

      return NextResponse.json(analyticsData);
    } catch (apiError) {
      console.error("Umami API Error:", apiError);

      // Return mock data if API fails
      const mockData = {
        pageviews: { value: 0, change: 0 },
        visitors: { value: 0, change: 0 },
        visits: { value: 0, change: 0 },
        bounceRate: { value: 0, change: 0 },
        avgVisitTime: { value: "0m", change: 0 },
        topPages: [],
        topReferrers: [],
        devices: { desktop: 0, mobile: 0, tablet: 0 },
        countries: [],
        cities: [],
        recentVisitors: [],
        cartAnalytics: {
          addToCart: 0,
          removeFromCart: 0,
          checkoutStarted: 0,
          totalCartValue: 0,
          popularAddOns: [],
        },
        productAnalytics: {
          productViews: [],
          totalViews: 0,
        },
        salesAnalytics: {
          totalRevenue: 0,
          totalOrders: 0,
          allTimeRevenue: 0,
          allTimeOrders: 0,
          averageOrderValue: 0,
          topProducts: [],
          todaysOrders: 0,
          todaysRevenue: 0,
          recentOrders: [],
          dailyBreakdown: [],
          dayOfWeekStats: [],
          periodComparison: { current: { revenue: 0, orders: 0 }, previous: { revenue: 0, orders: 0 }, revenueChange: 0, ordersChange: 0 },
          insights: { bestDay: '', bestDayRevenue: 0, bestDayOrders: 0, worstDay: '', worstDayRevenue: 0, avgRevenuePerDay: 0 }
        },
      };

      return NextResponse.json(mockData);
    }
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

async function getTodaysOrdersCount() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "kassycakes");
    const bookings = db.collection("bookings");

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const count = await bookings.countDocuments({
      $or: [
        { createdAt: { $gte: startOfDay, $lte: endOfDay } },
        { createdAt: { $gte: startOfDay.toISOString(), $lte: endOfDay.toISOString() } }
      ]
    });

    return count;
  } catch (error) {
    console.error("Error fetching today's orders:", error);
    return 0;
  }
}

// Fetch real sales data directly from Stripe API
async function fetchStripeSalesData(startDate: Date, endDate: Date) {
  try {

    // Fetch ALL checkout sessions from Stripe (not just 'complete' status)
    // Some sessions may have status='expired' but payment_status='paid'
    // (when success callback failed but customer actually paid)
    // Fetch ALL sessions for all-time totals (up to 500 to avoid infinite loops)
    const allTimeStart = new Date('2020-01-01'); // Far back enough to get all orders

    // Fetch sessions in batches to get all orders (Stripe limits to 100 per request)
    let allSessions: any[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const params: any = {
        limit: 100,
        created: {
          gte: Math.floor(allTimeStart.getTime() / 1000),
          lte: Math.floor(endDate.getTime() / 1000),
        },
        expand: ['data.line_items'],
      };

      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const sessions = await stripe.checkout.sessions.list(params);
      allSessions = allSessions.concat(sessions.data);

      hasMore = sessions.has_more;
      if (sessions.data.length > 0) {
        startingAfter = sessions.data[sessions.data.length - 1].id;
      } else {
        hasMore = false;
      }

      // Safety limit to prevent infinite loops
      if (allSessions.length > 500) break;
    }

    // Filter to only paid sessions
    const paidSessions = allSessions.filter(s => s.payment_status === 'paid');

    const productSales = new Map<string, { revenue: number; quantity: number; name: string }>();
    const allTimeProductSales = new Map<string, { revenue: number; quantity: number; name: string }>();
    const recentOrders: Array<{
      id: string;
      customerName: string;
      productName: string;
      amount: number;
      date: Date;
      status: string;
    }> = [];

    let totalRevenue = 0; // For selected period
    let totalOrders = 0; // For selected period
    let allTimeRevenue = 0; // All-time total
    let allTimeOrders = 0; // All-time total
    let todaysOrders = 0;
    let todaysRevenue = 0;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    for (const session of paidSessions) {

      const amountPaid = (session.amount_total || 0) / 100; // Convert from cents
      // Prefer metadata.customerName (from our order) over customer_details.name (from card)
      // because customers sometimes pay with someone else's card
      const customerName = session.metadata?.customerName || session.customer_details?.name || 'Unknown';
      const customerEmail = session.customer_details?.email || '';
      const createdDate = new Date(session.created * 1000);

      // Get product name from line items or metadata
      let productName = 'Unknown Product';
      if (session.line_items?.data && session.line_items.data.length > 0) {
        productName = session.line_items.data[0].description || 'Unknown Product';
      } else if (session.metadata?.productName) {
        productName = session.metadata.productName;
      }

      // Track all-time totals
      allTimeRevenue += amountPaid;
      allTimeOrders++;

      // Track all-time product sales
      const existingAllTime = allTimeProductSales.get(productName) || { revenue: 0, quantity: 0, name: productName };
      existingAllTime.revenue += amountPaid;
      existingAllTime.quantity += 1;
      allTimeProductSales.set(productName, existingAllTime);

      // Check if order is within the requested date range
      const isInDateRange = createdDate >= startDate && createdDate <= endDate;

      // Only count towards period totals if within date range
      if (isInDateRange) {
        totalRevenue += amountPaid;
        totalOrders++;

        // Track product sales (only for date range)
        const existing = productSales.get(productName) || { revenue: 0, quantity: 0, name: productName };
        existing.revenue += amountPaid;
        existing.quantity += 1;
        productSales.set(productName, existing);
      }

      // Track today's stats (always check)
      if (createdDate >= startOfDay) {
        todaysOrders++;
        todaysRevenue += amountPaid;
      }

      // Add to recent orders list (for display purposes, include all recent)
      recentOrders.push({
        id: session.id,
        customerName,
        productName,
        amount: amountPaid,
        date: createdDate,
        status: 'paid'
      });
    }

    // Sort recent orders by date (most recent first)
    recentOrders.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Calculate average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get top products sorted by revenue (all-time)
    const topProducts = Array.from(allTimeProductSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(p => ({
        product: p.name,
        revenue: p.revenue,
        quantity: p.quantity
      }));

    // Calculate daily breakdown for the date range
    const dailyBreakdown: { [key: string]: { revenue: number; orders: number; date: string } } = {};
    const dayOfWeekStats: { [key: number]: { revenue: number; orders: number; dayName: string } } = {
      0: { revenue: 0, orders: 0, dayName: 'Sunday' },
      1: { revenue: 0, orders: 0, dayName: 'Monday' },
      2: { revenue: 0, orders: 0, dayName: 'Tuesday' },
      3: { revenue: 0, orders: 0, dayName: 'Wednesday' },
      4: { revenue: 0, orders: 0, dayName: 'Thursday' },
      5: { revenue: 0, orders: 0, dayName: 'Friday' },
      6: { revenue: 0, orders: 0, dayName: 'Saturday' },
    };

    // Filter to only orders in the requested date range for daily stats
    const ordersInRange = recentOrders.filter(order =>
      order.date >= startDate && order.date <= endDate
    );

    for (const order of ordersInRange) {
      const dateKey = order.date.toISOString().split('T')[0]; // YYYY-MM-DD
      const dayOfWeek = order.date.getDay();

      // Daily breakdown
      if (!dailyBreakdown[dateKey]) {
        dailyBreakdown[dateKey] = { revenue: 0, orders: 0, date: dateKey };
      }
      dailyBreakdown[dateKey].revenue += order.amount;
      dailyBreakdown[dateKey].orders += 1;

      // Day of week stats
      dayOfWeekStats[dayOfWeek].revenue += order.amount;
      dayOfWeekStats[dayOfWeek].orders += 1;
    }

    // Convert daily breakdown to sorted array
    const dailyData = Object.values(dailyBreakdown).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Calculate current period vs previous period (same length)
    // If viewing Jan 16-23 (7 days), compare to Jan 9-15 (previous 7 days)
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousPeriodEnd = new Date(startDate.getTime() - 1); // Day before current period starts
    const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodLength);

    let currentPeriodRevenue = 0;
    let currentPeriodOrders = 0;
    let previousPeriodRevenue = 0;
    let previousPeriodOrders = 0;

    for (const order of recentOrders) {
      // Current period (selected date range)
      if (order.date >= startDate && order.date <= endDate) {
        currentPeriodRevenue += order.amount;
        currentPeriodOrders += 1;
      }
      // Previous period (same length, immediately before)
      else if (order.date >= previousPeriodStart && order.date <= previousPeriodEnd) {
        previousPeriodRevenue += order.amount;
        previousPeriodOrders += 1;
      }
    }

    // Find best and worst days
    const dayOfWeekArray = Object.entries(dayOfWeekStats).map(([day, stats]) => ({
      day: parseInt(day),
      ...stats
    }));
    const bestDay = dayOfWeekArray.reduce((best, current) =>
      current.revenue > best.revenue ? current : best
    );
    const worstDay = dayOfWeekArray.reduce((worst, current) =>
      current.revenue < worst.revenue && current.orders > 0 ? current : worst
    , dayOfWeekArray[0]);

    // Average per day (for days with orders)
    const daysWithOrders = dayOfWeekArray.filter(d => d.orders > 0).length;
    const avgRevenuePerDay = daysWithOrders > 0 ? totalRevenue / daysWithOrders : 0;

    return {
      totalRevenue,
      totalOrders,
      allTimeRevenue,
      allTimeOrders,
      averageOrderValue,
      topProducts,
      todaysOrders,
      todaysRevenue,
      recentOrders: recentOrders, // Return all orders for monthly calculations
      // New fields for insights
      dailyBreakdown: dailyData,
      dayOfWeekStats: dayOfWeekArray,
      periodComparison: {
        current: { revenue: currentPeriodRevenue, orders: currentPeriodOrders },
        previous: { revenue: previousPeriodRevenue, orders: previousPeriodOrders },
        revenueChange: previousPeriodRevenue > 0 ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue * 100) : 0,
        ordersChange: previousPeriodOrders > 0 ? ((currentPeriodOrders - previousPeriodOrders) / previousPeriodOrders * 100) : 0
      },
      insights: {
        bestDay: bestDay.dayName,
        bestDayRevenue: bestDay.revenue,
        bestDayOrders: bestDay.orders,
        worstDay: worstDay.dayName,
        worstDayRevenue: worstDay.revenue,
        avgRevenuePerDay
      }
    };
  } catch (error) {
    console.error("Error fetching Stripe sales data:", error);
    return {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      topProducts: [],
      todaysOrders: 0,
      todaysRevenue: 0,
      recentOrders: []
    };
  }
}

async function fetchMongoVisitors(startDate: Date, endDate: Date) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "kassycakes");
    const visitors = db.collection("visitor_sessions");

    const sessions = await visitors
      .find({
        firstSeen: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ lastSeen: -1 })
      .limit(50)
      .toArray();

    // Fetch geolocation data for each IP
    const visitorsWithGeo = await Promise.all(
      sessions.map(async (session: any) => {
        const geoData = await getIPGeolocation(session.ip);

        return {
          ip: session.ip,
          city: geoData.city || "Unknown",
          state: geoData.state || "",
          country: geoData.country || "Unknown",
          countryCode: geoData.countryCode || "",
          device: parseDevice(session.userAgent),
          browser: parseBrowser(session.userAgent),
          os: parseOS(session.userAgent),
          timestamp: session.lastSeen.toISOString(),
          pageviews: session.pageviews || 1,
        };
      })
    );

    return visitorsWithGeo;
  } catch (error) {
    console.error("MongoDB visitor fetch error:", error);
    return [];
  }
}

async function getIPGeolocation(ip: string) {
  try {
    // Skip localhost and private IPs - they won't have geolocation data
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return { city: null, state: null, country: null, countryCode: null };
    }

    // Use ip-api.com (free, no API key needed, 45 requests/minute)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city`);

    if (!response.ok) {
      return { city: null, state: null, country: null, countryCode: null };
    }

    const text = await response.text();
    if (!text) {
      return { city: null, state: null, country: null, countryCode: null };
    }

    const data = JSON.parse(text);

    if (data.status === 'success') {
      return {
        city: data.city,
        state: data.regionName,
        country: data.country,
        countryCode: data.countryCode,
      };
    }
  } catch (error) {
    // Silently fail for geolocation - it's not critical
  }

  return { city: null, state: null, country: null, countryCode: null };
}

function parseDevice(userAgent: string): string {
  if (/mobile/i.test(userAgent)) return 'mobile';
  if (/tablet|ipad/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

function parseBrowser(userAgent: string): string {
  if (/edg/i.test(userAgent)) return 'Edge';
  if (/chrome/i.test(userAgent)) return 'Chrome';
  if (/firefox/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent)) return 'Safari';
  return 'Other';
}

function parseOS(userAgent: string): string {
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/mac/i.test(userAgent)) return 'macOS';
  if (/linux/i.test(userAgent)) return 'Linux';
  if (/android/i.test(userAgent)) return 'Android';
  if (/ios|iphone|ipad/i.test(userAgent)) return 'iOS';
  return 'Other';
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

async function fetchMongoProducts() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "kassycakes");
    const products = db.collection("products");

    const allProducts = await products.find({}).toArray();
    return allProducts;
  } catch (error) {
    console.error("MongoDB products fetch error:", error);
    return [];
  }
}

function processTrendingCakes(pagesData: any, mongoProducts: any[]) {
  if (!Array.isArray(pagesData) || mongoProducts.length === 0) {
    return [];
  }

  // Filter page views for product pages and extract product IDs
  const productPageViews: Array<{ productId: string; views: number }> = [];

  pagesData.forEach((page: any) => {
    const url = page.x || page.url || "";
    // Match URLs like /cakes/product/690f7162196b1d1935db83b6
    const productMatch = url.match(/^\/cakes\/product\/([a-f0-9]+)$/i);

    if (productMatch) {
      const productId = productMatch[1];
      const views = page.y || page.pageviews || 0;

      productPageViews.push({ productId, views });
    }
  });

  // Match product IDs to product data from MongoDB
  const trendingCakes = productPageViews
    .map(({ productId, views }) => {
      // Convert productId string to MongoDB ObjectId-like format for comparison
      const product = mongoProducts.find((p: any) => {
        const pId = p._id?.toString ? p._id.toString() : p._id;
        return pId === productId;
      });

      if (product) {
        return {
          product: product.name,
          productId: productId,
          views: views,
          revenue: 0, // Can be populated from sales data if needed
          imageUrl: product.media?.[0]?.url || 'https://kassy.b-cdn.net/placeholder-cake.webp',
        };
      }
      return null;
    })
    .filter(Boolean) // Remove null entries
    .sort((a: any, b: any) => b.views - a.views)
    .slice(0, 10);

  return trendingCakes;
}

function processEventsData(eventsData: any) {
  // Initialize analytics objects
  const cartAnalytics = {
    addToCart: 0,
    removeFromCart: 0,
    checkoutStarted: 0,
    totalCartValue: 0,
    popularAddOns: [] as Array<{ name: string; count: number }>,
  };

  const productAnalytics = {
    productViews: [] as Array<{ product: string; views: number; revenue: number }>,
    totalViews: 0,
  };

  const salesAnalytics = {
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    topProducts: [] as Array<{ product: string; revenue: number; quantity: number }>,
    todaysOrders: 0
  };

  // Process events if available
  if (Array.isArray(eventsData)) {
    const productViewsMap = new Map();
    const addOnsMap = new Map();
    let totalCartValue = 0;
    let checkoutCount = 0;

    eventsData.forEach((event: any) => {
      const eventName = event.event_name || event.x || "";
      const eventValue = event.y || event.value || 1;
      const eventData = event.event_data || {};

      // Count cart events
      if (eventName === "add-to-cart") {
        cartAnalytics.addToCart += eventValue;
        totalCartValue += eventData.total_value || 0;

        // Track add-ons
        if (eventData.add_ons && eventData.add_ons !== "none") {
          const addOns = eventData.add_ons.split(", ");
          addOns.forEach((addOn: string) => {
            addOnsMap.set(addOn, (addOnsMap.get(addOn) || 0) + 1);
          });
        }
      } else if (eventName === "remove-from-cart") {
        cartAnalytics.removeFromCart += eventValue;
      } else if (eventName === "checkout-started") {
        cartAnalytics.checkoutStarted += eventValue;
        checkoutCount += eventValue;
      } else if (eventName === "product-view") {
        productAnalytics.totalViews += eventValue;
        const productName = eventData.product_name || "Unknown";
        const existing = productViewsMap.get(productName) || { views: 0, revenue: 0 };
        productViewsMap.set(productName, {
          views: existing.views + eventValue,
          revenue: existing.revenue,
        });
      } else if (eventName === "purchase-completed") {
        salesAnalytics.totalOrders += eventValue;
        salesAnalytics.totalRevenue += eventData.total_value || 0;
      }
    });

    cartAnalytics.totalCartValue = totalCartValue;

    // Convert maps to arrays
    cartAnalytics.popularAddOns = Array.from(addOnsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    productAnalytics.productViews = Array.from(productViewsMap.entries())
      .map(([product, data]) => ({
        product,
        views: data.views,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Calculate average order value
    if (salesAnalytics.totalOrders > 0) {
      salesAnalytics.averageOrderValue =
        salesAnalytics.totalRevenue / salesAnalytics.totalOrders;
    }
  }

  return { cartAnalytics, productAnalytics, salesAnalytics };
}
