import { createRoot } from 'react-dom/client';
import { applyTokens } from './design';
import { App } from './app/App';

applyTokens();
createRoot(document.getElementById('root')!).render(<App />);
