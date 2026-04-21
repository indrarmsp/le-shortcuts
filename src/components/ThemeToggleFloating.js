"use client";
import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggleFloating() {
    const [isLight, setIsLight] = useState(false);

    useEffect(() => {
        setIsLight(document.documentElement.classList.contains('light'));
    }, []);

    const toggleTheme = () => {
        const next = !isLight;
        setIsLight(next);
        if (next) {
            document.documentElement.classList.add('light');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.remove('light');
            localStorage.setItem('theme', 'dark');
        }
    };

    return (
        <button
            onClick={toggleTheme}
            className="btn-icon"
            style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 9999
            }}
        >
            {isLight ? <Moon size={20} /> : <Sun size={20} />}
        </button>
    );
}
