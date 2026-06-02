import React from 'react';
import ReactDOM from 'react-dom/client';
import Options from './options';
import { initI18n } from './modules/i18n';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
// Ensure i18n is ready before the first render so getMessage() returns
// translations instead of raw keys.
initI18n().finally(() => root.render(React.createElement(Options))); 