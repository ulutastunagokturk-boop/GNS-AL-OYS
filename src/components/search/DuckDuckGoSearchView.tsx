import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Globe, 
  ExternalLink, 
  Sparkles, 
  BookOpen, 
  ShieldCheck, 
  Bot, 
  ArrowRight, 
  RotateCcw, 
  Check, 
  Layers,
  GraduationCap,
  School,
  X,
  History,
  TrendingUp,
  Bookmark
} from 'lucide-react';
import { aiService } from '../../services/aiService';
import { DuckDuckGoSearchResponse } from '../../types';

interface DuckDuckGoSearchViewProps {
  onAskAi?: (query: string) => void;
  initialQuery?: string;
}

export const DuckDuckGoSearchView: React.FC<DuckDuckGoSearchViewProps> = ({
  onAskAi,
  initialQuery = ''
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'meb' | 'academic' | 'exam'>('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DuckDuckGoSearchResponse | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([
    '2026 MEB Çalışma Takvimi',
    'Fotosentez ve Kloroplast',
    'Gaziemir Nevvar Salih İşgören Anadolu Lisesi',
    'YKS TYT Matematik Konuları'
  ]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionBoxRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions with debounce as user types
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const items = await aiService.getDuckDuckGoSuggestions(query);
        setSuggestions(items);
      } catch {
        setSuggestions([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Hide suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionBoxRef.current && 
        !suggestionBoxRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Run initial search if query is provided
  useEffect(() => {
    if (initialQuery.trim()) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (searchTerm?: string, cat = selectedCategory) => {
    const q = (searchTerm !== undefined ? searchTerm : query).trim();
    if (!q) return;

    setLoading(true);
    setShowSuggestions(false);

    // Update history
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== q.toLowerCase());
      return [q, ...filtered].slice(0, 8);
    });

    try {
      const data = await aiService.searchDuckDuckGo(q, cat);
      setResult(data);
    } catch (err) {
      console.error('DuckDuckGo search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (cat: 'all' | 'meb' | 'academic' | 'exam') => {
    setSelectedCategory(cat);
    if (query.trim()) {
      handleSearch(query, cat);
    }
  };

  const applyBang = (bang: string, label: string) => {
    const newQuery = `${bang} ${query.replace(/!\w+\s*/, '')}`.trim();
    setQuery(newQuery);
    if (inputRef.current) inputRef.current.focus();
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const categories = [
    { id: 'all', label: 'Tüm Web', icon: Globe, desc: 'Genel DuckDuckGo arama motoru' },
    { id: 'meb', label: 'MEB & Mevzuat', icon: School, desc: 'site:meb.gov.tr resmî duyuruları' },
    { id: 'academic', label: 'Bilim & Ansiklopedi', icon: BookOpen, desc: 'Vikipedi & Akademik kavramlar' },
    { id: 'exam', label: 'YKS & Sınavlar', icon: GraduationCap, desc: 'ÖSYM ve YKS hazırlık kaynakları' },
  ];

  return (
    <div id="duckduckgo-search-view" className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Brand & Privacy Header */}
      <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100 dark:from-stone-900 dark:via-orange-950/40 dark:to-stone-900 p-6 rounded-2xl border border-orange-200/80 dark:border-orange-800/40 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-stone-800 shadow-md flex items-center justify-center p-2.5 border border-orange-300 dark:border-orange-700/60 flex-shrink-0">
              <img 
                src="https://duckduckgo.com/assets/logo_homepage.alt.v108.svg" 
                alt="DuckDuckGo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback icon if image blocked
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="text-2xl hidden" id="ddg-fallback-emoji">🦆</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  DuckDuckGo Güvenli Arama Portalı
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3" /> Sıfır İzleme
                </span>
              </div>
              <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                GNSİAL öğrencileri ve öğretmenleri için arama geçmişi kaydedilmeden, gizliliğinizi koruyarak güvenle arayın.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 text-xs text-stone-600 dark:text-stone-300 bg-white/70 dark:bg-stone-800/80 p-2.5 rounded-xl border border-orange-200/60 dark:border-orange-800/30">
            <div className="flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Kişisel Profil Yok
            </div>
            <span className="text-stone-300 dark:text-stone-600">•</span>
            <div className="flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Takipçi Engelli
            </div>
            <span className="text-stone-300 dark:text-stone-600">•</span>
            <div className="flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              MEB Uyumlu
            </div>
          </div>
        </div>
      </div>

      {/* Search Box & Controls */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
        {/* Input Bar */}
        <div className="relative">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-stone-500" />
              <input 
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Örn: 2026 MEB müfredatı, Fotosentez denklemi, Gaziemir Nevvar Salih İşgören Lisesi..."
                className="w-full pl-12 pr-10 py-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-base"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSuggestions([]);
                    if (inputRef.current) inputRef.current.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Search className="w-5 h-5" />
              )}
              <span>Ara</span>
            </button>
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div 
              ref={suggestionBoxRef}
              className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 shadow-xl z-30 overflow-hidden py-1 divide-y divide-stone-100 dark:divide-stone-700/50"
            >
              <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-stone-400 dark:text-stone-500 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
                DuckDuckGo Canlı Arama Önerileri
              </div>
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(item);
                    setShowSuggestions(false);
                    handleSearch(item);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-stone-800 dark:text-stone-200 hover:bg-orange-50 dark:hover:bg-stone-700 flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Search className="w-3.5 h-3.5 text-stone-400 group-hover:text-orange-500 transition-colors" />
                    <span>{item}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category Selector Tabs */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-stone-100 dark:border-stone-800">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isSelected 
                    ? 'bg-orange-600 text-white shadow-sm' 
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
                title={cat.desc}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Bangs & Helpful Shortcuts */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs text-stone-500 dark:text-stone-400">
          <span className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-orange-500" />
            DuckDuckGo Kısayolları (!Bangs):
          </span>
          <button 
            type="button"
            onClick={() => applyBang('!meb', 'MEB')}
            className="px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 hover:bg-orange-100 hover:text-orange-700 dark:hover:bg-orange-950/40 text-stone-700 dark:text-stone-300 font-mono text-xs transition-colors"
          >
            !meb <span className="text-[10px] text-stone-400">(MEB)</span>
          </button>
          <button 
            type="button"
            onClick={() => applyBang('!w', 'Vikipedi')}
            className="px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 hover:bg-orange-100 hover:text-orange-700 dark:hover:bg-orange-950/40 text-stone-700 dark:text-stone-300 font-mono text-xs transition-colors"
          >
            !w <span className="text-[10px] text-stone-400">(Vikipedi)</span>
          </button>
          <button 
            type="button"
            onClick={() => applyBang('!yt', 'YouTube')}
            className="px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 hover:bg-orange-100 hover:text-orange-700 dark:hover:bg-orange-950/40 text-stone-700 dark:text-stone-300 font-mono text-xs transition-colors"
          >
            !yt <span className="text-[10px] text-stone-400">(Video)</span>
          </button>
          <button 
            type="button"
            onClick={() => applyBang('!tdk', 'TDK Sözlük')}
            className="px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 hover:bg-orange-100 hover:text-orange-700 dark:hover:bg-orange-950/40 text-stone-700 dark:text-stone-300 font-mono text-xs transition-colors"
          >
            !tdk <span className="text-[10px] text-stone-400">(TDK)</span>
          </button>
        </div>
      </div>

      {/* Main Results Section */}
      {loading && (
        <div className="bg-white dark:bg-stone-900 p-12 rounded-2xl border border-stone-200 dark:border-stone-800 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
            DuckDuckGo ve MEB kaynakları taranıyor...
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-500">
            Kişisel verileriniz ve IP adresiniz kaydedilmeden güvenle getiriliyor.
          </p>
        </div>
      )}

      {!loading && result && (
        <div className="space-y-6">
          {/* Instant Answer / Knowledge Panel Card (if available) */}
          {result.instantAnswer && (
            <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/70 dark:from-stone-900 dark:to-orange-950/20 p-6 rounded-2xl border border-orange-200 dark:border-orange-800/40 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-orange-500 text-white">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-orange-800 dark:text-orange-300">
                    {result.instantAnswer.source || 'DuckDuckGo Anlık Bilgi Kartı'}
                  </span>
                </div>
                {onAskAi && (
                  <button
                    type="button"
                    onClick={() => onAskAi(`"${result.query}" konusu hakkında DuckDuckGo bilgilerine dayanarak detaylı bir ders ve çalışma özeti hazırla.`)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-sm"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    AI ile Detaylandır & Özetle
                  </button>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-5 items-start">
                {result.instantAnswer.image && (
                  <img 
                    src={result.instantAnswer.image} 
                    alt={result.instantAnswer.heading} 
                    className="w-full md:w-48 h-40 object-cover rounded-xl border border-orange-200 dark:border-stone-700 shadow-sm bg-white dark:bg-stone-800 flex-shrink-0"
                  />
                )}
                <div className="space-y-2 flex-1">
                  <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                    {result.instantAnswer.heading}
                  </h2>
                  <p className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed">
                    {result.instantAnswer.abstract}
                  </p>
                  {result.instantAnswer.url && (
                    <a
                      href={result.instantAnswer.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline pt-1"
                    >
                      <span>Resmî Makaleyi Aç</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Web Results & Sources */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-base">
                  Doğrulanmış Web Kaynakları ({result.sources.length})
                </h3>
              </div>
              <a
                href={result.duckDuckGoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-stone-800 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-stone-700 text-xs font-medium transition-colors border border-orange-200/60 dark:border-stone-700"
              >
                <span>DuckDuckGo'da Tüm Sonuçlar</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {result.sources.map((src, i) => (
                <div key={i} className="py-3.5 group first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5 truncate max-w-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        <span className="font-mono">{src.uri}</span>
                      </div>
                      <a
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-medium text-orange-700 dark:text-orange-400 group-hover:underline flex items-center gap-1.5"
                      >
                        <span>{src.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyLink(src.uri)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                        title="Bağlantıyı Kopyala"
                      >
                        {copiedUrl === src.uri ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Related Topics / İlgili Başlıklar */}
          {result.relatedTopics && result.relatedTopics.length > 0 && (
            <div className="bg-stone-50 dark:bg-stone-800/60 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                İlgili Konular & Aramalar
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.relatedTopics.map((rel, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(rel.title);
                      handleSearch(rel.title);
                    }}
                    className="text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-orange-400 dark:hover:border-orange-500 hover:text-orange-600 transition-colors"
                  >
                    {rel.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search History & Suggested Topics if no search executed yet */}
      {!result && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick School Search Topics */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-semibold text-sm">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span>Popüler Okul & MEB Aramaları</span>
            </div>
            <div className="space-y-2">
              {[
                { title: '2026 MEB Çalışma ve Tatil Takvimi', category: 'meb' },
                { title: 'Gaziemir Nevvar Salih İşgören Anadolu Lisesi Tarihçesi', category: 'all' },
                { title: '10. ve 11. Sınıf Fizik Formül ve Konu Özeti', category: 'academic' },
                { title: 'YKS Başvuru ve Sınav Tarihleri 2026', category: 'exam' },
                { title: 'MEB Ortaöğretim Yönetmeliği Devamsızlık Maddeleri', category: 'meb' },
                { title: 'Fotosentez ve Hücresel Solunum Karşılaştırması', category: 'academic' },
              ].map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQuery(item.title);
                    setSelectedCategory(item.category as any);
                    handleSearch(item.title, item.category as any);
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 hover:bg-orange-50 dark:hover:bg-stone-700/80 text-stone-700 dark:text-stone-300 text-xs sm:text-sm font-medium transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-stone-400 group-hover:text-orange-500 transition-colors" />
                    <span>{item.title}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* Privacy & Safe Browsing Promise */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Neden DuckDuckGo?</span>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-stone-600 dark:text-stone-300">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
                <span className="p-1 rounded-md bg-emerald-500 text-white flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </span>
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100">Kişiselleştirilmemiş Tarafsız Sonuçlar</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Arama geçmişinize göre filtrelenmez; herkes için nesnel, doğru ve tarafsız akademik kaynaklar sunar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-800/30">
                <span className="p-1 rounded-md bg-orange-500 text-white flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </span>
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100">AI ile Entegre Canlı Doğrulama</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    GNSİAL AI Öğretmen ve Rehber Koç Asistanı, en güncel bilgileri bu arama motoru üzerinden kontrol eder.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30">
                <span className="p-1 rounded-md bg-blue-500 text-white flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </span>
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100">Reklamsız ve Güvenli Okul Ortamı</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Öğrencilerimiz için dikkat dağıtıcı hedefli reklamlar ve zararlı içerikler filtrelenir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
