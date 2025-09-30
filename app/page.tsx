'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

function HomePageContent() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  // Fullscreen detection and enforcement
  const checkFullscreen = () => {
    const isFullscreenMode = document.fullscreenElement !== null
    setIsFullscreen(isFullscreenMode)
    return isFullscreenMode
  }

  const requestFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
        // Wait a moment for fullscreen to activate
        setTimeout(() => {
          if (checkFullscreen()) {
            setShowFullscreenPrompt(false)
            // Proceed to test
            localStorage.setItem('studentEmail', email)
            router.push('/test')
          }
        }, 100)
      }
    } catch (err) {
      console.error('Failed to enter fullscreen:', err)
      setError('Failed to enter fullscreen mode. Please try again.')
    }
  }

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      console.error('Failed to exit fullscreen:', err)
    }
  }

  useEffect(() => {
    const emailFromUrl = searchParams.get('email')
    const tokenFromUrl = searchParams.get('token')
    const errorFromUrl = searchParams.get('error')
    
    if (errorFromUrl === 'banned') {
      setError('Your account has been permanently banned from taking tests.')
      setOtpSent(false)
      setEmail('banned@user.com') // Set a dummy email to show the error message properly
    } else if (errorFromUrl === 'completed') {
      setError('Test already completed. You cannot retake the test.')
      setOtpSent(false)
      setEmail('completed@user.com') // Set a dummy email to show the error message properly
    } else if (tokenFromUrl) {
      // Handle encrypted email token
      validateEncryptedToken(tokenFromUrl)
    } else if (emailFromUrl) {
      // Handle plain email (backward compatibility)
      setEmail(emailFromUrl)
      checkTestStatus(emailFromUrl)
    } else {
      setError('Invalid link. Email parameter or token is missing.')
      setEmail('invalid@user.com') // Set a dummy email to show the error message properly
    }
  }, [searchParams])

  // Fullscreen event listeners
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenNow = checkFullscreen()
      // If we're in fullscreen and showing the prompt, proceed to test
      if (isFullscreenNow && showFullscreenPrompt) {
        setShowFullscreenPrompt(false)
        localStorage.setItem('studentEmail', email)
        router.push('/test')
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [showFullscreenPrompt, email, router])

  const validateEncryptedToken = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/validate-encrypted-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (data.success) {
        const email = data.data.email
        setEmail(email)
        // Check if test is already completed
        await checkTestStatus(email)
      } else {
        setError(data.message || 'Invalid or expired test link.')
        setOtpSent(false) // Don't show OTP form
      }
    } catch (err) {
      setError('Cannot validate test link. Please try again.')
      setOtpSent(false)
    }
  }

  const checkTestStatus = async (email: string) => {
    try {
      const response = await fetch(`${API_URL}/api/check-test-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success && data.data.ban_status) {
        setError('Your account has been permanently banned from taking tests.')
        setOtpSent(false) // Don't show OTP form
        return 'banned' // Return 'banned' to indicate user is banned
      } else if (data.success && data.data.test_completed) {
        setError('Test already completed. You cannot retake the test.')
        setOtpSent(false) // Don't show OTP form
        return 'completed' // Return 'completed' to indicate test is completed
      }
      return false // Return false to indicate test is not completed
    } catch (err) {
      // If check fails, continue with normal flow
      console.log('Could not check test status, continuing with normal flow')
      return false
    }
  }

  const sendOTP = async () => {
    if (!email) {
      setError('Email is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      // First check if test is already completed or user is banned
      const status = await checkTestStatus(email)
      if (status === 'banned' || status === 'completed') {
        setLoading(false)
        return
      }

      // If test is not completed, proceed to send OTP
      const response = await fetch(`${API_URL}/api/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          student_name: email.split('@')[0] // Use email prefix as name
        }),
      })

      const data = await response.json()

      if (data.success) {
        setOtpSent(true)
        setError('')
      } else {
        setError(data.message || 'Failed to send OTP. Please try again.')
      }
    } catch (err) {
      setError('Cannot connect to server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!otp) {
      setError('Please enter OTP')
      return
    }

    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          otp: otp,
          student_name: email.split('@')[0] // Use email prefix as name
        }),
      })

      const data = await response.json()

      if (data.success) {
        // OTP verified successfully - check fullscreen
        if (checkFullscreen()) {
          // Already in fullscreen, proceed to test
          localStorage.setItem('studentEmail', email)
          router.push('/test')
        } else {
          // Not in fullscreen, show prompt
          setShowFullscreenPrompt(true)
        }
      } else {
        // Check for different error types
        if (data.code === 'USER_BANNED') {
          setError('Your account has been permanently banned from taking tests.')
          // Clear the form to prevent further attempts
          setOtp('')
          setOtpSent(false)
        } else if (data.code === 'TEST_ALREADY_COMPLETED') {
          setError('Test already completed. You cannot retake the test.')
          // Clear the form to prevent further attempts
          setOtp('')
          setOtpSent(false)
        } else {
          setError(data.message || 'Invalid OTP. Please try again.')
        }
      }
    } catch (err) {
      setError('Cannot connect to server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-send OTP when email is available (after validation)
  useEffect(() => {
    if (email && !otpSent && !loading && !error) {
      sendOTP()
    }
  }, [email])

  if (!email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-100 to-orange-100 rounded-full mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Test Link</h1>
          <p className="text-gray-600 leading-relaxed">
            This link appears to be invalid or corrupted. Please use the correct test link provided to you.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
            MCQ Test Portal
          </h1>
          <p className="text-gray-600">Secure Online Assessment Platform</p>
        </div>

        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <div className="flex items-center mb-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-semibold text-blue-900 text-lg">Test Information</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center text-blue-800">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <span>4 Sections: Quantitative, Logical, Verbal, GK</span>
            </div>
            <div className="flex items-center text-blue-800">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <span>5 Questions per section (20 total)</span>
            </div>
            <div className="flex items-center text-blue-800">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <span>1 minute per section (4 min total)</span>
            </div>
            <div className="flex items-center text-blue-800">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <span>Sequential answering required</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50/50 text-gray-700 font-medium focus:outline-none transition-all duration-200"
          />
        </div>

        {!otpSent ? (
          <div className="text-center">
            {error && error.includes('banned') ? (
              <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-red-100/50 border border-red-200 rounded-2xl shadow-sm">
                <div className="flex items-center justify-center mb-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-red-800">Account Banned</h3>
                </div>
                <p className="text-red-700 mb-4 text-center">
                  Your account has been permanently banned from taking tests.
                </p>
                <div className="text-sm text-red-600 text-center">
                  <p>This decision is final and cannot be appealed.</p>
                </div>
              </div>
            ) : error && (error.includes('already completed') || error.includes('Test already completed')) ? (
              <div className="mb-8 p-6 bg-gradient-to-r from-orange-50 to-orange-100/50 border border-orange-200 rounded-2xl shadow-sm">
                <div className="flex items-center justify-center mb-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-orange-800">Test Already Completed</h3>
                </div>
                <p className="text-orange-700 mb-4 text-center">
                  You have already completed this test. Test retaking is not allowed.
                </p>
                <div className="text-sm text-orange-600 text-center">
                  <p>If you believe this is an error, please contact support.</p>
                </div>
              </div>
            ) : error && (error.includes('Invalid') || error.includes('expired')) ? (
              <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-red-100/50 border border-red-200 rounded-2xl shadow-sm">
                <div className="flex items-center justify-center mb-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-red-800">Invalid Test Link</h3>
                </div>
                <p className="text-red-700 mb-4 text-center">
                  {error}
                </p>
                <div className="text-sm text-red-600 text-center">
                  <p>Please use the correct test link provided to you.</p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600"></div>
                </div>
                <p className="text-gray-600 font-medium mb-2">Preparing Your Test</p>
                <p className="text-sm text-gray-500">Sending OTP to your email...</p>
              </div>
            )}
          </div>
        ) : !showFullscreenPrompt ? (
          <form onSubmit={verifyOTP} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-semibold text-gray-700 mb-3 text-center">
                Enter 6-digit OTP
              </label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 text-center text-2xl tracking-widest font-mono bg-gray-50/50 transition-all duration-200"
                placeholder="000000"
                maxLength={6}
                required
              />
              <p className="text-sm text-gray-500 mt-3 text-center">
                📧 OTP sent to <span className="font-medium text-gray-700">{email}</span>
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl disabled:shadow-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Verifying...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verify & Start Test
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={sendOTP}
              disabled={loading}
              className="w-full text-blue-600 hover:text-blue-800 text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-50 transition-all duration-200 disabled:opacity-50"
            >
              📨 Resend OTP
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Preparing Test Environment</h2>
            <p className="text-gray-600 mb-6">
              Please wait while we set up your secure test environment.
            </p>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-600"></div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <div className="inline-flex items-center text-sm text-gray-500">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ensure stable internet connection before starting
          </div>
        </div>
      </div>

      {/* Fullscreen Prompt */}
      {showFullscreenPrompt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 text-center shadow-2xl border border-white/20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full mb-6">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Fullscreen Required</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              The test must be taken in fullscreen mode to ensure security and maintain test integrity.
            </p>
            <div className="space-y-4">
              <button
                onClick={requestFullscreen}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Enter Fullscreen Mode
                </div>
              </button>
              <button
                onClick={() => {
                  setShowFullscreenPrompt(false)
                  setOtp('')
                  setOtpSent(false)
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-all duration-200"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-6">
              📝 You can exit fullscreen after completing the test
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-200 border-t-blue-600"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading...</h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}
