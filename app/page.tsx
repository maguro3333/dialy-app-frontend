'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'

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
  const [receivedCount, setReceivedCount] = useState(0)
  const [hasSavedToday, setHasSavedToday] = useState(false)
  const [savedDiaries, setSavedDiaries] = useState<Diary[]>([])
  const [myDiaries, setMyDiaries] = useState<Diary[]>([])
  const [notifications, setNotifications] = useState<Diary[]>([])
  const [savingDiaryId, setSavingDiaryId] = useState<string | null>(null)
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null)

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

  const fetchMyDiaries = useCallback(async () => {
    if (!userId) return
    try {
      const response = await fetch(`${API_URL}/api/diaries/my?user_id=${userId}`)
      if (!response.ok) throw new Error('Failed to fetch my diaries')
      const diaries: Diary[] = await response.json()
      setMyDiaries(diaries)
    } catch (error) {
      console.error('Error fetching my diaries:', error)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const today = new Date().toDateString()
    const lastPostedDate = localStorage.getItem(`lastPosted_${userId}`)
    const lastReceivedDate = localStorage.getItem(`lastReceived_${userId}`)
    const lastSavedDate = localStorage.getItem(`lastSaved_${userId}`)
    const receivedCountStr = localStorage.getItem(`receivedCount_${userId}`)

    if (lastPostedDate === today) setHasPostedToday(true)

    // 受け取り回数を復元（同じ日付なら回数を復元、違う日なら0にリセット）
    if (lastReceivedDate === today && receivedCountStr) {
      setReceivedCount(parseInt(receivedCountStr, 10))
    } else {
      setReceivedCount(0)
      localStorage.removeItem(`receivedCount_${userId}`)
    }

    if (lastSavedDate === today) setHasSavedToday(true)

    fetchSavedDiaries()
    fetchNotifications()
    fetchMyDiaries()
  }, [userId, fetchSavedDiaries, fetchNotifications, fetchMyDiaries])

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
        body: JSON.stringify({ user_id: userId, content: content.trim() }),
      })

      if (!response.ok) throw new Error('Failed to post diary')

      const today = new Date().toDateString()
      localStorage.setItem(`lastPosted_${userId}`, today)
      setHasPostedToday(true)
      setContent('')
      setMessage('日記を投稿しました')

      // 自分の日記履歴を更新
      await fetchMyDiaries()

      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error posting diary:', error)
      setMessage('投稿に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReceiveDiaries = async () => {
    if (!userId || receivedCount >= 5) return

    setFetchingDiaries(true)
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/api/diaries/today?user_id=${userId}`)
      if (!response.ok) throw new Error('Failed to fetch diaries')

      const newDiaries: Diary[] = await response.json()

      if (newDiaries.length === 0) {
        setMessage('今日お届けする日記がありません')
        return
      }

      // 既存の日記に追加
      setReceivedDiaries([...receivedDiaries, ...newDiaries])

      // 受け取り回数を更新
      const newCount = receivedCount + 1
      setReceivedCount(newCount)

      const today = new Date().toDateString()
      localStorage.setItem(`lastReceived_${userId}`, today)
      localStorage.setItem(`receivedCount_${userId}`, newCount.toString())

      setMessage(`日記を受け取りました (${newCount}/5)`)
      setActiveTab('read')

      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error receiving diaries:', error)
      setMessage('日記の受け取りに失敗しました')
    } finally {
      setFetchingDiaries(false)
    }
  }

  const handleSaveDiary = async (diaryId: string) => {
    if (!userId || hasSavedToday || savingDiaryId) return

    setSavingDiaryId(diaryId)
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/api/diaries/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, diary_id: diaryId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to save diary')
      }

      const today = new Date().toDateString()
      localStorage.setItem(`lastSaved_${userId}`, today)
      setHasSavedToday(true)
      setMessage('この日記をコレクションに保存しました')

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-secondary-text font-rounded">読み込み中...</div>
      </div>
    )
  }

  // 詳細モーダル
  if (selectedDiary) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setSelectedDiary(null)}
            className="mb-6 text-secondary-text hover:text-accent transition-colors font-rounded flex items-center gap-2"
          >
            <span>←</span> 戻る
          </button>

          <article className="card-base">
            <div className="prose prose-lg max-w-none">
              <p className="text-primary-text leading-relaxed whitespace-pre-wrap font-serif text-lg">
                {selectedDiary.content}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-secondary-text/10">
              <p className="text-sm text-secondary-text font-rounded">
                {new Date(selectedDiary.created_at).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {selectedDiary.saved_count !== undefined && selectedDiary.saved_count > 0 && (
                <p className="text-sm text-accent font-rounded mt-2">
                  {selectedDiary.saved_count}人に保存されました
                </p>
              )}
            </div>
          </article>

          {activeTab === 'read' && !hasSavedToday && (
            <div className="fixed bottom-8 left-0 right-0 flex justify-center px-4">
              <button
                onClick={() => handleSaveDiary(selectedDiary.id)}
                disabled={savingDiaryId !== null}
                className="btn-primary flex items-center gap-2 shadow-2xl"
              >
                <span>📖</span>
                {savingDiaryId === selectedDiary.id ? '保存中...' : 'この日記を保存する'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="bg-surface shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-rounded font-bold text-primary-text">日記交換</h1>
            {notifications.length > 0 && (
              <button
                onClick={() => setActiveTab('collection')}
                className="relative text-accent"
              >
                <span className="text-2xl">🔔</span>
                <span className="absolute -top-1 -right-1 bg-accent text-white text-xs font-rounded w-5 h-5 rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* メッセージ表示 */}
      {message && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="bg-accent-light/30 text-accent px-4 py-3 rounded-lg font-rounded text-center">
            {message}
          </div>
        </div>
      )}

      {/* タブナビゲーション */}
      <nav className="max-w-4xl mx-auto px-4 mt-6">
        <div className="flex gap-2 bg-surface rounded-full p-1 shadow-md">
          <button
            onClick={() => setActiveTab('write')}
            className={`flex-1 py-3 px-4 rounded-full font-rounded transition-all ${
              activeTab === 'write'
                ? 'bg-accent text-white shadow-md'
                : 'text-secondary-text hover:text-primary-text'
            }`}
          >
            書く
          </button>
          <button
            onClick={() => setActiveTab('read')}
            className={`flex-1 py-3 px-4 rounded-full font-rounded transition-all ${
              activeTab === 'read'
                ? 'bg-accent text-white shadow-md'
                : 'text-secondary-text hover:text-primary-text'
            }`}
          >
            読む
          </button>
          <button
            onClick={() => setActiveTab('collection')}
            className={`flex-1 py-3 px-4 rounded-full font-rounded transition-all relative ${
              activeTab === 'collection'
                ? 'bg-accent text-white shadow-md'
                : 'text-secondary-text hover:text-primary-text'
            }`}
          >
            コレクション
            {savedDiaries.length > 0 && (
              <span className="ml-1 text-xs">({savedDiaries.length})</span>
            )}
          </button>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-8 pb-24">
        {/* 書くタブ */}
        {activeTab === 'write' && (
          <div className="space-y-6">
            {hasPostedToday ? (
              <div className="card-base text-center">
                <p className="text-2xl mb-4">✨</p>
                <h2 className="text-xl font-rounded font-bold text-primary-text mb-2">
                  今日の日記を投稿しました
                </h2>
                <p className="text-secondary-text font-rounded">
                  明日、また新しい日記を綴りましょう
                </p>
              </div>
            ) : (
              <div className="card-base">
                <h2 className="text-lg font-rounded font-bold text-primary-text mb-4">
                  今日の出来事を、そっと綴ってみる...
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="ここに、あなたの今日を書いてください。&#10;&#10;誰かが、あなたの言葉にそっと触れるかもしれません。"
                    className="textarea-diary min-h-[300px]"
                    disabled={submitting}
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting || !content.trim()}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? '投稿中...' : '日記を投稿する'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {receivedCount < 5 && (
              <div className="card-base text-center">
                <h3 className="font-rounded font-bold text-primary-text mb-4">
                  誰かの日記を受け取る
                </h3>
                <p className="text-secondary-text font-rounded text-sm mb-4">
                  今日はあと {5 - receivedCount} 回受け取ることができます
                </p>
                <button
                  onClick={handleReceiveDiaries}
                  disabled={fetchingDiaries || receivedCount >= 5}
                  className="btn-primary disabled:opacity-50"
                >
                  {fetchingDiaries ? '受け取り中...' : '日記を1つ受け取る'}
                </button>
              </div>
            )}

            {receivedCount >= 5 && (
              <div className="card-base text-center">
                <p className="text-2xl mb-4">✅</p>
                <h3 className="font-rounded font-bold text-primary-text mb-2">
                  今日の受け取り完了
                </h3>
                <p className="text-secondary-text font-rounded">
                  明日また新しい日記と出会えます
                </p>
              </div>
            )}
          </div>
        )}

        {/* 読むタブ */}
        {activeTab === 'read' && (
          <div className="space-y-4">
            {receivedDiaries.length === 0 ? (
              <div className="card-base text-center">
                <p className="text-2xl mb-4">📬</p>
                <h2 className="text-xl font-rounded font-bold text-primary-text mb-2">
                  まだ日記を受け取っていません
                </h2>
                <p className="text-secondary-text font-rounded mb-6">
                  1日に5回、1つずつ日記を受け取れます
                </p>
                <button
                  onClick={handleReceiveDiaries}
                  disabled={fetchingDiaries || receivedCount >= 5}
                  className="btn-primary disabled:opacity-50"
                >
                  {fetchingDiaries ? '受け取り中...' : '日記を1つ受け取る'}
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4 px-2">
                  <h2 className="text-lg font-rounded font-bold text-primary-text">
                    今日受け取った日記 ({receivedDiaries.length})
                  </h2>
                  {receivedCount < 5 && (
                    <button
                      onClick={handleReceiveDiaries}
                      disabled={fetchingDiaries || receivedCount >= 5}
                      className="btn-secondary disabled:opacity-50 text-sm"
                    >
                      {fetchingDiaries ? '受け取り中...' : `もう1つ受け取る (${receivedCount}/5)`}
                    </button>
                  )}
                </div>
                {receivedDiaries.map((diary) => (
                  <article
                    key={diary.id}
                    onClick={() => setSelectedDiary(diary)}
                    className="card-hover"
                  >
                    <p className="text-primary-text font-serif leading-relaxed line-clamp-3">
                      {diary.content}
                    </p>
                    <p className="text-sm text-secondary-text font-rounded mt-4">
                      {new Date(diary.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </article>
                ))}
                {!hasSavedToday && (
                  <p className="text-center text-secondary-text text-sm font-rounded mt-8">
                    心に残った日記を1つ、保存することができます
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* コレクションタブ */}
        {activeTab === 'collection' && (
          <div className="space-y-6">
            {notifications.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-rounded font-bold text-primary-text px-2 flex items-center gap-2">
                  <span>🔔</span> あなたの日記が保存されました
                </h2>
                {notifications.map((diary) => (
                  <article
                    key={diary.id}
                    onClick={() => setSelectedDiary(diary)}
                    className="card-hover border-2 border-accent/20"
                  >
                    <p className="text-primary-text font-serif leading-relaxed line-clamp-3">
                      {diary.content}
                    </p>
                    <div className="flex justify-between items-center mt-4">
                      <p className="text-sm text-secondary-text font-rounded">
                        {new Date(diary.created_at).toLocaleDateString('ja-JP')}
                      </p>
                      <p className="text-sm text-accent font-rounded font-bold">
                        {diary.saved_count}人が保存
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="space-y-4">
              <h2 className="text-lg font-rounded font-bold text-primary-text px-2 flex items-center gap-2">
                <span>📝</span> 自分が書いた日記
              </h2>
              {myDiaries.length === 0 ? (
                <div className="card-base text-center">
                  <p className="text-2xl mb-4">✍️</p>
                  <p className="text-secondary-text font-rounded">
                    まだ日記を書いていません
                  </p>
                </div>
              ) : (
                myDiaries.map((diary) => (
                  <article
                    key={diary.id}
                    onClick={() => setSelectedDiary(diary)}
                    className="card-hover bg-gradient-to-br from-surface to-accent/5"
                  >
                    <p className="text-primary-text font-serif leading-relaxed line-clamp-3">
                      {diary.content}
                    </p>
                    <div className="flex justify-between items-center mt-4">
                      <p className="text-sm text-secondary-text font-rounded">
                        {new Date(diary.created_at).toLocaleDateString('ja-JP')}
                      </p>
                      {diary.saved_count !== undefined && diary.saved_count > 0 && (
                        <p className="text-sm text-accent font-rounded">
                          {diary.saved_count}人が保存
                        </p>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-rounded font-bold text-primary-text px-2 flex items-center gap-2">
                <span>📖</span> 保存した日記
              </h2>
              {savedDiaries.length === 0 ? (
                <div className="card-base text-center">
                  <p className="text-2xl mb-4">📚</p>
                  <p className="text-secondary-text font-rounded">
                    まだ保存した日記がありません
                  </p>
                </div>
              ) : (
                savedDiaries.map((diary) => (
                  <article
                    key={diary.id}
                    onClick={() => setSelectedDiary(diary)}
                    className="card-hover bg-gradient-to-br from-surface to-accent-light/10"
                  >
                    <p className="text-primary-text font-serif leading-relaxed line-clamp-3">
                      {diary.content}
                    </p>
                    <p className="text-sm text-secondary-text font-rounded mt-4">
                      {new Date(diary.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
