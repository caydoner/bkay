import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { UserPlus, Mail, Lock, User, Briefcase, ChevronLeft } from 'lucide-react';

const Register: React.FC = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        sector: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await api.post('/auth/register', {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                first_name: formData.firstName,
                last_name: formData.lastName,
                sector: formData.sector,
                role: 'PUBLIC'
            });

            alert('Kayıt başarılı! Admin onayı bekleniyor.');
            navigate('/login');
        } catch (err: any) {
            const msg = err.response?.data?.detail || 'Kayıt sırasında bir hata oluştu.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-6">
            <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-primary-100 flex flex-col md:flex-row">
                {/* Left Side - Visual */}
                <div className="md:w-1/3 bg-primary-600 p-8 text-white flex flex-col justify-center items-center text-center">
                    <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                        <UserPlus className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Aramıza Katıl</h2>
                    <p className="text-primary-100 text-sm">Paydaş platformuna kayıt olun ve veri toplama süreçlerine başlayın.</p>
                </div>

                {/* Right Side - Form */}
                <div className="flex-1 p-8 md:p-12">
                    <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-8 transition-colors">
                        <ChevronLeft className="h-4 w-4" /> Giriş Ekranına Dön
                    </Link>

                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Yeni Hesap Oluştur</h1>
                    <p className="text-gray-500 mb-8">Lütfen aşağıdaki bilgileri eksiksiz doldurun.</p>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Kullanıcı Adı</label>
                            <div className="relative">
                                <User className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    name="username"
                                    required
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="w-full bg-gray-50 border border-gray-100 py-3.5 pl-12 pr-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-gray-900"
                                    placeholder="kullanici_adi"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Ad</label>
                            <input
                                type="text"
                                name="firstName"
                                required
                                value={formData.firstName}
                                onChange={handleChange}
                                className="w-full bg-gray-50 border border-gray-100 py-3.5 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-gray-900"
                                placeholder="Mehmet"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Soyad</label>
                            <input
                                type="text"
                                name="lastName"
                                required
                                value={formData.lastName}
                                onChange={handleChange}
                                className="w-full bg-gray-50 border border-gray-100 py-3.5 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-gray-900"
                                placeholder="Yılmaz"
                            />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">E-posta</label>
                            <div className="relative">
                                <Mail className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full bg-gray-50 border border-gray-100 py-3.5 pl-12 pr-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-gray-900"
                                    placeholder="ornek@eposta.com"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Sektör</label>
                            <div className="relative">
                                <Briefcase className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select
                                    name="sector"
                                    required
                                    value={formData.sector}
                                    onChange={handleChange}
                                    className="w-full bg-gray-50 border border-gray-100 py-3.5 pl-12 pr-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-gray-900 appearance-none"
                                >
                                    <option value="">Sektör Seçin</option>
                                    <option value="KAMU">Kamu</option>
                                    <option value="OZEL">Özel Sektör</option>
                                    <option value="STK">STK</option>
                                    <option value="AKADEMI">Akademi</option>
                                    <option value="DIGER">Diğer</option>
                                </select>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Şifre</label>
                            <div className="relative">
                                <Lock className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full bg-gray-50 border border-gray-100 py-3.5 pl-12 pr-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-gray-900"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`md:col-span-2 mt-4 bg-primary-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all active:scale-95 flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <UserPlus className="h-5 w-5" /> {loading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
