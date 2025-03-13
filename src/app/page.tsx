import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-6">Event Registration System</h1>
        <p className="text-gray-600 mb-8">
          Welcome to our event registration system. Please choose an option below:
        </p>
        <div className="space-y-4">
          <Link
            href="/control_admin"
            className="block w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded"
          >
            Admin Dashboard
          </Link>
          <Link
            href="/control_comp"
            className="block w-full bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded"
          >
            Company Dashboard
          </Link>
          <div className="border-t border-gray-300 my-6 pt-6">
            <p className="text-sm text-gray-500 mb-2">
              Need to log in first?
            </p>
            <Link
              href="/login"
              className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
