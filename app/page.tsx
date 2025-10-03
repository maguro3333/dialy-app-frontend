'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/useUser'

const API_URL = 'https://dialy-app-backend.onrender.com'

interface Diary {
  id: string
  content: string
  created_at: string
}

export default function Home() {
  const { userId, loading } = useUser()
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [receivedDiaries, setReceivedDiaries] = useState<Diary[]>([])
  const [fetchingDiaries, setFetchingDiaries] = useState(false)

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

  const handleReceiveDiaries = async () => {
    if (!userId) {
      setMessage('ユーザーIDが見つかりません')
      return
    }

    setFetchingDiaries(true)
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/api/diaries/today?user_id=${userId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch diaries')
      }

      const diaries: Diary[] = await response.json()
      setReceivedDiaries(diaries)

      if (diaries.length === 0) {
        setMessage('まだ日記が配信されていません')
      }
    } catch (error) {
      console.error('Error fetching diaries:', error)
      setMessage('日記の取得に失敗しました')
    } finally {
      setFetchingDiaries(false)
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
    <div className="min-h-screen p-8 bg-gray-50">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">匿名日記</h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* 日記投稿フォーム */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">日記を書く</h2>
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
            </form>
          </div>

          {/* 日記受け取りセクション */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">届いた日記</h2>
            <button
              onClick={handleReceiveDiaries}
              disabled={fetchingDiaries}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mb-4"
            >
              {fetchingDiaries ? '取得中...' : '日記を受け取る'}
            </button>

            {receivedDiaries.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {receivedDiaries.map((diary, index) => (
                  <div key={diary.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">日記 #{index + 1}</p>
                    <p className="text-sm whitespace-pre-wrap">{diary.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(diary.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                日記を受け取るボタンを押してください
              </p>
            )}
          </div>
        </div>

        {message && (
          <p className={`text-center mt-4 ${message.includes('失敗') ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}

        {userId && (
          <p className="mt-4 text-xs text-gray-500 text-center">
            User ID: {userId}
          </p>
        )}
      </main>
    </div>
  )
}
