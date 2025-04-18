import { useState, useEffect } from 'react'
import { differenceInSeconds } from 'date-fns'
import { subscribeToUserTimeEntries } from '@/lib/supabase'
import { useAuth } from './use-auth'

export function useTimer(startTime) {
  const [duration, setDuration] = useState(0)
  const [isRunning, setIsRunning] = useState(!!startTime)
  const { user } = useAuth()

  // Effect for timer updates
  useEffect(() => {
    if (!startTime) {
      setDuration(0)
      setIsRunning(false)
      return
    }

    setIsRunning(true)
    let intervalId

    const updateDuration = () => {
      const now = new Date()
      const start = new Date(`${startTime}`)
      const diff = differenceInSeconds(now, start)
      setDuration(diff)
    }

    // Initial update
    updateDuration()
    
    // Update every second if timer is running
    intervalId = setInterval(updateDuration, 1000)

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [startTime])

  // Subscribe to real-time updates for status changes
  useEffect(() => {
    if (!user?.id) return

    const subscription = subscribeToUserTimeEntries(user.id, (payload) => {
      const { eventType, new: newRecord } = payload
      
      // Stop timer if entry is completed
      if (eventType === 'UPDATE' && newRecord.status === 'completed') {
        setIsRunning(false)
        setDuration(0)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [user?.id])

  // Calculate hours, minutes and seconds ensuring hours wrap around after 24
  const totalSeconds = duration
  const hours = Math.floor(totalSeconds / 3600) % 24  // Apply modulo 24 to wrap hours
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return {
    duration: totalSeconds,
    isRunning,
    hours,
    minutes,
    seconds
  }
}
