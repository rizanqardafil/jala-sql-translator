import { useState } from 'react'

interface TranslateResponse {
  translatedQuery: string
}

export default function SQLTranslator() {
  const [englishQuery, setEnglishQuery] = useState('')
  const [translatedQuery, setTranslatedQuery] = useState('')

  const handleTranslate = async () => {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: englishQuery }),
      })

      if (!response.ok) {
        throw new Error('Translation failed')
      }

      const data: TranslateResponse = await response.json()
      setTranslatedQuery(data.translatedQuery)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div>
      <textarea
        value={englishQuery}
        onChange={(e) => setEnglishQuery(e.target.value)}
        placeholder='Enter an English query'
      />
      <button onClick={handleTranslate}>Translate</button>
      {translatedQuery && <div>{translatedQuery}</div>}
    </div>
  )
}
