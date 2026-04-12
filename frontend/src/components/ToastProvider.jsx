import { useCallback, useMemo, useState } from 'react'
import { ToastContext } from './ToastContext'

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 3400)
  }, [removeToast])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{ position: 'fixed', right: '1rem', bottom: '1rem', zIndex: 120, display: 'grid', gap: '.55rem' }}>
        {toasts.map((toast) => {
          const bg = toast.type === 'error'
            ? 'linear-gradient(135deg, #f1585c, #e53c46)'
            : toast.type === 'success'
              ? 'linear-gradient(135deg, #1ea971, #0c8f5b)'
              : 'linear-gradient(135deg, #1060ff, #00a2ff)'

          return (
            <div
              key={toast.id}
              style={{
                minWidth: '260px',
                maxWidth: '360px',
                color: '#fff',
                borderRadius: '.85rem',
                padding: '.75rem .85rem',
                background: bg,
                boxShadow: '0 16px 32px rgba(9, 28, 62, 0.28)',
                animation: 'slideIn 220ms ease both'
              }}
            >
              {toast.message}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
