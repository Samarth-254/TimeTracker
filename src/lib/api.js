import { supabase } from './supabase'

// Time Entries API
export const timeEntriesApi = {
  async getRange(startDate, endDate, userId = null) {
    let query = supabase
      .from('time_entries')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async create(entry) {
    // Format entry data
    const formattedEntry = {
      date: entry.date,
      day_of_week: String(entry.day_of_week),
      check_in: String(entry.check_in),
      status: String(entry.status),
      user_id: entry.user_id // Remove Number() casting since user_id is a UUID string
    };

    const { data, error } = await supabase
      .from('time_entries')
      .insert([formattedEntry])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    return data;
  },

  async batchCreate(entries) {
    const { data, error } = await supabase
      .from('time_entries')
      .insert(entries)
      .select()

    if (error) throw error
    return data
  },

  async update(id, updates) {
    // If check_in and check_out are present, recalculate total_hours
    let total_hours = undefined;
    if (updates.check_in && updates.check_out) {
      const [inH, inM, inS = 0] = updates.check_in.split(":").map(Number);
      const [outH, outM, outS = 0] = updates.check_out.split(":").map(Number);
      let inSec = inH * 3600 + inM * 60 + inS;
      let outSec = outH * 3600 + outM * 60 + inS;
      let diff = outSec - inSec;
      if (diff < 0) diff += 24 * 3600; // handle overnight
      total_hours = Math.round((diff / 3600) * 100) / 100;
    }
    const updateObj = { ...updates };
    if (total_hours !== undefined) updateObj.total_hours = total_hours;
    const { data, error } = await supabase
      .from('time_entries')
      .update(updateObj)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getByStatus(status, userId = null) {
    let query = supabase
      .from('time_entries')
      .select('*')
      .eq('status', status)
      .order('date', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  subscribeToChanges(callback) {
    return supabase
      .channel('time_entries_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'time_entries' },
        callback
      )
      .subscribe()
  }
}

export const leaveRecordsApi = {
  async getRange(startDate, endDate, userId = null) {
    let query = supabase
      .from('leave_records')
      .select(`
        *,
        users:user_id (
          id,
          username,
          full_name
        )
      `)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    }

    query = query.order('date', { ascending: false })

    const { data, error } = await query
    if (error) {
      console.error('Error fetching leave records:', error)
      throw error
    }
    return data
  },

  async create(record) {
    const formattedRecord = {
      date: record.date,
      leave_type: record.leave_type,
      note: record.note || '',
      user_id: record.user_id, // Keeping UUID as is
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('leave_records')
      .insert([formattedRecord])
      .select(`
        *,
        users:user_id (
          id,
          username,
          full_name
        )
      `)
      .single()

    if (error) {
      console.error('Error creating leave record:', error)
      throw error
    }
    return data
  },

  async batchCreate(records) {
    const { data, error } = await supabase
      .from('leave_records')
      .insert(records)
      .select(`
        *,
        users:user_id (
          id
        )
      `)

    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('leave_records')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        users:user_id (
          id
        )
      `)
      .single()

    if (error) throw error
    return data
  },

  async delete(id) {
    const { error } = await supabase
      .from('leave_records')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getByType(leaveType, userId = null) {
    let query = supabase
      .from('leave_records')
      .select(`
        *,
        users:user_id (
          id
        )
      `)
      .eq('leave_type', leaveType)
      .order('date', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getLeaveStats(userId) {
    const startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]; // Start of year
    const endDate = new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]; // End of year

    const { data, error } = await supabase
      .from('leave_records')
      .select('leave_type')
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('user_id', userId);

    if (error) throw error;

    const stats = {
      total: 15, // Annual leave balance
      used: {
        paid: 0,
        unpaid: 0,
        casual: 0
      }
    };

    data.forEach(record => {
      if (record.leave_type in stats.used) {
        stats.used[record.leave_type]++;
      }
    });

    stats.remaining = stats.total - stats.used.paid; // Only paid leave affects the balance

    return stats;
  },

  subscribeToChanges(callback) {
    return supabase
      .channel('leave_records_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'leave_records' },
        callback
      )
      .subscribe()
  }
}

// User Profile API
export const userApi = {
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  subscribeToProfileChanges(userId, callback) {
    return supabase
      .channel('profile_changes')
      .on('postgres_changes',
        { 
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}` 
        },
        callback
      )
      .subscribe()
  }
}

// Stats and Summary API
export const statsApi = {
  async getSummary(userId) {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0]
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0]

    const [timeEntries, leaveRecords] = await Promise.all([
      supabase
        .from('time_entries')
        .select('total_hours,status')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .eq('user_id', userId),
      supabase
        .from('leave_records')
        .select('leave_type')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .eq('user_id', userId)
    ])

    if (timeEntries.error) throw timeEntries.error
    if (leaveRecords.error) throw leaveRecords.error

    return {
      timeEntries: timeEntries.data,
      leaveRecords: leaveRecords.data
    }
  },

  async getYearlyStats(userId, year) {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    const [timeEntries, leaveRecords] = await Promise.all([
      supabase
        .from('time_entries')
        .select('total_hours,status,date')
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('user_id', userId),
      supabase
        .from('leave_records')
        .select('leave_type,date')
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('user_id', userId)
    ])

    if (timeEntries.error) throw timeEntries.error
    if (leaveRecords.error) throw leaveRecords.error

    return {
      timeEntries: timeEntries.data,
      leaveRecords: leaveRecords.data
    }
  }
}