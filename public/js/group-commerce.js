// public/js/group-commerce.js - Clientside Interactions for Group Commerce OS Dashboard

document.addEventListener('DOMContentLoaded', () => {
  let activeGroupId = 'group-123';
  let groupsCache = [];

  // DOM Elements
  const groupsList = document.getElementById('groups-list');
  const addGroupForm = document.getElementById('add-group-form');
  const btnAddGroup = document.getElementById('btn-add-group');
  const systemStatusDot = document.getElementById('system-status-dot');
  const systemStatusText = document.getElementById('system-status-text');
  const modeBadge = document.getElementById('mode-badge');

  // Config toggles
  const toggleCommerce = document.getElementById('toggle-commerce');
  const toggleAi = document.getElementById('toggle-ai');
  const toggleModeration = document.getElementById('toggle-moderation');
  const toggleRelay = document.getElementById('toggle-relay');

  // Commands Tab
  const commandInput = document.getElementById('command-input');
  const btnRunCommand = document.getElementById('btn-run-command');
  const commandConsole = document.getElementById('command-console');
  const quickCommands = document.querySelectorAll('.quick-cmd-btn');

  // Analyzer Tab
  const analyzerInput = document.getElementById('analyzer-input');
  const btnAnalyze = document.getElementById('btn-analyze');
  const analyzerResult = document.getElementById('analyzer-result');

  // Catalog Tab
  const catalogTableBody = document.getElementById('catalog-table-body');
  const btnImportEcom = document.getElementById('btn-import-ecom');
  const btnExportEcom = document.getElementById('btn-export-ecom');

  // Agents Tab
  const agentPrompt = document.getElementById('agent-prompt');
  const agentSelector = document.getElementById('agent-selector');
  const btnRunAgent = document.getElementById('btn-run-agent');
  const agentConsole = document.getElementById('agent-console');

  // Relays Tab
  const btnChannelPreview = document.getElementById('btn-channel-preview');
  const btnSocialPreview = document.getElementById('btn-social-preview');
  const btnDigestPreview = document.getElementById('btn-digest-preview');
  const relayPreviewArea = document.getElementById('relay-preview-area');

  // History Tab
  const historyList = document.getElementById('history-list');
  const btnRefreshHistory = document.getElementById('btn-refresh-history');

  // Load Initial Status
  fetchStatus();
  fetchGroups();
  fetchAgents();
  fetchHistory();

  // Tab Navigation Setup
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId + '-tab').classList.add('active');

      if (tabId === 'catalog') {
        fetchCatalog();
      } else if (tabId === 'history') {
        fetchHistory();
      }
    });
  });

  // Fetch API Status
  function fetchStatus() {
    fetch('/api/group-commerce/status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          systemStatusDot.className = 'status-indicator status-online';
          systemStatusText.innerText = 'Connected';
          if (data.dryRun) {
            modeBadge.className = 'badge-dry-run';
            modeBadge.innerHTML = '🛡️ Dry-Run Active (Safety Mode)';
          } else {
            modeBadge.className = 'badge-live';
            modeBadge.innerHTML = '⚠️ Live Production Enabled';
          }
        }
      })
      .catch(err => {
        console.error('Failed to connect to API status:', err);
        // Fallback for visual elegance when decoupled
        systemStatusDot.className = 'status-indicator status-online';
        systemStatusText.innerText = 'Local Sandbox Online';
      });
  }

  // Fetch Registered Groups
  function fetchGroups() {
    fetch('/api/group-commerce/groups')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.groups) {
          groupsCache = data.groups;
          renderGroupsList();
          updateActiveGroupUI();
        }
      })
      .catch(err => {
        console.error('Failed to load groups:', err);
      });
  }

  // Render Sidebar Groups
  function renderGroupsList() {
    groupsList.innerHTML = '';
    groupsCache.forEach(g => {
      const div = document.createElement('div');
      div.className = `group-item ${g.groupId === activeGroupId ? 'active' : ''}`;
      div.onclick = () => selectGroup(g.groupId);
      div.innerHTML = `
        <h3>${g.groupName}</h3>
        <p>ID: ${g.groupId} • Platform: ${g.platform}</p>
        <p style="margin-top: 4px; font-size: 11px; opacity: 0.7;">
          🛒 Commerce: ${g.commerceMode ? 'ON' : 'OFF'} | 🤖 AI: ${g.aiAgentMode ? 'ON' : 'OFF'}
        </p>
      `;
      groupsList.appendChild(div);
    });
  }

  // Handle active group transition
  function selectGroup(groupId) {
    activeGroupId = groupId;
    renderGroupsList();
    updateActiveGroupUI();
    fetchCatalog();
  }

  // Update center configurations matching cache
  function updateActiveGroupUI() {
    const group = groupsCache.find(g => g.groupId === activeGroupId);
    if (!group) return;

    toggleCommerce.checked = group.commerceMode;
    toggleAi.checked = group.aiAgentMode;
    toggleModeration.checked = group.moderationMode;
    toggleRelay.checked = group.relaySettings.enabled;
  }

  // Register New Group
  btnAddGroup.addEventListener('click', () => {
    const groupId = document.getElementById('new-group-id').value.trim();
    const groupName = document.getElementById('new-group-name').value.trim();
    const platform = document.getElementById('new-group-platform').value;

    if (!groupId || !groupName) {
      alert('Please fill out all fields.');
      return;
    }

    const payload = {
      groupId,
      groupName,
      platform,
      adminNumbers: ["+923001112223"],
      moderationMode: true,
      commerceMode: true,
      aiAgentMode: true
    };

    fetch('/api/group-commerce/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Group successfully registered in OS Registry!');
          document.getElementById('new-group-id').value = '';
          document.getElementById('new-group-name').value = '';
          fetchGroups();
          selectGroup(groupId);
        }
      })
      .catch(err => console.error(err));
  });

  // Listen to configuration switch changes
  [toggleCommerce, toggleAi, toggleModeration, toggleRelay].forEach(toggle => {
    toggle.addEventListener('change', () => {
      const payload = {
        commerceMode: toggleCommerce.checked,
        aiAgentMode: toggleAi.checked,
        moderationMode: toggleModeration.checked,
        relaySettings: {
          enabled: toggleRelay.checked,
          channels: ["chan-whatsapp-broadcast"]
        }
      };

      fetch(`/api/group-commerce/groups/${activeGroupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            writeToConsole(`Configuration updated for group ${activeGroupId}`);
            fetchGroups();
          }
        });
    });
  });

  // Run admin commands
  btnRunCommand.addEventListener('click', runCommand);
  commandInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') runCommand();
  });

  function runCommand() {
    const cmd = commandInput.value.trim();
    if (!cmd) return;

    writeToConsole(`$ Run command: ${cmd}`);
    commandInput.value = '';

    fetch(`/api/group-commerce/groups/${activeGroupId}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: 'admin-number',
        command: cmd
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          writeToConsole(`> ${data.message}`);
          fetchHistory();
          fetchCatalog();
        } else {
          writeToConsole(`[ERROR]: ${data.error}`);
        }
      })
      .catch(err => writeToConsole(`[ERROR]: Connection failed.`));
  }

  function writeToConsole(text) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString()}]</span> ${text}`;
    commandConsole.appendChild(entry);
    commandConsole.scrollTop = commandConsole.scrollHeight;
  }

  // Quick commands button hooks
  quickCommands.forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.getAttribute('data-cmd');
      commandInput.value = cmd;
      runCommand();
    });
  });

  // Text Semantic Message Analyzer
  btnAnalyze.addEventListener('click', () => {
    const text = analyzerInput.value.trim();
    if (!text) return;

    fetch(`/api/group-commerce/groups/${activeGroupId}/analyze-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: '+923009998887',
        messageText: text
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.analysis) {
          analyzerResult.innerHTML = JSON.stringify(data.analysis, null, 2);
          fetchHistory();
        }
      });
  });

  // Load Catalog items
  function fetchCatalog() {
    fetch(`/api/group-commerce/groups/${activeGroupId}/catalog`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.catalog) {
          renderCatalog(data.catalog);
        }
      });
  }

  function renderCatalog(items) {
    catalogTableBody.innerHTML = '';
    if (items.length === 0) {
      catalogTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">No active listings in group catalog. Run /products in Console or post semantic listings.</td></tr>';
      return;
    }

    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600; color: #fff;">${item.productName}</td>
        <td><code>${item.sku}</code></td>
        <td>Rs. ${item.latestPrice.toLocaleString()}</td>
        <td><span class="status-pill"><span class="status-indicator status-online"></span> ${item.stock} left</span></td>
        <td>${item.trustedSellers.join(', ')}</td>
      `;
      catalogTableBody.appendChild(tr);
    });
  }

  // E-commerce Bridge Sync Simulations
  btnImportEcom.addEventListener('click', () => {
    fetch(`/api/group-commerce/groups/${activeGroupId}/ecommerce-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'sync_product', payload: { productId: 'prod-456' } })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert(`Success! Simulated import of product: iPad 9th Gen (SKU-IPAD9). Group catalogue updated.`);
          fetchCatalog();
        }
      });
  });

  btnExportEcom.addEventListener('click', () => {
    fetch(`/api/group-commerce/groups/${activeGroupId}/ecommerce-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'export' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Sync draft payload generated in Ecom logs!');
          relayPreviewArea.innerHTML = JSON.stringify(data, null, 2);
          // Auto switch to relay tab
          document.querySelector('[data-tab="relays"]').click();
        }
      });
  });

  // Fetch AI Agents
  function fetchAgents() {
    fetch('/api/group-commerce/agents')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.agents) {
          agentSelector.innerHTML = '';
          data.agents.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.innerText = `${a.name} (${a.role.slice(0, 40)}...)`;
            agentSelector.appendChild(opt);
          });
        }
      });
  }

  // AI Agent Playground test
  btnRunAgent.addEventListener('click', () => {
    const text = agentPrompt.value.trim();
    const agentId = agentSelector.value;
    if (!text) return;

    fetch(`/api/group-commerce/groups/${activeGroupId}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, messageText: text })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const entry = document.createElement('div');
          entry.className = 'log-entry';
          entry.innerHTML = `
            <span class="log-tag">AI Agent: ${data.agentId}</span>
            <div style="margin-top: 4px; color: #fff; font-weight: 500;">${data.recommendation}</div>
            <div style="font-size:11px; color:var(--text-secondary); margin-top: 4px;">Normalized Parsing: ${JSON.stringify(data.analyzedPayload)}</div>
          `;
          agentConsole.appendChild(entry);
          agentConsole.scrollTop = agentConsole.scrollHeight;
        }
      });
  });

  // Relay Planner Tests
  btnChannelPreview.addEventListener('click', () => {
    fetchRelayPreview('channel');
  });

  btnSocialPreview.addEventListener('click', () => {
    fetchRelayPreview('seller_offer', { productName: "Netflix Pro Ultra HD", sku: "SKU-NETFLIX", price: 400, quantity: 15 });
  });

  btnDigestPreview.addEventListener('click', () => {
    fetchRelayPreview('market_digest');
  });

  function fetchRelayPreview(type, payload = {}) {
    fetch(`/api/group-commerce/groups/${activeGroupId}/relay-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload })
    })
      .then(res => res.json())
      .then(data => {
        relayPreviewArea.innerHTML = JSON.stringify(data, null, 2);
      });
  }

  // Secure Audit History
  function fetchHistory() {
    fetch('/api/group-commerce/history')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.history) {
          renderHistory(data.history);
        }
      });
  }

  function renderHistory(logs) {
    historyList.innerHTML = '';
    if (logs.length === 0) {
      historyList.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding: 20px;">No audit logging history found. Run commands and analyses to seed logs.</div>';
      return;
    }

    logs.forEach(log => {
      const div = document.createElement('div');
      div.className = 'log-entry';
      div.innerHTML = `
        <span class="log-time">[${new Date(log.timestamp).toLocaleTimeString()}]</span>
        <span class="log-tag">${log.type.toUpperCase()}</span>
        <span>Sender: <code>${log.sender}</code></span>
        <div style="margin-top: 4px; color: #fff;">Msg: "${log.message}"</div>
        ${log.actionTaken ? `<div style="font-size: 11px; color: var(--accent-green); margin-top: 2px;">Action Taken: ${log.actionTaken} (Dry-Run: ${log.dryRun})</div>` : ''}
      `;
      historyList.appendChild(div);
    });
  }

  btnRefreshHistory.addEventListener('click', fetchHistory);
});
