'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import Panel from '../../components/Panel';
import StatusBadge from '../../components/StatusBadge';
import { api, safeApi } from '../../lib/api';

const platformMeta = {
  facebook: { icon: 'f', title: 'Facebook Page', hint: 'Page posts, comments, Messenger webhook' },
  instagram: { icon: 'IG', title: 'Instagram Business', hint: 'Image posts, comments, DM events' },
  linkedin: { icon: 'in', title: 'LinkedIn', hint: 'Profile or organization posts' }
};

const emptyAccount = {
  platform: 'facebook',
  name: '',
  pageId: '',
  igUserId: '',
  authorUrn: '',
  accessToken: '',
  appId: '',
  appSecret: '',
  clientId: '',
  clientSecret: '',
  verifyToken: '',
  syncToSettings: true
};

export default function SocialPage() {
  const [status, setStatus] = useState({ platforms: [], accounts: [], recentPosts: [], recentEvents: [] });
  const [oauth, setOauth] = useState({ urls: {} });
  const [account, setAccount] = useState(emptyAccount);
  const [composer, setComposer] = useState({
    platform: 'facebook',
    accountId: '',
    message: 'AI Tools Store update: ChatGPT Plus, Claude Pro, Cursor Pro aur Gemini Advanced plans available hain. DM for today rates.',
    imageUrl: '',
    videoUrl: ''
  });
  const [videoProvider, setVideoProvider] = useState({
    name: '',
    apiUrl: '',
    apiKey: '',
    resultPath: '',
    statusUrl: ''
  });
  const [videoJob, setVideoJob] = useState({
    title: '',
    provider: 'auto',
    platforms: 'facebook, instagram, linkedin',
    prompt: '',
    message: '',
    videoUrl: '',
    imageUrl: '',
    durationSeconds: 8,
    aspectRatio: '9:16',
    scheduledAt: ''
  });
  const [comment, setComment] = useState({
    platform: 'facebook',
    accountId: '',
    targetId: '',
    parentCommentId: '',
    message: ''
  });
  const [notice, setNotice] = useState('');
  const [readiness, setReadiness] = useState(null);
  const [readinessLoading, setReadinessLoading] = useState(false);

  async function load() {
    const [state, urls] = await Promise.all([
      safeApi('/api/social/status', status),
      safeApi('/api/social/oauth/urls', { urls: {} })
    ]);
    setStatus(state);
    setOauth(urls);
  }

  useEffect(() => { load(); loadReadiness(); }, []);

  async function loadReadiness() {
    setReadinessLoading(true);
    try {
      const data = await safeApi('/api/social/readiness', null);
      setReadiness(data);
    } catch (e) {
      setReadiness(null);
    } finally {
      setReadinessLoading(false);
    }
  }

  const accountsByPlatform = useMemo(() => {
    const grouped = { facebook: [], instagram: [], linkedin: [] };
    for (const row of status.accounts || []) {
      if (grouped[row.platform]) grouped[row.platform].push(row);
    }
    return grouped;
  }, [status.accounts]);

  async function saveAccount(e) {
    e.preventDefault();
    setNotice('');
    try {
      const saved = await api('/api/social/accounts', {
        method: 'POST',
        body: JSON.stringify(account)
      });
      setNotice(`${saved.account?.label || 'Account'} saved. Token masked: ${saved.account?.tokenMasked || 'none'}`);
      setAccount({ ...emptyAccount, platform: account.platform });
      await load();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function publish() {
    setNotice('');
    try {
      const posted = await api('/api/social/publish', {
        method: 'POST',
        body: JSON.stringify(composer)
      });
      setNotice(`Published on ${posted.post.platform}. External ID: ${posted.post.externalId || 'saved'}`);
      await load();
    } catch (error) {
      setNotice(error.message);
      await load();
    }
  }

  async function testPlatform(platform) {
    const result = await safeApi(`/api/social/test/${platform}`, { configured: false, message: 'Test failed' }, { method: 'POST', body: JSON.stringify({}) });
    setNotice(`${platform}: ${result.message || (result.configured ? 'Configured' : 'Not configured yet')}`);
  }

  function connectOAuth(platform) {
    const url = oauth.urls?.[platform];
    if (!url) {
      setNotice(`${platform}: App ID/Client ID pehle save karein, phir OAuth connect button active ho ga.`);
      return;
    }
    window.location.href = url;
  }

  async function scanAutoPoster() {
    const result = await safeApi('/api/social/auto-poster/scan', { imported: 0 }, { method: 'POST', body: JSON.stringify({}) });
    setNotice(`Auto poster scanned. Imported: ${result.imported || 0}`);
    await load();
  }

  async function runAutoPoster() {
    const result = await safeApi('/api/social/auto-poster/run', { processed: 0 }, { method: 'POST', body: JSON.stringify({ force: true, limit: 10 }) });
    setNotice(`Auto poster processed: ${result.processed || 0}`);
    await load();
  }

  async function retryAutoPost(id) {
    await safeApi(`/api/social/auto-poster/jobs/${encodeURIComponent(id)}/retry`, {}, { method: 'POST', body: JSON.stringify({}) });
    await runAutoPoster();
  }

  async function saveVideoProvider(e) {
    e.preventDefault();
    const saved = await safeApi('/api/video-agent/providers', {}, {
      method: 'POST',
      body: JSON.stringify({ ...videoProvider, authHeader: 'Authorization', authPrefix: 'Bearer ', method: 'POST', enabled: true })
    });
    setNotice(saved.provider ? `${saved.provider.name} video provider saved.` : 'Video provider save failed');
    setVideoProvider({ name: '', apiUrl: '', apiKey: '', resultPath: '', statusUrl: '' });
    await load();
  }

  async function scanVideoAgent() {
    const result = await safeApi('/api/video-agent/scan', { imported: 0 }, { method: 'POST', body: JSON.stringify({}) });
    setNotice(`Video agent scanned. Imported: ${result.imported || 0}`);
    await load();
  }

  async function runVideoAgent() {
    const result = await safeApi('/api/video-agent/run', { processed: 0 }, { method: 'POST', body: JSON.stringify({ force: true, limit: 5 }) });
    setNotice(`Video agent processed: ${result.processed || 0}`);
    await load();
  }

  async function retryVideoJob(id) {
    await safeApi(`/api/video-agent/jobs/${encodeURIComponent(id)}/retry`, {}, { method: 'POST', body: JSON.stringify({}) });
    await runVideoAgent();
  }

  async function createVideoJob(runNow = false) {
    try {
      const created = await api('/api/video-agent/jobs', {
        method: 'POST',
        body: JSON.stringify(videoJob)
      });
      setNotice(`Video job queued: ${created.job?.title || created.job?.id}`);
      if (runNow) await runVideoAgent();
      else await load();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function sendComment() {
    try {
      const sent = await api('/api/social/comment', {
        method: 'POST',
        body: JSON.stringify(comment)
      });
      setNotice(`Comment sent: ${sent.event?.externalId || sent.event?.id || 'saved'}`);
      await load();
    } catch (error) {
      setNotice(error.message);
      await load();
    }
  }

  return (
    <AppShell title="Social Platforms / Meta + LinkedIn">

      {/* Social Production Readiness Panel */}
      <Panel title="Social Production Readiness">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {readiness ? (
              <StatusBadge tone={readiness.readiness === 'production-ready' ? 'good' : readiness.readiness === 'staging-ready' ? 'warn' : 'bad'}>
                {readiness.readiness || 'unknown'}
              </StatusBadge>
            ) : (
              <StatusBadge tone="warn">{readinessLoading ? 'Checking...' : 'Not loaded'}</StatusBadge>
            )}
            {readiness && (
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Score: {readiness.score}% &middot; {readiness.totals?.passed}/{readiness.totals?.checks} passed
              </span>
            )}
          </div>
          <button className="btn btn-sm" onClick={loadReadiness} disabled={readinessLoading}>
            {readinessLoading ? 'Checking...' : 'Refresh Readiness'}
          </button>
        </div>

        {readiness && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-3">
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2 text-center">
                <p className="text-xs text-slate-500">Accounts</p>
                <p className="font-bold text-slate-800 dark:text-slate-100">{readiness.summary?.configuredAccounts}/{readiness.summary?.socialAccounts}</p>
              </div>
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2 text-center">
                <p className="text-xs text-slate-500">Critical Failed</p>
                <p className={`font-bold ${readiness.totals?.criticalFailed > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{readiness.totals?.criticalFailed}</p>
              </div>
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2 text-center">
                <p className="text-xs text-slate-500">Warnings</p>
                <p className={`font-bold ${readiness.totals?.warningFailed > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{readiness.totals?.warningFailed}</p>
              </div>
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2 text-center">
                <p className="text-xs text-slate-500">Public URL</p>
                <p className="text-xs font-medium truncate text-slate-700 dark:text-slate-300">{readiness.summary?.publicBaseUrl || 'missing'}</p>
              </div>
            </div>

            {readiness.nextSteps && readiness.nextSteps.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Top Issues</p>
                <ul className="space-y-1">
                  {readiness.nextSteps.slice(0, 5).map((step, idx) => (
                    <li key={idx} className="flex gap-2 text-xs">
                      <span className={`shrink-0 font-bold ${step.level === 'critical' ? 'text-red-500' : 'text-amber-500'}`}>[{step.level}]</span>
                      <span className="text-slate-600 dark:text-slate-400">{step.name} &mdash; {step.recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {readiness.nextSteps && readiness.nextSteps.length === 0 && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">All checks passed. Ready for production posting.</p>
            )}
          </>
        )}

        <p className="mt-3 text-xs text-slate-400">CLI: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">npm run social:check</code> &middot; <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">npm run social:smoke</code></p>
      </Panel>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {Object.entries(platformMeta).map(([key, meta]) => {
          const row = (status.platforms || []).find((item) => item.platform === key) || {};
          const configured = Boolean(row.configured);
          return (
            <Panel key={key} title={meta.title}>
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
                  key === 'facebook' ? 'bg-blue-600 text-white' : key === 'instagram' ? 'bg-pink-600 text-white' : 'bg-sky-700 text-white'
                }`}>
                  {meta.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <StatusBadge tone={configured ? 'good' : 'warn'}>{configured ? 'Ready' : 'Token needed'}</StatusBadge>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{meta.hint}</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Accounts: {row.accounts || 0}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="btn" onClick={() => testPlatform(key)}>Test config</button>
                <button className="btn btn-primary" onClick={() => connectOAuth(key)}>{configured ? 'Reconnect' : 'Connect'}</button>
              </div>
            </Panel>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel title="Connect Account">
          <form onSubmit={saveAccount} className="grid gap-3">
            <select className="input" value={account.platform} onChange={(e) => setAccount({ ...emptyAccount, platform: e.target.value, syncToSettings: true })}>
              <option value="facebook">Facebook Page</option>
              <option value="instagram">Instagram Business</option>
              <option value="linkedin">LinkedIn</option>
            </select>
            <input className="input" placeholder="Display name" value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} />
            {account.platform === 'facebook' ? (
              <>
                <input className="input" placeholder="Facebook Page ID" value={account.pageId} onChange={(e) => setAccount({ ...account, pageId: e.target.value })} />
                <input className="input" placeholder="Meta App ID" value={account.appId} onChange={(e) => setAccount({ ...account, appId: e.target.value })} />
                <input className="input" placeholder="Meta App Secret" value={account.appSecret} onChange={(e) => setAccount({ ...account, appSecret: e.target.value })} />
                <input className="input" placeholder="Meta Webhook Verify Token" value={account.verifyToken} onChange={(e) => setAccount({ ...account, verifyToken: e.target.value })} />
              </>
            ) : null}
            {account.platform === 'instagram' ? (
              <>
                <input className="input" placeholder="Instagram Business User ID" value={account.igUserId} onChange={(e) => setAccount({ ...account, igUserId: e.target.value })} />
                <input className="input" placeholder="Connected Facebook Page ID" value={account.pageId} onChange={(e) => setAccount({ ...account, pageId: e.target.value })} />
              </>
            ) : null}
            {account.platform === 'linkedin' ? (
              <>
                <input className="input" placeholder="Author URN: urn:li:person:... or urn:li:organization:..." value={account.authorUrn} onChange={(e) => setAccount({ ...account, authorUrn: e.target.value })} />
                <input className="input" placeholder="LinkedIn Client ID" value={account.clientId} onChange={(e) => setAccount({ ...account, clientId: e.target.value })} />
                <input className="input" placeholder="LinkedIn Client Secret" value={account.clientSecret} onChange={(e) => setAccount({ ...account, clientSecret: e.target.value })} />
              </>
            ) : null}
            <textarea className="input min-h-24" placeholder="Access token" value={account.accessToken} onChange={(e) => setAccount({ ...account, accessToken: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={account.syncToSettings} onChange={(e) => setAccount({ ...account, syncToSettings: e.target.checked })} />
              Sync this account to backend settings
            </label>
            <button className="btn btn-primary">Save social account</button>
            <div className="rounded-xl border border-line bg-card p-3 text-xs text-slate-500 dark:text-slate-400">
              Meta access token, page IDs aur LinkedIn URN aap baad mein provide kar den. System abhi structure ready rakhega.
            </div>
          </form>
        </Panel>

        <Panel title="Publish Composer">
          <div className="grid gap-3">
            <select className="input" value={composer.platform} onChange={(e) => setComposer({ ...composer, platform: e.target.value, accountId: '' })}>
              <option value="facebook">Facebook Page</option>
              <option value="instagram">Instagram Business</option>
              <option value="linkedin">LinkedIn</option>
            </select>
            <select className="input" value={composer.accountId} onChange={(e) => setComposer({ ...composer, accountId: e.target.value })}>
              <option value="">Auto-select configured account</option>
              {(accountsByPlatform[composer.platform] || []).map((row) => (
                <option key={row.id} value={row.id}>{row.name} {row.configured ? '(ready)' : '(needs token)'}</option>
              ))}
            </select>
            <textarea className="input min-h-40" value={composer.message} onChange={(e) => setComposer({ ...composer, message: e.target.value })} />
            <input className="input" placeholder="Image URL (required for Instagram publishing)" value={composer.imageUrl} onChange={(e) => setComposer({ ...composer, imageUrl: e.target.value })} />
            <input className="input" placeholder="Video URL (AI video / reels)" value={composer.videoUrl} onChange={(e) => setComposer({ ...composer, videoUrl: e.target.value })} />
            <button className="btn btn-primary" onClick={publish}>Publish now</button>
            {notice ? <div className="rounded-xl border border-line bg-card p-3 text-sm">{notice}</div> : null}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Panel title="Connected Accounts">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Platform</th>
                  <th className="table-th">Name</th>
                  <th className="table-th">ID</th>
                  <th className="table-th">Token</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {(status.accounts || []).map((row) => (
                  <tr key={row.id}>
                    <td className="table-td capitalize">{row.platform}</td>
                    <td className="table-td font-bold">{row.name}</td>
                    <td className="table-td text-xs">{row.pageId || row.igUserId || row.authorUrn || '-'}</td>
                    <td className="table-td text-xs">{row.tokenMasked || '-'}</td>
                    <td className="table-td"><StatusBadge tone={row.configured ? 'good' : 'warn'}>{row.configured ? 'ready' : 'missing'}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="OAuth Helper URLs">
          <div className="space-y-3 text-sm">
            {Object.entries(oauth.urls || {}).map(([platform, url]) => (
              <div key={platform} className="rounded-xl border border-line bg-card p-3">
                <div className="mb-1 font-bold capitalize">{platform}</div>
                {url ? (
                  <div className="space-y-2">
                    <button className="btn btn-primary" onClick={() => connectOAuth(platform)}>Connect {platform}</button>
                    <div className="break-all text-xs text-slate-500 dark:text-slate-400">{url}</div>
                  </div>
                ) : (
                  <div className="text-slate-500 dark:text-slate-400">App/Client ID add karne ke baad OAuth URL yahan show ho ga.</div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Panel title="AI Video Agent">
          <div className="grid gap-3">
            <div className="rounded-xl border border-line bg-card p-3 text-xs text-slate-500 dark:text-slate-400">
              <div><span className="font-bold text-slate-700 dark:text-slate-200">Inbox:</span> {status.videoAgent?.inbox || 'video-auto-posts/inbox'}</div>
              <div><span className="font-bold text-slate-700 dark:text-slate-200">Assets:</span> {status.videoAgent?.assets || 'video-auto-posts/assets'}</div>
              <div><span className="font-bold text-slate-700 dark:text-slate-200">Generated:</span> {status.videoAgent?.generated || 'video-auto-posts/generated'}</div>
              <div><span className="font-bold text-slate-700 dark:text-slate-200">Public URL:</span> {status.videoAgent?.publicBaseUrl || 'http://localhost:3001'}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line bg-card p-4">
                <div className="text-2xl font-black">{Number((status.videoAgent?.counts?.queued || 0) + (status.videoAgent?.counts?.blocked || 0)).toLocaleString()}</div>
                <div className="text-xs text-slate-500">Queued / blocked</div>
              </div>
              <div className="rounded-xl border border-line bg-card p-4">
                <div className="text-2xl font-black">{Number((status.videoAgent?.counts?.posted || 0) + (status.videoAgent?.counts?.partial || 0)).toLocaleString()}</div>
                <div className="text-xs text-slate-500">Posted</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn" onClick={scanVideoAgent}>Scan video folder</button>
              <button className="btn btn-primary" onClick={runVideoAgent}>Generate + post</button>
            </div>
            <pre className="rounded-xl border border-line bg-card p-3 text-xs whitespace-pre-wrap">{`provider: auto
platforms: facebook, instagram, linkedin
durationSeconds: 8
aspectRatio: 9:16
message: AI Tools Store update. DM for today rates.
---
Create a vertical promo video for ChatGPT Plus, Claude Pro, Cursor Pro, Gemini Advanced.`}</pre>
          </div>
        </Panel>

        <Panel title="Video Provider Slot">
          <form onSubmit={saveVideoProvider} className="grid gap-3">
            <input className="input" placeholder="Provider name: Runway / Pika / Luma / Kling" value={videoProvider.name} onChange={(e) => setVideoProvider({ ...videoProvider, name: e.target.value })} />
            <input className="input" placeholder="API URL" value={videoProvider.apiUrl} onChange={(e) => setVideoProvider({ ...videoProvider, apiUrl: e.target.value })} />
            <textarea className="input min-h-24" placeholder="API key" value={videoProvider.apiKey} onChange={(e) => setVideoProvider({ ...videoProvider, apiKey: e.target.value })} />
            <input className="input" placeholder="Result path, e.g. data.video_url" value={videoProvider.resultPath} onChange={(e) => setVideoProvider({ ...videoProvider, resultPath: e.target.value })} />
            <input className="input" placeholder="Status URL optional, e.g. https://api.../{id}" value={videoProvider.statusUrl} onChange={(e) => setVideoProvider({ ...videoProvider, statusUrl: e.target.value })} />
            <button className="btn btn-primary">Save provider</button>
          </form>
          <div className="mt-4 space-y-2">
            {(status.videoAgent?.providers || []).map((provider) => (
              <div key={provider.id} className="rounded-xl border border-line bg-card p-3 text-sm">
                <StatusBadge tone={provider.configured ? 'good' : 'warn'}>{provider.configured ? 'ready' : 'key needed'}</StatusBadge>
                <span className="ml-2 font-bold">{provider.name}</span>
                <div className="mt-1 truncate text-xs text-slate-500">{provider.apiUrl || 'API URL missing'} · {provider.tokenMasked}</div>
              </div>
            ))}
            {!(status.videoAgent?.providers || []).length ? <div className="text-sm text-slate-500">No AI video providers yet.</div> : null}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Panel title="Manual Video + Caption">
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input className="input" placeholder="Video title" value={videoJob.title} onChange={(e) => setVideoJob({ ...videoJob, title: e.target.value })} />
              <select className="input" value={videoJob.provider} onChange={(e) => setVideoJob({ ...videoJob, provider: e.target.value })}>
                <option value="auto">Auto-select provider</option>
                {(status.videoAgent?.providers || []).map((provider) => (
                  <option key={provider.id} value={provider.id}>{provider.name} {provider.configured ? '(ready)' : '(needs key)'}</option>
                ))}
              </select>
            </div>
            <input className="input" placeholder="Platforms: facebook, instagram, linkedin" value={videoJob.platforms} onChange={(e) => setVideoJob({ ...videoJob, platforms: e.target.value })} />
            <textarea className="input min-h-28" placeholder="AI video prompt" value={videoJob.prompt} onChange={(e) => setVideoJob({ ...videoJob, prompt: e.target.value })} />
            <textarea className="input min-h-24" placeholder="Caption / post text" value={videoJob.message} onChange={(e) => setVideoJob({ ...videoJob, message: e.target.value })} />
            <div className="grid gap-3 md:grid-cols-2">
              <input className="input" placeholder="Existing video URL optional" value={videoJob.videoUrl} onChange={(e) => setVideoJob({ ...videoJob, videoUrl: e.target.value })} />
              <input className="input" placeholder="Reference image URL optional" value={videoJob.imageUrl} onChange={(e) => setVideoJob({ ...videoJob, imageUrl: e.target.value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <input className="input" type="number" min="3" max="60" value={videoJob.durationSeconds} onChange={(e) => setVideoJob({ ...videoJob, durationSeconds: Number(e.target.value || 8) })} />
              <select className="input" value={videoJob.aspectRatio} onChange={(e) => setVideoJob({ ...videoJob, aspectRatio: e.target.value })}>
                <option value="9:16">9:16 Reel</option>
                <option value="1:1">1:1 Square</option>
                <option value="16:9">16:9 Landscape</option>
              </select>
              <input className="input" type="datetime-local" value={videoJob.scheduledAt} onChange={(e) => setVideoJob({ ...videoJob, scheduledAt: e.target.value })} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn" onClick={() => createVideoJob(false)}>Save job</button>
              <button className="btn btn-primary" onClick={() => createVideoJob(true)}>Save + generate/post</button>
            </div>
          </div>
        </Panel>

        <Panel title="Social Comments / Replies">
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <select className="input" value={comment.platform} onChange={(e) => setComment({ ...comment, platform: e.target.value, accountId: '' })}>
                <option value="facebook">Facebook Page</option>
                <option value="instagram">Instagram Business</option>
                <option value="linkedin">LinkedIn</option>
              </select>
              <select className="input" value={comment.accountId} onChange={(e) => setComment({ ...comment, accountId: e.target.value })}>
                <option value="">Auto-select configured account</option>
                {(accountsByPlatform[comment.platform] || []).map((row) => (
                  <option key={row.id} value={row.id}>{row.name} {row.configured ? '(ready)' : '(needs token)'}</option>
                ))}
              </select>
            </div>
            <input className="input" placeholder="Target post/media ID or LinkedIn URN" value={comment.targetId} onChange={(e) => setComment({ ...comment, targetId: e.target.value })} />
            <input className="input" placeholder="Parent comment ID optional" value={comment.parentCommentId} onChange={(e) => setComment({ ...comment, parentCommentId: e.target.value })} />
            <textarea className="input min-h-28" placeholder="Comment text" value={comment.message} onChange={(e) => setComment({ ...comment, message: e.target.value })} />
            <button className="btn btn-primary" onClick={sendComment}>Send comment / reply</button>
            <div className="space-y-2">
              {(status.recentEvents || []).filter((row) => String(row.type || '').includes('comment')).slice(0, 5).map((row) => (
                <div key={row.id} className="rounded-xl border border-line bg-card p-3 text-sm">
                  <StatusBadge tone={row.type === 'comment_failed' ? 'bad' : 'good'}>{row.type}</StatusBadge>
                  <span className="ml-2 font-bold capitalize">{row.platform}</span>
                  <div className="mt-1 text-xs text-slate-500">{row.text || row.externalId}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="AI Video Jobs">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Video</th>
                  <th className="table-th">Provider</th>
                  <th className="table-th">Platforms</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Action</th>
                </tr>
              </thead>
              <tbody>
                {(status.videoAgent?.latest || []).map((job) => (
                  <tr key={job.id}>
                    <td className="table-td">
                      <div className="font-bold">{job.title || job.originalName}</div>
                      <div className="max-w-sm truncate text-xs text-slate-500">{job.prompt || job.message || job.lastError}</div>
                    </td>
                    <td className="table-td">{job.provider || 'auto'}</td>
                    <td className="table-td">{(job.platforms || []).join(', ')}</td>
                    <td className="table-td"><StatusBadge tone={job.status === 'posted' ? 'good' : job.status === 'failed' ? 'bad' : 'warn'}>{job.status}</StatusBadge></td>
                    <td className="table-td">{['failed', 'blocked', 'partial'].includes(job.status) ? <button className="btn" onClick={() => retryVideoJob(job.id)}>Retry</button> : '-'}</td>
                  </tr>
                ))}
                {!(status.videoAgent?.latest || []).length ? (
                  <tr><td className="table-td text-slate-500" colSpan="5">No AI video jobs yet. Drop prompts in video-auto-posts/inbox.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Panel title="Auto Poster Folder">
          <div className="grid gap-3">
            <div className="rounded-xl border border-line bg-card p-3 text-xs text-slate-500 dark:text-slate-400">
              <div><span className="font-bold text-slate-700 dark:text-slate-200">Inbox:</span> {status.autoPoster?.inbox || 'social-auto-posts/inbox'}</div>
              <div><span className="font-bold text-slate-700 dark:text-slate-200">Media:</span> {status.autoPoster?.media || 'social-auto-posts/media'}</div>
              <div><span className="font-bold text-slate-700 dark:text-slate-200">Public URL:</span> {status.autoPoster?.publicBaseUrl || 'http://localhost:3001'}</div>
              <div><span className="font-bold text-slate-700 dark:text-slate-200">Posted:</span> {status.autoPoster?.posted || 'social-auto-posts/posted'}</div>
              <div><span className="font-bold text-slate-700 dark:text-slate-200">Failed:</span> {status.autoPoster?.failed || 'social-auto-posts/failed'}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line bg-card p-4">
                <div className="text-2xl font-black">{Number(status.autoPoster?.counts?.queued || 0).toLocaleString()}</div>
                <div className="text-xs text-slate-500">Queued</div>
              </div>
              <div className="rounded-xl border border-line bg-card p-4">
                <div className="text-2xl font-black">{Number((status.autoPoster?.counts?.posted || 0) + (status.autoPoster?.counts?.partial || 0)).toLocaleString()}</div>
                <div className="text-xs text-slate-500">Posted</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn" onClick={scanAutoPoster}>Scan folder</button>
              <button className="btn btn-primary" onClick={runAutoPoster}>Run now</button>
            </div>
            <pre className="rounded-xl border border-line bg-card p-3 text-xs whitespace-pre-wrap">{`platforms: facebook, instagram, linkedin
image: offer.jpg
scheduledAt: 2026-05-08T20:00:00+05:00
---
Aaj ke AI tools plans available hain.
DM for rates.`}</pre>
          </div>
        </Panel>

        <Panel title="Auto Poster Jobs">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Post</th>
                  <th className="table-th">Platforms</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Action</th>
                </tr>
              </thead>
              <tbody>
                {(status.autoPoster?.latest || []).map((job) => (
                  <tr key={job.id}>
                    <td className="table-td">
                      <div className="font-bold">{job.title || job.originalName}</div>
                      <div className="max-w-sm truncate text-xs text-slate-500">{job.message || job.lastError}</div>
                    </td>
                    <td className="table-td">{(job.platforms || []).join(', ')}</td>
                    <td className="table-td"><StatusBadge tone={job.status === 'posted' ? 'good' : job.status === 'failed' ? 'bad' : 'warn'}>{job.status}</StatusBadge></td>
                    <td className="table-td">{['failed', 'blocked', 'partial'].includes(job.status) ? <button className="btn" onClick={() => retryAutoPost(job.id)}>Retry</button> : '-'}</td>
                  </tr>
                ))}
                {!(status.autoPoster?.latest || []).length ? (
                  <tr><td className="table-td text-slate-500" colSpan="4">No jobs yet. Drop files in inbox folder.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Panel title="Recent Social Posts">
          <div className="space-y-3">
            {(status.recentPosts || []).map((row) => (
              <div key={row.id} className="rounded-xl border border-line bg-card p-3 text-sm">
                <StatusBadge tone={row.status === 'published' ? 'good' : row.status === 'failed' ? 'bad' : 'warn'}>{row.status}</StatusBadge>
                <span className="ml-2 font-bold capitalize">{row.platform}</span>
                <p className="mt-2 text-slate-500 dark:text-slate-400">{row.message}</p>
                {row.error ? <p className="mt-2 text-red-500">{row.error}</p> : null}
              </div>
            ))}
            {!(status.recentPosts || []).length ? <div className="text-sm text-slate-500">No social posts yet.</div> : null}
          </div>
        </Panel>

        <Panel title="Recent Social Events">
          <div className="space-y-3">
            {(status.recentEvents || []).map((row) => (
              <div key={row.id} className="rounded-xl border border-line bg-card p-3 text-sm">
                <StatusBadge>{row.type}</StatusBadge>
                <span className="ml-2 font-bold capitalize">{row.platform}</span>
                <p className="mt-2 text-slate-500 dark:text-slate-400">{row.text || row.externalId || 'Webhook event saved'}</p>
              </div>
            ))}
            {!(status.recentEvents || []).length ? <div className="text-sm text-slate-500">No webhook events yet.</div> : null}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
