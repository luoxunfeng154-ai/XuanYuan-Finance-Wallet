let currentUser = null;
let realtimeChannel = null;

async function init() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) { window.location.href = 'index.html'; return; }
  currentUser = user;

  const { data: profile } = await supabaseClient
    .from('profiles').select('display_name').eq('id', user.id).single();
  document.getElementById('user-name').textContent = profile?.display_name || user.email;

  await loadGroups();
  await loadTransactions();
  subscribeToChanges();
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

// ===== 群組 =====
async function loadGroups() {
  const { data: memberships } = await supabaseClient
    .from('group_members')
    .select('group_id, groups(id, name, type, invite_code)')
    .eq('user_id', currentUser.id);

  const groupsList = document.getElementById('groups-list');
  const groupSelect = document.getElementById('tx-group');
  groupsList.innerHTML = '';
  groupSelect.innerHTML = '<option value="">個人</option>';

  (memberships || []).forEach(m => {
    const g = m.groups;
    groupsList.innerHTML += `
      <div class="group-item">
        <strong>${g.name}</strong> (${g.type === 'couple' ? '情侶' : '家庭'})
        <br><small>邀請碼：${g.invite_code}</small>
      </div>`;
    groupSelect.innerHTML += `<option value="${g.id}">${g.name}</option>`;
  });
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

// ===== 交易 =====
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
  const { data: transactions } = await supabaseClient
    .from('transactions').select('*')
    .order('created_at', { ascending: false }).limit(50);

  const list = document.getElementById('transactions-list');
  let income = 0, expense = 0;
  list.innerHTML = '';

  (transactions || []).forEach(t => {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
    list.innerHTML += `
      <div class="tx-item">
        <span class="tx-type ${t.type}">${t.type === 'income' ? '收入' : '支出'}</span>
        <span>HK$${t.amount.toFixed(2)}</span>
        <span>${t.note || '-'}</span>
        <span>${t.date}</span>
      </div>`;
  });

  document.getElementById('total-income').textContent = income.toFixed(2);
  document.getElementById('total-expense').textContent = expense.toFixed(2);
  document.getElementById('balance').textContent = (income - expense).toFixed(2);
}

// ===== Realtime =====
function subscribeToChanges() {
  if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);
  realtimeChannel = supabaseClient
    .channel('transactions-realtime')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'transactions'
    }, () => loadTransactions())
    .subscribe();
}

init();