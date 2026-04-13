// ToastProvider component
import React from 'react';
import { ToastProvider } from './ToastContext';
import useToast from './useToast';

const App = () => {
  return (
    <ToastProvider>
      {/* Other components go here */}
    </ToastProvider>
  );
};

export default App;
