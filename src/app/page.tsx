'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast, Toaster } from 'sonner'

interface Word { id: string; english: string; chinese: string }
interface BlankPosition { index: number; char: string; userAnswer: string }
interface PracticeWord { word: Word; blankPositions: BlankPosition[]; isCompleted: boolean; isCorrect: boolean | null }
interface PracticeRecord { total: number; correct: number; date: string }

export default function Home() {
  const [words, setWords] = useState<Word[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newEnglish, setNewEnglish] = useState('')
  const [newChinese, setNewChinese] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [batchText, setBatchText] = useState('')
  const [isBatchAdding, setIsBatchAdding] = useState(false)
  const [practiceWords, setPracticeWords] = useState<PracticeWord[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isPracticeMode, setIsPracticeMode] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [practiceHistory, setPracticeHistory] = useState<PracticeRecord[]>([])
  const [activeTab, setActiveTab] = useState('list')
  const [addMode, setAddMode] = useState<'single' | 'batch'>('single')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const fetchWords = useCallback(async () => {
    try {
      const response = await fetch('/api/words')
      const data = await response.json()
      setWords(data)
    } catch { toast.error('获取单词失败') }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => {
    fetchWords()
    const savedHistory = localStorage.getItem('practiceHistory')
    if (savedHistory) setPracticeHistory(JSON.parse(savedHistory))
  }, [fetchWords])

  const saveHistory = (total: number, correct: number) => {
    const newHistory = [{ total, correct, date: new Date().toISOString() }, ...practiceHistory].slice(0, 10)
    setPracticeHistory(newHistory)
    localStorage.setItem('practiceHistory', JSON.stringify(newHistory))
  }

  const handleAddWord = async () => {
    if (!newEnglish.trim() || !newChinese.trim()) { toast.error('请填写完整'); return }
    setIsAdding(true)
    try {
      const response = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ english: newEnglish.trim(), chinese: newChinese.trim() })
      })
      const data = await response.json()
      if (response.ok) {
        setWords([data, ...words])
        setNewEnglish(''); setNewChinese('')
        toast.success('添加成功！')
      } else toast.error(data.error || '添加失败')
    } catch { toast.error('添加失败') }
    finally { setIsAdding(false) }
  }

  const parseBatchText = (text: string): Array<{english: string, chinese: string}> => {
    const lines = text.split('\n').filter(line => line.trim())
    const result: Array<{english: string, chinese: string}> = []
    
    for (const line of lines) {
      let parts: string[] = []
      
      if (line.includes(' - ')) {
        parts = line.split(' - ')
      } else if (line.includes('：')) {
        parts = line.split('：')
      } else if (line.includes(':')) {
        parts = line.split(':')
      } else if (line.includes('\t')) {
        parts = line.split('\t')
      } else {
        const spaceParts = line.trim().split(/\s+/)
        if (spaceParts.length >= 2) {
          parts = [spaceParts[0], spaceParts.slice(1).join(' ')]
        }
      }
      
      if (parts.length >= 2) {
        const english = parts[0].trim()
        const chinese = parts.slice(1).join(' ').trim()
        if (english && chinese) {
          result.push({ english, chinese })
        }
      }
    }
    return result
  }

  const handleBatchAdd = async () => {
    if (!batchText.trim()) { toast.error('请输入单词'); return }
    
    const wordList = parseBatchText(batchText)
    if (wordList.length === 0) { toast.error('未能识别有效单词，请检查格式'); return }
    
    setIsBatchAdding(true)
    let successCount = 0
    let failCount = 0
    
    for (const word of wordList) {
      try {
        const response = await fetch('/api/words', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ english: word.english, chinese: word.chinese })
        })
        if (response.ok) successCount++
        else failCount++
      } catch { failCount++ }
    }
    
    await fetchWords()
    setBatchText('')
    setIsBatchAdding(false)
    
    if (successCount > 0) {
      toast.success(`成功添加 ${successCount} 个单词${failCount > 0 ? `，${failCount} 个已存在或失败` : ''}`)
    } else {
      toast.error('添加失败，单词可能已存在')
    }
  }

  const handleDeleteWord = async (id: string) => {
    try {
      const response = await fetch(`/api/words?id=${id}`, { method: 'DELETE' })
      if (response.ok) { setWords(words.filter(w => w.id !== id)); toast.success('删除成功') }
    } catch { toast.error('删除失败') }
  }

  const generateBlanks = (word: string): BlankPosition[] => {
    const letters = word.split('')
    const letterIndices = letters.map((char, index) => ({ char, index })).filter(item => /[a-zA-Z]/.test(item.char))
    if (letterIndices.length === 0) return []
    const blankCount = Math.max(1, Math.floor(letterIndices.length * (0.3 + Math.random() * 0.2)))
    const shuffled = [...letterIndices].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, blankCount).map(item => ({ index: item.index, char: letters[item.index], userAnswer: '' }))
  }

  const startPractice = () => {
    if (words.length === 0) { toast.error('请先添加单词'); return }
    const shuffledWords = [...words].sort(() => Math.random() - 0.5).slice(0, 10)
    const practiceData = shuffledWords.map(word => ({ word, blankPositions: generateBlanks(word.english), isCompleted: false, isCorrect: null }))
    setPracticeWords(practiceData); setCurrentWordIndex(0); setIsPracticeMode(true); setShowAnswer(false); setCorrectCount(0); setTotalCount(practiceData.length); setShowResult(false); inputRefs.current = []
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }

  const updateAnswer = (blankIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const lastChar = value.slice(-1)
    if (value && !/^[a-zA-Z]$/.test(lastChar)) return
    const currentPractice = practiceWords[currentWordIndex]
    const newBlankPositions = [...currentPractice.blankPositions]
    if (value === '') newBlankPositions[blankIndex] = { ...newBlankPositions[blankIndex], userAnswer: '' }
    else newBlankPositions[blankIndex] = { ...newBlankPositions[blankIndex], userAnswer: lastChar }
    const newPracticeWords = [...practiceWords]
    newPracticeWords[currentWordIndex] = { ...currentPractice, blankPositions: newBlankPositions }
    setPracticeWords(newPracticeWords)
    if (value && blankIndex < newBlankPositions.length - 1) { const nextInput = inputRefs.current[blankIndex + 1]; if (nextInput) { nextInput.focus(); nextInput.select() } }
  }

  const handleKeyDown = (blankIndex: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentPractice = practiceWords[currentWordIndex]
    const currentValue = currentPractice.blankPositions[blankIndex].userAnswer
    if (e.key === 'Backspace' && currentValue === '' && blankIndex > 0) {
      e.preventDefault()
      const prevInput = inputRefs.current[blankIndex - 1]
      if (prevInput) { prevInput.focus(); const newBlankPositions = [...currentPractice.blankPositions]; newBlankPositions[blankIndex - 1] = { ...newBlankPositions[blankIndex - 1], userAnswer: '' }; const newPracticeWords = [...practiceWords]; newPracticeWords[currentWordIndex] = { ...currentPractice, blankPositions: newBlankPositions }; setPracticeWords(newPracticeWords) }
    }
    if (e.key === 'Enter' && !showAnswer) { e.preventDefault(); checkAnswer() }
  }

  const checkAnswer = () => {
    const currentPractice = practiceWords[currentWordIndex]
    const isCorrect = currentPractice.blankPositions.every(blank => blank.userAnswer === blank.char)
    const newPracticeWords = [...practiceWords]
    newPracticeWords[currentWordIndex] = { ...currentPractice, isCompleted: true, isCorrect }
    setPracticeWords(newPracticeWords); setShowAnswer(true)
    if (isCorrect) setCorrectCount(prev => prev + 1)
  }

  const nextWord = () => {
    if (currentWordIndex < practiceWords.length - 1) { setCurrentWordIndex(prev => prev + 1); setShowAnswer(false); inputRefs.current = []; setTimeout(() => inputRefs.current[0]?.focus(), 100) }
    else { saveHistory(totalCount, correctCount); setShowResult(true); setIsPracticeMode(false) }
  }

  const retryCurrentWord = () => {
    const newPracticeWords = [...practiceWords]
    newPracticeWords[currentWordIndex] = { ...newPracticeWords[currentWordIndex], blankPositions: generateBlanks(newPracticeWords[currentWordIndex].word.english), isCompleted: false, isCorrect: null }
    setPracticeWords(newPracticeWords); setShowAnswer(false); inputRefs.current = []; setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }

  const renderBlankedWord = (practice: PracticeWord) => {
    const { word, blankPositions, isCompleted } = practice
    const letters = word.english.split('')
    let blankIndex = 0
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px', margin: '24px 0' }}>
        {letters.map((char, index) => {
          const blankPos = blankPositions.find(bp => bp.index === index)
          if (blankPos) {
            const currentBlankIndex = blankIndex++
            const isAnswerCorrect = blankPos.userAnswer === blankPos.char
            return (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <input ref={el => { inputRefs.current[currentBlankIndex] = el }} type="text" autoCapitalize="off" autoComplete="off" value={blankPos.userAnswer} onChange={(e) => updateAnswer(currentBlankIndex, e)} onKeyDown={(e) => handleKeyDown(currentBlankIndex, e)} disabled={isCompleted} style={{ width: '36px', height: '48px', textAlign: 'center', fontSize: '20px', fontWeight: 'bold', borderRadius: '12px', border: `2px solid ${isCompleted ? (isAnswerCorrect ? '#10b981' : '#f43f5e') : '#a78bfa'}`, backgroundColor: isCompleted ? (isAnswerCorrect ? '#d1fae5' : '#ffe4e6') : '#fff', color: isCompleted ? (isAnswerCorrect ? '#059669' : '#e11d48') : '#000' }} maxLength={1} />
                {isCompleted && !isAnswerCorrect && <span style={{ fontSize: '14px', color: '#059669', fontWeight: 'bold', marginTop: '4px' }}>{char}</span>}
              </div>
            )
          }
          return <div key={index} style={{ width: '36px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', color: '#334155', backgroundColor: '#f1f5f9', borderRadius: '12px', border: '2px solid #e2e8f0' }}>{char}</div>
        })}
      </div>
    )
  }

  const exitPractice = () => { setIsPracticeMode(false); setPracticeWords([]); setCurrentWordIndex(0); setShowResult(false) }
  const getAccuracy = () => totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100)

  if (showResult) {
    const accuracy = getAccuracy()
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #e9d5ff, #f3e8ff)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <Toaster position="top-center" />
        <div style={{ width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>{accuracy === 100 ? '🏆' : accuracy >= 80 ? '🌟' : accuracy >= 60 ? '💪' : '🎯'}</div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#7c3aed' }}>{accuracy === 100 ? '太棒了！满分！' : accuracy >= 80 ? '非常优秀！' : accuracy >= 60 ? '继续加油！' : '再接再厉！'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#7c3aed' }}>{totalCount}</div><div style={{ fontSize: '14px', color: '#64748b' }}>总题数</div></div>
            <div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>{correctCount}</div><div style={{ fontSize: '14px', color: '#64748b' }}>正确</div></div>
            <div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f43f5e' }}>{totalCount - correctCount}</div><div style={{ fontSize: '14px', color: '#64748b' }}>错误</div></div>
          </div>
          <div style={{ marginBottom: '24px', fontSize: '18px' }}>正确率：<span style={{ fontWeight: 'bold', color: '#7c3aed', fontSize: '24px' }}>{accuracy}%</span></div>
          <button onClick={startPractice} style={{ width: '100%', padding: '12px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', marginBottom: '12px' }}>🔄 再来一轮</button>
          <button onClick={exitPractice} style={{ width: '100%', padding: '12px', background: '#fff', color: '#7c3aed', border: '2px solid #7c3aed', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>返回主页</button>
        </div>
      </div>
    )
  }

  if (isPracticeMode && practiceWords.length > 0) {
    const currentPractice = practiceWords[currentWordIndex]
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #e0f2fe, #f3e8ff)', display: 'flex', flexDirection: 'column' }}>
        <Toaster position="top-center" />
        <header style={{ position: 'sticky', top: 0, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e9d5ff', padding: '12px 16px' }}>
          <div style={{ maxWidth: '400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={exitPractice} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px' }}>✕ 退出</button>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '4px 12px', borderRadius: '9999px', fontSize: '14px' }}>{currentWordIndex + 1} / {totalCount}</span>
              <span style={{ background: '#d1fae5', color: '#059669', padding: '4px 12px', borderRadius: '9999px', fontSize: '14px' }}>正确: {correctCount}</span>
            </div>
          </div>
        </header>
        <div style={{ width: '100%', height: '6px', background: '#ede9fe' }}><div style={{ height: '100%', background: '#7c3aed', transition: 'width 0.3s', width: `${((currentWordIndex + 1) / totalCount) * 100}%` }} /></div>
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '400px', margin: '0 auto', padding: '24px 16px', width: '100%' }}>
          <div style={{ flex: 1, background: '#fff', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>✏️ 请填写缺失的字母</p>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#7c3aed' }}>{currentPractice.word.chinese}</h2>
            </div>
            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {renderBlankedWord(currentPractice)}
              {showAnswer && (
                <div style={{ textAlign: 'center', padding: '16px', borderRadius: '12px', marginBottom: '16px', background: currentPractice.isCorrect ? '#d1fae5' : '#ffe4e6', color: currentPractice.isCorrect ? '#059669' : '#e11d48' }}>
                  {currentPractice.isCorrect ? <span style={{ fontWeight: 'bold', fontSize: '18px' }}>✓ 正确！</span> : <div><span style={{ fontWeight: 'bold', fontSize: '18px' }}>✗ 再接再厉！</span><div style={{ fontSize: '14px', marginTop: '8px' }}>正确答案：{currentPractice.word.english}</div></div>}
                </div>
              )}
              <div>
                {!showAnswer ? (
                  <>
                    <button onClick={checkAnswer} style={{ width: '100%', padding: '14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', marginBottom: '12px' }}>✓ 确认答案</button>
                    <button onClick={retryCurrentWord} style={{ width: '100%', padding: '14px', background: '#fff', color: '#7c3aed', border: '2px solid #7c3aed', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>🔄 换一种填空</button>
                  </>
                ) : (
                  <button onClick={nextWord} style={{ width: '100%', padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>{currentWordIndex < practiceWords.length - 1 ? '→ 下一个单词' : '📊 查看成绩'}</button>
                )}
              </div>
            </div>
          </div>
        </main>
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', padding: '16px' }}>只能输入字母 · 退格键删除 · 回车确认</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #f8fafc, #f3e8ff)' }}>
      <Toaster position="top-center" />
      <header style={{ position: 'sticky', top: 0, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e9d5ff' }}>
        <div style={{ maxWidth: '400px', margin: '0 auto', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(to bottom right, #7c3aed, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>📖</div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c3aed' }}>单词听写</h1>
          </div>
          <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '4px 12px', borderRadius: '9999px', fontSize: '14px' }}>共 {words.length} 词</span>
        </div>
      </header>
      <main style={{ maxWidth: '400px', margin: '0 auto', padding: '24px 16px' }}>
        {practiceHistory.length > 0 && (
          <div style={{ background: '#fffbeb', borderRadius: '12px', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#b45309' }}>🏆 上次成绩</span>
            <div style={{ textAlign: 'right' }}><span style={{ fontWeight: 'bold', color: '#b45309' }}>{practiceHistory[0].correct} / {practiceHistory[0].total}</span><br /><span style={{ fontSize: '12px', color: '#b45309' }}>正确率 {Math.round((practiceHistory[0].correct / practiceHistory[0].total) * 100)}%</span></div>
          </div>
        )}
        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', padding: '32px', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '80px', height: '80px', margin: '0 auto 16px', borderRadius: '16px', background: 'linear-gradient(to bottom right, #7c3aed, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>✏️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>准备好了吗？</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>随机抽取单词进行听写练习</p>
          <button onClick={startPractice} disabled={words.length === 0} style={{ width: '100%', padding: '14px', background: words.length === 0 ? '#cbd5e1' : 'linear-gradient(to right, #7c3aed, #9333ea)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: words.length === 0 ? 'not-allowed' : 'pointer' }}>✨ 开始听写</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button onClick={() => setActiveTab('list')} style={{ flex: 1, padding: '12px', background: activeTab === 'list' ? '#7c3aed' : '#fff', color: activeTab === 'list' ? '#fff' : '#7c3aed', border: '2px solid #7c3aed', borderRadius: '8px', cursor: 'pointer' }}>📋 单词列表</button>
          <button onClick={() => setActiveTab('add')} style={{ flex: 1, padding: '12px', background: activeTab === 'add' ? '#7c3aed' : '#fff', color: activeTab === 'add' ? '#fff' : '#7c3aed', border: '2px solid #7c3aed', borderRadius: '8px', cursor: 'pointer' }}>➕ 添加单词</button>
        </div>
        {activeTab === 'list' ? (
          isLoading ? <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>加载中...</div> : words.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', background: '#fff', borderRadius: '12px', border: '2px dashed #cbd5e1' }}><div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div><p style={{ color: '#64748b' }}>暂无单词</p><p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>点击「添加单词」开始添加</p></div>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>{words.map((word) => (
              <div key={word.id} style={{ background: '#fff', borderRadius: '8px', padding: '16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontWeight: 'bold', fontSize: '18px' }}>{word.english}</div><div style={{ color: '#64748b', fontSize: '14px' }}>{word.chinese}</div></div>
                <button onClick={() => handleDeleteWord(word.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '18px' }}>🗑️</button>
              </div>
            ))}</div>
          )
        ) : (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button onClick={() => setAddMode('single')} style={{ flex: 1, padding: '10px', background: addMode === 'single' ? '#10b981' : '#fff', color: addMode === 'single' ? '#fff' : '#10b981', border: '2px solid #10b981', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>单个添加</button>
              <button onClick={() => setAddMode('batch')} style={{ flex: 1, padding: '10px', background: addMode === 'batch' ? '#10b981' : '#fff', color: addMode === 'batch' ? '#fff' : '#10b981', border: '2px solid #10b981', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>批量添加</button>
            </div>
            
            {addMode === 'single' ? (
              <>
                <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', marginBottom: '4px', color: '#64748b', fontSize: '14px' }}>英文单词</label><input type="text" placeholder="例如：apple 或 China" value={newEnglish} onChange={(e) => setNewEnglish(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} /></div>
                <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', marginBottom: '4px', color: '#64748b', fontSize: '14px' }}>中文释义</label><input type="text" placeholder="例如：苹果" value={newChinese} onChange={(e) => setNewChinese(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} /></div>
                <button onClick={handleAddWord} disabled={isAdding} style={{ width: '100%', padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>{isAdding ? '添加中...' : '➕ 添加单词'}</button>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#64748b', fontSize: '14px' }}>粘贴单词列表（每行一个）</label>
                  <textarea 
                    placeholder={`示例格式：\napple 苹果\nbanana 香蕉\nChina 中国\n\n输入什么格式就保存什么格式`}
                    value={batchText}
                    onChange={(e) => setBatchText(e.target.value)}
                    style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', minHeight: '150px', resize: 'vertical' }}
                  />
                </div>
                <button onClick={handleBatchAdd} disabled={isBatchAdding} style={{ width: '100%', padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}>{isBatchAdding ? '添加中...' : '📝 批量添加'}</button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}