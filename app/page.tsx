'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

const API_URL = 'https://dialy-app-backend.onrender.com'

interface Diary {
  id: string
  content: string
  created_at: string
}

type Tab = 'write' | 'read'

export default function Home() {
  const { userId, loading } = useUser()
  const [activeTab, setActiveTab] = useState<Tab>('write')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [receivedDiaries, setReceivedDiaries] = useState<Diary[]>([])
  const [fetchingDiaries, setFetchingDiaries] = useState(false)
  const [hasPostedToday, setHasPostedToday] = useState(false)
  const [hasReceivedToday, setHasReceivedToday] = useState(false)

  // 今日の投稿状態をlocalStorageから復元
  useEffect(() => {
    if (!userId) return

    const today = new Date().toDateString()
    const lastPostedDate = localStorage.getItem(`lastPosted_${userId}`)
    const lastReceivedDate = localStorage.getItem(`lastReceived_${userId}`)

    if (lastPostedDate === today) {
      setHasPostedToday(true)
    }
    if (lastReceivedDate === today) {
      setHasReceivedToday(true)
    }
  }, [userId])

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

      // 投稿成功後の処理
      const today = new Date().toDateString()
      localStorage.setItem(`lastPosted_${userId}`, today)
      setHasPostedToday(true)
      setMessage('日記を投稿しました！')
      setContent('')

      // 自動的に「読む」タブに切り替え
      setTimeout(() => {
        setActiveTab('read')
        setMessage('')
      }, 1500)
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

      // 受け取り成功後の処理
      const today = new Date().toDateString()
      localStorage.setItem(`lastReceived_${userId}`, today)
      setHasReceivedToday(true)

      if (diaries.length === 0) {
        setMessage('まだ日記が配信されていません')
      } else {
        setMessage(`${diaries.length}件の日記を受け取りました`)
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-center text-gray-800">匿名日記</h1>
        </div>
      </header>

      {/* タブナビゲーション（モバイル） */}
      <div className="md:hidden bg-white border-b border-gray-200 sticky top-16 z-10">
        <div className="flex">
          <button
            onClick={() => setActiveTab('write')}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === 'write'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            書く
          </button>
          <button
            onClick={() => setActiveTab('read')}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === 'read'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            読む
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* デスクトップ: 2カラム / モバイル: タブ切り替え */}
        <div className="md:grid md:grid-cols-2 md:gap-6">
          {/* 書くセクション */}
          <div className={`${activeTab === 'read' ? 'hidden md:block' : ''} mb-6 md:mb-0`}>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">今日の日記</h2>

              {hasPostedToday ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">✅</div>
                  <p className="text-lg font-medium text-gray-700 mb-2">今日の日記は投稿済みです</p>
                  <p className="text-sm text-gray-500">また明日お待ちしています</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800"
                      placeholder="今日の出来事や気持ちを書いてみましょう..."
                      disabled={submitting}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !content.trim()}
                    className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-medium text-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors active:scale-95"
                  >
                    {submitting ? '投稿中...' : '日記を投稿する'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* 読むセクション */}
          <div className={`${activeTab === 'write' ? 'hidden md:block' : ''}`}>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">届いた日記</h2>

              {!hasReceivedToday ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">📮</div>
                  <p className="text-gray-600 mb-6">
                    {hasPostedToday
                      ? '日記を受け取ってみましょう'
                      : '日記を投稿すると、他の人の日記を受け取れます'}
                  </p>
                  <button
                    onClick={handleReceiveDiaries}
                    disabled={fetchingDiaries || !hasPostedToday}
                    className="bg-green-600 text-white py-4 px-8 rounded-lg font-medium text-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors active:scale-95"
                  >
                    {fetchingDiaries ? '取得中...' : '日記を受け取る'}
                  </button>
                  {!hasPostedToday && (
                    <p className="text-xs text-gray-400 mt-3">※ まず日記を投稿してください</p>
                  )}
                </div>
              ) : receivedDiaries.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {receivedDiaries.map((diary, index) => (
                    <div
                      key={diary.id}
                      className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-blue-600">日記 #{index + 1}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(diary.created_at).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {diary.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">📭</div>
                  <p className="text-gray-500">まだ日記が配信されていません</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <div
            className={`mt-6 p-4 rounded-lg text-center font-medium ${
              message.includes('失敗')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            {message}
          </div>
        )}

        {/* フッター情報 */}
        {userId && (
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">User ID: {userId.slice(0, 8)}...</p>
          </div>
        )}
      </main>
    </div>
  )
}
