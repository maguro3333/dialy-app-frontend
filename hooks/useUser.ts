import { useEffect, useState } from 'react'

const API_URL = 'https://dialy-app-backend.onrender.com'

export function useUser() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeUser = async () => {
      // localStorageからユーザーIDを確認
      const storedUserId = localStorage.getItem('user_id')

      if (storedUserId) {
        setUserId(storedUserId)
        setLoading(false)
        return
      }

      // 新しいユーザーを作成
      try {
        const response = await fetch(`${API_URL}/api/users/init`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Failed to initialize user')
        }

        const data = await response.json()
        const newUserId = data.user_id

        localStorage.setItem('user_id', newUserId)
        setUserId(newUserId)
      } catch (error) {
        console.error('Error initializing user:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeUser()
  }, [])

  return { userId, loading }
}
