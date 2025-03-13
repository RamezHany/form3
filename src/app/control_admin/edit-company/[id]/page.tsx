'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Company {
  id: string;
  name: string;
  username: string;
  image: string | null;
  enabled?: boolean;
}

export default function EditCompanyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '', // Optional, only set if changing
    image: null as string | null,
    enabled: true,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const fetchCompany = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/companies');
      
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      
      const data = await response.json();
      const foundCompany = data.companies.find((c: Company) => c.id === companyId);
      
      if (!foundCompany) {
        throw new Error('Company not found');
      }
      
      setFormData({
        name: foundCompany.name,
        username: foundCompany.username,
        password: '',
        image: null,
        enabled: foundCompany.enabled !== false, // Default to true if not specified
      });
      
      if (foundCompany.image) {
        setImagePreview(foundCompany.image);
      }
    } catch (error) {
      console.error('Error fetching company:', error);
      setError('Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session.user.type !== 'admin') {
      router.push('/');
      return;
    }

    // Fetch company details
    if (status === 'authenticated') {
      fetchCompany();
    }
  }, [status, session, router, companyId, fetchCompany]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData((prev) => ({ ...prev, image: base64String }));
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.username) {
      setError('Name and username are required');
      return;
    }
    
    setSubmitting(true);
    setError('');
    setSuccess(false);
    
    try {
      const response = await fetch('/api/companies', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: companyId,
          name: formData.name,
          username: formData.username,
          password: formData.password || undefined, // Only include if not empty
          image: formData.image || undefined, // Only include if changed
          enabled: formData.enabled,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update company');
      }
      
      // Show success message
      setSuccess(true);
      
      // Reset password field
      setFormData((prev) => ({ ...prev, password: '' }));
      
      // Refresh company data
      fetchCompany();
    } catch (error) {
      console.error('Error updating company:', error);
      setError(error instanceof Error ? error.message : 'Failed to update company');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Edit Company</h1>
          <div className="flex items-center space-x-4">
            <Link
              href="/control_admin"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                Company updated successfully!
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                  Company Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                  Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="image">
                  Profile Image
                </label>
                <input
                  type="file"
                  id="image"
                  name="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-1">Preview:</p>
                    <div className="h-24 w-24 relative">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="rounded-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="enabled"
                    checked={formData.enabled}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Enable Company</span>
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  When disabled, the company cannot log in and users cannot register for its events.
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                    submitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {submitting ? 'Updating...' : 'Update Company'}
                </button>
                <Link
                  href="/control_admin"
                  className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
} 