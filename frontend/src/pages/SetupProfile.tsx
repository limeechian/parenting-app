import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress,
  IconButton,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Typography,
  Box,
  Paper,
  Grid,
} from '@mui/material';
import { 
  User, 
  Baby, 
  Users, 
  ArrowRight, 
  ArrowLeft,
  Check,
  Plus,
  X,
  Calendar,
  MapPin,
  Briefcase,
  Heart,
  Home,
  Edit3,
  Trash2,
  Sparkles,
  Star,
  Shield
} from 'lucide-react';

//const API_BASE_URL = 'http://localhost:8000';
const API_BASE_URL = 'http://3.26.204.206:8000';

const defaultParentProfile = {
  full_name: '',
  gender: '',
  age: 0,
  phone_number: '',
  education_level: '',
  relationship_with_child: '',
  relationship_status: '',
  birthdate: '',
  location: '',
  occupation: '',
  parenting_style: '',
};

const defaultChildProfile = {
    id: '',
    name: '',
    gender: '',
    age: '',
    birthdate: '',
    education_level: '',
    developmental_stage: '',
    special_needs: [],
    characteristics: [],
    current_challenges: [],
  special_notes: '',
};

const specialNeedsOptions = ['Autism', 'ADHD', 'Learning disabilities', 'Physical disabilities', 'Other', 'None'];
const characteristicsOptions = ['Introverted', 'Extroverted', 'Active', 'Calm', 'Sensitive', 'Resilient', 'Other'];
const challengesOptions = ['Sleep issues', 'Behavioural problems', 'Academic struggles', 'Social difficulties', 'Eating issues', 'Emotional regulation', 'Other', 'None'];

const SetupProfile: React.FC = () => {
  const navigate = useNavigate();
  const [parentProfile, setParentProfile] = useState<any>(defaultParentProfile);
  const [children, setChildren] = useState<any[]>([]);
  const [tempChildren, setTempChildren] = useState<any[]>([]); // Temporary children for this session
  const [currentChild, setCurrentChild] = useState<any>(defaultChildProfile);
  const [isEditingChild, setIsEditingChild] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  const normalizeProfile = (profile: any) => ({
    full_name: profile.full_name || '',
    gender: profile.gender || '',
    age: profile.age || 0,
    phone_number: profile.phone_number || '',
    education_level: profile.education_level || '',
    relationship_with_child: profile.relationship_with_child || '',
    relationship_status: profile.relationship_status || '',
    birthdate: profile.birthdate || '',
    location: profile.location || '',
    occupation: profile.occupation || '',
    parenting_style: profile.parenting_style || '',
  });

  // Fetch parent profile and children on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Parent profile
        //const parentRes = await fetch(`${API_BASE_URL}/profile/parent`, { credentials: 'include' });
        const parentRes = await fetch(`${API_BASE_URL}/profile/parent`, {
          credentials: 'include',
        });
        if (parentRes.ok) {
          const data = await parentRes.json();
          setParentProfile(normalizeProfile(data));
        }
        // Children (existing saved children)
        const childrenRes = await fetch(`${API_BASE_URL}/profile/children`, { credentials: 'include' });
        if (childrenRes.ok) {
          const data = await childrenRes.json();
          const savedChildren = data.map((c: any) => {
            const id = c.id ?? c.child_id;
            return { ...c, id: id !== undefined ? id.toString() : '' };
          });
          setChildren(savedChildren);
          setTempChildren(savedChildren); // Initialize temp children with saved ones
        }
      } catch (e) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Parent profile handlers
  const handleParentChange = (field: string, value: any) => {
    setParentProfile((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSaveParentProfile = async () => {
    setLoading(true);
    setError('');
    try {
      //const res = await fetch(`${API_BASE_URL}/profile/parent`, {
              const res = await fetch(`${API_BASE_URL}/profile/parent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...parentProfile,
          age: Number(parentProfile.age) || 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || 'Failed to save parent profile');
        setLoading(false);
        return;
      }
      setCurrentStep(2);
    } catch (e) {
      setError('Failed to save parent profile');
    } finally {
      setLoading(false);
    }
  };

  // Child profile handlers (working with temp children)
  const handleChildChange = (field: string, value: any) => {
    setCurrentChild((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleMultiSelectChange = (field: string, value: string) => {
    setCurrentChild((prev: any) => {
      let arr = prev[field] || [];
      if (value === 'None') {
        // If 'None' is selected, unselect all others and only select 'None'
        return { ...prev, [field]: ['None'] };
      } else {
        // If any other is selected, remove 'None' if present
        arr = arr.filter((item: string) => item !== 'None');
        if (arr.includes(value)) {
          arr = arr.filter((item: string) => item !== value);
        } else {
          arr = [...arr, value];
        }
        return { ...prev, [field]: arr };
      }
    });
  };

  const handleSaveChild = async () => {
    setLoading(true);
    setError('');
    try {
      if (isEditingChild) {
        // Update existing child (this one is already saved in DB)
        const res = await fetch(`${API_BASE_URL}/profile/children/${isEditingChild}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...currentChild,
            age: Number(currentChild.age) || 0,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.detail || 'Failed to update child');
          setLoading(false);
          return;
        }
        const updated = await res.json();
        const id = updated.id ?? updated.child_id;
        setChildren((prev) => prev.map((c) => (c.id === isEditingChild ? { ...updated, id: id !== undefined ? id.toString() : '' } : c)));
        setTempChildren((prev) => prev.map((c) => (c.id === isEditingChild ? { ...updated, id: id !== undefined ? id.toString() : '' } : c)));
        setIsEditingChild(null);
      } else {
        // Add new child to temp state only (not saved to DB yet)
        const newChild = {
          ...currentChild,
          id: `temp_${Date.now()}`, // Temporary ID
          age: Number(currentChild.age) || 0,
        };
        setTempChildren((prev) => [...prev, newChild]);
      }
      setCurrentChild(defaultChildProfile);
    } catch (e) {
      setError('Failed to save child');
    } finally {
      setLoading(false);
    }
  };

  const handleEditChild = (child: any) => {
    setCurrentChild({ ...child });
    setIsEditingChild(child.id);
  };

  const handleDeleteChild = async (childId: string) => {
    setLoading(true);
    setError('');
    try {
      if (childId.startsWith('temp_')) {
        // Delete from temp state only
        setTempChildren((prev) => prev.filter((c) => c.id !== childId));
      } else {
        // Delete from database
        const res = await fetch(`${API_BASE_URL}/profile/children/${childId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok) {
          setError('Failed to delete child');
          setLoading(false);
          return;
        }
        setChildren((prev) => prev.filter((c) => c.id !== childId));
        setTempChildren((prev) => prev.filter((c) => c.id !== childId));
      }
      if (isEditingChild === childId) {
        setCurrentChild(defaultChildProfile);
        setIsEditingChild(null);
      }
    } catch (e) {
      setError('Failed to delete child');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');
    try {
      // Save all temp children to database
      const tempChildrenToSave = tempChildren.filter(child => child.id.startsWith('temp_'));
      
      for (const child of tempChildrenToSave) {
        const res = await fetch(`${API_BASE_URL}/profile/children`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...child,
            id: undefined, // Remove temp ID
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.detail || 'Failed to save children');
          setLoading(false);
          return;
        }
      }
      
      navigate('/parent-dashboard');
    } catch (e) {
      setError('Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  // Navigation handlers
  const nextStep = () => {
    if (currentStep === 1) {
      handleSaveParentProfile();
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const prevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    }
  };

  const skipStep = () => {
    if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  // Validation
  const isParentProfileValid = () => {
    return (
      parentProfile.full_name &&
      parentProfile.gender &&
      parentProfile.age &&
      parentProfile.relationship_with_child &&
      parentProfile.relationship_status
    );
  };

  const isChildValid = () => {
    return (
      currentChild.name &&
      currentChild.gender &&
      currentChild.age &&
      currentChild.birthdate &&
      currentChild.developmental_stage
    );
  };

  // Progress bar
  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-[#8B4513]">Setup Progress</span>
        <span className="text-sm text-[#6B8CAE]">{currentStep} of 3</span>
      </div>
      <div className="w-full bg-[#F5F5DC] rounded-full h-3">
        <div 
          className="bg-gradient-to-r from-[#9CAF88] to-[#8B4513] h-3 rounded-full transition-all duration-500 shadow-sm"
          style={{ width: `${(currentStep / 3) * 100}%` }}
        />
      </div>
    </div>
  );

  // Step 1: Parent Profile
  const renderParentProfileStep = () => (
    <div>
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-[#9CAF88] to-[#8B4513] rounded-xl flex items-center justify-center mr-4 shadow-md">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#8B4513]">Parent Profile</h2>
          <p className="text-[#6B8CAE]">Tell us about yourself to personalize your experience</p>
        </div>
      </div>
      
      <form className="space-y-6" onSubmit={e => { e.preventDefault(); nextStep(); }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <TextField 
              label="Full Name *" 
              value={parentProfile.full_name} 
              onChange={e => handleParentChange('full_name', e.target.value)} 
              fullWidth 
              required 
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: '#F5F5DC',
                  '&:hover': { backgroundColor: '#F0F0D0' },
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
          <div>
            <FormControl fullWidth required>
              <InputLabel sx={{ color: '#8B4513', fontWeight: 500 }}>Gender *</InputLabel>
              <Select 
                value={parentProfile.gender} 
                label="Gender *" 
                onChange={e => handleParentChange('gender', e.target.value)}
                sx={{
                  borderRadius: '12px',
                  backgroundColor: '#F5F5DC',
                  '&:hover': { backgroundColor: '#F0F0D0' },
                  '&.Mui-focused': {
                    backgroundColor: 'white',
                    boxShadow: '0 0 0 2px #9CAF88',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'transparent',
                  },
                }}
              >
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Male">Male</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div>
            <TextField 
              label="Age *" 
              type="number" 
              value={parentProfile.age} 
              onChange={e => handleParentChange('age', e.target.value)} 
              fullWidth 
              required 
              inputProps={{ min: 0 }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: '#F5F5DC',
                  '&:hover': { backgroundColor: '#F0F0D0' },
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
          <div>
            <TextField 
              label="Phone Number" 
              value={parentProfile.phone_number} 
              onChange={e => handleParentChange('phone_number', e.target.value)} 
              fullWidth 
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: '#F5F5DC',
                  '&:hover': { backgroundColor: '#F0F0D0' },
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
          <div>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#8B4513', fontWeight: 500 }}>Education Level</InputLabel>
              <Select 
                value={parentProfile.education_level} 
                label="Education Level" 
                onChange={e => handleParentChange('education_level', e.target.value)}
                sx={{
                  borderRadius: '12px',
                  backgroundColor: '#F5F5DC',
                  '&:hover': { backgroundColor: '#F0F0D0' },
                  '&.Mui-focused': {
                    backgroundColor: 'white',
                    boxShadow: '0 0 0 2px #9CAF88',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'transparent',
                  },
                }}
              >
                <MenuItem value="High School">High School</MenuItem>
                <MenuItem value="Bachelor's">Bachelor's</MenuItem>
                <MenuItem value="Master's">Master's</MenuItem>
                <MenuItem value="PhD">PhD</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div>
            <FormControl fullWidth required>
              <InputLabel sx={{ color: '#8B4513', fontWeight: 500 }}>Relationship with Child *</InputLabel>
              <Select 
                value={parentProfile.relationship_with_child} 
                label="Relationship with Child *" 
                onChange={e => handleParentChange('relationship_with_child', e.target.value)}
                sx={{
                  borderRadius: '12px',
                  backgroundColor: '#F5F5DC',
                  '&:hover': { backgroundColor: '#F0F0D0' },
                  '&.Mui-focused': {
                    backgroundColor: 'white',
                    boxShadow: '0 0 0 2px #9CAF88',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'transparent',
                  },
                }}
              >
                <MenuItem value="Mother">Mother</MenuItem>
                <MenuItem value="Father">Father</MenuItem>
                <MenuItem value="Guardian">Guardian</MenuItem>
                <MenuItem value="Caregiver">Caregiver</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div>
            <FormControl fullWidth required>
              <InputLabel sx={{ color: '#8B4513', fontWeight: 500 }}>Relationship Status *</InputLabel>
              <Select 
                value={parentProfile.relationship_status} 
                label="Relationship Status *" 
                onChange={e => handleParentChange('relationship_status', e.target.value)}
                sx={{
                  borderRadius: '12px',
                  backgroundColor: '#F5F5DC',
                  '&:hover': { backgroundColor: '#F0F0D0' },
                  '&.Mui-focused': {
                    backgroundColor: 'white',
                    boxShadow: '0 0 0 2px #9CAF88',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'transparent',
                  },
                }}
              >
                <MenuItem value="Single">Single</MenuItem>
                <MenuItem value="Married">Married</MenuItem>
                <MenuItem value="Divorced">Divorced</MenuItem>
                <MenuItem value="Separated">Separated</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div>
            <TextField 
              label="Birth Date" 
              type="date" 
              value={parentProfile.birthdate} 
              onChange={e => handleParentChange('birthdate', e.target.value)} 
              fullWidth 
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: '#F5F5DC',
                  '&:hover': { backgroundColor: '#F0F0D0' },
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
          <div>
            <TextField 
              label="Location" 
              value={parentProfile.location} 
              onChange={e => handleParentChange('location', e.target.value)} 
              fullWidth 
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: '#F5F5DC',
                  '&:hover': { backgroundColor: '#F0F0D0' },
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
          <div>
            <TextField 
              label="Occupation" 
              value={parentProfile.occupation} 
              onChange={e => handleParentChange('occupation', e.target.value)} 
              fullWidth 
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: '#F5F5DC',
                  '&:hover': { backgroundColor: '#F0F0D0' },
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
          <div>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#8B4513', fontWeight: 500 }}>Parenting Style</InputLabel>
              <Select 
                value={parentProfile.parenting_style} 
                label="Parenting Style" 
                onChange={e => handleParentChange('parenting_style', e.target.value)}
                sx={{
                  borderRadius: '12px',
                  backgroundColor: '#F5F5DC',
                  '&:hover': { backgroundColor: '#F0F0D0' },
                  '&.Mui-focused': {
                    backgroundColor: 'white',
                    boxShadow: '0 0 0 2px #9CAF88',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'transparent',
                  },
                }}
              >
                <MenuItem value="Authoritative">Authoritative</MenuItem>
                <MenuItem value="Authoritarian">Authoritarian</MenuItem>
                <MenuItem value="Permissive">Permissive</MenuItem>
                <MenuItem value="Uninvolved">Uninvolved</MenuItem>
                <MenuItem value="Not sure">Not sure</MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>
      </form>
    </div>
  );

  // Step 2: Children Profile
  const renderChildrenStep = () => (
    <div>
      <div className="flex items-center mb-6">
        <Baby className="w-6 h-6 text-blue-600 mr-3" />
        <h2 className="text-2xl font-bold text-gray-900">Children Profile</h2>
      </div>
      <p className="text-gray-600 mb-6">Add your children to get personalized parenting advice.</p>
      
      {tempChildren.length > 0 && (
        <div className="space-y-2 mb-6">
          <Typography variant="h6" className="mb-3">Your Children</Typography>
          {tempChildren.map((child) => (
            <div key={child.id} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
              <div>
                <Typography fontWeight={600}>{child.name}</Typography>
                <Typography variant="body2" color="text.secondary">{child.age} years old • {child.gender} • {child.developmental_stage}</Typography>
                {child.id.startsWith('temp_') && (
                  <Typography variant="caption" color="text.secondary">(Not saved yet)</Typography>
                )}
              </div>
              <div>
                <Button size="small" onClick={() => handleEditChild(child)}>Edit</Button>
                <Button size="small" color="error" onClick={() => handleDeleteChild(child.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSaveChild(); }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <TextField label="Name *" value={currentChild.name} onChange={e => handleChildChange('name', e.target.value)} fullWidth required />
          </div>
          <div>
            <FormControl fullWidth required>
              <InputLabel>Gender *</InputLabel>
              <Select value={currentChild.gender} label="Gender *" onChange={e => handleChildChange('gender', e.target.value)}>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Male">Male</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div>
            <TextField label="Age *" type="number" value={currentChild.age} onChange={e => handleChildChange('age', e.target.value)} fullWidth required inputProps={{ min: 0 }} />
          </div>
          <div>
            <TextField label="Birth Date *" type="date" value={currentChild.birthdate} onChange={e => handleChildChange('birthdate', e.target.value)} fullWidth required InputLabelProps={{ shrink: true }} />
          </div>
          <div>
            <FormControl fullWidth>
              <InputLabel>Education Level</InputLabel>
              <Select value={currentChild.education_level} label="Education Level" onChange={e => handleChildChange('education_level', e.target.value)}>
                <MenuItem value="Not attending school">Not attending school</MenuItem>
                <MenuItem value="Kindergarten">Kindergarten</MenuItem>
                <MenuItem value="Primary School">Primary School</MenuItem>
                <MenuItem value="Homeschooled">Homeschooled</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div>
            <FormControl fullWidth required>
              <InputLabel>Developmental Stage *</InputLabel>
              <Select value={currentChild.developmental_stage} label="Developmental Stage *" onChange={e => handleChildChange('developmental_stage', e.target.value)}>
                <MenuItem value="Infancy">Infancy (0-2 years)</MenuItem>
                <MenuItem value="Toddlerhood">Toddlerhood (2-3 years)</MenuItem>
                <MenuItem value="Preschool">Preschool (3-5 years)</MenuItem>
                <MenuItem value="School-age">School-age (6+ years)</MenuItem>
              </Select>
            </FormControl>
          </div>
          {/* Special Needs Section */}
          <div className="col-span-2">
            <Typography variant="subtitle2">Special Needs</Typography>
            {specialNeedsOptions.map(option => (
              <FormControlLabel
                key={option}
                control={<Checkbox checked={currentChild.special_needs.includes(option)} onChange={() => handleMultiSelectChange('special_needs', option)} />}
                label={option}
              />
            ))}
            {/* Show custom field if 'Other' is selected */}
            {currentChild.special_needs.includes('Other') && (
              <TextField
                label="Please specify other special need"
                value={currentChild.customSpecialNeed || ''}
                onChange={e => handleChildChange('customSpecialNeed', e.target.value)}
                fullWidth
                className="mt-2"
              />
            )}
          </div>
          {/* Characteristics Section */}
          <div className="col-span-2">
            <Typography variant="subtitle2">Characteristics</Typography>
            {[...characteristicsOptions, 'None'].map(option => (
              <FormControlLabel
                key={option}
                control={<Checkbox checked={currentChild.characteristics.includes(option)} onChange={() => handleMultiSelectChange('characteristics', option)} />}
                label={option}
              />
            ))}
            {currentChild.characteristics.includes('Other') && (
              <TextField
                label="Please specify other characteristic"
                value={currentChild.customCharacteristic || ''}
                onChange={e => handleChildChange('customCharacteristic', e.target.value)}
                fullWidth
                className="mt-2"
              />
            )}
          </div>
          {/* Current Challenges Section */}
          <div className="col-span-2">
            <Typography variant="subtitle2">Current Challenges</Typography>
            {[...challengesOptions, 'None'].map(option => (
              <FormControlLabel
                key={option}
                control={<Checkbox checked={currentChild.current_challenges.includes(option)} onChange={() => handleMultiSelectChange('current_challenges', option)} />}
                label={option}
              />
            ))}
            {currentChild.current_challenges.includes('Other') && (
              <TextField
                label="Please specify other challenge"
                value={currentChild.customChallenge || ''}
                onChange={e => handleChildChange('customChallenge', e.target.value)}
                fullWidth
                className="mt-2"
              />
            )}
          </div>
          <div>
            <TextField label="Special Notes" value={currentChild.special_notes} onChange={e => handleChildChange('special_notes', e.target.value)} fullWidth multiline rows={2} />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          {isEditingChild && (
            <Button onClick={() => { setCurrentChild(defaultChildProfile); setIsEditingChild(null); }} sx={{ mr: 1 }}>Cancel</Button>
          )}
          <Button type="submit" variant="contained" color="primary" disabled={!isChildValid()}>{isEditingChild ? 'Update Child' : 'Add Child'}</Button>
        </div>
      </form>
    </div>
  );

  // Step 3: Completion
  const renderCompletionStep = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto">
        <Check className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Setup Complete!</h2>
      <p className="text-gray-600 max-w-md mx-auto">
        Thank you for providing this information. We'll use it to give you personalized parenting guidance and support.
      </p>
      
      {tempChildren.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="font-semibold text-blue-900 mb-2">Children to be saved:</h3>
          <ul className="text-sm text-blue-800 space-y-1 text-left">
            {tempChildren.map((child, index) => (
              <li key={child.id}>• {child.name} ({child.age} years old)</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="bg-blue-50 rounded-lg p-6 max-w-md mx-auto">
        <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
        <ul className="text-sm text-blue-800 space-y-1 text-left">
          <li>• Explore your personalized dashboard</li>
          <li>• Start tracking your children's development</li>
          <li>• Chat with our AI parenting assistant</li>
          <li>• Join community groups for support</li>
        </ul>
      </div>
    </div>
  );

  // UI
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC] via-white to-[#F4C2C2] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#9CAF88] to-[#8B4513] rounded-2xl mb-4 shadow-lg">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#8B4513] mb-2 font-['Inter']">Complete Your Profile</h1>
          <p className="text-[#6B8CAE] text-lg">Let's personalize your parenting experience</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {renderProgressBar()}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center mb-6">
              <div className="flex items-center justify-center text-red-600">
                <Shield className="w-4 h-4 mr-2" />
                {error}
              </div>
            </div>
          )}

          {currentStep === 1 && renderParentProfileStep()}
          {currentStep === 2 && renderChildrenStep()}
          {currentStep === 3 && renderCompletionStep()}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center space-x-2 px-6 py-3 border border-[#6B8CAE] text-[#6B8CAE] rounded-xl hover:bg-[#F5F5DC] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center space-x-3">
              {currentStep === 2 && (
                <button
                  onClick={skipStep}
                  className="px-6 py-3 text-[#6B8CAE] hover:text-[#722F37] transition-colors font-medium"
                >
                  Skip
                </button>
              )}
              
              {currentStep < 3 ? (
                <button
                  onClick={nextStep}
                  disabled={currentStep === 1 && !isParentProfileValid()}
                  className="flex items-center space-x-2 px-6 py-3 bg-[#722F37] text-white rounded-xl hover:bg-[#5A2530] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#9CAF88] to-[#8B4513] text-white rounded-xl hover:from-[#8BAF78] hover:to-[#7A3F03] transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  <span>Complete Setup</span>
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="flex items-center justify-center space-x-2 text-[#9CAF88]">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Creating a nurturing environment for your family</span>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupProfile;