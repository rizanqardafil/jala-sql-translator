import { SQL_PREFIX, SQL_SUFFIX } from '../../utils/prompt'
import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from 'openai'
import { OpenAI } from 'langchain'
import { SqlToolkit, createSqlAgent } from 'langchain/agents'
import { SqlDatabase } from 'langchain/sql_db'
import type { NextApiRequest, NextApiResponse } from 'next'
import { DataSource } from 'typeorm'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ChatResponse {
  prompt: string
  sqlQuery: string
  result: Record<string, string | boolean | number>[]
  error: string
}
const openai = new OpenAIApi(configuration)

export async function executorSQL(
  sqlQuery: string,
  sqlResult: string
): Promise<string> {
  const data = JSON.parse(sqlResult)

  let dataText = 'Data Information:\n\n'
  Object.keys(data).forEach((key) => {
    dataText += `- ${key}: ${data[key]}\n`
  })

  return dataText
}

const functionMap: { [key: string]: Function } = {
  executorSQL: executorSQL,
}

const generateFunctionsArray = () => {
  return Object.keys(functionMap).map((funcName) => {
    const func = functionMap[funcName]

    return {
      name: funcName,
      description: `Description of ${funcName}`,
      parameters: {
        type: 'object',
        properties: {
          sqlQuery: {
            type: 'string',
          },
          sqlResult: {
            type: 'string',
          },
        },
        required: ['sqlQuery', 'sqlResult'],
      },
    }
  })
}

interface ChatResponse {
  prompt: string
  sqlQuery: string
  result: Record<string, string | boolean | number>[]
  error: string
}

export const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const datasource = new DataSource({
    type: 'mysql',
    host: 'localhost',
    port: 3306, 
    username: 'root',
    password: '',
    database: 'sekolahkita'
  })


  const db = await SqlDatabase.fromDataSourceParams({
    appDataSource: datasource,
  })

  const toolkit = new SqlToolkit(db)
  const model = new OpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
  })
  const executor = createSqlAgent(model, toolkit, {
    topK: 10,
    prefix: SQL_PREFIX,
    suffix: SQL_SUFFIX,
  })
  const { query: prompt } = req.body

  let response = {
    prompt: prompt,
    sqlQuery: '',
    result: [],
    error: '',
  }

  let response1: ChatResponse = {
    prompt: prompt,
    sqlQuery: '',
    result: [],
    error: '',
  }

  const result = await executor.call({ input: prompt })

  let messages: ChatCompletionRequestMessage[] = [
    {
      role: 'user',
      content: SQL_PREFIX,
    },
  ]

  result.intermediateSteps.forEach((step: any) => {
    if (step.action.tool === 'query-sql') {
      response.sqlQuery = step.action.toolInput
      response.result = JSON.parse(step.observation)

      messages.push({
        role: 'assistant',
        content: response.sqlQuery,
        function_call: {
          name: 'executorSQL',
          arguments: JSON.stringify({
            sqlQuery: response.sqlQuery,
            sqlResult: JSON.stringify(response.result),
          }),
        },
      })
    }
  })

  try {

    const translationResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo-16k-0613',
      messages: messages,
      functions: generateFunctionsArray(),
      function_call: 'auto',
      temperature: 0.25,
    })

    const responseMessage = translationResponse.data.choices[0]?.message
    const formattedContent = responseMessage?.content?.replace(/\n/g, '')

    if (responseMessage && formattedContent !== undefined) {
      responseMessage.content = formattedContent
      let customOutput = responseMessage

      res.status(200).json({ output: customOutput })
    } else {
      res.status(500).json({ error: 'Invalid response from GPT-3' })
    }
  } catch (error) {
    console.error('Error processing request:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export default handler
