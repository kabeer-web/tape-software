import { useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../supabase';
import { Eye, EyeOff, LogIn, Lock, User } from 'lucide-react';

// Fallback only — covers accounts created before the `profiles.username`/
// `profiles.email` columns existed and before the DB backfill has run.
// Once every profile row has a username+email, this map is dead code and
// can be deleted; it is not the primary lookup path.
const LEGACY_USER_FALLBACK = {
  'sami': 'sami@beerflow.com',
  'matiullah': 'matiullah@beerflow.com',
  'kabeer': 'kabeer@beerflow.com'
};

const Login = () => {
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resolveEmail = async (username) => {
    const { data, error: lookupError } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', username)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (data?.email) return data.email;
    return LEGACY_USER_FALLBACK[username] || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const username = name.toLowerCase().trim();

    let targetEmail;
    try {
      targetEmail = await resolveEmail(username);
    } catch (err) {
      setError('Could not verify username. Please try again.');
      setLoading(false);
      return;
    }

    if (!targetEmail) {
      setError('Invalid username. Please enter a valid registered name.');
      setLoading(false);
      return;
    }

    try {
      await signIn(targetEmail, password);
    } catch (err) {
      setError('Authentication failed. Please check your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] flex items-center justify-center p-4">
      {/* Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#22c55e]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tighter italic">
            <span className="text-[#22c55e]">BEER</span>
            <span className="text-white">FLOW</span>
          </h1>
          <div className="h-1 w-16 bg-[#22c55e] rounded-full mx-auto mt-2" />
          <p className="text-gray-500 text-sm mt-3">Tape Factory Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-[#22c55e]/20 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div>
              <label className="text-xs text-gray-500 uppercase font-bold mb-1.5 block">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  className="w-full pl-10 p-3 bg-black/30 rounded-xl border border-[#22c55e]/20 text-white outline-none focus:border-[#22c55e]/50 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="text-xs text-gray-500 uppercase font-bold mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-12 p-3 bg-black/30 rounded-xl border border-[#22c55e]/20 text-white outline-none focus:border-[#22c55e]/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#22c55e] text-black font-black py-3 rounded-xl hover:bg-[#1db954] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <><LogIn size={18} /> SIGN IN</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          BeerFlow v1.0 — Authorized Access Only
        </p>
      </div>
    </div>
  );
};

export default Login;
