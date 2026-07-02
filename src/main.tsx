import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { getRouter, AppWithProviders } from './router'
import './styles.css'

const router = getRouter()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWithProviders>
      <RouterProvider router={router} />
    </AppWithProviders>
  </React.StrictMode>,
)