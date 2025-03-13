'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Company {
  id: string;
  name: string;
  username: string;
  image: string | null;
  enabled?: boolean;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updatingCompany, setUpdatingCompany] = useState<string | null>(null);

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

    // Fetch companies
    if (status === 'authenticated') {
      fetchCompanies();
    }
  }, [status, session, router]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/companies');
      
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      
      const data = await response.json();
      setCompanies(data.companies || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/companies?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete company');
      }
      
      // Refresh companies list
      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      setError('Failed to delete company');
    }
  };

  const handleToggleCompanyStatus = async (company: Company) => {
    try {
      setUpdatingCompany(company.id);
      setError('');
      setSuccess('');
      
      const response = await fetch('/api/companies', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: company.id,
          enabled: !company.enabled,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update company');
      }
      
      // Update local state
      setCompanies(companies.map(c => 
        c.id === company.id 
          ? { ...c, enabled: !company.enabled } 
          : c
      ));
      
      setSuccess(`Company ${company.name} ${!company.enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error updating company:', error);
      setError(error instanceof Error ? error.message : 'Failed to update company');
    } finally {
      setUpdatingCompany(null);
    }
  };

  if (status === 'loading') {
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
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Welcome, Admin</span>
            <button
              onClick={() => router.push('/api/auth/signout')}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Companies</h2>
            <Link
              href="/control_admin/add-company"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Add Company
            </Link>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-10">Loading companies...</div>
          ) : companies.length === 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
              <p className="text-gray-500">No companies found. Add your first company!</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {companies.map((company) => (
                  <li key={company.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      {company.image ? (
                        <div className="h-12 w-12 mr-4 relative">
                          <Image
                            src={company.image}
                            alt={company.name}
                            fill
                            className="rounded-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 mr-4 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-500 text-lg">
                            {company.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{company.name}</h3>
                        <p className="text-sm text-gray-500">@{company.username}</p>
                        <p className="text-xs mt-1">
                          <span className={`inline-block px-2 py-1 rounded ${
                            company.enabled !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {company.enabled !== false ? 'Enabled' : 'Disabled'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        href={`/control_admin/company/${company.id}`}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold py-2 px-4 rounded"
                      >
                        View Events
                      </Link>
                      <Link
                        href={`/control_admin/edit-company/${company.id}`}
                        className="bg-green-100 hover:bg-green-200 text-green-800 font-semibold py-2 px-4 rounded"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleToggleCompanyStatus(company)}
                        disabled={updatingCompany === company.id}
                        className={`${
                          company.enabled !== false
                            ? 'bg-red-100 hover:bg-red-200 text-red-800'
                            : 'bg-green-100 hover:bg-green-200 text-green-800'
                        } font-semibold py-2 px-4 rounded ${
                          updatingCompany === company.id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {updatingCompany === company.id
                          ? 'Updating...'
                          : company.enabled !== false
                          ? 'Disable'
                          : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDeleteCompany(company.id)}
                        className="bg-red-100 hover:bg-red-200 text-red-800 font-semibold py-2 px-4 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 