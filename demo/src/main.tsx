import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { registerSw } from './registerSw';

const regPromise = registerSw();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App registrationPromise={regPromise} />
    </StrictMode>
);
