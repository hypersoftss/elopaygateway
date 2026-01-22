import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'zh' | 'en';

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      language: 'zh',
      setLanguage: (language) => set({ language }),
    }),
    { name: 'paygate-language' }
  )
);

// Alias for components
export const useI18n = () => {
  const { language, setLanguage } = useI18nStore();
  return { language, setLanguage };
};

const translations: Record<Language, Record<string, string>> = {
  zh: {
    // Common
    'app.name': 'PayGate',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.save': '保存',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.create': '创建',
    'common.search': '搜索',
    'common.filter': '筛选',
    'common.export': '导出',
    'common.refresh': '刷新',
    'common.back': '返回',
    'common.submit': '提交',
    'common.copy': '复制',
    'common.copied': '已复制',
    'common.show': '显示',
    'common.hide': '隐藏',
    'common.active': '活跃',
    'common.inactive': '停用',
    'common.all': '全部',
    'common.today': '今日',
    'common.total': '总计',
    'common.amount': '金额',
    'common.fee': '手续费',
    'common.status': '状态',
    'common.date': '日期',
    'common.actions': '操作',
    'common.details': '详情',
    'common.retry': '重试',
    'common.noData': '暂无数据',
    
    // Auth
    'auth.login': '登录',
    'auth.logout': '退出登录',
    'auth.accountNumber': '账号',
    'auth.password': '密码',
    'auth.rememberMe': '记住我',
    'auth.forgotPassword': '忘记密码？',
    'auth.captcha': '验证码',
    'auth.captchaPlaceholder': '请输入计算结果',
    'auth.loginSuccess': '登录成功',
    'auth.loginFailed': '登录失败',
    'auth.invalidCredentials': '账号或密码错误',
    'auth.invalidCaptcha': '验证码错误',
    'auth.sessionExpired': '会话已过期，请重新登录',
    'auth.setupAdmin': '初始化管理员',
    'auth.setupKey': '设置密钥',
    'auth.email': '邮箱',
    'auth.createAdmin': '创建管理员账户',
    
    // Dashboard
    'dashboard.title': '仪表板',
    'dashboard.welcome': '欢迎回来',
    'dashboard.totalMerchants': '商户总数',
    'dashboard.todayPayin': '今日代收',
    'dashboard.todayPayout': '今日代付',
    'dashboard.totalVolume': '总交易额',
    'dashboard.recentTransactions': '最近交易',
    'dashboard.availableBalance': '可用余额',
    'dashboard.frozenBalance': '冻结余额',
    'dashboard.quickActions': '快捷操作',
    
    // Sidebar
    'sidebar.dashboard': '仪表板',
    'sidebar.merchants': '商户管理',
    'sidebar.payinOrders': '代收订单',
    'sidebar.payoutOrders': '代付订单',
    'sidebar.withdrawals': '提现管理',
    'sidebar.settings': '系统设置',
    'sidebar.apiTesting': 'API测试',
    'sidebar.analytics': '数据分析',
    'sidebar.documentation': 'API文档',
    'sidebar.paymentLinks': '收款链接',
    'sidebar.channelPrice': '通道费率',
    'sidebar.accountInfo': '账户信息',
    'sidebar.withdrawal': '提现申请',
    'sidebar.security': '安全设置',
    
    // Merchants
    'merchants.title': '商户管理',
    'merchants.create': '创建商户',
    'merchants.edit': '编辑商户',
    'merchants.name': '商户名称',
    'merchants.accountNumber': '商户号',
    'merchants.balance': '余额',
    'merchants.payinFee': '代收费率',
    'merchants.payoutFee': '代付费率',
    'merchants.callbackUrl': '回调地址',
    'merchants.status': '状态',
    'merchants.createdAt': '创建时间',
    'merchants.apiKey': 'API密钥',
    'merchants.payoutKey': '代付密钥',
    'merchants.regenerateKeys': '重新生成密钥',
    'merchants.adjustBalance': '调整余额',
    'merchants.withdrawalPassword': '提现密码',
    
    // Transactions
    'transactions.title': '交易记录',
    'transactions.orderNo': '订单号',
    'transactions.merchantOrderNo': '商户订单号',
    'transactions.type': '类型',
    'transactions.payin': '代收',
    'transactions.payout': '代付',
    'transactions.netAmount': '实际金额',
    'transactions.pending': '处理中',
    'transactions.success': '成功',
    'transactions.failed': '失败',
    'transactions.bankName': '银行名称',
    'transactions.accountHolder': '持卡人',
    'transactions.accountNumber': '银行账号',
    'transactions.ifscCode': 'IFSC代码',
    'transactions.usdtAddress': 'USDT地址',
    
    // Settings
    'settings.title': '系统设置',
    'settings.gateway': '网关配置',
    'settings.masterCredentials': '主账户凭证',
    'settings.masterMerchantId': '主商户ID',
    'settings.masterApiKey': '主API密钥',
    'settings.masterPayoutKey': '主代付密钥',
    'settings.baseUrl': 'API基础地址',
    'settings.defaultFees': '默认费率',
    'settings.branding': '品牌设置',
    'settings.gatewayName': '网关名称',
    'settings.gatewayDomain': '网关域名',
    'settings.logo': 'Logo',
    'settings.uploadLogo': '上传Logo',
    'settings.supportEmail': '客服邮箱',
    
    // API Documentation
    'docs.title': 'API文档',
    'docs.credentials': 'API凭证',
    'docs.payinApi': '代收API',
    'docs.payoutApi': '代付API',
    'docs.callback': '回调说明',
    'docs.signature': '签名算法',
    'docs.endpoint': '接口地址',
    'docs.parameters': '请求参数',
    'docs.response': '响应示例',
    'docs.example': '示例代码',
    
    // Withdrawal
    'withdrawal.title': '提现申请',
    'withdrawal.bankTransfer': '银行转账',
    'withdrawal.usdt': 'USDT提现',
    'withdrawal.amount': '提现金额',
    'withdrawal.fee': '手续费',
    'withdrawal.netAmount': '实际到账',
    'withdrawal.bankName': '银行名称',
    'withdrawal.accountNumber': '银行账号',
    'withdrawal.ifscCode': 'IFSC代码',
    'withdrawal.accountHolder': '持卡人姓名',
    'withdrawal.usdtAddress': 'USDT地址(TRC20)',
    'withdrawal.password': '提现密码',
    'withdrawal.submit': '提交申请',
    'withdrawal.history': '提现记录',
    
    // Payment Links
    'paymentLinks.title': '收款链接',
    'paymentLinks.create': '创建链接',
    'paymentLinks.amount': '金额',
    'paymentLinks.description': '描述',
    'paymentLinks.expiresAt': '过期时间',
    'paymentLinks.linkCode': '链接代码',
    'paymentLinks.copyLink': '复制链接',
    'paymentLinks.openLink': '打开链接',
    
    // Security
    'security.title': '安全设置',
    'security.changePassword': '修改登录密码',
    'security.currentPassword': '当前密码',
    'security.newPassword': '新密码',
    'security.confirmPassword': '确认密码',
    'security.withdrawalPassword': '提现密码',
    'security.setWithdrawalPassword': '设置提现密码',
    
    // Channel Pricing
    'channelPrice.title': '通道费率',
    'channelPrice.payinRate': '代收费率',
    'channelPrice.payoutRate': '代付费率',
    'channelPrice.example': '费率示例',
    
    // API Testing
    'apiTesting.title': 'API测试',
    'apiTesting.testPayin': '测试代收',
    'apiTesting.testPayout': '测试代付',
    'apiTesting.generateSignature': '生成签名',
    'apiTesting.sendRequest': '发送请求',
    'apiTesting.request': '请求内容',
    'apiTesting.response': '响应结果',
    
    // Analytics
    'analytics.title': '数据分析',
    'analytics.dateRange': '日期范围',
    'analytics.last7Days': '最近7天',
    'analytics.last30Days': '最近30天',
    'analytics.last90Days': '最近90天',
    'analytics.totalPayin': '代收总额',
    'analytics.totalPayout': '代付总额',
    'analytics.totalFees': '手续费总额',
    'analytics.successRate': '成功率',
    'analytics.dailyVolume': '每日交易量',
    'analytics.distribution': '交易分布',
  },
  en: {
    // Common
    'app.name': 'PayGate',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.refresh': 'Refresh',
    'common.back': 'Back',
    'common.submit': 'Submit',
    'common.copy': 'Copy',
    'common.copied': 'Copied',
    'common.show': 'Show',
    'common.hide': 'Hide',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.all': 'All',
    'common.today': 'Today',
    'common.total': 'Total',
    'common.amount': 'Amount',
    'common.fee': 'Fee',
    'common.status': 'Status',
    'common.date': 'Date',
    'common.actions': 'Actions',
    'common.details': 'Details',
    'common.retry': 'Retry',
    'common.noData': 'No data',
    
    // Auth
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.accountNumber': 'Account Number',
    'auth.password': 'Password',
    'auth.rememberMe': 'Remember me',
    'auth.forgotPassword': 'Forgot password?',
    'auth.captcha': 'Captcha',
    'auth.captchaPlaceholder': 'Enter the result',
    'auth.loginSuccess': 'Login successful',
    'auth.loginFailed': 'Login failed',
    'auth.invalidCredentials': 'Invalid account or password',
    'auth.invalidCaptcha': 'Invalid captcha',
    'auth.sessionExpired': 'Session expired, please login again',
    'auth.setupAdmin': 'Setup Admin',
    'auth.setupKey': 'Setup Key',
    'auth.email': 'Email',
    'auth.createAdmin': 'Create Admin Account',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome back',
    'dashboard.totalMerchants': 'Total Merchants',
    'dashboard.todayPayin': 'Today Pay-in',
    'dashboard.todayPayout': 'Today Pay-out',
    'dashboard.totalVolume': 'Total Volume',
    'dashboard.recentTransactions': 'Recent Transactions',
    'dashboard.availableBalance': 'Available Balance',
    'dashboard.frozenBalance': 'Frozen Balance',
    'dashboard.quickActions': 'Quick Actions',
    
    // Sidebar
    'sidebar.dashboard': 'Dashboard',
    'sidebar.merchants': 'Merchants',
    'sidebar.payinOrders': 'Pay-in Orders',
    'sidebar.payoutOrders': 'Pay-out Orders',
    'sidebar.withdrawals': 'Withdrawals',
    'sidebar.settings': 'Settings',
    'sidebar.apiTesting': 'API Testing',
    'sidebar.analytics': 'Analytics',
    'sidebar.documentation': 'API Docs',
    'sidebar.paymentLinks': 'Payment Links',
    'sidebar.channelPrice': 'Channel Pricing',
    'sidebar.accountInfo': 'Account Info',
    'sidebar.withdrawal': 'Withdrawal',
    'sidebar.security': 'Security',
    
    // Merchants
    'merchants.title': 'Merchant Management',
    'merchants.create': 'Create Merchant',
    'merchants.edit': 'Edit Merchant',
    'merchants.name': 'Merchant Name',
    'merchants.accountNumber': 'Account Number',
    'merchants.balance': 'Balance',
    'merchants.payinFee': 'Pay-in Fee',
    'merchants.payoutFee': 'Pay-out Fee',
    'merchants.callbackUrl': 'Callback URL',
    'merchants.status': 'Status',
    'merchants.createdAt': 'Created At',
    'merchants.apiKey': 'API Key',
    'merchants.payoutKey': 'Payout Key',
    'merchants.regenerateKeys': 'Regenerate Keys',
    'merchants.adjustBalance': 'Adjust Balance',
    'merchants.withdrawalPassword': 'Withdrawal Password',
    
    // Transactions
    'transactions.title': 'Transactions',
    'transactions.orderNo': 'Order No',
    'transactions.merchantOrderNo': 'Merchant Order No',
    'transactions.type': 'Type',
    'transactions.payin': 'Pay-in',
    'transactions.payout': 'Pay-out',
    'transactions.netAmount': 'Net Amount',
    'transactions.pending': 'Pending',
    'transactions.success': 'Success',
    'transactions.failed': 'Failed',
    'transactions.bankName': 'Bank Name',
    'transactions.accountHolder': 'Account Holder',
    'transactions.accountNumber': 'Account Number',
    'transactions.ifscCode': 'IFSC Code',
    'transactions.usdtAddress': 'USDT Address',
    
    // Settings
    'settings.title': 'Settings',
    'settings.gateway': 'Gateway Configuration',
    'settings.masterCredentials': 'Master Credentials',
    'settings.masterMerchantId': 'Master Merchant ID',
    'settings.masterApiKey': 'Master API Key',
    'settings.masterPayoutKey': 'Master Payout Key',
    'settings.baseUrl': 'API Base URL',
    'settings.defaultFees': 'Default Fees',
    'settings.branding': 'Branding',
    'settings.gatewayName': 'Gateway Name',
    'settings.gatewayDomain': 'Gateway Domain',
    'settings.logo': 'Logo',
    'settings.uploadLogo': 'Upload Logo',
    'settings.supportEmail': 'Support Email',
    
    // API Documentation
    'docs.title': 'API Documentation',
    'docs.credentials': 'API Credentials',
    'docs.payinApi': 'Pay-in API',
    'docs.payoutApi': 'Pay-out API',
    'docs.callback': 'Callback',
    'docs.signature': 'Signature',
    'docs.endpoint': 'Endpoint',
    'docs.parameters': 'Parameters',
    'docs.response': 'Response',
    'docs.example': 'Example',
    
    // Withdrawal
    'withdrawal.title': 'Withdrawal',
    'withdrawal.bankTransfer': 'Bank Transfer',
    'withdrawal.usdt': 'USDT Withdrawal',
    'withdrawal.amount': 'Amount',
    'withdrawal.fee': 'Fee',
    'withdrawal.netAmount': 'Net Amount',
    'withdrawal.bankName': 'Bank Name',
    'withdrawal.accountNumber': 'Account Number',
    'withdrawal.ifscCode': 'IFSC Code',
    'withdrawal.accountHolder': 'Account Holder',
    'withdrawal.usdtAddress': 'USDT Address (TRC20)',
    'withdrawal.password': 'Withdrawal Password',
    'withdrawal.submit': 'Submit Request',
    'withdrawal.history': 'Withdrawal History',
    
    // Payment Links
    'paymentLinks.title': 'Payment Links',
    'paymentLinks.create': 'Create Link',
    'paymentLinks.amount': 'Amount',
    'paymentLinks.description': 'Description',
    'paymentLinks.expiresAt': 'Expires At',
    'paymentLinks.linkCode': 'Link Code',
    'paymentLinks.copyLink': 'Copy Link',
    'paymentLinks.openLink': 'Open Link',
    
    // Security
    'security.title': 'Security Settings',
    'security.changePassword': 'Change Password',
    'security.currentPassword': 'Current Password',
    'security.newPassword': 'New Password',
    'security.confirmPassword': 'Confirm Password',
    'security.withdrawalPassword': 'Withdrawal Password',
    'security.setWithdrawalPassword': 'Set Withdrawal Password',
    
    // Channel Pricing
    'channelPrice.title': 'Channel Pricing',
    'channelPrice.payinRate': 'Pay-in Rate',
    'channelPrice.payoutRate': 'Pay-out Rate',
    'channelPrice.example': 'Rate Example',
    
    // API Testing
    'apiTesting.title': 'API Testing',
    'apiTesting.testPayin': 'Test Pay-in',
    'apiTesting.testPayout': 'Test Pay-out',
    'apiTesting.generateSignature': 'Generate Signature',
    'apiTesting.sendRequest': 'Send Request',
    'apiTesting.request': 'Request',
    'apiTesting.response': 'Response',
    
    // Analytics
    'analytics.title': 'Analytics',
    'analytics.dateRange': 'Date Range',
    'analytics.last7Days': 'Last 7 Days',
    'analytics.last30Days': 'Last 30 Days',
    'analytics.last90Days': 'Last 90 Days',
    'analytics.totalPayin': 'Total Pay-in',
    'analytics.totalPayout': 'Total Pay-out',
    'analytics.totalFees': 'Total Fees',
    'analytics.successRate': 'Success Rate',
    'analytics.dailyVolume': 'Daily Volume',
    'analytics.distribution': 'Distribution',
  },
};

export const useTranslation = () => {
  const { language, setLanguage } = useI18nStore();

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return { t, language, setLanguage };
};
