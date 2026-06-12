// BijakBeli Product Collector - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Load configuration
  const config = await chrome.storage.sync.get(['apiUrl', 'ingestionSecret']);
  document.getElementById('apiUrl').value = config.apiUrl || 'https://www.bijakbeli.app';
  document.getElementById('ingestionSecret').value = config.ingestionSecret || '';
  
  // Load history
  loadHistory();
  
  // Update status
  updateStatus(config.ingestionSecret);
  
  // Save configuration
  document.getElementById('configForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const ingestionSecret = document.getElementById('ingestionSecret').value.trim();
    
    await chrome.storage.sync.set({ apiUrl, ingestionSecret });
    
    // Show success message
    const successMsg = document.getElementById('successMsg');
    successMsg.classList.add('show');
    setTimeout(() => successMsg.classList.remove('show'), 3000);
    
    updateStatus(ingestionSecret);
  });
  
  // Clear history
  document.getElementById('clearHistory').addEventListener('click', async () => {
    if (confirm('Clear all collection history?')) {
      await chrome.storage.local.set({ history: [] });
      loadHistory();
      chrome.action.setBadgeText({ text: '' });
    }
  });
});

async function loadHistory() {
  const { history } = await chrome.storage.local.get(['history']);
  const historyList = document.getElementById('historyList');
  const count = document.getElementById('count');
  
  if (!history || history.length === 0) {
    historyList.innerHTML = '<div class="empty-state">No products collected yet. Visit a Tokopedia product page to start!</div>';
    count.textContent = '0';
    return;
  }
  
  count.textContent = history.length;
  
  historyList.innerHTML = history.slice(0, 10).map(item => {
    const date = new Date(item.timestamp);
    const timeStr = date.toLocaleString('id-ID', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return `
      <div class="history-item">
        <div class="history-time">${timeStr}</div>
        <div class="history-product">${item.product.name}</div>
      </div>
    `;
  }).join('');
}

function updateStatus(hasSecret) {
  const status = document.getElementById('status');
  if (hasSecret) {
    status.textContent = '✅ Ready';
    status.style.color = '#22c55e';
  } else {
    status.textContent = '⚠️ Not Configured';
    status.style.color = '#f59e0b';
  }
}
