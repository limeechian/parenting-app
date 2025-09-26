import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TextField, Button, Checkbox, FormControlLabel, InputAdornment, IconButton, CircularProgress, Radio, RadioGroup, FormControl } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { signInWithGoogle } from '../firebase';
import { Users, Shield, ArrowRight, Heart, Star } from 'lucide-react';

//const API_BASE_URL = 'http://localhost:8000';
//const API_BASE_URL = 'https://5e0em7cm60.execute-api.ap-southeast-2.amazonaws.com/prod';
//const API_BASE_URL = 'http://parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com';
//const API_BASE_URL = 'https://2fayughxfh.execute-api.ap-southeast-2.amazonaws.com/prod';
// const API_BASE_URL = 'http://localhost:8000'; // For local development
// const API_BASE_URL = 'https://parenzing.com'; // For production
//const API_BASE_URL = 'https://parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com';
//const API_BASE_URL = 'https://parenzing.com';
//import { API_BASE_URL } from '../config/api';
import { sendSignup, googleSignIn, sendLogin } from '../services/api';

const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'parent' | 'professional'>('parent');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    if (!username) {
      setError('Username is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!acceptTerms) {
      setError('You must accept the terms');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Use centralized API service
      await sendSignup({ email, password, username, role });
      
      // Store user email for profile setup
      localStorage.setItem('userEmail', email);
      
      // Auto-login after successful registration using centralized API service
      try {
        const loginData = await sendLogin({ identifier: email, password: password });
        console.log('Auto-login successful:', loginData);
        navigate('/setup-profile');
      } catch (loginErr) {
        console.error('Auto-login failed:', loginErr);
        setError('Signup succeeded, but auto-login failed. Please log in manually.');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  // Google sign-in handler (assumes Firebase is set up)
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      const idToken = await result.user.getIdToken();
  
      localStorage.setItem('userEmail', result.user.email || '');
  
      // Use centralized API service
      const data = await googleSignIn(idToken, result.user.email || '');
      
      if (!data.profileComplete) {
        navigate("/setup-profile");
      } else {
        navigate("/parent-dashboard");
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      setError(error.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F5DC] via-white to-[#F4C2C2] p-4">
      <div className="w-full max-w-lg">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#9CAF88] to-[#8B4513] rounded-2xl mb-4 shadow-lg">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#8B4513] mb-2 font-['Inter']">Join Our Community</h1>
          <p className="text-[#6B8CAE] text-lg">Start your parenting journey with expert guidance</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div className="bg-[#F5F5DC] rounded-xl p-6">
              <div className="flex items-center mb-4">
                <Star className="w-5 h-5 text-[#8B4513] mr-2" />
                <h3 className="text-lg font-semibold text-[#8B4513]">I am a...</h3>
              </div>
              <FormControl component="fieldset" className="w-full">
                <RadioGroup
                  row
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  name="role"
                  className="space-x-6"
                >
                  <FormControlLabel 
                    value="parent" 
                    control={
                      <Radio 
                        sx={{
                          color: '#9CAF88',
                          '&.Mui-checked': {
                            color: '#722F37',
                          },
                        }}
                      />
                    } 
                    label={
                      <span className="text-[#8B4513] font-medium">Parent/Caregiver</span>
                    }
                  />
                  <FormControlLabel 
                    value="professional" 
                    control={
                      <Radio 
                        sx={{
                          color: '#9CAF88',
                          '&.Mui-checked': {
                            color: '#722F37',
                          },
                        }}
                      />
                    } 
                    label={
                      <span className="text-[#8B4513] font-medium">Professional</span>
                    }
                  />
                </RadioGroup>
              </FormControl>
              
              {role === 'professional' && (
                <div className="mt-4 p-4 bg-gradient-to-r from-[#F4C2C2] to-[#F5F5DC] rounded-lg border border-[#F4C2C2]">
                  <div className="flex items-start">
                    <Shield className="w-5 h-5 text-[#722F37] mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[#722F37] font-semibold text-sm mb-1">Professional accounts require review</p>
                      <p className="text-[#8B4513] text-sm">
                        Please upload valid credentials for verification. Our team will notify you once your application is approved.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <TextField
                label="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                fullWidth
                required
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
                label="Email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                fullWidth
                required
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
              
              <TextField
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                fullWidth
                required
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

            {/* Terms and Conditions */}
            <div className="bg-[#F5F5DC] rounded-xl p-4">
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={acceptTerms} 
                    onChange={e => setAcceptTerms(e.target.checked)}
                    sx={{
                      color: '#9CAF88',
                      '&.Mui-checked': {
                        color: '#722F37',
                      },
                    }}
                  />
                }
                label={
                  <span className="text-[#8B4513] text-sm">
                    I agree to the{' '}
                    <a href="/terms" className="text-[#722F37] hover:text-[#8B4513] font-semibold transition-colors">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-[#722F37] hover:text-[#8B4513] font-semibold transition-colors">
                      Privacy Policy
                    </a>
                  </span>
                }
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{
                backgroundColor: '#722F37',
                borderRadius: '12px',
                padding: '14px',
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
                  Create Account
                  <ArrowRight className="ml-2 w-4 h-4" />
                </span>
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[#6B8CAE] font-medium">or continue with</span>
              </div>
            </div>

            {/* Google Sign In */}
            <Button
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

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center text-red-600">
                  <Shield className="w-4 h-4 mr-2" />
                  {error}
                </div>
              </div>
            )}

            {/* Sign In Link */}
            <div className="text-center pt-4">
              <p className="text-[#6B8CAE]">
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  className="text-[#722F37] hover:text-[#8B4513] font-semibold transition-colors"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="flex items-center justify-center space-x-2 text-[#9CAF88]">
            <Heart className="w-4 h-4" />
            <span className="text-sm font-medium">Building stronger families together</span>
            <Heart className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;