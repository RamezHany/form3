import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendToSheet, createSheet, deleteRow } from '@/lib/sheets';
import { uploadImage } from '@/lib/github';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/companies - Get all companies
export async function GET() {
  try {
    // Check if user is authenticated as admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get companies data from Google Sheets
    const data = await getSheetData('companies');
    
    // Skip header row and map to objects
    const companies = data.slice(1).map((row) => ({
      id: row[0],
      name: row[1],
      username: row[2],
      // Don't include password
      image: row[4] || null,
      enabled: row[5] !== 'false', // Add enabled status
    }));
    
    return NextResponse.json({ companies });
  } catch (error) {
    console.error('Error getting companies:', error);
    return NextResponse.json(
      { error: 'Failed to get companies' },
      { status: 500 }
    );
  }
}

// POST /api/companies - Create a new company
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated as admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { name, username, password, image } = await request.json();
    
    // Validate required fields
    if (!name || !username || !password) {
      return NextResponse.json(
        { error: 'Name, username, and password are required' },
        { status: 400 }
      );
    }
    
    // Check if companies sheet exists, if not create it
    try {
      await getSheetData('companies');
    } catch {
      console.log('Companies sheet does not exist, creating it...');
      // Create companies sheet with headers
      await createSheet('companies');
      await appendToSheet('companies', [
        ['ID', 'Name', 'Username', 'Password', 'Image'],
      ]);
    }
    
    // Check if username already exists
    const existingData = await getSheetData('companies');
    const existingCompanies = existingData.slice(1); // Skip header row
    
    if (existingCompanies.some((row) => row[2] === username)) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }
    
    // Generate a unique ID for the company
    const id = `company_${Date.now()}`;
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Upload image if provided
    let imageUrl = null;
    if (image) {
      const fileName = `company_${id}_${Date.now()}.jpg`;
      const uploadResult = await uploadImage(fileName, image, 'companies');
      
      if (uploadResult.success) {
        imageUrl = uploadResult.url;
      }
    }
    
    // Add company to the sheet
    await appendToSheet('companies', [
      [id, name, username, hashedPassword, imageUrl],
    ]);
    
    // Create a sheet for the company
    await createSheet(name);
    
    return NextResponse.json({
      success: true,
      company: {
        id,
        name,
        username,
        image: imageUrl,
      },
    });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}

// DELETE /api/companies?id={id} - Delete a company
export async function DELETE(request: NextRequest) {
  try {
    // Check if user is authenticated as admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get company ID from query parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }
    
    // Get companies data
    const data = await getSheetData('companies');
    const companies = data.slice(1); // Skip header row
    
    // Find the company index
    const companyIndex = companies.findIndex((row) => row[0] === id);
    
    if (companyIndex === -1) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }
    
    // Get company name for deleting its sheet
    const companyName = companies[companyIndex][1];
    
    // Delete the company row (add 1 to account for header row)
    await deleteRow('companies', companyIndex + 1);
    
    // Note: We don't delete the company's sheet to preserve data
    // In a production environment, you might want to archive it instead
    
    return NextResponse.json({
      success: true,
      message: `Company ${companyName} deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    );
  }
}

// PATCH /api/companies - Update company details
export async function PATCH(request: NextRequest) {
  try {
    // Check if user is authenticated as admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { id, name, username, password, image, enabled } = await request.json();
    
    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }
    
    // Get companies data
    const data = await getSheetData('companies');
    const companies = data.slice(1); // Skip header row
    
    // Find the company to update
    const companyIndex = companies.findIndex((row) => row[0] === id);
    
    if (companyIndex === -1) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }
    
    // Check if username already exists (if changing username)
    if (username && username !== companies[companyIndex][2]) {
      if (companies.some((row) => row[2] === username && row[0] !== id)) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        );
      }
    }
    
    // Prepare updated company data
    const updatedCompany = [...companies[companyIndex]];
    
    // Update fields if provided
    if (name) updatedCompany[1] = name;
    if (username) updatedCompany[2] = username;
    
    // Hash and update password if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updatedCompany[3] = hashedPassword;
    }
    
    // Upload and update image if provided
    if (image) {
      const fileName = `company_${id}_${Date.now()}.jpg`;
      const uploadResult = await uploadImage(fileName, image, 'companies');
      
      if (uploadResult.success) {
        updatedCompany[4] = uploadResult.url;
      }
    }
    
    // Update enabled status if provided (add a new column if it doesn't exist)
    if (enabled !== undefined) {
      if (updatedCompany.length <= 5) {
        updatedCompany[5] = enabled ? 'true' : 'false';
      } else {
        updatedCompany[5] = enabled ? 'true' : 'false';
      }
    }
    
    // Delete the old row and insert the updated one
    await deleteRow('companies', companyIndex + 2); // +2 because of 0-indexing and header row
    await appendToSheet('companies', [updatedCompany]);
    
    return NextResponse.json({ 
      success: true,
      company: {
        id: updatedCompany[0],
        name: updatedCompany[1],
        username: updatedCompany[2],
        image: updatedCompany[4] || null,
        enabled: updatedCompany[5] === 'true'
      }
    });
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
} 