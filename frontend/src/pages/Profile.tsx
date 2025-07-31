import React, { useState, useEffect } from 'react';
import { getParentProfile, updateParentProfile, getChildren, addChild, updateChild, deleteChild } from '../services/api';
import { ParentProfile as ParentProfileType, ChildProfile } from '../types/types';
import { Button, TextField, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, InputLabel, FormControl, Checkbox, FormControlLabel, Typography } from '@mui/material';
import { User, Baby, Edit3, Trash2, Plus, Heart, Shield, Sparkles, Star } from 'lucide-react';

const defaultParentProfile: ParentProfileType = {
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

const defaultChildProfile: ChildProfile = {
  name: '',
  gender: '',
  age: 0,
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

const Profile: React.FC = () => {
  const [parentProfile, setParentProfile] = useState<ParentProfileType>(defaultParentProfile);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editParent, setEditParent] = useState(false);
  const [childDialogOpen, setChildDialogOpen] = useState(false);
  const [editingChildIndex, setEditingChildIndex] = useState<number | null>(null);
  const [childForm, setChildForm] = useState<ChildProfile>(defaultChildProfile);
  const [childLoading, setChildLoading] = useState(false);
  // Add state for custom fields
  const [customSpecialNeed, setCustomSpecialNeed] = useState('');
  const [customCharacteristic, setCustomCharacteristic] = useState('');
  const [customChallenge, setCustomChallenge] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const parent = await getParentProfile();
        setParentProfile(parent);
        const kids = await getChildren();
        setChildren(kids);
      } catch (e: any) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Parent profile handlers
  const handleParentChange = (field: keyof ParentProfileType, value: any) => {
    setParentProfile((prev) => ({ ...prev, [field]: value }));
  };
  const handleSaveParent = async () => {
    setLoading(true);
    setError('');
    try {
      await updateParentProfile(parentProfile);
      setEditParent(false);
    } catch (e: any) {
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Child profile handlers
  const openAddChild = () => {
    setChildForm(defaultChildProfile);
    setEditingChildIndex(null);
    setChildDialogOpen(true);
  };
  const openEditChild = (idx: number) => {
    // Ensure arrays are always present and handle null values
    const c = children[idx];
    setChildForm({
      ...c,
      special_needs: Array.isArray(c.special_needs) ? c.special_needs : [],
      characteristics: Array.isArray(c.characteristics) ? c.characteristics : [],
      current_challenges: Array.isArray(c.current_challenges) ? c.current_challenges : [],
      special_notes: c.special_notes || '', // Ensure special_notes is never null
    });
    setEditingChildIndex(idx);
    setChildDialogOpen(true);
  };
  const handleChildChange = (field: keyof ChildProfile, value: any) => {
    setChildForm((prev) => ({ ...prev, [field]: value }));
  };
  /*
  const handleMultiSelect = (field: keyof ChildProfile, value: string) => {
    setChildForm((prev) => {
      const arr = Array.isArray(prev[field]) ? prev[field] as string[] : [];
      return {
        ...prev,
        [field]: arr.includes(value)
          ? arr.filter((v: string) => v !== value)
          : [...arr, value],
      };
    });
  };*/
  const handleMultiSelect = (field: keyof ChildProfile, value: string) => {
    setChildForm((prev) => {
      let arr = Array.isArray(prev[field]) ? prev[field] as string[] : [];
      if (value === 'None') {
        return { ...prev, [field]: ['None'] };
      } else {
        arr = arr.filter((item: string) => item !== 'None');
        if (arr.includes(value)) {
          arr = arr.filter((v: string) => v !== value);
        } else {
          arr = [...arr, value];
        }
        return { ...prev, [field]: arr };
      }
    });
  };
  const handleSaveChild = async () => {
    setChildLoading(true);
    setError('');
    try {
      // Validate that if "Other" is selected, custom text is provided
      if ((childForm.special_needs || []).includes('Other') && !customSpecialNeed.trim()) {
        setError('Please specify the special need when "Other" is selected');
        setChildLoading(false);
        return;
      }
      if ((childForm.characteristics || []).includes('Other') && !customCharacteristic.trim()) {
        setError('Please specify the characteristic when "Other" is selected');
        setChildLoading(false);
        return;
      }
      if ((childForm.current_challenges || []).includes('Other') && !customChallenge.trim()) {
        setError('Please specify the challenge when "Other" is selected');
        setChildLoading(false);
        return;
      }

      // Add custom values if present and not already in array
      let updatedChildForm = { ...childForm };
      
      // Handle special needs
      if ((childForm.special_needs || []).includes('Other') && customSpecialNeed.trim()) {
        // Remove "Other" and add the custom value
        updatedChildForm.special_needs = (childForm.special_needs || []).filter(item => item !== 'Other');
        if (!updatedChildForm.special_needs.includes(customSpecialNeed.trim())) {
          updatedChildForm.special_needs.push(customSpecialNeed.trim());
        }
      }
      
      // Handle characteristics
      if ((childForm.characteristics || []).includes('Other') && customCharacteristic.trim()) {
        // Remove "Other" and add the custom value
        updatedChildForm.characteristics = (childForm.characteristics || []).filter(item => item !== 'Other');
        if (!updatedChildForm.characteristics.includes(customCharacteristic.trim())) {
          updatedChildForm.characteristics.push(customCharacteristic.trim());
        }
      }
      
      // Handle current challenges
      if ((childForm.current_challenges || []).includes('Other') && customChallenge.trim()) {
        // Remove "Other" and add the custom value
        updatedChildForm.current_challenges = (childForm.current_challenges || []).filter(item => item !== 'Other');
        if (!updatedChildForm.current_challenges.includes(customChallenge.trim())) {
          updatedChildForm.current_challenges.push(customChallenge.trim());
        }
      }

      if (editingChildIndex !== null) {
        // Update
        const updated = await updateChild(children[editingChildIndex].id!, updatedChildForm);
        setChildren((prev) => prev.map((c, i) => (i === editingChildIndex ? updated : c)));
      } else {
        // Add
        const added = await addChild(updatedChildForm);
        setChildren((prev) => [...prev, added]);
      }
      setChildDialogOpen(false);
      setCustomSpecialNeed('');
      setCustomCharacteristic('');
      setCustomChallenge('');
    } catch (e: any) {
      setError('Failed to save child');
    } finally {
      setChildLoading(false);
    }
  };
  const handleDeleteChild = async (idx: number) => {
    setChildLoading(true);
    setError('');
    try {
      await deleteChild(children[idx].id!);
      setChildren((prev) => prev.filter((_, i) => i !== idx));
    } catch (e: any) {
      setError('Failed to delete child');
    } finally {
      setChildLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC] via-white to-[#F4C2C2] flex justify-center items-center">
      <div className="text-center">
        <CircularProgress sx={{ color: '#9CAF88' }} />
        <p className="mt-4 text-[#8B4513] font-medium">Loading your profile...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC] via-white to-[#F4C2C2] pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#9CAF88] to-[#8B4513] rounded-2xl mb-4 shadow-lg">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#8B4513] mb-2 font-['Inter']">Your Profile</h1>
          <p className="text-[#6B8CAE] text-lg">Manage your account and family information</p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center mb-6">
            <div className="flex items-center justify-center text-red-600">
              <Shield className="w-4 h-4 mr-2" />
              {error}
            </div>
          </div>
        )}
      {/* Parent Profile Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-[#9CAF88] to-[#8B4513] rounded-xl flex items-center justify-center mr-4 shadow-md">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#8B4513]">Parent Profile</h2>
              <p className="text-[#6B8CAE]">Your personal information and preferences</p>
            </div>
          </div>
          <Button 
            variant="outlined" 
            onClick={() => setEditParent((v) => !v)}
            sx={{
              borderColor: '#6B8CAE',
              color: '#6B8CAE',
              borderRadius: '12px',
              padding: '8px 16px',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': {
                borderColor: '#722F37',
                color: '#722F37',
                backgroundColor: '#F5F5DC',
              },
            }}
          >
            {editParent ? 'Cancel' : 'Edit'}
          </Button>
        </div>
        {editParent ? (
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={e => { e.preventDefault(); handleSaveParent(); }}>
            <TextField label="Full Name" value={parentProfile.full_name} onChange={e => handleParentChange('full_name', e.target.value)} fullWidth required />
            <FormControl fullWidth required>
              <InputLabel>Gender</InputLabel>
              <Select value={parentProfile.gender} label="Gender" onChange={e => handleParentChange('gender', e.target.value)}>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Male">Male</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Age" type="number" value={parentProfile.age} onChange={e => handleParentChange('age', Number(e.target.value))} fullWidth required />
            <TextField label="Phone Number" value={parentProfile.phone_number} onChange={e => handleParentChange('phone_number', e.target.value)} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Education Level</InputLabel>
              <Select value={parentProfile.education_level} label="Education Level" onChange={e => handleParentChange('education_level', e.target.value)}>
                <MenuItem value="High School">High School</MenuItem>
                <MenuItem value="Bachelor's">Bachelor's</MenuItem>
                <MenuItem value="Master's">Master's</MenuItem>
                <MenuItem value="PhD">PhD</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Relationship with Child</InputLabel>
              <Select value={parentProfile.relationship_with_child} label="Relationship with Child" onChange={e => handleParentChange('relationship_with_child', e.target.value)}>
                <MenuItem value="Mother">Mother</MenuItem>
                <MenuItem value="Father">Father</MenuItem>
                <MenuItem value="Guardian">Guardian</MenuItem>
                <MenuItem value="Caregiver">Caregiver</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Relationship Status</InputLabel>
              <Select value={parentProfile.relationship_status} label="Relationship Status" onChange={e => handleParentChange('relationship_status', e.target.value)}>
                <MenuItem value="Single">Single</MenuItem>
                <MenuItem value="Married">Married</MenuItem>
                <MenuItem value="Divorced">Divorced</MenuItem>
                <MenuItem value="Separated">Separated</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Birth Date" type="date" value={parentProfile.birthdate} onChange={e => handleParentChange('birthdate', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Location" value={parentProfile.location} onChange={e => handleParentChange('location', e.target.value)} fullWidth />
            <TextField label="Occupation" value={parentProfile.occupation} onChange={e => handleParentChange('occupation', e.target.value)} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Parenting Style</InputLabel>
              <Select value={parentProfile.parenting_style} label="Parenting Style" onChange={e => handleParentChange('parenting_style', e.target.value)}>
                <MenuItem value="Authoritative">Authoritative</MenuItem>
                <MenuItem value="Authoritarian">Authoritarian</MenuItem>
                <MenuItem value="Permissive">Permissive</MenuItem>
                <MenuItem value="Uninvolved">Uninvolved</MenuItem>
                <MenuItem value="Not sure">Not sure</MenuItem>
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" color="primary" className="col-span-2">Save</Button>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#F5F5DC] rounded-xl p-4">
              <div className="text-[#8B4513] font-semibold mb-1">Full Name</div>
              <div className="text-[#6B8CAE]">{parentProfile.full_name || 'Not provided'}</div>
            </div>
            <div className="bg-[#F5F5DC] rounded-xl p-4">
              <div className="text-[#8B4513] font-semibold mb-1">Gender</div>
              <div className="text-[#6B8CAE]">{parentProfile.gender || 'Not provided'}</div>
            </div>
            <div className="bg-[#F5F5DC] rounded-xl p-4">
              <div className="text-[#8B4513] font-semibold mb-1">Age</div>
              <div className="text-[#6B8CAE]">{parentProfile.age || 'Not provided'}</div>
            </div>
            <div className="bg-[#F5F5DC] rounded-xl p-4">
              <div className="text-[#8B4513] font-semibold mb-1">Phone Number</div>
              <div className="text-[#6B8CAE]">{parentProfile.phone_number || 'Not provided'}</div>
            </div>
            <div className="bg-[#F5F5DC] rounded-xl p-4">
              <div className="text-[#8B4513] font-semibold mb-1">Education Level</div>
              <div className="text-[#6B8CAE]">{parentProfile.education_level || 'Not provided'}</div>
            </div>
            <div className="bg-[#F5F5DC] rounded-xl p-4">
              <div className="text-[#8B4513] font-semibold mb-1">Relationship with Child</div>
              <div className="text-[#6B8CAE]">{parentProfile.relationship_with_child || 'Not provided'}</div>
            </div>
            <div className="bg-[#F5F5DC] rounded-xl p-4">
              <div className="text-[#8B4513] font-semibold mb-1">Relationship Status</div>
              <div className="text-[#6B8CAE]">{parentProfile.relationship_status || 'Not provided'}</div>
            </div>
            <div className="bg-[#F5F5DC] rounded-xl p-4">
              <div className="text-[#8B4513] font-semibold mb-1">Birth Date</div>
              <div className="text-[#6B8CAE]">{parentProfile.birthdate || 'Not provided'}</div>
            </div>
            <div className="bg-[#F5F5DC] rounded-xl p-4">
              <div className="text-[#8B4513] font-semibold mb-1">Location</div>
              <div className="text-[#6B8CAE]">{parentProfile.location || 'Not provided'}</div>
            </div>
            <div className="bg-[#F5F5DC] rounded-xl p-4">
              <div className="text-[#8B4513] font-semibold mb-1">Occupation</div>
              <div className="text-[#6B8CAE]">{parentProfile.occupation || 'Not provided'}</div>
            </div>
            <div className="bg-[#F5F5DC] rounded-xl p-4">
              <div className="text-[#8B4513] font-semibold mb-1">Parenting Style</div>
              <div className="text-[#6B8CAE]">{parentProfile.parenting_style || 'Not provided'}</div>
            </div>
          </div>
        )}
      </div>
      {/* Children Section */}
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-[#F4C2C2] to-[#9CAF88] rounded-xl flex items-center justify-center mr-4 shadow-md">
              <Baby className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#8B4513]">Your Children</h2>
              <p className="text-[#6B8CAE]">Manage your children's information and development</p>
            </div>
          </div>
          <Button 
            variant="contained" 
            onClick={openAddChild}
            sx={{
              backgroundColor: '#722F37',
              borderRadius: '12px',
              padding: '10px 20px',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(114, 47, 55, 0.3)',
              '&:hover': {
                backgroundColor: '#5A2530',
                boxShadow: '0 6px 16px rgba(114, 47, 55, 0.4)',
              },
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Child
          </Button>
        </div>
        {children.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#F5F5DC] rounded-full flex items-center justify-center mx-auto mb-4">
              <Baby className="w-8 h-8 text-[#6B8CAE]" />
            </div>
            <p className="text-[#6B8CAE] text-lg font-medium">No children added yet</p>
            <p className="text-[#6B8CAE] text-sm mt-2">Add your children to get personalized parenting advice</p>
          </div>
        ) : (
          <div className="space-y-4">
            {children.map((child, idx) => (
              <div key={child.id || idx} className="bg-[#F5F5DC] p-6 rounded-xl border border-[#F4C2C2] hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Star className="w-4 h-4 text-[#9CAF88] mr-2" />
                      <Typography fontWeight={600} className="text-[#8B4513] text-lg">{child.name}</Typography>
                    </div>
                    <Typography variant="body2" className="text-[#6B8CAE]">
                      {child.age} years old • {child.gender} • {child.developmental_stage}
                    </Typography>
                    {child.special_needs && child.special_needs.length > 0 && child.special_needs[0] !== 'None' && (
                      <div className="mt-2">
                        <span className="text-xs bg-[#F4C2C2] text-[#722F37] px-2 py-1 rounded-full">
                          Special needs: {child.special_needs.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="small" 
                      onClick={() => openEditChild(idx)}
                      sx={{
                        color: '#6B8CAE',
                        borderColor: '#6B8CAE',
                        borderRadius: '8px',
                        textTransform: 'none',
                        '&:hover': {
                          borderColor: '#722F37',
                          color: '#722F37',
                          backgroundColor: '#F5F5DC',
                        },
                      }}
                      variant="outlined"
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="small" 
                      color="error" 
                      onClick={() => handleDeleteChild(idx)}
                      sx={{
                        backgroundColor: '#F4C2C2',
                        color: '#722F37',
                        borderRadius: '8px',
                        textTransform: 'none',
                        '&:hover': {
                          backgroundColor: '#F0B0B0',
                        },
                      }}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center mt-8">
        <div className="flex items-center justify-center space-x-2 text-[#9CAF88]">
          <Heart className="w-4 h-4" />
          <span className="text-sm font-medium">Nurturing growth, one family at a time</span>
          <Heart className="w-4 h-4" />
        </div>
      </div>

      {/* Child Dialog */}
      <Dialog 
        open={childDialogOpen} 
        onClose={() => setChildDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: '#F5F5DC', 
          color: '#8B4513',
          fontWeight: 600,
          fontSize: '1.25rem',
          borderBottom: '1px solid #F4C2C2'
        }}>
          <div className="flex items-center">
            <Baby className="w-5 h-5 mr-2" />
            {editingChildIndex !== null ? 'Edit Child' : 'Add Child'}
          </div>
        </DialogTitle>
        <DialogContent sx={{ padding: '24px' }}>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField label="Name" value={childForm.name} onChange={e => handleChildChange('name', e.target.value)} fullWidth required />
            <FormControl fullWidth required>
              <InputLabel>Gender</InputLabel>
              <Select value={childForm.gender} label="Gender" onChange={e => handleChildChange('gender', e.target.value)}>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Male">Male</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Age" type="number" value={childForm.age} onChange={e => handleChildChange('age', Number(e.target.value))} fullWidth required />
            <TextField label="Birth Date" type="date" value={childForm.birthdate} onChange={e => handleChildChange('birthdate', e.target.value)} fullWidth required InputLabelProps={{ shrink: true }} />
            <FormControl fullWidth>
              <InputLabel>Education Level</InputLabel>
              <Select value={childForm.education_level} label="Education Level" onChange={e => handleChildChange('education_level', e.target.value)}>
                <MenuItem value="Not attending school">Not attending school</MenuItem>
                <MenuItem value="Kindergarten">Kindergarten</MenuItem>
                <MenuItem value="Primary School">Primary School</MenuItem>
                <MenuItem value="Homeschooled">Homeschooled</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Developmental Stage</InputLabel>
              <Select value={childForm.developmental_stage} label="Developmental Stage" onChange={e => handleChildChange('developmental_stage', e.target.value)}>
                <MenuItem value="Infancy">Infancy (0-2 years)</MenuItem>
                <MenuItem value="Toddlerhood">Toddlerhood (2-3 years)</MenuItem>
                <MenuItem value="Preschool">Preschool (3-5 years)</MenuItem>
                <MenuItem value="School-age">School-age (6+ years)</MenuItem>
              </Select>
            </FormControl>
            <div className="col-span-2">
              <Typography variant="subtitle2">Special Needs</Typography>
              {specialNeedsOptions.map(option => (
                <FormControlLabel
                  key={option}
                  control={<Checkbox checked={(childForm.special_needs || []).includes(option)} onChange={() => handleMultiSelect('special_needs', option)} />}
                  label={option}
                />
              ))}
              {/* Show custom field if 'Other' is selected */}
              {(childForm.special_needs || []).includes('Other') && (
                <TextField
                  label="Please specify other special need"
                  value={customSpecialNeed}
                  onChange={e => setCustomSpecialNeed(e.target.value)}
                  fullWidth
                  className="mt-2"
                />
              )}
            </div>
            <div className="col-span-2">
              <Typography variant="subtitle2">Characteristics</Typography>
              {characteristicsOptions.map(option => (
                <FormControlLabel
                  key={option}
                  control={<Checkbox checked={(childForm.characteristics || []).includes(option)} onChange={() => handleMultiSelect('characteristics', option)} />}
                  label={option}
                />
              ))}
              {(childForm.characteristics || []).includes('Other') && (
                <TextField
                  label="Please specify other characteristic"
                  value={customCharacteristic}
                  onChange={e => setCustomCharacteristic(e.target.value)}
                  fullWidth
                  className="mt-2"
                />
              )}
            </div>
            <div className="col-span-2">
              <Typography variant="subtitle2">Current Challenges</Typography>
              {challengesOptions.map(option => (
                <FormControlLabel
                  key={option}
                  control={<Checkbox checked={(childForm.current_challenges || []).includes(option)} onChange={() => handleMultiSelect('current_challenges', option)} />}
                  label={option}
                />
              ))}
              {(childForm.current_challenges || []).includes('Other') && (
                <TextField
                  label="Please specify other challenge"
                  value={customChallenge}
                  onChange={e => setCustomChallenge(e.target.value)}
                  fullWidth
                  className="mt-2"
                />
              )}
            </div>
            <TextField label="Special Notes" value={childForm.special_notes} onChange={e => handleChildChange('special_notes', e.target.value)} fullWidth multiline rows={2} className="col-span-2" />
          </form>
        </DialogContent>
        <DialogActions sx={{ padding: '16px 24px', backgroundColor: '#F5F5DC' }}>
          <Button 
            onClick={() => setChildDialogOpen(false)}
            sx={{
              color: '#6B8CAE',
              borderColor: '#6B8CAE',
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#722F37',
                color: '#722F37',
                backgroundColor: 'white',
              },
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveChild} 
            variant="contained" 
            disabled={childLoading}
            sx={{
              backgroundColor: '#722F37',
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
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
            {childLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : (editingChildIndex !== null ? 'Update' : 'Add')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
    </div>
  );
};

export default Profile;
