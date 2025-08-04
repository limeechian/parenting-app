import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Baby, 
  Heart, 
  Users, 
  AlertTriangle, 
  MessageCircle, 
  BookOpen as DiaryIcon,
  BookOpen, 
  User,
  Menu as MenuIcon,
  X as XIcon,
  Sparkles,
  Shield
} from 'lucide-react';

const navItems = [
  { path: '/parent-dashboard', label: 'Dashboard', icon: Home },
  { path: '/ai-chat', label: 'AI Chat', icon: MessageCircle },
];

const getRoleDisplayName = (role: string) => {
  if (role === 'professional') return 'Professional';
  return 'Parent';
};

const Navigation: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState({ name: 'Parent', role: 'parent', avatar: '' });

  useEffect(() => {
    // Only fetch user profile if we're on a protected route
    const protectedRoutes = ['/parent-dashboard', '/ai-chat', '/profile'];
    if (protectedRoutes.some(route => location.pathname.startsWith(route))) {
      //fetch('https://parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com/profile/parent', { credentials: 'include' })
      fetch('https://parenzing.com/profile/parent', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          setUser({
            name: data.username || data.full_name || 'Parent',
            role: 'parent',
            avatar: '', // or data.avatar if you have it
          });
        })
        .catch(() => {
          setUser({ name: 'Parent', role: 'parent', avatar: '' });
        });
    }
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-lg z-50 border-b border-[#F4C2C2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#9CAF88] to-[#8B4513] rounded-xl flex items-center justify-center shadow-md">
              <Baby className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-[#8B4513] font-['Inter']">ParenZing</span>
              <div className="flex items-center space-x-1 mt-1">
                <Sparkles className="w-3 h-3 text-[#9CAF88]" />
                <span className="text-xs text-[#6B8CAE] font-medium">Nurturing Growth</span>
                <Sparkles className="w-3 h-3 text-[#9CAF88]" />
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-[#9CAF88] to-[#8B4513] text-white shadow-md'
                      : 'text-[#6B8CAE] hover:text-[#8B4513] hover:bg-[#F5F5DC] hover:shadow-sm'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu (Desktop) */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="bg-[#F5F5DC] px-3 py-1 rounded-full">
              <span className="text-xs font-medium text-[#8B4513]">
                {getRoleDisplayName(user?.role || 'parent')}
              </span>
            </div>
            <div className="flex items-center space-x-3 bg-white rounded-xl px-3 py-2 shadow-sm border border-[#F4C2C2]">
              <img
                className="w-8 h-8 rounded-full border-2 border-[#F4C2C2]"
                src={user?.avatar || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'}
                alt={user?.name}
              />
              <span className="text-sm font-medium text-[#8B4513]">{user?.name}</span>
            </div>
            <Link
              to="/profile"
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive('/profile')
                  ? 'bg-gradient-to-r from-[#9CAF88] to-[#8B4513] text-white shadow-md'
                  : 'text-[#6B8CAE] hover:text-[#8B4513] hover:bg-[#F5F5DC] hover:shadow-sm'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </Link>
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium text-[#722F37] hover:bg-[#F4C2C2] hover:text-[#5A2530] transition-all duration-200"
            >
              <Shield className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-[#6B8CAE] hover:text-[#8B4513] hover:bg-[#F5F5DC] transition-all duration-200"
            aria-label="Open menu"
          >
            {isMobileMenuOpen ? (
              <XIcon className="w-6 h-6" />
            ) : (
              <MenuIcon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-80 bg-gradient-to-b from-white to-[#F5F5DC] h-full shadow-2xl border-l border-[#F4C2C2] flex flex-col">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-[#6B8CAE] hover:text-[#8B4513] hover:bg-[#F5F5DC] transition-all duration-200"
              aria-label="Close menu"
            >
              <XIcon className="w-6 h-6" />
            </button>
            
            {/* User Profile Section */}
            <div className="px-6 pt-12 pb-6 flex flex-col items-center border-b border-[#F4C2C2] bg-gradient-to-r from-[#F5F5DC] to-white">
              <div className="w-20 h-20 bg-gradient-to-br from-[#9CAF88] to-[#8B4513] rounded-full flex items-center justify-center mb-4 shadow-lg">
                <img
                  className="w-16 h-16 rounded-full border-4 border-white"
                  src={user?.avatar || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'}
                  alt={user?.name}
                />
              </div>
              <span className="text-lg font-bold text-[#8B4513] mb-1">{user?.name}</span>
              <div className="bg-[#F4C2C2] px-3 py-1 rounded-full">
                <span className="text-sm font-medium text-[#722F37]">
                  {getRoleDisplayName(user?.role || 'parent')}
                </span>
              </div>
              <div className="flex items-center space-x-1 mt-3">
                <Heart className="w-4 h-4 text-[#9CAF88]" />
                <span className="text-xs text-[#6B8CAE] font-medium">Welcome back!</span>
                <Heart className="w-4 h-4 text-[#9CAF88]" />
              </div>
            </div>
            
            {/* Navigation Items */}
            <div className="flex-1 px-4 py-6 space-y-2">
              {[...navItems, { path: '/profile', label: 'Profile', icon: User }].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-gradient-to-r from-[#9CAF88] to-[#8B4513] text-white shadow-md'
                        : 'text-[#6B8CAE] hover:text-[#8B4513] hover:bg-[#F5F5DC] hover:shadow-sm'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              
              {/* Logout Button */}
              <button
                onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                className="w-full text-left flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium text-[#722F37] hover:bg-[#F4C2C2] hover:text-[#5A2530] transition-all duration-200 mt-4"
              >
                <Shield className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#F4C2C2] bg-[#F5F5DC]">
              <div className="flex items-center justify-center space-x-2 text-[#9CAF88]">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Your parenting journey starts here</span>
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;