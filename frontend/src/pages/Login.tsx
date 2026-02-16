import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { LogIn, Shield, Users, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
    const [identifier, setIdentifier] = useState(''); // Can be email or username
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/auth/login', null, {
                params: { identifier, password }
            });
            const data = response.data;

            // Store user role and id in local storage
            localStorage.setItem('user_role', data.role);
            localStorage.setItem('user_id', data.id.toString());
            localStorage.setItem('username', data.username);

            if (data.role === 'ADMIN' || data.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/public');
            }
        } catch (err: any) {
            const msg = err.response?.data?.detail || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
                <div className="text-center">
                    <div className="mx-auto h-20 w-20 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                        <LogIn className="h-10 w-10 text-primary-600" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Paydaş Analizi
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 font-medium">
                        Veri toplama ve coğrafi analiz platformu
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="identifier" className="block text-sm font-semibold text-gray-700 mb-1">
                                Kullanıcı Adı veya E-posta
                            </label>
                            <input
                                id="identifier"
                                type="text"
                                required
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="block w-full px-4 py-3 rounded-xl border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all sm:text-sm"
                                placeholder="admin veya ornek@kurum.com"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
                                Şifre
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full px-4 py-3 rounded-xl border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all sm:text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100 animate-pulse">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin h-5 w-5" />
                        ) : (
                            'Giriş Yap'
                        )}
                    </button>
                </form>

                <div className="mt-6 border-t border-gray-100 pt-6 flex flex-col items-center gap-4">
                    <div className="flex justify-center gap-8">
                        <div className="flex flex-col items-center">
                            <Shield className="h-5 w-5 text-gray-400 mb-1" />
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Admin</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <Users className="h-5 w-5 text-gray-400 mb-1" />
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Public</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-50 w-full flex flex-col items-center gap-2">
                        <p className="text-gray-500 text-sm">Hesabınız yok mu?</p>
                        <Link
                            to="/register"
                            className="text-primary-600 font-bold hover:text-primary-700 transition-colors"
                        >
                            Yeni Kayıt Oluştur
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
