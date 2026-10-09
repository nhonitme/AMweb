import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Globe, Building2, User, Lock, AlertCircle, CheckCircle, ArrowRight, PieChart, Network, Fingerprint } from 'lucide-react';
import { buildAppPath, login, resolveDefaultCompanyCd } from '../lib/login';
import notify from 'devextreme/ui/notify';
import { languages, type Language, getCurrentLangArray, setCurrentLang } from '@/utils/language';

interface LoginPageProps {
  onLogin: () => void;
}

const NATIVE_LANGUAGE_NAMES = {
  VIET: 'Tiếng Việt',
  ENG: 'English',
  KOR: '한국어',
  // JPN: '日本語',
  // CHN: '中文',
} satisfies Partial<Record<Language['code'], string>>;

type LoginLanguageCode = keyof typeof NATIVE_LANGUAGE_NAMES;
type LoginFieldError = 'taxCodeRequired' | 'userIdRequired' | 'passwordRequired';

type LoginCopy = {
  headingSub: string;
  featureReports: string;
  featureIntegration: string;
  featureSecurity: string;
  rightsReserved: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  taxCodeLabel: string;
  taxCodePlaceholder: string;
  taxCodeRequired: string;
  userIdLabel: string;
  userIdPlaceholder: string;
  userIdRequired: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  passwordRequired: string;
  rememberMe: string;
  forgotPassword: string;
  signIn: string;
  loginFailed: string;
  needHelp: string;
  contactUs: string;
  forgotTitle: string;
  forgotSubtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  sendInstructions: string;
  emailSentTitle: string;
  emailSentBody: string;
  backToLogin: string;
};

const LOGIN_COPY: Record<LoginLanguageCode, LoginCopy> = {
  VIET: {
    headingSub: 'Phần mềm kế toán',
    featureReports: 'Báo cáo chuẩn xác',
    featureIntegration: 'Liên thông dữ liệu',
    featureSecurity: 'Bảo mật tối đa',
    rightsReserved: 'Tất cả quyền được bảo lưu.',
    welcomeTitle: 'Chào mừng trở lại',
    welcomeSubtitle: 'Đăng nhập để tiếp tục làm việc với AMnote',
    taxCodeLabel: 'Mã số thuế / Mã công ty',
    taxCodePlaceholder: 'Nhập mã số thuế hoặc mã công ty',
    taxCodeRequired: 'Vui lòng nhập mã số thuế hoặc mã công ty',
    userIdLabel: 'ID người dùng',
    userIdPlaceholder: 'Nhập ID người dùng',
    userIdRequired: 'Vui lòng nhập ID người dùng',
    passwordLabel: 'Mật khẩu',
    passwordPlaceholder: 'Nhập mật khẩu',
    passwordRequired: 'Vui lòng nhập mật khẩu',
    rememberMe: 'Nhớ đăng nhập',
    forgotPassword: 'Quên mật khẩu?',
    signIn: 'Đăng nhập',
    loginFailed: 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.',
    needHelp: 'Cần hỗ trợ?',
    contactUs: 'Liên hệ với chúng tôi',
    forgotTitle: 'Quên mật khẩu?',
    forgotSubtitle: 'Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu',
    emailLabel: 'Email đăng ký',
    emailPlaceholder: 'Nhập email của bạn',
    sendInstructions: 'Gửi hướng dẫn',
    emailSentTitle: 'Email đã được gửi!',
    emailSentBody: 'Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến email của bạn. Vui lòng kiểm tra hộp thư và làm theo hướng dẫn.',
    backToLogin: '← Quay lại đăng nhập',
  },
  ENG: {
    headingSub: 'Accounting Software',
    featureReports: 'Accurate reporting',
    featureIntegration: 'Seamless data integration',
    featureSecurity: 'Maximum security',
    rightsReserved: 'All rights reserved.',
    welcomeTitle: 'Welcome back',
    welcomeSubtitle: 'Sign in to continue working with AMnote',
    taxCodeLabel: 'Tax code / Company code',
    taxCodePlaceholder: 'Enter tax code or company code',
    taxCodeRequired: 'Please enter a tax code or company code',
    userIdLabel: 'User ID',
    userIdPlaceholder: 'Enter your user ID',
    userIdRequired: 'Please enter your user ID',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    passwordRequired: 'Please enter your password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    signIn: 'Sign in',
    loginFailed: 'Sign-in failed. Please check your information.',
    needHelp: 'Need help?',
    contactUs: 'Contact us',
    forgotTitle: 'Forgot password?',
    forgotSubtitle: 'Enter your email to receive password reset instructions',
    emailLabel: 'Registered email',
    emailPlaceholder: 'Enter your email',
    sendInstructions: 'Send instructions',
    emailSentTitle: 'Email sent!',
    emailSentBody: 'We sent password reset instructions to your email. Please check your inbox and follow the instructions.',
    backToLogin: '← Back to sign in',
  },
  KOR: {
    headingSub: '회계 소프트웨어',
    featureReports: '정확한 보고서',
    featureIntegration: '원활한 데이터 연동',
    featureSecurity: '최고 수준의 보안',
    rightsReserved: '모든 권리 보유.',
    welcomeTitle: '다시 오신 것을 환영합니다',
    welcomeSubtitle: 'AMnote에서 계속 작업하려면 로그인하세요',
    taxCodeLabel: '사업자등록번호 / 회사 코드',
    taxCodePlaceholder: '사업자등록번호 또는 회사 코드를 입력하세요',
    taxCodeRequired: '사업자등록번호 또는 회사 코드를 입력해 주세요',
    userIdLabel: '사용자 ID',
    userIdPlaceholder: '사용자 ID를 입력하세요',
    userIdRequired: '사용자 ID를 입력해 주세요',
    passwordLabel: '비밀번호',
    passwordPlaceholder: '비밀번호를 입력하세요',
    passwordRequired: '비밀번호를 입력해 주세요',
    rememberMe: '로그인 상태 유지',
    forgotPassword: '비밀번호를 잊으셨나요?',
    signIn: '로그인',
    loginFailed: '로그인에 실패했습니다. 정보를 다시 확인해 주세요.',
    needHelp: '도움이 필요하신가요?',
    contactUs: '문의하기',
    forgotTitle: '비밀번호를 잊으셨나요?',
    forgotSubtitle: '비밀번호 재설정 안내를 받으려면 이메일을 입력하세요',
    emailLabel: '등록된 이메일',
    emailPlaceholder: '이메일을 입력하세요',
    sendInstructions: '안내 메일 보내기',
    emailSentTitle: '이메일이 전송되었습니다',
    emailSentBody: '비밀번호 재설정 안내를 이메일로 보냈습니다. 받은편지함을 확인하고 안내에 따라 주세요.',
    backToLogin: '← 로그인으로 돌아가기',
  },
};

const loginLanguages = languages.filter(
  (language): language is Language & { code: LoginLanguageCode } => language.code in NATIVE_LANGUAGE_NAMES,
);

function resolveLoginLanguage(language?: Language): Language & { code: LoginLanguageCode } {
  if (language && language.code in NATIVE_LANGUAGE_NAMES) {
    return language as Language & { code: LoginLanguageCode };
  }
  return loginLanguages[0];
}

function getLoginCopy(code: Language['code']): LoginCopy {
  if (code in LOGIN_COPY) {
    return LOGIN_COPY[code as LoginLanguageCode];
  }
  return LOGIN_COPY.VIET;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(() => resolveLoginLanguage(getCurrentLangArray()[0]));
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState<LoginFieldError | ''>('');
  const [serverError, setServerError] = useState('');

  const [formData, setFormData] = useState({
    companyTaxCode: '',
    userId: '',
    password: ''
  });

  const navigate = useNavigate();

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'success'>('email');
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');

  const copy = getLoginCopy(selectedLanguage.code);
  const errorMessage = fieldError ? copy[fieldError] : serverError;

  useEffect(() => {
    if (!(getCurrentLangArray()[0]?.code in NATIVE_LANGUAGE_NAMES)) {
      setCurrentLang(selectedLanguage.code);
    }
  }, [selectedLanguage.code]);

  useEffect(() => {
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    if (!savedRememberMe) return;

    setRememberMe(true);
    const lastUserId = localStorage.getItem('lastUserId') || '';
    const lastCompanyTaxCode = localStorage.getItem('lastCompanyTaxCode') || '';
    setFormData(prev => ({
      ...prev,
      userId: lastUserId,
      companyTaxCode: lastCompanyTaxCode,
    }));
  }, []);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFieldError('');
    setServerError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.companyTaxCode.trim()) {
      setFieldError('taxCodeRequired');
      setServerError('');
      notify(copy.taxCodeRequired, 'error', 3000);
      return;
    }

    if (!formData.userId.trim()) {
      setFieldError('userIdRequired');
      setServerError('');
      notify(copy.userIdRequired, 'error', 3000);
      return;
    }

    if (!formData.password) {
      setFieldError('passwordRequired');
      setServerError('');
      notify(copy.passwordRequired, 'error', 3000);
      return;
    }

    setIsLoading(true);
    setFieldError('');
    setServerError('');

    try {
      const session = await login(
        formData.companyTaxCode.trim(),
        formData.userId.trim(),
        formData.password,
        selectedLanguage.code,
      );
      const companyCd = resolveDefaultCompanyCd(session);
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('lastUserId', formData.userId);
        localStorage.setItem('lastCompanyTaxCode', formData.companyTaxCode.trim());
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('lastUserId');
        localStorage.removeItem('lastCompanyTaxCode');
      }

      onLogin();
      navigate(buildAppPath(companyCd, "/"), { replace: true });
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : copy.loginFailed;
      setFieldError('');
      setServerError(message);
      notify(message, 'error', 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1500));

    setForgotPasswordStep('success');
    setIsLoading(false);
  };

  const selectLanguage = (language: Language) => {
    setCurrentLang(language.code);
    setSelectedLanguage(language);
    setIsLanguageDropdownOpen(false);
  };

  const languageSwitcher = (
    <div className="absolute top-6 right-6 md:top-8 md:right-8 z-20">
      <div className="relative">
        <button
          onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
          className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full px-4 py-2 transition-all"
        >
          <Globe size={14} />
          <span className="text-sm font-medium">
            {NATIVE_LANGUAGE_NAMES[selectedLanguage.code] ?? selectedLanguage.name}
          </span>
        </button>

        {isLanguageDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsLanguageDropdownOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
              {loginLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => selectLanguage(language)}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    selectedLanguage.code === language.code
                      ? 'bg-red-50 text-red-700'
                      : 'text-gray-700'
                  }`}
                >
                  <span className="flex-1 text-left">
                    {NATIVE_LANGUAGE_NAMES[language.code] ?? language.name}
                  </span>
                  {selectedLanguage.code === language.code && (
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  const brandPanel = (
    <div className="relative hidden md:flex md:w-[42%] overflow-hidden bg-gradient-to-br from-red-500 via-red-700 to-red-900 text-white p-10 flex-col justify-between">
      <div aria-hidden="true" className="pointer-events-none absolute -top-20 -right-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-black/15 blur-3xl" />

      <div className="relative flex items-center">
        <img
          src="/img/amnote_logo_mark.png"
          alt="AMnote"
          className="h-[84px] w-[84px] object-contain drop-shadow-sm"
          draggable={false}
        />
      </div>

      <div className="relative">
        <div className="mb-10">
          <p className="text-[19px] font-semibold leading-snug">{copy.headingSub}</p>
          <p className="text-[35px] font-extrabold leading-none mt-0.5">AMnote</p>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex w-1/3 flex-col items-center gap-2.5 text-center">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl border-[1.5px] border-white/55">
              <PieChart size={24} strokeWidth={1.6} />
            </span>
            <span className="text-xs leading-tight text-red-50">{copy.featureReports}</span>
          </div>
          <div className="flex w-1/3 flex-col items-center gap-2.5 text-center">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl border-[1.5px] border-white/55">
              <Network size={24} strokeWidth={1.6} />
            </span>
            <span className="text-xs leading-tight text-red-50">{copy.featureIntegration}</span>
          </div>
          <div className="flex w-1/3 flex-col items-center gap-2.5 text-center">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl border-[1.5px] border-white/55">
              <Fingerprint size={24} strokeWidth={1.6} />
            </span>
            <span className="text-xs leading-tight text-red-50">{copy.featureSecurity}</span>
          </div>
        </div>
      </div>

      <p className="relative text-xs text-red-200">© {new Date().getFullYear()} AMnote. {copy.rightsReserved}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col md:flex-row">
          {brandPanel}

          <div className="flex-1 relative p-8 md:p-12 flex flex-col justify-center">
            {languageSwitcher}

            {showForgotPassword ? (
              <div className="w-full max-w-sm mx-auto pt-12 md:pt-0">
                {forgotPasswordStep === 'email' ? (
                  <>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">{copy.forgotTitle}</h2>
                      <p className="text-gray-500 text-sm">
                        {copy.forgotSubtitle}
                      </p>
                    </div>

                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div>
                        <label className="block font-medium text-gray-700 mb-2">
                          {copy.emailLabel}
                        </label>
                        <input
                          type="email"
                          value={forgotPasswordEmail}
                          onChange={(e) => setForgotPasswordEmail(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                          placeholder={copy.emailPlaceholder}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-4 rounded-xl font-medium hover:from-red-700 hover:to-red-800 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          copy.sendInstructions
                        )}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="text-green-600" size={32} />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{copy.emailSentTitle}</h2>
                    <p className="text-gray-600 text-sm mb-6">
                      {copy.emailSentBody}
                    </p>
                  </div>
                )}

                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordStep('email');
                      setForgotPasswordEmail('');
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    {copy.backToLogin}
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-sm mx-auto pt-12 md:pt-0">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{copy.welcomeTitle}</h2>
                  <p className="text-gray-500 text-sm">{copy.welcomeSubtitle}</p>
                </div>

                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                    <AlertCircle className="text-red-600 mr-2 flex-shrink-0" size={20} />
                    <p className="text-sm text-red-700">{errorMessage}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      {copy.taxCodeLabel}
                    </label>
                    <div className="relative">
                      <Building2 size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={formData.companyTaxCode}
                        onChange={(e) => handleInputChange('companyTaxCode', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        placeholder={copy.taxCodePlaceholder}
                        maxLength={20}
                        autoComplete="organization"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      {copy.userIdLabel}
                    </label>
                    <div className="relative">
                      <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={formData.userId}
                        onChange={(e) => handleInputChange('userId', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        placeholder={copy.userIdPlaceholder}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      {copy.passwordLabel}
                    </label>
                    <div className="relative">
                      <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        placeholder={copy.passwordPlaceholder}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{copy.rememberMe}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      {copy.forgotPassword}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-4 rounded-xl font-medium hover:from-red-700 hover:to-red-800 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>{copy.signIn}</span>
                        <ArrowRight size={16} className="ml-2" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-500">
                    {copy.needHelp}
                    <a href="#" className="text-red-600 hover:text-red-700 font-medium ml-1">
                      {copy.contactUs}
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
