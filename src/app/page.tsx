'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product } from '@/types';
import {
  Layers,
  Cpu,
  Clock,
  Database,
  RotateCcw,
  Sparkles,
  Terminal,
  Filter,
  Check,
  AlertTriangle
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Electronics',
  'Clothing',
  'Books',
  'Home & Kitchen',
  'Beauty',
  'Sports',
  'Toys',
  'Automotive',
  'Garden',
  'Tools',
];

interface QueryLog {
  timestamp: string;
  message: string;
  cursorUsed: string | null;
  nextCursorReceived: string | null;
  latency: number;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time developer panel logs
  const [queryLogs, setQueryLogs] = useState<QueryLog[]>([]);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const isInitialMount = useRef(true);

  // Intersection observer target
  const observerRef = useRef<HTMLDivElement | null>(null);

  // Core product fetch logic
  const fetchProducts = useCallback(async (isLoadMore = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    try {
      const url = new URL('/api/products', window.location.origin);
      url.searchParams.set('limit', '20');

      if (activeCategory !== 'All') {
        url.searchParams.set('category', activeCategory);
      }

      const currentCursor = isLoadMore ? cursor : null;
      if (currentCursor) {
        url.searchParams.set('cursor', currentCursor);
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      setProducts((prev) => {
        if (isLoadMore) {
          const existingIds = new Set(prev.map((p) => p.id));
          const newProducts = data.products.filter((p: Product) => !existingIds.has(p.id));
          return [...prev, ...newProducts];
        }
        return data.products;
      });
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);

      // Log the event for the developer console panel
      const now = new Date().toLocaleTimeString();
      const newLog: QueryLog = {
        timestamp: now,
        message: `Loaded ${data.products.length} products (Category: ${activeCategory})`,
        cursorUsed: currentCursor ? currentCursor.substring(0, 10) + '...' : 'None (First Page)',
        nextCursorReceived: data.nextCursor ? data.nextCursor.substring(0, 10) + '...' : 'None (End of Feed)',
        latency,
      };

      setQueryLogs((prev) => [newLog, ...prev].slice(0, 15));
      setLatencyHistory((prev) => [...prev, latency].slice(-10));
    } catch (err: any) {
      const errMsg = err.message || 'Failed to fetch products';
      setError(errMsg);

      const now = new Date().toLocaleTimeString();
      setQueryLogs((prev) => [
        {
          timestamp: now,
          message: `ERROR: ${errMsg}`,
          cursorUsed: isLoadMore ? (cursor ? cursor.substring(0, 10) + '...' : 'Unknown') : 'None',
          nextCursorReceived: null,
          latency: 0,
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, cursor, loading]);

  // Handle category changes
  const handleCategoryChange = (category: string) => {
    if (loading) return;
    setActiveCategory(category);
    setProducts([]);
    setCursor(null);
    setHasMore(true);
  };

  // Re-fetch when category changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchProducts(false);
    } else if (products.length === 0 && cursor === null && hasMore) {
      fetchProducts(false);
    }
  }, [activeCategory, products.length, cursor, hasMore, fetchProducts]);

  // Set up IntersectionObserver for Infinite Scroll
  useEffect(() => {
    const currentTarget = observerRef.current;
    if (!currentTarget || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchProducts(true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(currentTarget);
    return () => {
      observer.unobserve(currentTarget);
    };
  }, [hasMore, loading, fetchProducts]);

  // Calculate average latency
  const avgLatency = latencyHistory.length > 0
    ? Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length)
    : 0;

  return (
    <main className="flex-1 bg-zinc-950 text-zinc-100 min-h-screen selection:bg-teal-500 selection:text-black">
      {/* Header section with gradient */}
      <div className="relative overflow-hidden border-b border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-cyan-500/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Keysets & Cursor Pagination
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                AeroFeed
              </h1>
              <p className="mt-2 text-base text-zinc-400 max-w-2xl">
                High-performance keyset pagination engine testing ~200,000 products.
                Guaranteed zero duplicates or missed records when new entries arrive.
              </p>
            </div>

            {/* System Metrics Panel */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Database className="h-3 w-3 text-teal-400" /> DB Scale
                </span>
                <span className="text-lg font-bold text-zinc-200 mt-1">~200,000+</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Layers className="h-3 w-3 text-cyan-400" /> In View
                </span>
                <span className="text-lg font-bold text-zinc-200 mt-1">{products.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Clock className="h-3 w-3 text-emerald-400" /> Avg Latency
                </span>
                <span className="text-lg font-bold text-zinc-200 mt-1">{avgLatency ? `${avgLatency}ms` : 'N/A'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Cpu className="h-3 w-3 text-pink-400" /> Keyset Mode
                </span>
                <span className="text-xs font-bold text-emerald-400 mt-1 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-900/60 self-start">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Left Side: Sidebar Filter & DevConsole */}
        <div className="space-y-6 lg:col-span-1">
          {/* Category Filter Widget */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
              <Filter className="h-4 w-4 text-teal-400" /> Categories
            </h2>
            <div className="space-y-1.5">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    disabled={loading && !isActive}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-sm transition-all duration-200 ${isActive
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                      }`}
                  >
                    <span>{cat}</span>
                    {isActive && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dev Terminal Console Logger */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 font-mono text-xs overflow-hidden">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-teal-400" /> Developer Log
              </span>
              {queryLogs.length > 0 && (
                <button
                  onClick={() => setQueryLogs([])}
                  className="text-zinc-600 hover:text-zinc-400 transition"
                  title="Clear log console"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </h2>

            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
              {queryLogs.length === 0 ? (
                <p className="text-zinc-600 italic">No queries executed yet. Scroll down to trigger database requests.</p>
              ) : (
                queryLogs.map((log, idx) => (
                  <div key={idx} className="border-b border-zinc-800/50 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2 text-zinc-500">
                      <span>[{log.timestamp}]</span>
                      {log.latency > 0 && <span className="text-teal-400 font-semibold">{log.latency}ms</span>}
                    </div>
                    <p className={`mt-0.5 font-medium ${log.message.includes('ERROR') ? 'text-rose-400' : 'text-zinc-300'}`}>
                      {log.message}
                    </p>
                    <div className="mt-1 flex flex-col gap-0.5 text-[10px] text-zinc-600">
                      <div><span className="text-zinc-500 font-semibold">Cursor In:</span> {log.cursorUsed}</div>
                      <div><span className="text-zinc-500 font-semibold">Cursor Out:</span> {log.nextCursorReceived}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Product Catalog Grid */}
        <div className="lg:col-span-3 space-y-8">
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/50 text-rose-300 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 text-rose-400 shrink-0" />
              <div>
                <h3 className="font-semibold text-white">Database connection required</h3>
                <p className="text-sm text-rose-300/80 mt-1">
                  Ensure you configure your Supabase connection strings in the `.env` file, run database migrations, and execute the seed script.
                </p>
                <code className="block mt-2 px-2 py-1 bg-rose-950/60 rounded text-[11px] font-mono border border-rose-900/30">
                  {error}
                </code>
              </div>
            </div>
          )}

          {/* Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {products.map((product) => {
              const formattedDate = new Date(product.createdAt).toLocaleString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={product.id}
                  className="group relative flex flex-col bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden transition-all duration-300 hover:border-zinc-700/60 hover:bg-zinc-900/60 hover:shadow-2xl hover:shadow-teal-500/5"
                >
                  {/* Thumbnail Image */}
                  <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur border border-zinc-800 text-[10px] text-zinc-300 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                      {product.category}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-teal-400 transition duration-200">
                        {product.name}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    </div>

                    {/* Footer Details */}
                    <div className="mt-5 pt-4 border-t border-zinc-800/60 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black text-white">
                          ${product.price.toFixed(2)}
                        </span>

                        <span className="text-[10px] font-mono text-zinc-500 font-medium bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded">
                          {formattedDate}
                        </span>
                      </div>

                      {/* Debug Identifier details */}
                      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-600">
                        <span className="truncate max-w-[120px]" title={`Unique ID: ${product.id}`}>
                          ID: {product.id}
                        </span>
                        <span>Tie-breaker ready</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Skeletons Loading indicators */}
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-zinc-900/30 border border-zinc-800/40 rounded-xl overflow-hidden animate-pulse flex flex-col h-[320px]"
                >
                  <div className="aspect-video w-full bg-zinc-950/50" />
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-zinc-800 rounded w-3/4" />
                      <div className="h-3 bg-zinc-800 rounded w-5/6" />
                      <div className="h-3 bg-zinc-800 rounded w-2/3" />
                    </div>
                    <div className="h-6 bg-zinc-800 rounded w-1/3" />
                  </div>
                </div>
              ))
            }
          </div>

          {/* End of list indicator / Infinite scroll trigger / load more */}
          <div className="pt-4 pb-12 flex flex-col items-center justify-center">
            {hasMore ? (
              <div
                ref={observerRef}
                className="w-full flex justify-center py-6 text-sm text-zinc-500"
              >
                {loading ? (
                  <div className="flex items-center gap-2 text-teal-400 font-semibold">
                    <div className="h-4 w-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                    Querying Supabase Keyset...
                  </div>
                ) : (
                  <button
                    onClick={() => fetchProducts(true)}
                    className="px-6 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white hover:border-zinc-700 transition"
                  >
                    Scroll down or click to load more
                  </button>
                )}
              </div>
            ) : (
              <div className="text-zinc-600 text-center py-8 border-t border-zinc-900 w-full mt-4">
                <Check className="h-6 w-6 text-teal-500/60 mx-auto mb-2" />
                <p className="text-xs font-mono">End of database catalog reached. All available records loaded.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
