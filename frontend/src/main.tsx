import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'

import App from './App'
import { AuthProvider } from './context/AuthContext'

import './index.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element #root was not found in index.html')
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
