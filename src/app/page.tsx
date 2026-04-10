'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Word {
  id: string
  english: string
  chinese: string
  createdAt: string
  updatedAt: string
}

interface BlankPosition {
  index: number
  char: string
  userAnswer: string
}

interface PracticeWord {
  word: Word
  blankPositions: BlankPosition[]
  isCompleted: boolean
  isCorrect: boolean | null
}

interface PracticeRecord {
  total: number
  correct: number
  date: string
}

export default function Home() {
  const [words, setWords] = useState<Word[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newEnglish, setNewEnglish] = useState('')
  const [newChinese, setNewChinese] = useState('')
  const [batchText, setBatchText] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list')
  const [addMode, setAddMode] = useState<'single' | 'batch'>('single')
  
  // 编辑状态
  const [editingWord, setEditingWord] = useState<Word | null>(null)
  const [editEnglish, setEditEnglish] = useState('')
  const [editChinese, setEditChinese] = useState('')
  
  const [practiceWords, setPracticeWords] = useState<PracticeWord[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isPracticeMode, setIsPracticeMode] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [practiceHistory, setPracticeHistory] = useState<PracticeRecord[]>([])
  const [focusedBlankIndex, setFocusedBlankIndex] = useState<number>(0)
  const addInputRef = useRef<HTMLInputElement>(null)
  const batchInputRef = useRef<HTMLTextAreaElement>(null)

  // ========== 🔧 BUG FIX: 新增的 ref ==========
  // 记录每个 input 上一次的 DOM value，防止 React setState 后重复触发 onChange
  const inputValuesRef = useRef<Record<string, string>>({})
  // 防止程序主动设置 DOM value 时触发多余的 onChange
  const isProgrammaticRef = useRef(false)
  // ========== 🔧 BUG FIX END ==========

  const loadWords = useCallback(() => {
    try {
      const savedWords = localStorage.getItem('spellingWords')
      if (savedWords) setWords(JSON.parse(savedWords))
    } catch (error) {
      console.error('获取单词失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWords()
    const savedHistory = localStorage.getItem('practiceHistory')
    if (savedHistory) setPracticeHistory(JSON.parse(savedHistory))
  }, [loadWords])

  const saveWords = (newWords: Word[]) => {
    localStorage.setItem('spellingWords', JSON.stringify(newWords))
    setWords(newWords)
  }

  const saveHistory = (total: number, correct: number) => {
    const newRecord: PracticeRecord = { total, correct, date: new Date().toISOString() }
    const newHistory = [newRecord, ...practiceHistory].slice(0, 10)
    setPracticeHistory(newHistory)
    localStorage.setItem('practiceHistory', JSON.stringify(newHistory))
  }

  const handleAddWord = () => {
    if (!newEnglish.trim() || !newChinese.trim()) {
      alert('请填写完整的单词信息')
      return
    }
    setIsAdding(true)
    try {
      const exists = words.some(w => w.english.toLowerCase() === newEnglish.trim().toLowerCase() && w.id !== (editingWord?.id || ''))
      if (exists) {
        alert('该单词已存在')
        setIsAdding(false)
        return
      }
      const newWord: Word = {
        id: Date.now().toString(),
        english: newEnglish.trim(),
        chinese: newChinese.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      saveWords([newWord, ...words])
      setNewEnglish('')
      setNewChinese('')
      alert('添加成功！')
      addInputRef.current?.focus()
    } catch (error) {
      alert('添加失败')
    } finally {
      setIsAdding(false)
    }
  }

  // 开始编辑单词
  const startEdit = (word: Word) => {
    setEditingWord(word)
    setEditEnglish(word.english)
    setEditChinese(word.chinese)
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingWord(null)
    setEditEnglish('')
    setEditChinese('')
  }

  // 保存编辑
  const saveEdit = () => {
    if (!editEnglish.trim() || !editChinese.trim()) {
      alert('请填写完整的单词信息')
      return
    }
    
    const exists = words.some(w => 
      w.english.toLowerCase() === editEnglish.trim().toLowerCase() && w.id !== editingWord?.id
    )
    if (exists) {
      alert('该单词已存在')
      return
    }
    
    const newWords = words.map(w => {
      if (w.id === editingWord?.id) {
        return {
          ...w,
          english: editEnglish.trim(),
          chinese: editChinese.trim(),
          updatedAt: new Date().toISOString()
        }
      }
      return w
    })
    
    saveWords(newWords)
    setEditingWord(null)
    setEditEnglish('')
    setEditChinese('')
    alert('修改成功！')
  }

  // 批量添加单词 - 解析文本
  const handleBatchAdd = () => {
    if (!batchText.trim()) {
      alert('请输入单词内容')
      return
    }

    const lines = batchText.trim().split('\n')
    const wordList: Array<{english: string, chinese: string}> = []

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue
      
      let parts: string[] = []
      
      if (trimmedLine.includes('\t')) {
        parts = trimmedLine.split('\t')
      } else if (trimmedLine.includes('，')) {
        parts = trimmedLine.split('，')
      } else if (trimmedLine.includes(',')) {
        parts = trimmedLine.split(',')
      } else if (trimmedLine.includes('：')) {
        parts = trimmedLine.split('：')
      } else if (trimmedLine.includes(':')) {
        parts = trimmedLine.split(':')
      } else {
        parts = trimmedLine.split(/\s+/)
      }

      if (parts.length >= 2) {
        const english = parts[0].trim()
        const chinese = parts.slice(1).join(' ').trim()
        if (english && chinese) {
          wordList.push({ english, chinese })
        }
      }
    }

    if (wordList.length === 0) {
      alert('未能识别到有效的单词格式\n\n格式示例：\napple 苹果\nbanana 香蕉')
      return
    }

    let successCount = 0
    let failCount = 0
    const newWords = [...words]

    for (const word of wordList) {
      const exists = newWords.some(w => w.english.toLowerCase() === word.english.toLowerCase().trim())
      if (exists) {
        failCount++
        continue
      }
      const newWord: Word = {
        id: Date.now().toString() + Math.random(),
        english: word.english.trim(),
        chinese: word.chinese.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      newWords.unshift(newWord)
      successCount++
    }

    saveWords(newWords)
    setBatchText('')
    
    if (successCount > 0) {
      alert(`成功添加 ${successCount} 个单词${failCount > 0 ? `\n${failCount} 个已存在或跳过` : ''}`)
    } else {
      alert('添加失败，所有单词可能都已存在')
    }
  }

  const handleDeleteWord = (id: string) => {
    if (confirm('确定要删除这个单词吗？')) {
      saveWords(words.filter(w => w.id !== id))
    }
  }

  const generateBlanks = (word: string): BlankPosition[] => {
    const letters = word.split('')
    const letterIndices = letters.map((char, index) => ({ char, index })).filter(item => /[a-zA-Z]/.test(item.char))
    if (letterIndices.length === 0) return []
    const blankCount = Math.max(1, Math.floor(letterIndices.length * (0.3 + Math.random() * 0.2)))
    const shuffled = [...letterIndices].sort(() => Math.random() - 0.5)
    const selectedIndices = shuffled.slice(0, blankCount).map(item => item.index)
    return selectedIndices.map(index => ({ index, char: letters[index], userAnswer: '' }))
  }

  const startPractice = () => {
    if (words.length === 0) {
      alert('请先添加单词')
      return
    }
    const shuffledWords = [...words].sort(() => Math.random() - 0.5).slice(0, 10)
    const practiceData = shuffledWords.map(word => ({ word, blankPositions: generateBlanks(word.english), isCompleted: false, isCorrect: null }))
    setPracticeWords(practiceData)
    setCurrentWordIndex(0)
    setIsPracticeMode(true)
    setShowAnswer(false)
    setCorrectCount(0)
    setTotalCount(practiceData.length)
    setShowResult(false)
    setFocusedBlankIndex(0)
    // ========== 🔧 BUG FIX: 重置所有 tracking ==========
    inputValuesRef.current = {}
    isProgrammaticRef.current = false
    // ========== 🔧 BUG FIX END ==========
  }

  const checkAnswer = () => {
    const currentPractice = practiceWords[currentWordIndex]
    const isCorrect = currentPractice.blankPositions.every(blank => blank.userAnswer.toLowerCase() === blank.char.toLowerCase())
    const newPracticeWords = [...practiceWords]
    newPracticeWords[currentWordIndex] = { ...currentPractice, isCompleted: true, isCorrect }
    setPracticeWords(newPracticeWords)
    setShowAnswer(true)
    if (isCorrect) setCorrectCount(prev => prev + 1)
  }

  const nextWord = () => {
    if (currentWordIndex < practiceWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1)
      setShowAnswer(false)
      setFocusedBlankIndex(0)
      // ========== 🔧 BUG FIX: 切换单词时重置 tracking ==========
      inputValuesRef.current = {}
      isProgrammaticRef.current = false
      // ========== 🔧 BUG FIX END ==========
    } else {
      saveHistory(totalCount, correctCount)
      setShowResult(true)
      setIsPracticeMode(false)
    }
  }

  const retryCurrentWord = () => {
    const newPracticeWords = [...practiceWords]
    newPracticeWords[currentWordIndex] = { ...newPracticeWords[currentWordIndex], blankPositions: generateBlanks(newPracticeWords[currentWordIndex].word.english), isCompleted: false, isCorrect: null }
    setPracticeWords(newPracticeWords)
    setShowAnswer(false)
    setFocusedBlankIndex(0)
    // ========== 🔧 BUG FIX: 换一种填空时也重置 ==========
    inputValuesRef.current = {}
    isProgrammaticRef.current = false
    // ========== 🔧 BUG FIX END ==========
  }

  const renderBlankedWord = (practice: PracticeWord) => {
    const { word, blankPositions, isCompleted } = practice
    const letters = word.english.split('')
    let blankIndex = 0
    return (
      // ========== 🔧 BUG FIX: 加 key 强制切换单词时重新挂载所有 input ==========
      <div key={`blanked-${currentWordIndex}`} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px', margin: '24px 0' }}>
        {/* ========== 🔧 BUG FIX END ========== */}
        {letters.map((char, index) => {
          const blankPos = blankPositions.find(bp => bp.index === index)
          if (blankPos) {
            const currentBlankIndex = blankIndex++
            const isAnswerCorrect = blankPos.userAnswer.toLowerCase() === blankPos.char.toLowerCase()
            const isFocused = currentBlankIndex === focusedBlankIndex && !isCompleted
            
            // ========== 🔧 BUG FIX: 重写 handleInputChange ==========
            const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              // 如果是自己程序设置 DOM value 触发的，直接忽略
              if (isProgrammaticRef.current) return

              const value = e.target.value
              const refKey = `${currentWordIndex}-${currentBlankIndex}`
              const prevValue = inputValuesRef.current[refKey] || ''

              if (value.length === 0) {
                // 删除
                inputValuesRef.current[refKey] = ''
                const newBlankPositions = [...blankPositions]
                newBlankPositions[currentBlankIndex] = { ...newBlankPositions[currentBlankIndex], userAnswer: '' }
                const newPracticeWords = [...practiceWords]
                newPracticeWords[currentWordIndex] = { ...practice, blankPositions: newBlankPositions }
                setPracticeWords(newPracticeWords)
              } else if (value.length > prevValue.length) {
                // 输入 - 只取新增的最后一个字符
                const lastChar = value[value.length - 1]
                if (/^[a-zA-Z]$/.test(lastChar)) {
                  // 根据原始字母的大小写，自动匹配
                  const originalChar = blankPositions[currentBlankIndex].char
                  const matchedChar = originalChar === originalChar.toUpperCase()
                    ? lastChar.toUpperCase()
                    : lastChar.toLowerCase()

                  inputValuesRef.current[refKey] = value

                  // 标记为程序更新
                  isProgrammaticRef.current = true

                  const newBlankPositions = [...blankPositions]
                  newBlankPositions[currentBlankIndex] = { ...newBlankPositions[currentBlankIndex], userAnswer: matchedChar }
                  const newPracticeWords = [...practiceWords]
                  newPracticeWords[currentWordIndex] = { ...practice, blankPositions: newBlankPositions }
                  setPracticeWords(newPracticeWords)
                  
                  // 原子操作：清空 DOM value 后再跳到下一格
                  setTimeout(() => {
                    if (e.target) e.target.value = ''
                    inputValuesRef.current[refKey] = ''
                    isProgrammaticRef.current = false

                    if (currentBlankIndex < blankPositions.length - 1) {
                      setFocusedBlankIndex(currentBlankIndex + 1)
                    }
                  }, 0)
                } else {
                  // 无效字符，重置
                  isProgrammaticRef.current = true
                  e.target.value = ''
                  inputValuesRef.current[refKey] = ''
                  setTimeout(() => { isProgrammaticRef.current = false }, 0)
                }
              }
            }
            // ========== 🔧 BUG FIX END ==========

            const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Backspace') {
                if (blankPos.userAnswer !== '') {
                  // 清除当前格子的答案
                  isProgrammaticRef.current = true
                  const newBlankPositions = [...blankPositions]
                  newBlankPositions[currentBlankIndex] = { ...newBlankPositions[currentBlankIndex], userAnswer: '' }
                  const newPracticeWords = [...practiceWords]
                  newPracticeWords[currentWordIndex] = { ...practice, blankPositions: newBlankPositions }
                  setPracticeWords(newPracticeWords)
                  const refKey = `${currentWordIndex}-${currentBlankIndex}`
                  inputValuesRef.current[refKey] = ''
                  setTimeout(() => { isProgrammaticRef.current = false }, 0)
                  e.preventDefault()
                } else if (currentBlankIndex > 0) {
                  // 当前格为空时，退格跳到上一格
                  setFocusedBlankIndex(currentBlankIndex - 1)
                  e.preventDefault()
                }
              }
              if (e.key === 'ArrowLeft' && currentBlankIndex > 0) {
                setFocusedBlankIndex(currentBlankIndex - 1)
                e.preventDefault()
              }
              if (e.key === 'ArrowRight' && currentBlankIndex < blankPositions.length - 1) {
                setFocusedBlankIndex(currentBlankIndex + 1)
                e.preventDefault()
              }
              if (e.key === 'Enter') {
                checkAnswer()
              }
            }
            
            // 将光标移到最右边
            const moveCursorToEnd = (e: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) => {
              const input = e.currentTarget
              setTimeout(() => {
                const len = input.value.length
                input.setSelectionRange(len, len)
              }, 0)
            }
            
            return (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <input
                  type="text"
                  inputMode="text"
                  pattern="[a-zA-Z]*"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                  autoComplete="off"
                  value={blankPos.userAnswer}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={(e) => { setFocusedBlankIndex(currentBlankIndex); moveCursorToEnd(e) }}
                  onClick={moveCursorToEnd}
                  disabled={isCompleted}
                  autoFocus={isFocused}
                  style={{
                    width: '40px',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    border: '2px solid',
                    cursor: isCompleted ? 'default' : 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    padding: 0,
                    outline: 'none',
                    background: isCompleted
                      ? isAnswerCorrect
                        ? 'linear-gradient(to bottom, #ecfdf5, #d1fae5)'
                        : 'linear-gradient(to bottom, #fff1f2, #ffe4e6)'
                      : isFocused
                        ? 'linear-gradient(to bottom, #ffe4e6, #fecdd3)'
                        : 'linear-gradient(to bottom, #f5f3ff, #ffffff)',
                    borderColor: isCompleted
                      ? isAnswerCorrect ? '#34d399' : '#fb7185'
                      : isFocused ? '#f43f5e' : '#a78bfa',
                    color: isCompleted
                      ? isAnswerCorrect ? '#047857' : '#be123c'
                      : isFocused ? '#be123c' : '#6d28d9',
                    boxShadow: isCompleted
                      ? isAnswerCorrect
                        ? '0 10px 15px -3px rgba(52, 211, 153, 0.3)'
                        : '0 10px 15px -3px rgba(251, 113, 133, 0.3)'
                      : isFocused
                        ? '0 10px 25px -3px rgba(244, 63, 94, 0.5)'
                        : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    transform: isFocused ? 'scale(1.05)' : 'none',
                    caretColor: 'transparent'
                  }}
                />
                {isCompleted && !isAnswerCorrect && (
                  <span style={{ fontSize: '12px', color: '#059669', fontWeight: 'bold', marginTop: '6px', background: '#d1fae5', padding: '2px 8px', borderRadius: '9999px' }}>
                    {blankPos.char}
                  </span>
                )}
              </div>
            )
          }
          return (
            <div key={index} style={{ width: '40px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 'bold', color: '#475569', background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)', borderRadius: '12px', border: '2px solid #e2e8f0' }}>
              {char}
            </div>
          )
        })}
      </div>
    )
  }

  const exitPractice = () => {
    setIsPracticeMode(false)
    setPracticeWords([])
    setCurrentWordIndex(0)
    setShowResult(false)
    // ========== 🔧 BUG FIX: 退出时也清掉 ==========
    inputValuesRef.current = {}
    // ========== 🔧 BUG FIX END ==========
  }

  const getAccuracy = () => totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100)
  const getEncouragement = () => {
    const accuracy = getAccuracy()
    if (accuracy === 100) return { text: '太棒了！满分！', emoji: '🏆' }
    if (accuracy >= 80) return { text: '非常优秀！', emoji: '🌟' }
    if (accuracy >= 60) return { text: '继续加油！', emoji: '💪' }
    return { text: '再接再厉！', emoji: '🎯' }
  }

  // 编辑弹窗
  if (editingWord) {
    return (
      <div style={{ minHeight: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ width: '100%', maxWidth: '400px', background: 'white', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
          <div style={{ height: '4px', background: 'linear-gradient(to right, #f59e0b, #f97316)' }} />
          <div style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>✏️ 编辑单词</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px', display: 'block' }}>英文单词</label>
                <input
                  type="text"
                  value={editEnglish}
                  onChange={(e) => setEditEnglish(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '16px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px', display: 'block' }}>中文释义</label>
                <input
                  type="text"
                  value={editChinese}
                  onChange={(e) => setEditChinese(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '16px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button onClick={cancelEdit} style={{ flex: 1, height: '48px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>取消</button>
                <button onClick={saveEdit} style={{ flex: 1, height: '48px', background: 'linear-gradient(to right, #f59e0b, #f97316)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>保存</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showResult) {
    const encouragement = getEncouragement()
    const accuracy = getAccuracy()
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #ede9fe, #faf5ff, #fce7f3)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ width: '100%', maxWidth: '400px', background: 'white', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
          <div style={{ height: '8px', background: 'linear-gradient(to right, #8b5cf6, #a855f7, #d946ef)' }} />
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>{encouragement.emoji}</div>
            <h2 style={{ fontSize: '26px', fontWeight: 'bold', color: accuracy >= 80 ? '#10b981' : accuracy >= 60 ? '#3b82f6' : '#f97316' }}>{encouragement.text}</h2>
            <div style={{ background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)', borderRadius: '16px', padding: '24px', margin: '24px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>{totalCount}</div><div style={{ fontSize: '12px', color: '#64748b' }}>总题数</div></div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}><div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{correctCount}</div><div style={{ fontSize: '12px', color: '#64748b' }}>正确</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f43f5e' }}>{totalCount - correctCount}</div><div style={{ fontSize: '12px', color: '#64748b' }}>错误</div></div>
              </div>
              <div style={{ marginTop: '20px' }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}><span>正确率</span><span style={{ fontWeight: 'bold', color: '#8b5cf6' }}>{accuracy}%</span></div><div style={{ height: '12px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${accuracy}%`, background: 'linear-gradient(to right, #8b5cf6, #a855f7)', borderRadius: '9999px' }} /></div></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>{[1, 2, 3, 4, 5].map((star) => (<span key={star} style={{ fontSize: '32px', color: star <= Math.ceil(accuracy / 20) ? '#fbbf24' : '#e2e8f0' }}>★</span>))}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={startPractice} style={{ width: '100%', height: '52px', fontSize: '16px', background: 'linear-gradient(to right, #8b5cf6, #a855f7)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>🔄 再来一轮</button>
              <button onClick={exitPractice} style={{ width: '100%', height: '52px', fontSize: '16px', background: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>返回主页</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isPracticeMode && practiceWords.length > 0) {
    const currentPractice = practiceWords[currentWordIndex]
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #e0f2fe, #f5f3ff, #f3e8ff)', display: 'flex', flexDirection: 'column' }}>
        <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #ede9fe' }}>
          <div style={{ maxWidth: '400px', margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={exitPractice} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '14px', cursor: 'pointer' }}>✕ 退出</button>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600' }}>🎯 {currentWordIndex + 1} / {totalCount}</span>
              <span style={{ background: '#d1fae5', color: '#059669', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600' }}>✓ {correctCount}</span>
            </div>
          </div>
        </header>
        <div style={{ width: '100%', height: '4px', background: '#ede9fe' }}><div style={{ height: '100%', width: `${((currentWordIndex + 1) / totalCount) * 100}%`, background: 'linear-gradient(to right, #8b5cf6, #a855f7)', transition: 'width 0.3s' }} /></div>
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '400px', margin: '0 auto', padding: '20px 16px', width: '100%' }}>
          <div style={{ flex: 1, background: 'white', borderRadius: '20px', boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.2)', overflow: 'hidden' }}>
            <div style={{ height: '4px', background: 'linear-gradient(to right, #34d399, #2dd4bf, #22d3ee)' }} />
            <div style={{ textAlign: 'center', padding: '20px', background: 'linear-gradient(to bottom, #f8fafc, white)' }}>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>✏️ 请填写缺失的字母</p>
              <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#7c3aed' }}>{currentPractice.word.chinese}</h2>
            </div>
            <div style={{ padding: '16px' }}>
              {renderBlankedWord(currentPractice)}
              {showAnswer && (
                <div style={{ textAlign: 'center', padding: '16px', borderRadius: '16px', marginBottom: '16px', background: currentPractice.isCorrect ? '#d1fae5' : '#ffe4e6', border: `2px solid ${currentPractice.isCorrect ? '#34d399' : '#fb7185'}` }}>
                  {currentPractice.isCorrect ? <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#047857' }}>✓ 正确！🏆</span> : <div><span style={{ fontWeight: 'bold', color: '#be123c' }}>✕ 再接再厉！</span><div style={{ marginTop: '8px', fontSize: '14px' }}>正确答案：<strong>{currentPractice.word.english}</strong></div></div>}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {!showAnswer ? (
                  <>
                    <button onClick={checkAnswer} style={{ width: '100%', height: '56px', fontSize: '16px', background: 'linear-gradient(to right, #8b5cf6, #a855f7)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>✓ 确认答案</button>
                    <button onClick={retryCurrentWord} style={{ width: '100%', height: '48px', fontSize: '14px', background: 'white', color: '#7c3aed', border: '1px solid #c4b5fd', borderRadius: '12px', cursor: 'pointer' }}>🔄 换一种填空</button>
                  </>
                ) : (
                  <button onClick={nextWord} style={{ width: '100%', height: '56px', fontSize: '16px', background: 'linear-gradient(to right, #10b981, #2dd4bf)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>{currentWordIndex < practiceWords.length - 1 ? '⚡ 下一个单词' : '🏅 查看成绩'}</button>
                )}
              </div>
            </div>
          </div>
        </main>
        <div style={{ maxWidth: '400px', margin: '0 auto', padding: '0 16px 20px', width: '100%', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>⌨️ 点击格子选中 · 输入字母填入 · 退格键删除 · 方向键切换</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #f8fafc, #f5f3ff, #faf5ff)' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #ede9fe' }}>
        <div style={{ maxWidth: '400px', margin: '0 auto', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(to bottom right, #8b5cf6, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📖</div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c3aed' }}>单词听写</h1>
          </div>
          <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600' }}>共 {words.length} 词</span>
        </div>
      </header>

      <main style={{ maxWidth: '400px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {practiceHistory.length > 0 && (
          <div style={{ background: 'linear-gradient(to right, #fffbeb, #fef3c7)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '20px' }}>🏆</span><span style={{ fontWeight: '600', color: '#92400e' }}>上次成绩</span></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: '18px', fontWeight: 'bold', color: '#b45309' }}>{practiceHistory[0].correct} / {practiceHistory[0].total}</div><div style={{ fontSize: '12px', color: '#a16207' }}>正确率 {Math.round((practiceHistory[0].correct / practiceHistory[0].total) * 100)}%</div></div>
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.2)', overflow: 'hidden' }}>
          <div style={{ height: '4px', background: 'linear-gradient(to right, #8b5cf6, #a855f7, #d946ef)' }} />
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', margin: '0 auto 20px', borderRadius: '20px', background: 'linear-gradient(to bottom right, #8b5cf6, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', boxShadow: '0 15px 30px -5px rgba(139, 92, 246, 0.4)' }}>✏️</div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>准备好了吗？</h2>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>随机抽取单词进行听写练习</p>
            <button onClick={startPractice} disabled={words.length === 0} style={{ width: '100%', height: '56px', fontSize: '16px', background: words.length === 0 ? '#e2e8f0' : 'linear-gradient(to right, #8b5cf6, #a855f7, #d946ef)', color: words.length === 0 ? '#94a3b8' : 'white', border: 'none', borderRadius: '12px', cursor: words.length === 0 ? 'not-allowed' : 'pointer', fontWeight: '600' }}>✨ 开始听写</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', background: '#f3e8ff', padding: '4px', borderRadius: '12px' }}>
          <button onClick={() => setActiveTab('list')} style={{ flex: 1, padding: '12px', background: activeTab === 'list' ? 'white' : 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: activeTab === 'list' ? '#7c3aed' : '#64748b' }}>📋 单词列表</button>
          <button onClick={() => setActiveTab('add')} style={{ flex: 1, padding: '12px', background: activeTab === 'add' ? 'white' : 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: activeTab === 'add' ? '#7c3aed' : '#64748b' }}>➕ 添加单词</button>
        </div>

        {activeTab === 'list' && (
          <div>
            {isLoading ? <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>加载中...</div> : words.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '12px', border: '2px dashed #c4b5fd' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📖</div>
                <p style={{ fontWeight: '600' }}>暂无单词</p>
                <p style={{ fontSize: '14px', color: '#94a3b8' }}>点击「添加单词」开始添加</p>
              </div>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {words.map((word) => (
                  <div key={word.id} style={{ background: 'white', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div onClick={() => startEdit(word)} style={{ flex: 1, cursor: 'pointer' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{word.english}</div>
                      <div style={{ color: '#64748b', fontSize: '14px' }}>{word.chinese}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => startEdit(word)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', padding: '4px' }}>✏️</button>
                      <button onClick={() => handleDeleteWord(word.id)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', padding: '4px' }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '4px', background: '#f0fdf4', padding: '4px', borderRadius: '12px' }}>
              <button onClick={() => setAddMode('single')} style={{ flex: 1, padding: '10px', background: addMode === 'single' ? 'white' : 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: addMode === 'single' ? '#059669' : '#64748b', boxShadow: addMode === 'single' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>单个添加</button>
              <button onClick={() => setAddMode('batch')} style={{ flex: 1, padding: '10px', background: addMode === 'batch' ? 'white' : 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: addMode === 'batch' ? '#059669' : '#64748b', boxShadow: addMode === 'batch' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>批量添加</button>
            </div>

            {addMode === 'single' ? (
              <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ height: '4px', background: 'linear-gradient(to right, #34d399, #2dd4bf)' }} />
                <div style={{ padding: '16px' }}>
                  <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>➕ 手动添加</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input ref={addInputRef} type="text" placeholder="英文单词，例如：apple" value={newEnglish} onChange={(e) => setNewEnglish(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
                    <input type="text" placeholder="中文释义，例如：苹果" value={newChinese} onChange={(e) => setNewChinese(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddWord()} style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
                    <button onClick={handleAddWord} disabled={isAdding} style={{ width: '100%', height: '48px', background: 'linear-gradient(to right, #10b981, #2dd4bf)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>{isAdding ? '添加中...' : '➕ 添加单词'}</button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ height: '4px', background: 'linear-gradient(to right, #8b5cf6, #a855f7)' }} />
                <div style={{ padding: '16px' }}>
                  <h3 style={{ fontWeight: '600', marginBottom: '4px' }}>📝 批量添加</h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>每行一个单词，格式：英文 中文</p>
                  <textarea
                    ref={batchInputRef}
                    placeholder="apple 苹果&#10;banana 香蕉&#10;orange 橙子"
                    value={batchText}
                    onChange={(e) => setBatchText(e.target.value)}
                    style={{
                      width: '100%',
                      height: '150px',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      lineHeight: '1.6'
                    }}
                  />
                  <button onClick={handleBatchAdd} style={{ width: '100%', height: '48px', background: 'linear-gradient(to right, #8b5cf6, #a855f7)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', marginTop: '12px' }}>📥 批量添加</button>
                </div>
              </div>
            )}

            <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '12px', fontSize: '13px', color: '#166534' }}>
              <strong>格式说明：</strong><br/>
              每行一个单词，英文和中文用空格、逗号或冒号分隔<br/>
              例如：apple 苹果 或 apple,苹果
            </div>
          </div>
        )}

        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>✨ 使用说明</h3>
          <div style={{ fontSize: '14px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p>1️⃣ 在「添加单词」批量粘贴单词</p>
            <p>2️⃣ 点击「开始听写」开始练习</p>
            <p>3️⃣ 点击格子选中，输入字母填入</p>
            <p>4️⃣ 按退格键删除，方向键切换格子</p>
            <p>5️⃣ 点击单词可以编辑修改</p>
          </div>
        </div>
      </main>
    </div>
  )
}
