'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

interface Question {
  id: number
  question: string
  description: string
  options: string[]
  section_id: number
}

interface Section {
  id: number
  name: string
  time_limit: number
  total_questions: number
}

interface Timing {
  section_time_remaining: number
  test_time_remaining: number
  is_section_time_up: boolean
  is_test_time_up: boolean
}

interface Progress {
  current_section_id: number
  current_question_number: number
  total_questions_in_section: number
  completion_percentage: number
  total_score: number
  total_sections: number
}

export default function TestPage() {
  const [email, setEmail] = useState('')
  const [question, setQuestion] = useState<Question | null>(null)
  const [section, setSection] = useState<Section | null>(null)
  const [timing, setTiming] = useState<Timing | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [copyPasteAttempts, setCopyPasteAttempts] = useState(0)
  const [isBanned, setIsBanned] = useState(false)
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const router = useRouter()

  // Fullscreen detection and control
  const checkFullscreen = () => {
    const isFullscreenMode = document.fullscreenElement !== null
    setIsFullscreen(isFullscreenMode)
    return isFullscreenMode
  }

  const requestFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      }
    } catch (err) {
      console.error('Failed to enter fullscreen:', err)
      setError('Failed to enter fullscreen mode. Please try again.')
    }
  }

  // Fullscreen event listeners with malpractice detection
  useEffect(() => {
    let wasFullscreen = true // Assume fullscreen when test starts

    const handleFullscreenChange = () => {
      const isFullscreenNow = checkFullscreen()
      
      // If user exits fullscreen during test, mark as malpractice
      if (wasFullscreen && !isFullscreenNow) {
        handleFullscreenExitMalpractice()
      }
      
      wasFullscreen = isFullscreenNow
    }

    const handleFullscreenExitMalpractice = async () => {
      try {
        const response = await fetch(`${API_URL}/api/ban-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        })

        if (response.ok) {
          localStorage.removeItem('studentEmail')
          setIsBanned(true)
        }
      } catch (err) {
        console.error('Failed to ban user for fullscreen exit:', err)
        setIsBanned(true)
      }
    }

    // Check initial fullscreen state
    checkFullscreen()

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
  }, [email])

  useEffect(() => {
    const storedEmail = localStorage.getItem('studentEmail')
    if (!storedEmail) {
      router.push('/')
      return
    }
    setEmail(storedEmail)
    
    // Check if user is banned before proceeding
    checkBanStatus(storedEmail)
  }, [])

  const checkBanStatus = async (studentEmail: string) => {
    try {
      const response = await fetch(`${API_URL}/api/check-test-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: studentEmail }),
      })

      const data = await response.json()

                if (data.success && data.data.ban_status) {
                    // User is banned, set banned state
                    localStorage.removeItem('studentEmail')
                    setIsBanned(true)
                    return
                }
      
      // If not banned, proceed with normal flow
      fetchCurrentQuestion(studentEmail)
    } catch (err) {
      // If check fails, continue with normal flow
      console.log('Could not check ban status, continuing with normal flow')
      fetchCurrentQuestion(studentEmail)
    }
  }

  // Navigation protection - warn then ban for malpractice
  useEffect(() => {
    let navigationAttempts = 0

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      navigationAttempts++
      if (navigationAttempts === 1) {
        e.preventDefault()
        e.returnValue = '⚠️ WARNING: Attempting to leave the test is considered malpractice. This will result in permanent ban. Are you sure?'
        return '⚠️ WARNING: Attempting to leave the test is considered malpractice. This will result in permanent ban. Are you sure?'
      } else {
        // Second attempt - ban the user
        banUserForMalpractice()
        return ''
      }
    }

    const handlePopState = (e: PopStateEvent) => {
      navigationAttempts++
      if (navigationAttempts === 1) {
        e.preventDefault()
        // Show warning in UI instead of alert
        setError('⚠️ WARNING: Going back is considered malpractice. Next attempt will result in permanent ban.')
        // Push state back to prevent navigation
        window.history.pushState(null, '', window.location.href)
      } else {
        // Second attempt - ban the user
        banUserForMalpractice()
      }
    }

    const banUserForMalpractice = async () => {
      try {
        const response = await fetch(`${API_URL}/api/ban-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        })

        if (response.ok) {
          // Clear local storage
          localStorage.removeItem('studentEmail')
          // Set banned state - UI will show ban message
          setIsBanned(true)
        }
      } catch (err) {
        console.error('Failed to ban user for malpractice:', err)
        // Even if API fails, set banned state
        localStorage.removeItem('studentEmail')
        setIsBanned(true)
      }
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    // Disable back button
    window.history.pushState(null, '', window.location.href)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [router, email])

  // Copy-paste detection and security
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect copy-paste shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) {
        e.preventDefault()
        handleCopyPasteAttempt()
      }
      
      // Detect F12 (Developer Tools)
      if (e.key === 'F12') {
        e.preventDefault()
        handleCopyPasteAttempt()
      }
      
      // Detect navigation shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault()
        setError('⚠️ WARNING: Reloading the page is considered malpractice. This will result in permanent ban.')
        handleCopyPasteAttempt()
      }
      
      // Detect right-click context menu
      if (e.key === 'ContextMenu') {
        e.preventDefault()
        handleCopyPasteAttempt()
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      handleCopyPasteAttempt()
    }

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      handleCopyPasteAttempt()
    }

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault()
      handleCopyPasteAttempt()
    }

    const handleSelectStart = (e: Event) => {
      e.preventDefault()
      handleCopyPasteAttempt()
    }

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault()
      handleCopyPasteAttempt()
    }

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('selectstart', handleSelectStart)
    document.addEventListener('dragstart', handleDragStart)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('selectstart', handleSelectStart)
      document.removeEventListener('dragstart', handleDragStart)
    }
  }, [copyPasteAttempts])

  // Focus change detection and security
  useEffect(() => {
    let focusLost = false

    const handleFocusLoss = async () => {
      if (focusLost) return // Prevent multiple triggers
      focusLost = true

      // Ban user immediately for losing focus
      try {
        const response = await fetch(`${API_URL}/api/ban-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        })

        if (response.ok) {
          localStorage.removeItem('studentEmail')
          setIsBanned(true)
        }
      } catch (err) {
        console.error('Failed to ban user for focus loss:', err)
        localStorage.removeItem('studentEmail')
        setIsBanned(true)
      }
    }

    const handleBlur = () => {
      // Window lost focus (tab switch, minimize, etc.)
      handleFocusLoss()
    }

    const handleVisibilityChange = () => {
      // Page visibility changed (tab switch, minimize, etc.)
      if (document.hidden) {
        handleFocusLoss()
      }
    }

    const handleFocus = () => {
      // Window gained focus - reset focus lost flag
      focusLost = false
    }

    // Add event listeners
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [email])

  const handleCopyPasteAttempt = async () => {
    const newAttempts = copyPasteAttempts + 1
    setCopyPasteAttempts(newAttempts)

    if (newAttempts >= 2) {
      // Ban the user after 2 attempts
      await banUser()
    } else {
      // Show warning for first attempt
      setError(`⚠️ Security Warning: Copy-paste detected! Attempt ${newAttempts}/2. Next violation will result in permanent ban.`)
    }
  }

  const banUser = async () => {
    try {
      const response = await fetch(`${API_URL}/api/ban-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setIsBanned(true)
        localStorage.removeItem('studentEmail')
        router.push('/?error=banned')
      } else {
        // If ban API fails, still redirect with error
        setIsBanned(true)
        localStorage.removeItem('studentEmail')
        router.push('/?error=banned')
      }
    } catch (err) {
      console.error('Failed to ban user:', err)
      // Even if API fails, redirect with error
      setIsBanned(true)
      localStorage.removeItem('studentEmail')
      router.push('/?error=banned')
    }
  }

  // Timer effect - update every second
  useEffect(() => {
    if (timing?.section_time_remaining && timing.section_time_remaining > 0) {
      setTimeRemaining(timing.section_time_remaining)

      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up - check if it's the last section
            clearInterval(timer)
            const currentSection = progress?.current_section_id || 1
            const totalSections = progress?.total_sections || 4
            
            if (currentSection >= totalSections) {
              // Last section - show test completed message
              setIsAutoAdvancing(true)
              setError('Time is up! Test completed. Submitting final answers...')
              // Auto-submit and redirect to thank you page
              setTimeout(() => {
                router.push('/thankyou')
              }, 2000)
            } else {
              // Not last section - auto advance
              setIsAutoAdvancing(true)
              setError('Time is up for this section! Auto-advancing...')
              setTimeout(() => {
                fetchCurrentQuestion(email)
              }, 100)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [timing?.section_time_remaining, progress?.current_section_id]) // Add section dependency

  const fetchCurrentQuestion = async (studentEmail: string) => {
    try {
      const response = await fetch(`${API_URL}/api/current-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: studentEmail }),
      })

      const data = await response.json()

      if (data.success) {
        setQuestion(data.data.question)
        setSection(data.data.section)
        setTiming(data.data.timing)
        setProgress(data.data.progress)
        setSelectedAnswer(null)
        setError('')
        setIsAutoAdvancing(false) // Clear auto-advancing state
      } else {
        // Check if test is completed
        if (data.completed || data.message?.includes('completed')) {
          router.push('/thankyou')
          return
        }
        setError(data.message || 'Failed to fetch question')
      }
    } catch (err) {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  const submitAnswer = async () => {
    if (selectedAnswer === null) {
      setError('Please select an answer before proceeding')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          question_id: question?.id,
          selected_answer: selectedAnswer,
          time_taken: 30, // You can track actual time taken
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Check if test is completed
        if (data.data.session_progress.test_completed) {
          // Redirect to thank you page
          setQuestion(null)
          setSection(null)
          setError('')
          router.push('/thankyou')
        } else {
          // Check if we moved to next section
          const currentSectionId = progress?.current_section_id
          const newSectionId = data.data.session_progress.current_section_id

          if (currentSectionId && newSectionId && newSectionId > currentSectionId) {
            // Section transition - no alert, just update state
            setTimeRemaining(timing?.section_time_remaining || 60)
          }

          // Fetch next question
          await fetchCurrentQuestion(email)
        }
      } else {
        setError(data.message || 'Failed to submit answer')
      }
    } catch (err) {
      setError('Cannot connect to server')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (isBanned) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-red-100 to-red-200 flex items-center justify-center p-6">
        <div className="text-center max-w-lg mx-auto">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-red-100 to-red-200 rounded-full mb-8">
              <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-red-800 mb-6">Account Banned</h1>
            <p className="text-lg text-red-700 mb-8 leading-relaxed">You have been permanently banned for violating test security protocols.</p>
            <div className="bg-gradient-to-r from-red-50 to-red-100/50 border border-red-200 rounded-xl p-6 mb-8">
              <p className="text-red-800 font-semibold mb-2">This decision is final and cannot be appealed.</p>
              <p className="text-red-600 text-sm">Security violations detected: Navigation attempts, focus loss, or other prohibited activities.</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Return to Home
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Fullscreen warning
  if (!isFullscreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100 flex items-center justify-center p-6">
        <div className="text-center max-w-lg mx-auto">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full mb-8">
              <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-yellow-800 mb-6">Fullscreen Required</h1>
            <p className="text-lg text-yellow-700 mb-8 leading-relaxed">You must remain in fullscreen mode to continue the test for security purposes.</p>
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 mb-8">
              <p className="text-yellow-800 font-semibold mb-2">Security Protocol Active</p>
              <p className="text-yellow-600 text-sm">Click the button below or press F11 to re-enter fullscreen mode.</p>
            </div>
            <div className="space-y-4">
              <button
                onClick={requestFullscreen}
                className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Enter Fullscreen Mode
                </div>
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-all duration-200"
              >
                Exit Test
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading || isAutoAdvancing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-200 border-t-blue-600"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{isAutoAdvancing ? 'Advancing to Next Section' : 'Loading Test Environment'}</h2>
            <p className="text-gray-600">{isAutoAdvancing ? 'Please wait while we prepare the next section...' : 'Setting up your secure test environment...'}</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !question) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-100 to-orange-100 rounded-full mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Test Error</h1>
          <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
          <button
            onClick={() => fetchCurrentQuestion(email)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </div>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
      {/* Security Notice */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50/50 border-b border-red-100 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center justify-center text-sm">
            <div className="inline-flex items-center bg-red-100/80 rounded-full px-4 py-2">
              <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="font-semibold text-red-800 mr-2">Security Monitor Active</span>
              <span className="text-red-700">All activities are monitored • Violations result in instant ban</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header with timing and progress */}
      <div className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl p-3 mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {section?.name}
                </h1>
                <p className="text-sm text-gray-600 font-medium">
                  Question {progress?.current_question_number} of {progress?.total_questions_in_section}
                </p>
                {copyPasteAttempts > 0 && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border border-yellow-200">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Security Warning: {copyPasteAttempts}/2 violations
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="bg-gradient-to-r from-red-100 to-red-200 rounded-xl p-3 mb-2">
                <div className="text-2xl font-bold text-red-700 flex items-center justify-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatTime(timeRemaining || timing?.section_time_remaining || 0)}
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center justify-end">
                  <span className="mr-2">Answered:</span>
                  <span className="font-semibold">{progress?.current_question_number ? progress.current_question_number - 1 : 0}</span>
                </div>
                <div className="flex items-center justify-end">
                  <span className="mr-2">Section:</span>
                  <span className="font-semibold text-blue-600">{progress?.current_section_id} of {progress?.total_sections}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${progress?.completion_percentage || 0}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Progress</span>
            <span>{Math.round(progress?.completion_percentage || 0)}% Complete</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto p-6 pt-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          {question && (
            <div>
              <div className="mb-8">
                <div className="flex items-start mb-4">
                  <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full p-2 mr-4 mt-1">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 leading-relaxed">
                    {question.question}
                  </h2>
                </div>

                {question.description && (
                  <div className="bg-blue-50/50 rounded-xl p-4 mb-6 border border-blue-100">
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {question.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4 mb-8">
                {question.options.map((option, index) => (
                  <label
                    key={index}
                    className={`group flex items-center p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      selectedAnswer === index
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 shadow-md transform scale-[1.02]'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 hover:shadow-sm'
                    }`}
                  >
                    <div className={`relative mr-4 ${
                      selectedAnswer === index ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      <input
                        type="radio"
                        name="answer"
                        value={index}
                        checked={selectedAnswer === index}
                        onChange={() => setSelectedAnswer(index)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        selectedAnswer === index
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300 group-hover:border-gray-400'
                      }`}>
                        {selectedAnswer === index && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full mr-4 font-bold text-sm transition-all duration-200 ${
                      selectedAnswer === index
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className={`text-gray-800 font-medium leading-relaxed transition-all duration-200 ${
                      selectedAnswer === index ? 'text-gray-900' : ''
                    }`}>
                      {option}
                    </span>
                  </label>
                ))}
              </div>

              {error && (
                <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100/50 border border-red-200 rounded-xl">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-700 font-medium">{error}</span>
                  </div>
                </div>
              )}

              <button
                onClick={submitAnswer}
                disabled={submitting || selectedAnswer === null}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                    Processing Answer...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Submit Answer & Continue
                  </div>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}