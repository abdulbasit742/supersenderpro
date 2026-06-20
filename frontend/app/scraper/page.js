'use client';

import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import Panel from '../../components/Panel';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../lib/api';

export default function ScraperPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  async function loadHistory() {
    try {
      const data = await api('/api/scraper/history');
      setHistory(data || []);
      if (data && data.length > 0 && !selectedItem) {
        setSelectedItem(data[0]);
      }
    } catch (err) {
      console.error('Failed to load scraper history:', err);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleScrape(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await api('/api/scraper/scrape', {
        method: 'POST',
        body: JSON.stringify({ url })
      });
      if (res.success && res.data) {
        setUrl('');
        setHistory(prev => [res.data, ...prev]);
        setSelectedItem(res.data);
      } else {
        setError(res.error || 'Scraping operation failed.');
      }
    } catch (err) {
      setError(err.message || 'Network error occurred during scrape.');
    } finally {
      setLoading(false);
    }
  }

  async function clearHistory() {
    if (!confirm('Are you sure you want to clear scraping history?')) return;
    try {
      await api('/api/scraper/clear', { method: 'POST' });
      setHistory([]);
      setSelectedItem(null);
    } catch (err) {
      console.error('Failed to clear scraper history:', err);
    }
  }

  return (
    <AppShell title="Web Intelligence & Scraper / ویب انٹیلیجنس پینل">
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left column: input form and logs history */}
        <div className="xl:col-span-1 space-y-6">
          <Panel title="Scrape New Webpage">
            <form onSubmit={handleScrape} className="grid gap-4 text-sm">
              <label className="grid gap-1">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Webpage URL</span>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="https://example.com/product"
                  value={url} 
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                />
              </label>

              <button 
                type="submit" 
                className="btn btn-primary w-full"
                disabled={loading || !url.trim()}
              >
                {loading ? 'Crawling & Capturing screenshot...' : '🚀 Scrape Webpage'}
              </button>

              {error && (
                <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}
            </form>
          </Panel>

          <Panel title="Scraped History Logs" action={
            history.length > 0 && (
              <button onClick={clearHistory} className="btn text-xs text-red-500 hover:bg-red-500/10">
                Clear Logs
              </button>
            )
          }>
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {history.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedItem(item)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedItem?.id === item.id 
                      ? 'border-emerald-500/50 bg-emerald-500/5' 
                      : 'border-line hover:bg-white/5'
                  }`}
                >
                  <div className="font-bold text-sm truncate">{item.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">{item.url}</div>
                  <div className="mt-2 flex justify-between items-center text-[10px]">
                    <StatusBadge tone={item.provider === 'firecrawl' ? 'good' : 'info'}>
                      {item.provider}
                    </StatusBadge>
                    <span className="text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <div className="text-center text-sm text-slate-400 py-6">
                  No scraped websites yet.
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Right column: scraped preview and content view */}
        <div className="xl:col-span-2 space-y-6">
          {selectedItem ? (
            <div className="grid gap-6">
              <Panel title="Scraped Content Details">
                <div className="space-y-4 text-sm">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Title</span>
                    <h2 className="text-lg font-bold">{selectedItem.title}</h2>
                  </div>

                  {selectedItem.description && (
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Description</span>
                      <p className="text-slate-600 dark:text-slate-300">{selectedItem.description}</p>
                    </div>
                  )}

                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase block mb-1">URL</span>
                    <a 
                      href={selectedItem.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-mint hover:underline font-mono text-xs"
                    >
                      {selectedItem.url} ↗
                    </a>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-400 uppercase">Parsed Body Content (Markdown/Text)</span>
                      <span className="text-xs text-slate-500">{(selectedItem.content || '').split(' ').length} words</span>
                    </div>
                    <pre className="p-4 rounded-xl border border-line bg-card max-h-72 overflow-y-auto font-mono text-xs whitespace-pre-wrap leading-relaxed">
                      {selectedItem.content}
                    </pre>
                  </div>
                </div>
              </Panel>

              <Panel title="Live Screenshot Capture Preview">
                <div className="rounded-xl border border-line overflow-hidden bg-card">
                  {selectedItem.screenshot ? (
                    <img 
                      src={selectedItem.screenshot} 
                      alt="Website screenshot" 
                      className="w-full h-auto object-cover max-h-[480px]"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="%23222831"/><text x="400" y="300" font-size="20" fill="%2300adb5" text-anchor="middle">Failed to render preview</text></svg>`;
                      }}
                    />
                  ) : (
                    <div className="p-12 text-center text-slate-400 text-sm">
                      No screenshot was captured.
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center text-slate-400">
              Select a scraped item or run a new scrape job to inspect details.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
