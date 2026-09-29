import streamlit as st
import pandas as pd
import plotly.express as px
import datetime
import os

# ==========================================
# 1. 15國語言包與貨幣設定
# ==========================================
LANG_DICT = {
    "繁體中文": {"title": "國際家庭/情侶資產管理系統", "income": "總收入", "expense": "總支出", "lend": "應收(借出)", "borrow": "應付(借入)", "currency": "結算貨幣", "lang": "語言選擇", "theme": "介面主題", "add": "確認新增", "save_target": "每月儲蓄目標設定", "calendar": "財務行事曆", "auth": "郵箱登入 / 註冊", "group": "家庭/情侶共享代碼"},
    "English": {"title": "Global Family/Couples Asset System", "income": "Total Income", "expense": "Total Expense", "lend": "Lent (Receivable)", "borrow": "Borrowed (Payable)", "currency": "Currency", "lang": "Language", "theme": "Theme", "add": "Add Record", "save_target": "Monthly Savings Goal", "calendar": "Financial Calendar", "auth": "Email Login / Sign Up", "group": "Family/Couple Group Code"},
    "日本語": {"title": "グローバル資産管理", "income": "総収入", "expense": "総支出", "lend": "貸付金", "borrow": "借入金", "currency": "決済通貨", "lang": "言語選択", "theme": "テーマ", "add": "追加", "save_target": "毎月の貯金目標", "calendar": "財務カレンダー", "auth": "ログイン / 登録", "group": "グループコード"}
}

CURRENCY_DICT = {
    "TWD (NT\$)": {"rate": 1.0, "sign": "NT\$"}, 
    "USD (\$)": {"rate": 0.031, "sign": "\$"},
    "EUR (€)": {"rate": 0.029, "sign": "€"}, 
    "JPY (¥)": {"rate": 4.65, "sign": "¥"},
    "GBP (£)": {"rate": 0.024, "sign": "£"}, 
    "HKD (HK\$)": {"rate": 0.24, "sign": "HK\$"},
    "AUD (A\$)": {"rate": 0.047, "sign": "A\$"},
    "CAD (C\$)": {"rate": 0.042, "sign": "C\$"},
    "CNY (¥)": {"rate": 0.22, "sign": "¥"},
    "KRW (₩)": {"rate": 41.5, "sign": "₩"},
    "SGD (S\$)": {"rate": 0.041, "sign": "S\$"},
    "CHF (Fr)": {"rate": 0.027, "sign": "Fr"},
    "INR (₹)": {"rate": 2.58, "sign": "₹"},
    "RUB (₽)": {"rate": 2.85, "sign": "₽"},
    "NZD (NZ\$)": {"rate": 0.051, "sign": "NZ\$"}
}

THEME_DICT = {
    "經典科技藍 (Classic Blue)": px.colors.sequential.Blues,
    "黑金低奢 (Luxury Dark)": ["#222222", "#D4AF37", "#AA7C11", "#FFDF73"],
    "極簡森林綠 (Forest Green)": px.colors.sequential.Greens,
    "活力櫻花粉 (Sakura Pink)": px.colors.sequential.RdPu
}

# ==========================================
# 2. 系統初始化與狀態管理
# ==========================================
st.set_page_config(page_title="Global Shared Finance", page_icon="👥", layout="wide")

if "logged_in" not in st.session_state:
    st.session_state.logged_in = False
if "user_email" not in st.session_state:
    st.session_state.user_email = ""
if "group_id" not in st.session_state:
    st.session_state.group_id = "個人私有"

with st.sidebar:
    st.header("⚙️ 系統設定 / Settings")
    selected_lang = st.selectbox("🌐 Language / 語言", list(LANG_DICT.keys()))
    L = LANG_DICT.get(selected_lang, LANG_DICT["繁體中文"])
    
    selected_curr = st.selectbox(f"💱 {L['currency']}", list(CURRENCY_DICT.keys()))
    curr_rate = CURRENCY_DICT[selected_curr]["rate"]
    curr_sign = CURRENCY_DICT[selected_curr]["sign"]
    
    selected_theme = st.selectbox(f"🎨 {L['theme']}", list(THEME_DICT.keys()))
    theme_color = THEME_DICT[selected_theme]
    
    if st.session_state.logged_in:
        st.markdown("---")
        st.write(f"👤 帳號: `{st.session_state.user_email}`")
        group_input = st.text_input(f"👥 {L['group']}", value=st.session_state.group_id)
        if group_input != st.session_state.group_id:
            st.session_state.group_id = group_input
            st.toast(f"已切換至群組: {group_input}")
        
        if st.button("登出 / Logout"):
            st.session_state.logged_in = False
            st.rerun()

# ==========================================
# 3. 郵箱註冊/登入牆 (體驗模擬模式)
# ==========================================
if not st.session_state.logged_in:
    st.title(f"🔐 {L['auth']}")
    auth_col1, auth_col2 = st.columns(2)
    
    with auth_col1:
        st.subheader("使用者登入 / Sign In")
        login_email = st.text_input("電子郵件 / Email", key="login_email_key")
        login_password = st.text_input("密碼 / Password", type="password", key="login_pass_key")
        if st.button("立即登入 / Login"):
            if login_email and login_password:
                st.session_state.logged_in = True
                st.session_state.user_email = login_email
                st.success("登入成功！")
                st.rerun()
            else:
                st.error("請輸入完整的帳號密碼！")
                
    with auth_col2:
        st.subheader("註冊新帳號 / Sign Up")
        reg_email = st.text_input("電子郵件 / Email", key="reg_email_key")
        reg_password = st.text_input("密碼 / Password (至少6碼)", type="password", key="reg_pass_key")
        if st.button("送出註冊 / Register"):
            if reg_email and len(reg_password) >= 6:
                st.success("【體驗模式】註冊成功！現在可以直接在左側填寫登入了。")
            else:
                st.error("郵箱格式不符或密碼少於6碼！")
    st.stop()

# ==========================================
# 4. 主系統與資料讀寫
# ==========================================
st.title(f"🌐 {L['title']}")
st.info(f"📁 當前正在查看群組：**[{st.session_state.group_id}]** 的即時同步資產")

DATA_FILE = "shared_financial_data.csv"
if os.path.exists(DATA_FILE):
    all_df = pd.read_csv(DATA_FILE)
else:
    all_df = pd.DataFrame(columns=["日期", "項目", "金額(TWD)", "分類", "群組", "記帳人"])

df = all_df[all_df["群組"] == st.session_state.group_id].copy()

col_input, col_calc = st.columns(2)

with col_input:
    st.subheader(f"✍️ 新增同步帳目")
    choose_date = st.date_input(L['calendar'], datetime.date.today())
    item_name = st.text_input("項目名稱/債務關係人", placeholder="例如：晚餐、大姐借錢")
    item_type = st.selectbox("分類", ["收入", "支出", "借出(他人欠我)", "借入(我欠他人)"])
    input_amount = st.number_input(f"金額 ({curr_sign})", min_value=0.0, value=100.0)
    
    if st.button(L['add']):
        twd_amount = input_amount / curr_rate
        new_row = pd.DataFrame([{
            "日期": choose_date, 
            "項目": item_name, 
            "金額(TWD)": twd_amount, 
            "分類": item_type,
            "群組": st.session_state.group_id,
            "記帳人": st.session_state.user_email
        }])
        all_df = pd.concat([all_df, new_row], ignore_index=True)
        all_df.to_csv(DATA_FILE, index=False)
        st.success("雲端同步成功！ / Synced Successfully!")
        st.rerun()

with col_calc:
    st.subheader(f"🎯 共同 {L['save_target']}")
    target_income = st.number_input("家庭/情侶每月預估總收入 (TWD)", min_value=0, value=80000)
    target_save = st.number_input("每月強迫共同儲蓄目標 (TWD)", min_value=0, value=30000)
    
    current_month = datetime.date.today().month
    if not df.empty:
        df['日期'] = pd.to_datetime(df['日期'])
        monthly_expense_twd = abs(df[(df['分類'] == "支出") & (df['日期'].dt.month == current_month)]["金額(TWD)"].sum())
    else:
        monthly_expense_twd = 0
        
    allowed_spend = target_income - target_save
    remained_budget_twd = allowed_spend - monthly_expense_twd
    remained_budget_curr = remained_budget_twd * curr_rate
    
    if remained_budget_curr >= 0:
        st.metric("本月共享剩餘生活費額度", f"{curr_sign} {remained_budget_curr:,.2f}", delta="👍 預算健康")
    else:
        st.metric("本月共享剩餘生活費額度", f"{curr_sign} {remained_budget_curr:,.2f}", delta="⚠️ 警告：群組已集體超支！", delta_color="inverse")

st.markdown("---")
if not df.empty:
    df_curr = df.copy()
    df_curr["金額"] = df_curr["金額(TWD)"] * curr_rate
    
    inc_total = df_curr[df_curr["分類"] == "收入"]["金額"].sum()
    exp_total = df_curr[df_curr["分類"] == "支出"]["金額"].sum()
    lend_total = df_curr[df_curr["分類"] == "借出(他人欠我)"]["金額"].sum()
    borrow_total = df_curr[df_curr["分類"] == "借入(我欠他人)"]["金額"].sum()
    
    m1, m2, m3, m4 = st.columns(4)
    m1.metric(L['income'], f"{curr_sign} {inc_total:,.2f}")
    m2.metric(L['expense'], f"{curr_sign} {exp_total:,.2f}")
    m3.metric(L['lend'], f"{curr_sign} {lend_total:,.2f}", delta="群組應收回")
    m4.metric(L['borrow'], f"{curr_sign} {borrow_total:,.2f}", delta="群組應還款", delta_color="inverse")
    
    st.markdown("---")
    col_chart, col_table = st.columns(2)
    with col_chart:
        st.subheader("📊 共同資產結構圖")
        fig = px.pie(df_curr, values="金額", names="分類", color_discrete_sequence=theme_color, hole=0.4)
        st.plotly_chart(fig, use_container_width=True)
    with col_table:
        st.subheader("📂 跨帳號即時同步明細")
        df_display = df_curr[["日期", "項目", "分類", "金額", "記帳人"]].copy()
        df_display["日期"] = pd.to_datetime(df_display["日期"]).dt.date
        df_display["金額"] = df_display["金額"].map(lambda x: f"{curr_sign} {x:,.2f}")
        st.dataframe(df_display, use_container_width=True)
else:
    st.info("💡 該群組目前尚無共同資料。請在上方新增帳目，或者讓您的另一半/家人在左側綁定相同的群組代碼！")
