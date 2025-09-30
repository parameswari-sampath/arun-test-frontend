'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ThankYouPage() {
  const [email, setEmail] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Check if user has completed a test
    const storedEmail = localStorage.getItem('studentEmail')
    if (!storedEmail) {
      // If no email found, redirect to home
      router.push('/')
      return
    }
    setEmail(storedEmail)
    
    // Clear the stored email after showing thank you page
    const timer = setTimeout(() => {
      localStorage.removeItem('studentEmail')
    }, 5000) // Clear after 5 seconds

    return () => clearTimeout(timer)
  }, [router])

  const handleReturnHome = () => {
    localStorage.removeItem('studentEmail')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-12 text-center">
        {/* Success Icon */}
        <div className="mb-12">
          <div className="mx-auto w-24 h-24 bg-gradient-to-r from-emerald-100 to-green-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <svg
              className="w-14 h-14 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Test Completed Successfully!
          </h1>
          <p className="text-xl text-gray-600 font-medium">
            Congratulations! You have successfully completed your assessment
          </p>
        </div>

        {/* Test Details */}
        <div className="bg-gradient-to-r from-emerald-50 via-blue-50 to-indigo-50 rounded-2xl p-8 mb-10 border border-emerald-100">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-emerald-100 to-blue-100 rounded-full p-3 mr-3">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-emerald-800">Test Summary</h2>
          </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/50 shadow-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-full mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-gray-700 font-semibold">All Sections Completed</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/50 shadow-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-gray-700 font-semibold">All Questions Answered</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/50 shadow-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-full mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-gray-700 font-semibold">Successfully Submitted</div>
          </div>
        </div>
        </div>

        {/* Email Display */}
        {email && (
          <div className="mb-10 p-6 bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div>
                <p className="text-sm text-gray-600 mb-1">Test completed by:</p>
                <p className="font-semibold text-gray-800 text-lg">{email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="mb-10">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full p-3 mr-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800">What happens next?</h3>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-xl p-6 border border-blue-100">
            <div className="space-y-4 text-gray-700">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center mr-4">
                  <span className="text-emerald-600 font-bold text-sm">1</span>
                </div>
                <span className="font-medium">Your responses have been submitted and secured</span>
              </div>
              <div className="flex items-center">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-bold text-sm">2</span>
                </div>
                <span className="font-medium">Results will be processed and carefully analyzed</span>
              </div>
              <div className="flex items-center">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center mr-4">
                  <span className="text-indigo-600 font-bold text-sm">3</span>
                </div>
                <span className="font-medium">You will receive detailed feedback via email</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-6">
          <button
            onClick={handleReturnHome}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Return to Home Page
            </div>
          </button>

          <div className="flex items-center justify-center text-sm text-gray-500">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            You can safely close this browser tab now
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p className="text-sm text-gray-500 font-medium">
              Thank you for your participation. Your responses are valuable to us.
            </p>
          </div>
          <p className="text-xs text-gray-400">
            © 2024 MCQ Test Portal. All responses are confidential and secure.
          </p>
        </div>
      </div>
    </div>
  )
}
