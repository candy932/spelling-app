'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast, Toaster } from 'sonner'
import { 
  Plus, 
  Trash2, 
  BookOpen, 
  Pencil, 
  Check, 
  X, 
  RefreshCw,
  List,
  Sparkles,
  Keyboard,
  Trophy,
  Target,
  Star,
  Zap,
  Award,
  Upload,
  Camera,
  Loader2
} from 'lucide-react'

// 单词类型
interface Word {
  id: string
  english: string
  chinese: string
  createdAt: string
  updatedAt: string
}

// 填空位置类型
interface BlankPosition {
  index: number
  char: string
  userAnswer: string
}

// 练习状态
interface PracticeWord {
  word: Word
  blankPositions: BlankPosition[]
  isCompleted: boolean
  isCorrect: boolean | null
}

// 练习记录
interface PracticeRecord {
  total: number
  correct: number
  date: string
}

export default function Home() {
  const [words, setWords] = useState<Word[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // 添加单词表单
  const [newEnglish, setNewEnglish] = useState('')
  const [newChinese, setNewChinese] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  
  // 图片识别
  const [isRecognizing, setIsRecognizing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 练习状态
  const [practiceWords, setPracticeWords] = useState<PracticeWord[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isPracticeMode, setIsPracticeMode] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  
  // 练习结束统计
  const [showResult, setShowResult] = useState(false)
  
  // 历史记录
  const [practiceHistory, setPracticeHistory] = useState<PracticeRecord[]>([])
  
  // 当前选中的格子索引
  const [focusedBlankIndex, setFocusedBlankIndex] = useState<number>(0)
  const addInputRef = useRef<HTMLInputElement>(null)

  // 获取所有单词
  const fetchWords = useCallback(async () => {
    try {
      const response = await fetch('/api/words')
      const data = await response.json()
      setWords(data)
    } catch (error) {
      toast.error('获取单词失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWords()
    // 从本地存储加载历史记录
    const savedHistory = localStorage.getItem('practiceHistory')
    if (savedHistory) {
      setPracticeHistory(JSON.parse(savedHistory))
    }
  }, [fetchWords])

  // 保存历史记录
  const saveHistory = (total: number, correct: number) => {
    const newRecord: PracticeRecord = {
      total,
      correct,
      date: new Date().toISOString()
    }
    const newHistory = [newRecord, ...practiceHistory].slice(0, 10)
    setPracticeHistory(newHistory)
    localStorage.setItem('practiceHistory', JSON.stringify(newHistory))
  }

  // 添加单词
  const handleAddWord = async () => {
    if (!newEnglish.trim() || !newChinese.trim()) {
      toast.error('请填写完整的单词信息')
      return
    }

    setIsAdding(true)
    try {
      const response = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          english: newEnglish.trim(),
          chinese: newChinese.trim()
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setWords([data, ...words])
        setNewEnglish('')
        setNewChinese('')
        toast.success('添加成功！')
        addInputRef.current?.focus()
      } else {
        toast.error(data.error || '添加失败')
      }
    } catch (error) {
      toast.error('添加失败')
    } finally {
      setIsAdding(false)
    }
  }

  // 批量添加单词
  const handleBatchAddWords = async (wordList: Array<{english: string, chinese: string}>) => {
    let successCount = 0
    let failCount = 0

    for (const word of wordList) {
      try {
        const response = await fetch('/api/words', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            english: word.english.toLowerCase().trim(),
            chinese: word.chinese.trim()
          })
        })
        
        if (response.ok) {
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }

    // 刷新单词列表
    await fetchWords()

    if (successCount > 0) {
      toast.success(`成功添加 ${successCount} 个单词${failCount > 0 ? `，${failCount} 个已存在或失败` : ''}`)
    } else {
      toast.error('添加失败，单词可能已存在')
    }
  }

  // 图片识别
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件')
      return
    }

    // 检查文件大小 (最大5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过5MB')
      return
    }

    setIsRecognizing(true)
    
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok && data.success && data.words.length > 0) {
        // 批量添加识别到的单词
        await handleBatchAddWords(data.words)
      } else {
        toast.error(data.error || '识别失败')
      }
    } catch (error) {
      toast.error('图片识别失败，请重试')
    } finally {
      setIsRecognizing(false)
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 删除单词
  const handleDeleteWord = async (id: string) => {
    try {
      const response = await fetch(`/api/words?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setWords(words.filter(w => w.id !== id))
        toast.success('删除成功')
      }
    } catch (error) {
      toast.error('删除失败')
    }
  }

  // 随机选择要隐藏的字母位置
  const generateBlanks = (word: string): BlankPosition[] => {
    const letters = word.split('')
    const letterIndices = letters
      .map((char, index) => ({ char, index }))
      .filter(item => /[a-zA-Z]/.test(item.char))
    
    if (letterIndices.length === 0) return []
    
    // 随机选择30%-50%的字母作为填空
    const blankCount = Math.max(1, Math.floor(letterIndices.length * (0.3 + Math.random() * 0.2)))
    
    // 随机打乱并选择
    const shuffled = [...letterIndices].sort(() => Math.random() - 0.5)
    const selectedIndices = shuffled.slice(0, blankCount).map(item => item.index)
    
    return selectedIndices.map(index => ({
      index,
      char: letters[index],
      userAnswer: ''
    }))
  }

  // 开始练习
  const startPractice = () => {
    if (words.length === 0) {
      toast.error('请先添加单词')
      return
    }

    // 随机选择最多10个单词进行练习
    const shuffledWords = [...words].sort(() => Math.random() - 0.5).slice(0, 10)
    
    const practiceData = shuffledWords.map(word => ({
      word,
      blankPositions: generateBlanks(word.english),
      isCompleted: false,
      isCorrect: null
    }))

    setPracticeWords(practiceData)
    setCurrentWordIndex(0)
    setIsPracticeMode(true)
    setShowAnswer(false)
    setCorrectCount(0)
    setTotalCount(practiceData.length)
    setShowResult(false)
    setFocusedBlankIndex(0)
  }

  // 全局键盘事件监听
  useEffect(() => {
    if (!isPracticeMode || showAnswer) return

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const currentPractice = practiceWords[currentWordIndex]
      if (!currentPractice || currentPractice.blankPositions.length === 0) return

      const blankCount = currentPractice.blankPositions.length

      // 字母输入
      if (/^[a-zA-Z]$/.test(e.key)) {
        const newBlankPositions = [...currentPractice.blankPositions]
        newBlankPositions[focusedBlankIndex] = {
          ...newBlankPositions[focusedBlankIndex],
          userAnswer: e.key.toLowerCase()
        }
        const newPracticeWords = [...practiceWords]
        newPracticeWords[currentWordIndex] = {
          ...currentPractice,
          blankPositions: newBlankPositions
        }
        setPracticeWords(newPracticeWords)

        // 自动跳到下一个格子
        if (focusedBlankIndex < blankCount - 1) {
          setFocusedBlankIndex(focusedBlankIndex + 1)
        }
        return
      }

      // 退格键删除
      if (e.key === 'Backspace') {
        const currentValue = currentPractice.blankPositions[focusedBlankIndex].userAnswer
        
        if (currentValue !== '') {
          // 当前格有内容，清空
          const newBlankPositions = [...currentPractice.blankPositions]
          newBlankPositions[focusedBlankIndex] = {
            ...newBlankPositions[focusedBlankIndex],
            userAnswer: ''
          }
          const newPracticeWords = [...practiceWords]
          newPracticeWords[currentWordIndex] = {
            ...currentPractice,
            blankPositions: newBlankPositions
          }
          setPracticeWords(newPracticeWords)
        } else if (focusedBlankIndex > 0) {
          // 当前格为空，跳到上一格并清空
          const newIndex = focusedBlankIndex - 1
          setFocusedBlankIndex(newIndex)
          const newBlankPositions = [...currentPractice.blankPositions]
          newBlankPositions[newIndex] = {
            ...newBlankPositions[newIndex],
            userAnswer: ''
          }
          const newPracticeWords = [...practiceWords]
          newPracticeWords[currentWordIndex] = {
            ...currentPractice,
            blankPositions: newBlankPositions
          }
          setPracticeWords(newPracticeWords)
        }
        return
      }

      // 回车键提交
      if (e.key === 'Enter') {
        checkAnswer()
        return
      }

      // 左右方向键切换格子
      if (e.key === 'ArrowLeft' && focusedBlankIndex > 0) {
        setFocusedBlankIndex(focusedBlankIndex - 1)
        return
      }
      if (e.key === 'ArrowRight' && focusedBlankIndex < blankCount - 1) {
        setFocusedBlankIndex(focusedBlankIndex + 1)
        return
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isPracticeMode, showAnswer, currentWordIndex, practiceWords, focusedBlankIndex])



  // 检查答案
  const checkAnswer = () => {
    const currentPractice = practiceWords[currentWordIndex]
    const isCorrect = currentPractice.blankPositions.every(
      blank => blank.userAnswer.toLowerCase() === blank.char.toLowerCase()
    )

    const newPracticeWords = [...practiceWords]
    newPracticeWords[currentWordIndex] = {
      ...currentPractice,
      isCompleted: true,
      isCorrect
    }
    setPracticeWords(newPracticeWords)
    setShowAnswer(true)

    if (isCorrect) {
      setCorrectCount(prev => prev + 1)
    }
  }

  // 下一个单词
  const nextWord = () => {
    if (currentWordIndex < practiceWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1)
      setShowAnswer(false)
      setFocusedBlankIndex(0)
    } else {
      // 练习结束，显示统计结果
      saveHistory(totalCount, correctCount)
      setShowResult(true)
      setIsPracticeMode(false)
    }
  }

  // 重新开始当前单词
  const retryCurrentWord = () => {
    const newPracticeWords = [...practiceWords]
    newPracticeWords[currentWordIndex] = {
      ...newPracticeWords[currentWordIndex],
      blankPositions: generateBlanks(newPracticeWords[currentWordIndex].word.english),
      isCompleted: false,
      isCorrect: null
    }
    setPracticeWords(newPracticeWords)
    setShowAnswer(false)
    setFocusedBlankIndex(0)
  }

  // 渲染填空单词
  const renderBlankedWord = (practice: PracticeWord) => {
    const { word, blankPositions, isCompleted, isCorrect } = practice
    const letters = word.english.split('')
    let blankIndex = 0

    return (
      <div className="flex flex-wrap justify-center gap-1.5 my-6">
        {letters.map((char, index) => {
          const blankPos = blankPositions.find(bp => bp.index === index)
          
          if (blankPos) {
            const currentBlankIndex = blankIndex++
            const isAnswerCorrect = blankPos.userAnswer.toLowerCase() === blankPos.char.toLowerCase()
            const isFocused = currentBlankIndex === focusedBlankIndex && !isCompleted
            
            return (
              <div key={index} className="flex flex-col items-center">
                <div
                  onClick={() => !isCompleted && setFocusedBlankIndex(currentBlankIndex)}
                  className={`w-9 h-12 flex items-center justify-center text-xl font-bold rounded-xl border-2 transition-all duration-200 cursor-pointer select-none
                    ${isCompleted 
                      ? isAnswerCorrect 
                        ? 'border-emerald-400 bg-gradient-to-b from-emerald-50 to-emerald-100 text-emerald-700 shadow-lg shadow-emerald-200' 
                        : 'border-rose-400 bg-gradient-to-b from-rose-50 to-rose-100 text-rose-700 shadow-lg shadow-rose-200'
                      : isFocused
                        ? 'border-rose-400 bg-gradient-to-b from-rose-100 to-rose-200 text-rose-700 shadow-lg shadow-rose-300 ring-4 ring-rose-200'
                        : 'border-violet-300 bg-gradient-to-b from-violet-50 to-white text-violet-700 shadow-md hover:border-violet-400'
                    }
                  `}
                >
                  {blankPos.userAnswer.toUpperCase()}
                </div>
                {isCompleted && !isAnswerCorrect && (
                  <span className="text-sm text-emerald-600 font-bold mt-1.5 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {blankPos.char.toUpperCase()}
                  </span>
                )}
              </div>
            )
          }
          
          return (
            <div key={index} className="w-9 h-12 flex items-center justify-center text-xl font-bold text-slate-700 bg-gradient-to-b from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200">
              {char.toUpperCase()}
            </div>
          )
        })}
      </div>
    )
  }

  // 退出练习
  const exitPractice = () => {
    setIsPracticeMode(false)
    setPracticeWords([])
    setCurrentWordIndex(0)
    setShowResult(false)
  }

  // 计算正确率
  const getAccuracy = () => {
    if (totalCount === 0) return 0
    return Math.round((correctCount / totalCount) * 100)
  }

  // 获取鼓励语
  const getEncouragement = () => {
    const accuracy = getAccuracy()
    if (accuracy === 100) return { text: '太棒了！满分！', emoji: '🏆', color: 'text-amber-500' }
    if (accuracy >= 80) return { text: '非常优秀！', emoji: '🌟', color: 'text-emerald-500' }
    if (accuracy >= 60) return { text: '继续加油！', emoji: '💪', color: 'text-blue-500' }
    return { text: '再接再厉！', emoji: '🎯', color: 'text-orange-500' }
  }

  // 练习结果页面
  if (showResult) {
    const encouragement = getEncouragement()
    const accuracy = getAccuracy()
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100 flex flex-col items-center justify-center p-4">
        <Toaster position="top-center" />
        
        <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
          
          <CardContent className="p-8 text-center">
            {/* 表情和鼓励 */}
            <div className="text-6xl mb-4">{encouragement.emoji}</div>
            <h2 className={`text-2xl font-bold mb-2 ${encouragement.color}`}>
              {encouragement.text}
            </h2>
            
            {/* 统计数据 */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 my-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-violet-600">{totalCount}</div>
                  <div className="text-sm text-slate-500 mt-1">总题数</div>
                </div>
                <div className="text-center border-x border-slate-200">
                  <div className="text-3xl font-bold text-emerald-600">{correctCount}</div>
                  <div className="text-sm text-slate-500 mt-1">正确</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-rose-500">{totalCount - correctCount}</div>
                  <div className="text-sm text-slate-500 mt-1">错误</div>
                </div>
              </div>
              
              {/* 正确率进度条 */}
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">正确率</span>
                  <span className="font-bold text-violet-600">{accuracy}%</span>
                </div>
                <Progress value={accuracy} className="h-3" />
              </div>
            </div>
            
            {/* 星星评价 */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-8 h-8 ${
                    star <= Math.ceil(accuracy / 20)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-200'
                  }`}
                />
              ))}
            </div>
            
            {/* 按钮 */}
            <div className="space-y-3">
              <Button 
                size="lg"
                className="w-full h-12 text-lg bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
                onClick={startPractice}
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                再来一轮
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="w-full"
                onClick={exitPractice}
              >
                返回主页
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 练习模式UI
  if (isPracticeMode && practiceWords.length > 0) {
    const currentPractice = practiceWords[currentWordIndex]
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-violet-50 to-purple-100 flex flex-col">
        <Toaster position="top-center" />
        
        {/* 顶部导航 */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-violet-100 shadow-sm">
          <div className="container max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={exitPractice} className="text-slate-600 hover:text-slate-900">
              <X className="h-4 w-4 mr-1" />
              退出
            </Button>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-violet-100 text-violet-700 border-violet-200">
                <Target className="h-3 w-3 mr-1" />
                {currentWordIndex + 1} / {totalCount}
              </Badge>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <Check className="h-3 w-3 mr-1" />
                {correctCount}
              </Badge>
            </div>
          </div>
        </header>

        {/* 进度条 */}
        <div className="w-full h-1.5 bg-violet-100">
          <div 
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
            style={{ width: `${((currentWordIndex + 1) / totalCount) * 100}%` }}
          />
        </div>

        {/* 主要练习区域 */}
        <main className="flex-1 flex flex-col container max-w-lg mx-auto px-4 py-6">
          <Card className="flex-1 flex flex-col shadow-xl border-0 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
            
            <CardHeader className="text-center pb-2 bg-gradient-to-b from-slate-50 to-white">
              <CardDescription className="text-sm text-slate-500 mb-2 flex items-center justify-center gap-2">
                <Pencil className="h-4 w-4" />
                请填写缺失的字母
              </CardDescription>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                {currentPractice.word.chinese}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col justify-between bg-gradient-to-b from-white to-slate-50">
              {/* 填空区域 */}
              {renderBlankedWord(currentPractice)}
              
              {/* 答案反馈 */}
              {showAnswer && (
                <div className={`text-center p-4 rounded-2xl mb-4 ${
                  currentPractice.isCorrect 
                    ? 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border-2 border-emerald-200' 
                    : 'bg-gradient-to-r from-rose-100 to-orange-100 text-rose-800 border-2 border-rose-200'
                }`}>
                  {currentPractice.isCorrect ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-bold text-lg">正确！</span>
                      <Trophy className="h-5 w-5 text-amber-500" />
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center">
                          <X className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-bold text-lg">再接再厉！</span>
                      </div>
                      <div className="text-sm bg-white/50 rounded-lg px-3 py-1">
                        正确答案：<span className="font-bold">{currentPractice.word.english.toUpperCase()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* 操作按钮 */}
              <div className="space-y-3">
                {!showAnswer ? (
                  <>
                    <Button 
                      className="w-full h-14 text-lg bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg shadow-violet-200" 
                      onClick={checkAnswer}
                    >
                      <Check className="h-5 w-5 mr-2" />
                      确认答案
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-violet-200 text-violet-600 hover:bg-violet-50"
                      onClick={retryCurrentWord}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      换一种填空
                    </Button>
                  </>
                ) : (
                  <Button 
                    className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200" 
                    onClick={nextWord}
                  >
                    {currentWordIndex < practiceWords.length - 1 ? (
                      <>
                        <Zap className="h-5 w-5 mr-2" />
                        下一个单词
                      </>
                    ) : (
                      <>
                        <Award className="h-5 w-5 mr-2" />
                        查看成绩
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </main>

        {/* 键盘提示 */}
        <div className="container max-w-lg mx-auto px-4 pb-6">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <Keyboard className="h-3 w-3" />
            <span>点击格子选中 · 输入字母填入 · 退格键删除 · 方向键切换</span>
          </div>
        </div>
      </div>
    )
  }

  // 主页面 - 单词管理
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-purple-50">
      <Toaster position="top-center" />
      
      {/* 顶部标题 */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-violet-100 shadow-sm">
        <div className="container max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  单词听写
                </h1>
              </div>
            </div>
            <Badge variant="secondary" className="bg-violet-100 text-violet-700 border-violet-200">
              共 {words.length} 词
            </Badge>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* 历史统计 */}
        {practiceHistory.length > 0 && (
          <Card className="border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <span className="font-medium text-amber-800">上次成绩</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg font-bold text-amber-700">
                      {practiceHistory[0].correct} / {practiceHistory[0].total}
                    </div>
                    <div className="text-xs text-amber-600">
                      正确率 {Math.round((practiceHistory[0].correct / practiceHistory[0].total) * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 开始练习按钮 */}
        <Card className="shadow-xl border-0 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
          <CardContent className="p-8 bg-gradient-to-br from-violet-50 via-white to-purple-50">
            <div className="text-center space-y-5">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-300/50">
                  <Pencil className="h-10 w-10 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">准备好了吗？</h2>
                <p className="text-slate-500">
                  随机抽取单词进行听写练习
                </p>
              </div>
              <Button 
                size="lg" 
                className="w-full h-14 text-lg bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600 shadow-xl shadow-violet-300/50"
                onClick={startPractice}
                disabled={words.length === 0}
              >
                <Sparkles className="h-5 w-5 mr-2" />
                开始听写
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-violet-100/50">
            <TabsTrigger value="list" className="data-[state=active]:bg-white data-[state=active]:text-violet-700">
              <List className="h-4 w-4 mr-2" />
              单词列表
            </TabsTrigger>
            <TabsTrigger value="add" className="data-[state=active]:bg-white data-[state=active]:text-violet-700">
              <Plus className="h-4 w-4 mr-2" />
              添加单词
            </TabsTrigger>
          </TabsList>
          
          {/* 单词列表 */}
          <TabsContent value="list" className="mt-4">
            {isLoading ? (
              <div className="text-center py-8 text-slate-400">
                加载中...
              </div>
            ) : words.length === 0 ? (
              <Card className="border-dashed border-2 border-violet-200">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-violet-400" />
                  </div>
                  <p className="text-slate-600 font-medium">暂无单词</p>
                  <p className="text-sm text-slate-400 mt-1">
                    点击「添加单词」开始添加
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-3">
                  {words.map((word, index) => (
                    <Card key={word.id} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow"
                      style={{
                        background: `linear-gradient(135deg, 
                          ${index % 3 === 0 ? 'rgba(139, 92, 246, 0.08)' : index % 3 === 1 ? 'rgba(59, 130, 246, 0.08)' : 'rgba(16, 185, 129, 0.08)'} 0%, 
                          white 100%)`
                      }}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-bold text-lg text-slate-800">
                            {word.english.toUpperCase()}
                          </div>
                          <div className="text-slate-500">
                            {word.chinese}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => handleDeleteWord(word.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
          
          {/* 添加单词 */}
          <TabsContent value="add" className="mt-4 space-y-4">
            {/* 图片识别 */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-400 to-cyan-400" />
              <CardHeader className="bg-gradient-to-r from-slate-50 to-white pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="h-5 w-5 text-blue-500" />
                  图片识别
                </CardTitle>
                <CardDescription>
                  上传单词截图，自动识别添加
                </CardDescription>
              </CardHeader>
              <CardContent className="bg-gradient-to-b from-white to-slate-50">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline"
                  className="w-full h-20 border-dashed border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRecognizing}
                >
                  {isRecognizing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin text-blue-500" />
                      <span className="text-blue-600">识别中...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 mr-2 text-blue-500" />
                      <span className="text-blue-600">点击上传图片</span>
                    </>
                  )}
                </Button>
                <p className="text-xs text-slate-400 text-center mt-2">
                  支持 JPG、PNG 格式，最大 5MB
                </p>
              </CardContent>
            </Card>

            {/* 手动添加 */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
              <CardHeader className="bg-gradient-to-r from-slate-50 to-white pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-5 w-5 text-emerald-500" />
                  手动添加
                </CardTitle>
                <CardDescription>
                  输入英文单词和中文释义
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 bg-gradient-to-b from-white to-slate-50">
                <div className="space-y-2">
                  <Label htmlFor="english" className="text-slate-700">英文单词</Label>
                  <Input
                    ref={addInputRef}
                    id="english"
                    placeholder="例如：apple"
                    value={newEnglish}
                    onChange={(e) => setNewEnglish(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        document.getElementById('chinese')?.focus()
                      }
                    }}
                    className="border-violet-200 focus:border-violet-400 focus:ring-violet-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chinese" className="text-slate-700">中文释义</Label>
                  <Input
                    id="chinese"
                    placeholder="例如：苹果"
                    value={newChinese}
                    onChange={(e) => setNewChinese(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddWord()
                      }
                    }}
                    className="border-violet-200 focus:border-violet-400 focus:ring-violet-200"
                  />
                </div>
                <Button 
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  onClick={handleAddWord}
                  disabled={isAdding}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isAdding ? '添加中...' : '添加单词'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 使用说明 */}
        <Card className="border-0 shadow-md bg-gradient-to-r from-slate-50 to-violet-50">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-slate-700">
              <Sparkles className="h-4 w-4 text-violet-500" />
              使用说明
            </h3>
            <ul className="text-sm text-slate-500 space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <span>在「添加单词」上传图片或手动添加单词</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <span>点击「开始听写」开始练习</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <span>点击格子选中，输入字母填入</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                <span>按退格键删除，方向键切换格子</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}