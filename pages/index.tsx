import React, { useEffect, useRef, useState, FormEvent } from 'react'
import axios from 'axios'
import { AiFillGithub, AiOutlineInfoCircle } from 'react-icons/ai'
import Header from '../components/Header'

const API_URL = 'http://localhost:3000/api/chat'

const IndexPage: React.FC = () => {
  const [inputQuery, setInputQuery] = useState('')
  const [messages, setMessages] = useState<
    Array<{ role: string; content: string }>
  >([])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputQuery(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
      const response = await axios.post(API_URL, { query: inputQuery })
      const { output } = response.data

      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'user', content: inputQuery },
        { role: 'assistant', content: output.content },
      ])
      setInputQuery('')
    } catch (error) {
      console.error('Error fetching data:', error)
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'user', content: inputQuery },
        {
          role: 'assistant',
          content: 'Error occurred while processing the request.',
        },
      ])
      setInputQuery('')
    }
  }

  return (
    <div className='flex flex-col justify-between h-screen bg-gray-800 p-2 mx-auto max-w-full'>
      <Header className='mt-5 mb-5' />

      <button
        onClick={() => {
          window.open(
            'https://github.com/rizanqardafil/jala-sql-translator',
            '_blank'
          )
        }}
        className='fixed right-12 top-4 md:right-12 md:top-6 text-xl text-white'
      >
        <AiFillGithub />
      </button>

      <div className='flex w-full flex-grow overflow-hidden relative'>
        <div id='chat' className='flex flex-col w-full mr-4 mx-5 lg:mx-0'>
          <div className='border-2 border-gray-600 p-6 rounded-lg overflow-y-scroll flex-grow flex flex-col justify-end bg-gray-700'>
            <>
              <div className='border-2 border-gray-600 p-6 rounded-lg overflow-y-scroll flex-grow flex flex-col justify-end bg-gray-700'>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`${
                      message.role === 'user'
                        ? 'text-green-300'
                        : 'text-blue-300'
                    } my-2 p-3 rounded shadow-md hover:shadow-lg transition-shadow duration-200 flex slide-in-bottom bg-gray-800 border border-gray-600 message-glow`}
                  >
                    <div className='rounded-tl-lg bg-gray-800 p-2 border-r border-gray-600 flex items-center'>
                      {message.role === 'user' ? '🤖' : '🧑‍💻'}
                    </div>
                    <div className='ml-2 flex items-center text-gray-200'>
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
              <form
                onSubmit={handleSubmit}
                className='mt-5 mb-5 relative bg-gray-700 rounded-lg flex items-center'
              >
                <input
                  type='text'
                  className='input-glow appearance-none border rounded w-full py-2 px-3 text-gray-200 leading-tight focus:outline-none focus:shadow-outline pl-3 pr-10 bg-gray-600 border-gray-600 transition-shadow duration-200'
                  value={inputQuery}
                  onChange={handleInputChange}
                />
                <button
                  type='submit'
                  className='ml-4 bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-blue-600'
                >
                  Submit
                </button>
              </form>
            </>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IndexPage
