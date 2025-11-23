import React, { useState, useContext } from 'react';
import { AuthContext, API } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      login(response.data.token, response.data.user);
      toast.success('ورود موفق');
      navigate('/');
    } catch (error) {
      toast.error('نام کاربری یا رمز عبور نادرست است');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-yellow-50 rtl">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZjdlZCIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>
      
      <div className="relative w-full max-w-md animate-fade-in">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-200/50 p-8 space-y-6">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="https://customer-assets.emergentagent.com/job_83c5a98e-8567-4cd4-a74d-6f37b95fe680/artifacts/ave6xfti_logo.png" 
              alt="لوگو پردیس پاژ" 
              className="h-24 w-auto"
              data-testid="login-logo"
            />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">پرتال سازمانی</h1>
            <p className="text-amber-700 font-medium">گروه صنعتی پردیس پاژ خراسان</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700 font-medium">نام کاربری</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-white border-amber-200 focus:border-amber-500 focus:ring-amber-500"
                placeholder="نام کاربری خود را وارد کنید"
                data-testid="username-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">رمز عبور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white border-amber-200 focus:border-amber-500 focus:ring-amber-500"
                placeholder="رمز عبور خود را وارد کنید"
                data-testid="password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-l from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold py-6 rounded-xl shadow-lg hover:shadow-xl"
              data-testid="login-button"
            >
              {loading ? 'در حال ورود...' : 'ورود به سیستم'}
            </Button>
          </form>

          <div className="text-center text-sm text-gray-600 pt-4 border-t border-amber-100">
            <p>حساب پیش‌فرض: admin / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;