'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/useUser'

const API_URL = 'https://dialy-app-backend.onrender.com'

export default function Home() {
  const { userId, loading } = useUser()
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId || !content.trim()) {
      setMessage('日記の内容を入力してください')
      return
    }

    setSubmitting(true)
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/api/diaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          content: content.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create diary')
      }

      setMessage('日記を投稿しました！')
      setContent('')
    } catch (error) {
      console.error('Error creating diary:', error)
      setMessage('投稿に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <main className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-8 text-center">匿名日記</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="diary" className="block text-sm font-medium mb-2">
              今日の日記
            </label>
            <textarea
              id="diary"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="今日の出来事や気持ちを書いてみましょう..."
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? '投稿中...' : '日記を投稿する'}
          </button>

          {message && (
            <p className={`text-center ${message.includes('失敗') ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </p>
          )}
        </form>

        {userId && (
          <p className="mt-4 text-xs text-gray-500 text-center">
            User ID: {userId}
          </p>
        )}
      </main>
    </div>
  )
}
