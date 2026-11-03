import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles.css';
import { SolutionSection } from '@/features/solution/solution-section';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main>
      <SolutionSection />
    </main>
  </StrictMode>
);
