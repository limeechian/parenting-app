import React, { useEffect, useState } from 'react';
import { getParentProfile, getChildren } from '../services/api';
import { CircularProgress, Card, CardContent, Typography, Grid } from '@mui/material';

const ParentDashboard: React.FC = () => {
  const [parent, setParent] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const parentData = await getParentProfile();
        setParent(parentData);
        const childrenData = await getChildren();
        setChildren(childrenData);
      } catch (e: any) {
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex justify-center items-center min-h-screen"><CircularProgress /></div>;
  if (error) return <div className="text-red-600 text-center mt-8">{error}</div>;

  return (
    <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {parent?.full_name || 'Parent'}! 👋
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your children's development today.
        </p>
      </div>
      <Grid container spacing={4}>
        <Grid item xs={12} sm={6} md={4}>
          <Card className="bg-blue-50">
            <CardContent>
              <Typography variant="h6">Children</Typography>
              <Typography variant="h3" color="primary">{children.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Add more stats here as needed */}
      </Grid>
      {/* Show message if no children */}
      {children.length === 0 && (
        <div className="mt-8 text-center text-gray-700 text-lg">
          You have not added any children yet.<br />
          <span className="text-blue-600 font-semibold">Add your children in the <a href="/profile" className="underline">Profile</a> page</span> for more personalized and tailored parenting advice just for your family!
        </div>
      )}
      {/* Recent activities, tips, etc. can be added here */}
    </div>
  );
};

export default ParentDashboard;