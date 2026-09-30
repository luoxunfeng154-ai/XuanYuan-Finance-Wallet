let currentUser = null;
let currentGroupId = null;
let realtimeChannel = null;
let currentView = 'personal'; // 'personal' 或 'group'

// ============ 初始化 ============
async function init() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  
  currentUser = session.user;

  // 顯示用戶名
  const { data: profile } = await supabaseClient
    .from('profiles').select('display_name').eq('id', currentUser.id).single();
  document.getElementById('user-name').textContent = profile?.display_name || currentUser.email;

  // 顯示日期
  const today = new Date();
  document.getElementById('current-date').textContent = today.toLocaleDateString('zh-Hant');

  await loadGroups();
  await loadTransactions();
  subscribeToChanges();
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

// ============ 視圖切換 ============
function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  if (view === 'group' && !currentGroupId) {
    // 如果切換到共享但沒有選中群組，自動選第一個群組
    const groupSelect = document.getElementById('tx-group');
    if (groupSelect.options.length > 1) {
      currentGroupId = groupSelect.options[1].value;
      // 同時更新選中樣式
      document.querySelectorAll('.view-btn')[1].classList.add('active');
    } else {
      alert('請先建立或加入一個群組');
      currentView = 'personal';
      document.querySelectorAll('.view-btn')[0].classList.add('active');
      return;
    }
  }
  loadTransactions();
}

function selectGroup(groupId, groupName) {
  currentGroupId = groupId;
  currentView = 'group';
  
  // 更新切換按鈕樣式
  document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.view-btn')[1].classList.add('active');
  
  // 更新記帳表單的下拉選單
  document.getElementById('tx-group').value = groupId;
  
  loadTransactions();
}

// ============ 群組 ============
async function loadGroups() {
  const { data: memberships } = await supabaseClient
    .from('group_members')
    .select('group_id, groups(id, name, type, invite_code)')
    .eq('user_id', currentUser.id);

  const groupsList = document.getElementById('groups-list');
  const groupSelect = document.getElementById('tx-group');
  groupsList.innerHTML = '';
  groupSelect.innerHTML = '<option value="">個人</option>';

  if (memberships && memberships.length > 0) {
    memberships.forEach(m => {
      const g = m.groups;
      groupsList.innerHTML += `
        <div class="group-item" onclick="selectGroup('${g.id}', '${g.name}')" style="cursor:pointer;">
          <strong>${g.name}</strong> (${g.type === 'couple' ? '情侶' : '家庭'})
          <br><small>邀請碼：${g.invite_code}</small>
        </div>`;
      groupSelect.innerHTML += `<option value="${g.id}">${g.name}</option>`;
    });
  } else {
    groupsList.innerHTML = '<p style="color:#94a3b8; font-size:14px;">還沒有群組，建立一個吧！</p>';
  }
}

async function showCreateGroup() {
  const name = prompt('群組名稱（例如：我們的家）');
  if (!name) return;
  const type = prompt('類型：輸入 1 = 家庭，2 = 情侶') === '2' ? 'couple' : 'family';
  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  const { data: group, error } = await supabaseClient
    .from('groups')
    .insert({ name, type, invite_code: inviteCode, created_by: currentUser.id })
    .select().single();

  if (error) { alert('建立失敗：' + error.message); return; }

  await supabaseClient.from('group_members').insert({
    group_id: group.id, user_id: currentUser.id, role: 'owner'
  });

  alert(`群組建立成功！\n邀請碼：${inviteCode}\n把這個碼給對方。`);
  await loadGroups();
}

async function showJoinGroup() {
  const code = prompt('輸入邀請碼：');
  if (!code) return;

  const { data: group } = await supabaseClient
    .from('groups').select('id, name').eq('invite_code', code.toUpperCase()).single();

  if (!group) { alert('邀請碼無效'); return; }

  const { error } = await supabaseClient.from('group_members').insert({
    group_id: group.id, user_id: currentUser.id, role: 'member'
  });

  if (error) alert('加入失敗：' + error.message);
  else { alert(`已加入「${group.name}」！`); await loadGroups(); }
}

// ============ 交易 ============
async function addTransaction() {
  const type = document.getElementById('tx-type').value;
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const note = document.getElementById('tx-note').value;
  const groupId = document.getElementById('tx-group').value || null;

  if (!amount || amount <= 0) { alert('請輸入有效金額'); return; }

  const { error } = await supabaseClient.from('transactions').insert({
    user_id: currentUser.id, group_id: groupId,
    amount, type, note, date: new Date().toISOString().split('T')[0]
  });

  if (error) { alert('記錄失敗：' + error.message); return; }

  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-note').value = '';
  await loadTransactions();
}

async function loadTransactions() {
  let query = supabaseClient.from('transactions').select('*');
  
  if (currentView === 'personal') {
    // 個人視圖：只顯示自己的，且不屬於任何群組的交易
    query = query.eq('user_id', currentUser.id).is('group_id', null);
  } else {
    // 共享視圖：顯示所選群組的所有交易
    if (!currentGroupId) {
      document.getElementById('transactions-list').innerHTML = '<p>請選擇一個群組</p>';
      return;
    }
    query = query.eq('group_id', currentGroupId);
  }
  
  const { data: transactions, error } = await query.order('created_at', { ascending: false }).limit(50);
  
  if (error) { console.error('加載交易失敗:', error); return; }
  
  updateTransactionList(transactions || []);
  updateSummary(transactions || []);
  renderCharts(transactions || []);
}

function updateTransactionList(transactions) {
  const list = document.getElementById('transactions-list');
  list.innerHTML = '';
  
  if (!transactions || transactions.length === 0) {
    list.innerHTML = '<p style="color:#94a3b8; font-size:14px;">暫無交易記錄</p>';
    return;
  }
  
  transactions.forEach(t => {
    const isIncome = t.type === 'income';
    const amountClass = isIncome ? 'income' : 'expense';
    const amountSign = isIncome ? '+' : '-';
    
    list.innerHTML += `
      <div class="tx-item">
        <div>
          <span class="tx-type ${amountClass}">${isIncome ? '收入' : '支出'}</span>
          <span class="tx-note">${t.note || '-'}</span>
          <small class="tx-date">${t.date}</small>
        </div>
        <span class="tx-amount ${amountClass}">${amountSign} HK$${t.amount.toFixed(2)}</span>
      </div>`;
  });
}

function updateSummary(transactions) {
  let income = 0, expense = 0;
  transactions.forEach(t => {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  });
  
  document.getElementById('total-income').textContent = income.toFixed(2);
  document.getElementById('total-expense').textContent = expense.toFixed(2);
  document.getElementById('balance').textContent = (income - expense).toFixed(2);
}

// ============ Realtime ============
function subscribeToChanges() {
  if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);
  realtimeChannel = supabaseClient
    .channel('transactions-realtime')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'transactions'
    }, () => loadTransactions())
    .subscribe();
}

// ============ 圖表 ============
let lineChartInstance = null;
let pieChartInstance = null;

function renderCharts(transactions) {
  const dates = {};
  const categories = {};
  
  transactions.forEach(t => {
    if (!dates[t.date]) dates[t.date] = { income: 0, expense: 0 };
    if (t.type === 'income') dates[t.date].income += t.amount;
    else dates[t.date].expense += t.amount;

    if (t.type === 'expense') {
      const cat = t.category || '其他';
      categories[cat] = (categories[cat] || 0) + t.amount;
    }
  });

  const sortedDates = Object.keys(dates).sort();
  const incomeData = sortedDates.map(d => dates[d].income);
  const expenseData = sortedDates.map(d => dates[d].expense);

  const lineCtx = document.getElementById('lineChart');
  if (lineCtx) {
    if (lineChartInstance) lineChartInstance.destroy();
    lineChartInstance = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: sortedDates,
        datasets: [
          { label: '收入', data: incomeData, borderColor: '#16a34a', tension: 0.3, fill: false },
          { label: '支出', data: expenseData, borderColor: '#dc2626', tension: 0.3, fill: false }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }

  const pieCtx = document.getElementById('pieChart');
  if (pieCtx) {
    if (pieChartInstance) pieChartInstance.destroy();
    pieChartInstance = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(categories),
        datasets: [{
          data: Object.values(categories),
          backgroundColor: ['#1e293b', '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }
}

init();
