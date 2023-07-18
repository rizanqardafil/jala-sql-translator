import Link from 'next/link'
import Github from '../Github'
import ThemeButton from '../ThemeButton'
import { useTheme } from 'next-themes'

export const Header = () => {
  const { resolvedTheme } = useTheme()
  const svgFillColor = resolvedTheme === 'dark' ? '#D8D8D8' : 'black'
  const btnBgColor =
    resolvedTheme === 'dark'
      ? 'dark-button-w-gradient-border'
      : 'light-button-w-gradient-border'

  return (
    <header className='flex flex-col items-center sm:justify-between w-full pt-4 pb-8 px-2'>
      <Link href='/' className='flex flex-col items-center'>
        <h1 className='font-mono sm:text-xl tracking-tight'>
          Jala - SQL Translate
        </h1>
        <p className='font-mono font-bold text-gray-600'>
          Jala - Human Language to SQL Translator
        </p>
      </Link>
    </header>
  )
}
