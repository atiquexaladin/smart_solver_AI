
console.log('🚀 main.tsx loading...');

import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Root from './Root.tsx';
import './index.css';

console.log('✓ Imports complete');

const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (!rootElement) {
  console.error('❌ Root element not found!');
} else {
  console.log('✓ Creating React root...');
  try {
    createRoot(rootElement).render(
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    );
    console.log('✓ React rendered successfully');
  } catch (err) {
    console.error('❌ Error rendering React:', err);
  }
}
