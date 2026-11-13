import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/instrument-sans';
import '@fontsource/ibm-plex-mono/400.css';
import './styles/workspace.css';
import './styles/motion.css';
import { Workspace } from './features/plan-workspace/Workspace';

createRoot(document.getElementById('root')!).render(<React.StrictMode><Workspace /></React.StrictMode>);
