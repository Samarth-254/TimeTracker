import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Prefer': 'return=representation'
    }
  }
})

// Auth helpers
export const signIn = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export const signUp = async ({ email, password, fullName }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })
  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Realtime subscriptions
export const subscribeToTimeEntries = (callback) => {
  return supabase
    .channel('time_entries_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'time_entries'
      },
      callback
    )
    .subscribe()
}

export const subscribeToUserTimeEntries = (userId, callback) => {
  return supabase
    .channel(`user_time_entries_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'time_entries',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

export const subscribeToLeaveRecords = (callback) => {
  return supabase
    .channel('leave_records_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leave_records'
      },
      callback
    )
    .subscribe()
}

export const subscribeToUserLeaveRecords = (userId, callback) => {
  return supabase
    .channel(`user_leave_records_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leave_records',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

export const subscribeToUserPresence = (callback) => {
  const channel = supabase.channel('online_users')
  
  channel
    .on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState()
      callback(presenceState)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() })
      }
    })
    
  return channel
}

// Enhanced user profile management
export const updateUserProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

// Team management
export const subscribeToTeamPresence = (teamId, callback) => {
  const channel = supabase.channel(`team_presence_${teamId}`)
  
  channel
    .on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState()
      callback(presenceState)
    })
    .subscribe()
    
  return channel
}

export const getTeamMembers = async (teamId) => {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('team_id', teamId)

  if (error) throw error
  return data
}

// Enhanced time tracking
export const getCurrentTimeEntry = async (userId) => {
  // Instead of filtering by today's date, we just look for any active entry
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 is "no rows returned"
  return data
}

export const clockIn = async (userId) => {
  const existingEntry = await getCurrentTimeEntry(userId)
  if (existingEntry) {
    throw new Error('Already clocked in')
  }

  // Get current date and time in Indian timezone (IST = UTC+5:30)
  const options = { timeZone: 'Asia/Kolkata' }
  const now = new Date()
  
  // Format date as YYYY-MM-DD in Indian timezone
  const dateInIndia = now.toLocaleDateString('en-CA', options) // en-CA gives YYYY-MM-DD format
  
  // Get day of week in Indian timezone
  const dayOfWeekInIndia = now.toLocaleDateString('en-US', { ...options, weekday: 'long' })
  
  // Format time as HH:MM:SS in Indian timezone
  const timeInIndia = now.toLocaleTimeString('en-US', { ...options, hour12: false })
  
  const entry = {
    user_id: userId,
    date: dateInIndia,
    day_of_week: dayOfWeekInIndia,
    check_in: timeInIndia,
    status: 'active'
  }

  const { data, error } = await supabase
    .from('time_entries')
    .insert([entry])
    .select()
    .single()

  if (error) throw error
  return data
}

export const clockOut = async (userId) => {
  const entry = await getCurrentTimeEntry(userId)
  if (!entry) {
    throw new Error('No active time entry found')
  }

  // Get current time in Indian timezone
  const options = { timeZone: 'Asia/Kolkata' }
  const now = new Date()
  const checkOut = now.toLocaleTimeString('en-US', { ...options, hour12: false })
  const currentDate = now.toLocaleDateString('en-CA', options) // en-CA gives YYYY-MM-DD format

  // Calculate time difference in hours more accurately
  // Parse hours, minutes, seconds from check-in and check-out times
  const [checkInHours, checkInMinutes, checkInSeconds] = entry.check_in.split(':').map(Number)
  const [checkOutHours, checkOutMinutes, checkOutSeconds] = checkOut.split(':').map(Number)
  
  // Calculate total seconds for each time
  const checkInTotalSeconds = checkInHours * 3600 + checkInMinutes * 60 + checkInSeconds
  const checkOutTotalSeconds = checkOutHours * 3600 + checkOutMinutes * 60 + checkOutSeconds
  
  // Handle overnight shifts (if check-out time is earlier than check-in time)
  let diffInSeconds = checkOutTotalSeconds - checkInTotalSeconds
  if (diffInSeconds < 0 && currentDate !== entry.date) {
    // Add 24 hours in seconds
    diffInSeconds += 24 * 3600
  }
  
  // Convert to hours with 2 decimal places
  const totalHours = Math.round((diffInSeconds / 3600) * 100) / 100

  const { data, error } = await supabase
    .from('time_entries')
    .update({
      check_out: checkOut,
      status: 'completed',
      total_hours: totalHours
    })
    .eq('id', entry.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const getTimeEntriesStats = async (userId, startDate, endDate) => {
  console.log(`Fetching stats for user ${userId} from ${startDate} to ${endDate}`);
  
  const { data, error } = await supabase
    .from('time_entries')
    .select('*') // Get all fields
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    console.error("Error fetching time entries stats:", error);
    throw error;
  }
  
  console.log("Retrieved time entries:", data);
  
  // Process the data to match expected format
  // Make sure data exists and has length
  if (!data || data.length === 0) {
    return [];
  }
  
  return data;
}

// Analytics and reporting
export const getTeamStats = async (teamId, startDate, endDate) => {
  const { data, error } = await supabase.rpc('get_team_stats', {
    p_team_id: teamId,
    p_start_date: startDate,
    p_end_date: endDate
  })

  if (error) throw error
  return data
}

// Notifications
export const subscribeToNotifications = (userId, callback) => {
  return supabase
    .channel(`user_notifications_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

export const markNotificationAsRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  if (error) throw error
}