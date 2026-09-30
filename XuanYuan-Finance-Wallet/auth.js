function switchTab(tab) {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(t => t.classList.remove('active'));

  if (tab === 'login') {
    tabs[0].classList.add('active');
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
  } else {
    tabs[1].classList.add('active');
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const msg = document.getElementById('auth-message');

  const { data, error } = await supabaseClient.auth.signUp({
    email, password,
    options: { data: { display_name: name } }
  });

  if (error) { 
    msg.textContent = '註冊失敗：' + error.message; 
    return; 
  }

  if (data.user) {
    await supabaseClient.from('profiles').insert({
      id: data.user.id, email, display_name: name
    });
  }

  msg.textContent = '註冊成功！正在跳轉...';
  window.location.href = 'dashboard.html';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const msg = document.getElementById('auth-message');

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) { 
    msg.textContent = '登入失敗：' + error.message; 
    return; 
  }
  window.location.href = 'dashboard.html';
}

supabaseClient.auth.getSession().then(({ data: { session } }) => {
  if (session) window.location.href = 'dashboard.html';
});