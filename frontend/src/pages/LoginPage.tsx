import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TextField, Button, Checkbox, FormControlLabel, InputAdornment, IconButton, CircularProgress } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { signInWithGoogle } from '../firebase';
import { Heart, Shield, Sparkles, ArrowRight } from 'lucide-react';
import { sendLogin, getParentProfile, googleSignIn } from '../services/api';


interface LoginPageProps {
  //onGoogleSignIn?: () => void;
  onSuccessfulSignIn?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onSuccessfulSignIn }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // No auto-authentication - user must click the button manually

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Use the API service for login
      await sendLogin({ identifier: identifier, password });
      
      // Store user identifier for profile setup
      localStorage.setItem('userEmail', identifier);
  
      // Fetch parent profile to check completion using API service
      try {
        const profile = await getParentProfile();
        // Check if important fields are filled
        const requiredFields = [
          'full_name',
          'gender',
          'age',
          'relationship_with_child',
          'relationship_status',
          'parenting_style',
        ];
        const isComplete = requiredFields.every(
          (field) =>
            profile[field] !== null &&
            profile[field] !== undefined &&
            profile[field] !== '' &&
            // For age, check for 0 (if you use 0 as default)
            (field !== 'age' || profile[field] > 0)
        );
        if (isComplete) {
          // Notify App.tsx that we just signed in successfully
          if (onSuccessfulSignIn) {
            onSuccessfulSignIn();
          }
          navigate('/parent-dashboard');
        } else {
          navigate('/setup-profile');
        }
      } catch (profileErr) {
        // If profile not found, treat as incomplete
        navigate('/setup-profile');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message && err.message.includes("Google sign-in")) {
        setError("This account was created with Google sign-in. Please use the 'Sign in with Google' button below.");
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // Google sign-in handler
  const handleGoogleSignIn = async () => {
    console.log('Google sign-in button clicked');
    setError('');
    setLoading(true);
    try {
      console.log('Calling signInWithGoogle...');
      const result = await signInWithGoogle();
      
      console.log('Google sign-in successful, getting ID token...');
      const idToken = await result.user.getIdToken();
      localStorage.setItem('userEmail', result.user.email || '');
      
      console.log('Making request to /auth/google...');
      const data = await googleSignIn(idToken, result.user.email || '');
      
      console.log('Response data:', data);
      console.log('profileComplete:', data.profileComplete);
      
      if (!data.profileComplete) {
        console.log('Profile incomplete, navigating to setup-profile');
        navigate("/setup-profile");
      } else {
        console.log('Profile complete, navigating to dashboard');
        // Notify App.tsx that we just signed in successfully
        if (onSuccessfulSignIn) {
          onSuccessfulSignIn();
        }
        navigate("/parent-dashboard");
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError("Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F5DC] via-white to-[#F4C2C2] p-4">
      <div className="w-full max-w-md">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#9CAF88] to-[#8B4513] rounded-2xl mb-4 shadow-lg">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#8B4513] mb-2" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Welcome Back</h1>
          <p className="text-[#6B8CAE] text-lg">Continue your parenting journey with us</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <TextField
                label="Username or Email"
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                fullWidth
                required
                placeholder="Enter your username or email"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    backgroundColor: '#F5F5DC',
                    '&:hover': {
                      backgroundColor: '#F0F0D0',
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'white',
                      boxShadow: '0 0 0 2px #9CAF88',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#8B4513',
                    fontWeight: 500,
                  },
                }}
              />
              
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                fullWidth
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton 
                        onClick={() => setShowPassword(!showPassword)}
                        sx={{ color: '#8B4513' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    backgroundColor: '#F5F5DC',
                    '&:hover': {
                      backgroundColor: '#F0F0D0',
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'white',
                      boxShadow: '0 0 0 2px #9CAF88',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#8B4513',
                    fontWeight: 500,
                  },
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={rememberMe} 
                    onChange={e => setRememberMe(e.target.checked)}
                    sx={{
                      color: '#9CAF88',
                      '&.Mui-checked': {
                        color: '#722F37',
                      },
                    }}
                  />
                }
                label={
                  <span className="text-[#8B4513] font-medium">Remember me</span>
                }
              />
              <a href="/forgot-password" className="text-[#6B8CAE] hover:text-[#722F37] font-medium transition-colors">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{
                backgroundColor: '#722F37',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '16px',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(114, 47, 55, 0.3)',
                '&:hover': {
                  backgroundColor: '#5A2530',
                  boxShadow: '0 6px 16px rgba(114, 47, 55, 0.4)',
                },
                '&:disabled': {
                  backgroundColor: '#D1D5DB',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: 'white' }} />
              ) : (
                <span className="flex items-center justify-center">
                  Sign In
                  <ArrowRight className="ml-2 w-4 h-4" />
                </span>
              )}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[#6B8CAE] font-medium">or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outlined"
              fullWidth
              onClick={handleGoogleSignIn}
              disabled={loading}
              sx={{
                borderColor: '#6B8CAE',
                color: '#6B8CAE',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '16px',
                fontWeight: 600,
                textTransform: 'none',
                borderWidth: '2px',
                '&:hover': {
                  borderColor: '#722F37',
                  color: '#722F37',
                  backgroundColor: '#F5F5DC',
                },
                '&:disabled': {
                  borderColor: '#D1D5DB',
                  color: '#D1D5DB',
                },
              }}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center text-red-600">
                  <Shield className="w-4 h-4 mr-2" />
                  {error}
                </div>
              </div>
            )}

            <div className="text-center pt-4">
              <p className="text-[#6B8CAE]">
                Don't have an account?{' '}
                <Link 
                  to="/signup" 
                  className="text-[#722F37] hover:text-[#8B4513] font-semibold transition-colors"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="flex items-center justify-center space-x-2 text-[#9CAF88]">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Empowering parents, nurturing families</span>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
