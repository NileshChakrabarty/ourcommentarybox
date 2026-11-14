import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

// Dev-only debugging hook (stripped from production builds by Vite's dead-code elimination).
if (import.meta.env.DEV) void import('./store/room').then(({ room }) => { (window as unknown as { __room: typeof room }).__room = room; });
