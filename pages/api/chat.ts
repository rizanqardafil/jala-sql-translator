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

const openai = new OpenAIApi(configuration)

export async function executorSQL(
  sqlQuery: string,
  sqlResult: string
): Promise<string> {
  // Parse the JSON data
  const data = JSON.parse(sqlResult)

  // Convert the data into a text representation
  let dataText = 'Data Information:\n\n'
  Object.keys(data).forEach((key) => {
    dataText += `${key}: ${data[key]}`
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

export const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const datasource = new DataSource({
    type: 'sqlite',
    database: './data/northwind.db',
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

  const result = await executor.call({ input: prompt })

  let messages: ChatCompletionRequestMessage[] = [
    {
      role: 'system',
      content: SQL_PREFIX,
    },
  ]

  let message: ChatCompletionRequestMessage = {
    role: 'user',
    content: prompt,
  }

  messages.push(message)

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
    let sqlresult: any = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo-16k-0613',
      messages: messages,
      temperature: 0.25,
      functions: generateFunctionsArray(),
      function_call: 'auto',
    })

    while (sqlresult.data.choices[0]?.finish_reason === null) {
      const message: ChatCompletionRequestMessage = {
        role: 'user',
        content: sqlresult.data.choices[0]?.message?.content,
      }
      messages.push(message)

      if (sqlresult.data.choices[0]?.finish_reason === 'function_call') {
        try {
          const funcName =
            sqlresult.data.choices[0]?.message?.function_call?.name
          if (funcName) {
            const func = functionMap[funcName]
            const params = func({
              ...JSON.parse(
                sqlresult.data.choices[0]?.message?.function_call?.arguments ??
                  '{}'
              ),
            })
            const function_response = await func(params)
            const functionMessage: ChatCompletionRequestMessage = {
              role: 'function',
              name: funcName,
              content: function_response,
            }
            messages.push(functionMessage)
          }
        } catch (e) {
          const error = e as Error
          const functionMessage: ChatCompletionRequestMessage = {
            role: 'function',
            name: sqlresult.data.choices[0]?.message?.function_call?.name,
            content: JSON.stringify({
              status_code: 422,
              reason: error.name,
              content: error.message,
            }),
          }
          messages.push(functionMessage)
        }

        sqlresult = await openai.createChatCompletion({
          model: 'gpt-3.5-turbo-16k-0613',
          messages: messages,
          temperature: 0.25,
          functions: generateFunctionsArray(),
          function_call: 'auto',
        })
      } else {
        break
      }
    }

    const finalresponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo-16k-0613',
      messages: messages,
      temperature: 0.8,
      functions: generateFunctionsArray(),
      function_call: 'auto',
    })

    const responseMessage = finalresponse.data.choices[0]?.message
    if (responseMessage) {
      const formattedContent = responseMessage?.content?.replace(/\n/g, '')
      responseMessage.content = formattedContent
    }

    const customOutput = responseMessage || {}

    res.status(200).json({ output: customOutput })
  } catch (error) {
    console.error('Error calling OpenAI API:', error)
    res
      .status(500)
      .json({ error: 'An error occurred while processing the request.' })
  }
}

export default handler
