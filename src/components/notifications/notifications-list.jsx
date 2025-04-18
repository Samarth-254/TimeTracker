import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { subscribeToNotifications, markNotificationAsRead, subscribeToUserTimeEntries } from '@/lib/supabase'

export function NotificationsList() {
  const [unreadCount, setUnreadCount] = useState(0)
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data
    },
    enabled: !!user?.id
  })

  // Update unread count
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length)
  }, [notifications])

  // Subscribe to new notifications
  useEffect(() => {
    if (!user?.id) return

    const subscription = subscribeToNotifications(user.id, (payload) => {
      const { eventType, new: newNotification } = payload
      
      if (eventType === 'INSERT') {
        // Update notifications cache
        queryClient.setQueryData(['notifications'], (old) => {
          return [newNotification, ...(old || [])]
        })
        
        // Update unread count
        setUnreadCount(count => count + 1)
      }
    })

    return () => subscription.unsubscribe()
  }, [user?.id, queryClient])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const subscription = subscribeToUserTimeEntries(user.id, (payload) => {
      const { eventType, new: newRecord } = payload;
      
      // Add a new notification when important events occur
      if (eventType === 'INSERT') {
        queryClient.setQueryData(["notifications"], (old = []) => {
          const notification = {
            id: Date.now(),
            title: "New Time Entry",
            message: "A new time entry has been created.",
            timestamp: new Date().toISOString(),
            read: false
          };
          return [notification, ...old];
        });
        setUnreadCount(prev => prev + 1);
      } else if (eventType === 'UPDATE' && newRecord.status === 'completed') {
        queryClient.setQueryData(["notifications"], (old = []) => {
          const notification = {
            id: Date.now(),
            title: "Time Entry Completed",
            message: "Your time entry has been marked as completed.",
            timestamp: new Date().toISOString(),
            read: false
          };
          return [notification, ...old];
        });
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, queryClient]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId)
      
      // Update local state
      queryClient.setQueryData(['notifications'], (old) => {
        return old.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      })
      
      // Update unread count
      setUnreadCount(count => Math.max(0, count - 1))
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive'
      })
    }
  }

  const markAllAsRead = () => {
    queryClient.setQueryData(["notifications"], (old = []) => 
      old.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h4 className="font-medium">Notifications</h4>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              className="h-auto px-2 py-1 text-xs"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length > 0 ? (
            <div className="space-y-1 p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg px-3 py-2 text-sm",
                    notification.read ? "opacity-60" : "bg-accent"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{notification.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{notification.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}