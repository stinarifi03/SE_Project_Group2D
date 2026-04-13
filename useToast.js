// Hook for managing toast notifications
import { useContext } from 'react';
import ToastContext from './ToastContext';

const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default useToast;
