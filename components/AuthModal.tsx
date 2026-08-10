import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

type AuthMode = 'login' | 'register' | 'forgot';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { login, register, forgotPassword } = useAuth();

  // Reset form when modal opens/closes or mode changes
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setIdentifier('');
      setPassword('');
      setFullName('');
      setError('');
      setSuccess('');
    }
  }, [isOpen, initialMode]);

  // Reset form when mode changes
  React.useEffect(() => {
    setIdentifier('');
    setPassword('');
    setFullName('');
    setError('');
    setSuccess('');
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await login(identifier, password);
        if (result.success) {
          onClose();
        } else {
          setError(result.error || '登录失败');
        }
      } else if (mode === 'register') {
        const result = await register(identifier, password, fullName);
        if (result.success) {
          if (result.error) {
            // Success with warning (e.g., email verification required)
            setSuccess(result.error);
            // Optionally switch to login after a delay
            setTimeout(() => {
              onClose();
            }, 3000);
          } else {
            onClose();
          }
        } else {
          setError(result.error || '注册失败');
        }
      } else if (mode === 'forgot') {
        const result = await forgotPassword(identifier);
        if (result.success) {
          setSuccess('重置密码邮件已发送，请检查您的邮箱');
          setTimeout(() => {
            onClose();
          }, 3000);
        } else {
          setError(result.error || '发送失败');
        }
      }
    } catch (err) {
      setError('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isLoginMode = mode === 'login';
  const isRegisterMode = mode === 'register';
  const isForgotMode = mode === 'forgot';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-light px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {isLoginMode ? '登录' : isRegisterMode ? '注册' : '忘记密码'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
            disabled={loading}
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Tabs */}
        {!isForgotMode && (
          <div className="flex border-b border-slate-200">
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                isLoginMode
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setMode('login')}
              disabled={loading}
            >
              登录
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                isRegisterMode
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setMode('register')}
              disabled={loading}
            >
              注册
            </button>
          </div>
        )}

        {/* Form */}
        <div className="p-6">
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-700 text-sm">
                <span className="material-icons text-sm">check_circle</span>
                {success}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 text-sm">
                <span className="material-icons text-sm">error</span>
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  姓名（可选）
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="请输入您的姓名"
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isLoginMode ? '邮箱或手机号' : '邮箱'}
              </label>
              <input
                type={isLoginMode ? 'text' : 'email'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder={isLoginMode ? '请输入邮箱或手机号' : '请输入您的邮箱'}
                autoComplete={isLoginMode ? 'username' : 'email'}
                required
                disabled={loading}
              />
              {isLoginMode && (
                <p className="text-xs text-slate-500 mt-1">
                  支持中国大陆 11 位手机号，将自动使用 +86 区号登录
                </p>
              )}
            </div>

            {!isForgotMode && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="请输入密码"
                  required
                  disabled={loading}
                  minLength={6}
                />
                {isRegisterMode && (
                  <p className="text-xs text-slate-500 mt-1">
                    密码长度至少为 6 位
                  </p>
                )}
              </div>
            )}

            {isLoginMode && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm text-primary hover:text-primary-hover transition-colors"
                  disabled={loading}
                >
                  忘记密码？
                </button>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-2.5 text-sm font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                disabled={loading}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-icons text-sm animate-spin">refresh</span>
                    处理中...
                  </span>
                ) : isForgotMode ? '发送' : isLoginMode ? '登录' : '注册'}
              </button>
            </div>
          </form>

          {isForgotMode && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-sm text-primary hover:text-primary-hover transition-colors"
                disabled={loading}
              >
                返回登录
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 text-center">
          <p className="text-xs text-slate-500">
            登录即表示您同意我们的{' '}
            <a href="#" className="text-primary hover:underline">
              服务条款
            </a>{' '}
            和{' '}
            <a href="#" className="text-primary hover:underline">
              隐私政策
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
