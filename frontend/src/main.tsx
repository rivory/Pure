import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import App from './App'
import { Theme, Button } from '@radix-ui/themes'
import { Moon, Sun } from 'lucide-react'
import { ThemeProvider, useTheme } from './contexts/theme-context'

const container = document.getElementById('root')
const root = createRoot(container!)

function Root() {
    return (
        <StrictMode>
            <ThemeProvider>
                <ThemedApp />
            </ThemeProvider>
        </StrictMode>
    )
}

function ThemedApp() {
    const { theme, setTheme } = useTheme()

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
    }

    return (
        <Theme appearance={theme}>
            <div id='theme-toggle' className="fixed top-8 right-4 z-50">
                <Button
                    variant="soft"
                    onClick={toggleTheme}
                >
                    {theme === 'dark' ?
                        <Sun size={16} className='text-white' /> :
                        <Moon size={16} className='text-black' />
                    }
                </Button>
            </div>
            <App />
        </Theme>
    )
}

root.render(<Root />)
