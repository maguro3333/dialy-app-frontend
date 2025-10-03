'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

const API_URL = 'https://dialy-app-backend.onrender.com'

interface Diary {
  id: string
  content: string
  created_at: string
  saved_count?: number
  saved_at?: string
}

type Tab = 'write' | 'read' | 'collection'

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
  const [hasSavedToday, setHasSavedToday] = useState(false)
  const [savedDiaries, setSavedDiaries] = useState<Diary[]>([])
  const [notifications, setNotifications] = useState<Diary[]>([])
  const [savingDiaryId, setSavingDiaryId] = useState<string | null>(null)

  // コレクション取得関数
  const fetchSavedDiaries = useCallback(async () => {
    if (!userId) return

    try {
      const response = await fetch(`${API_URL}/api/diaries/saved?user_id=${userId}`)
      if (!response.ok) throw new Error('Failed to fetch saved diaries')

      const diaries: Diary[] = await response.json()
      setSavedDiaries(diaries)
    } catch (error) {
      console.error('Error fetching saved diaries:', error)
    }
  }, [userId])

  // 通知取得関数
  const fetchNotifications = useCallback(async () => {
    if (!userId) return

    try {
      const response = await fetch(`${API_URL}/api/users/notifications?user_id=${userId}`)
      if (!response.ok) throw new Error('Failed to fetch notifications')

      const notifs: Diary[] = await response.json()
      setNotifications(notifs)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }, [userId])

  // 今日の投稿・受取・保存状態をlocalStorageから復元
  useEffect(() => {
    if (!userId) return

    const today = new Date().toDateString()
    const lastPostedDate = localStorage.getItem(`lastPosted_${userId}`)
    const lastReceivedDate = localStorage.getItem(`lastReceived_${userId}`)
    const lastSavedDate = localStorage.getItem(`lastSaved_${userId}`)

    if (lastPostedDate === today) setHasPostedToday(true)
    if (lastReceivedDate === today) setHasReceivedToday(true)
    if (lastSavedDate === today) setHasSavedToday(true)

    // コレクションと通知を自動読み込み
    fetchSavedDiaries()
    fetchNotifications()
  }, [userId, fetchSavedDiaries, fetchNotifications])

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          content: content.trim(),
        }),
      })

      if (!response.ok) throw new Error('Failed to create diary')

      const today = new Date().toDateString()
      localStorage.setItem(`lastPosted_${userId}`, today)
      setHasPostedToday(true)
      setMessage('日記を投稿しました！')
      setContent('')

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
    if (!userId) return

    setFetchingDiaries(true)
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/api/diaries/today?user_id=${userId}`)
      if (!response.ok) throw new Error('Failed to fetch diaries')

      const diaries: Diary[] = await response.json()
      setReceivedDiaries(diaries)

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

  const handleSaveDiary = async (diaryId: string) => {
    if (!userId || hasSavedToday) return

    setSavingDiaryId(diaryId)
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/api/diaries/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          diary_id: diaryId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to save diary')
      }

      const today = new Date().toDateString()
      localStorage.setItem(`lastSaved_${userId}`, today)
      setHasSavedToday(true)
      setMessage('日記をコレクションに保存しました！')

      // コレクションを再取得
      await fetchSavedDiaries()

      setTimeout(() => {
        setActiveTab('collection')
        setMessage('')
      }, 1500)
    } catch (error) {
      console.error('Error saving diary:', error)
      setMessage(error instanceof Error ? error.message : '保存に失敗しました')
    } finally {
      setSavingDiaryId(null)
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
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">匿名日記</h1>
            {notifications.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setActiveTab('collection')}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
                >
                  <span className="text-2xl">🔔</span>
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications.length}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* タブナビゲーション */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-10">
        <div className="max-w-4xl mx-auto flex">
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
          <button
            onClick={() => setActiveTab('collection')}
            className={`flex-1 py-3 text-center font-medium transition-colors relative ${
              activeTab === 'collection'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            コレクション
            {savedDiaries.length > 0 && (
              <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                {savedDiaries.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 書くセクション */}
        {activeTab === 'write' && (
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
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800"
                  placeholder="今日の出来事や気持ちを書いてみましょう..."
                  disabled={submitting}
                />
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
        )}

        {/* 読むセクション */}
        {activeTab === 'read' && (
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
              <div className="space-y-4">
                {!hasSavedToday && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800">
                      💡 気に入った日記を1つだけ選んで、コレクションに保存できます
                    </p>
                  </div>
                )}
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
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed mb-3">
                      {diary.content}
                    </p>
                    {!hasSavedToday && (
                      <button
                        onClick={() => handleSaveDiary(diary.id)}
                        disabled={savingDiaryId === diary.id}
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400 transition-colors active:scale-95"
                      >
                        {savingDiaryId === diary.id ? '保存中...' : '💾 この日記を保存する'}
                      </button>
                    )}
                  </div>
                ))}
                {hasSavedToday && (
                  <div className="text-center py-4 text-sm text-gray-500">
                    今日は既に1つ保存済みです
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">📭</div>
                <p className="text-gray-500">まだ日記が配信されていません</p>
              </div>
            )}
          </div>
        )}

        {/* コレクションセクション */}
        {activeTab === 'collection' && (
          <div className="space-y-6">
            {/* 通知エリア */}
            {notifications.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                  🔔 通知
                  <span className="ml-2 text-sm bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    {notifications.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg border border-pink-200"
                    >
                      <p className="text-sm font-medium text-pink-900 mb-2">
                        あなたの日記が {notif.saved_count} 人に保存されました！
                      </p>
                      <p className="text-xs text-gray-600 line-clamp-2">{notif.content}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notif.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 保存した日記 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                保存した日記
                {savedDiaries.length > 0 && (
                  <span className="ml-2 text-sm text-gray-500">({savedDiaries.length}件)</span>
                )}
              </h2>

              {savedDiaries.length > 0 ? (
                <div className="space-y-4">
                  {savedDiaries.map((diary) => (
                    <div
                      key={diary.id}
                      className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-emerald-700">💾 保存済み</span>
                        <span className="text-xs text-gray-400">
                          {new Date(diary.saved_at || diary.created_at).toLocaleDateString('ja-JP')}
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
                  <div className="text-5xl mb-4">📚</div>
                  <p className="text-gray-500 mb-2">まだ日記を保存していません</p>
                  <p className="text-xs text-gray-400">気に入った日記を保存してコレクションを作りましょう</p>
                </div>
              )}
            </div>
          </div>
        )}

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
