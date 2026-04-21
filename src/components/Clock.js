"use client";
import { useState, useEffect } from "react";

export default function Clock() {
    const [time, setTime] = useState(null);

    useEffect(() => {
        setTime(new Date());
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!time) return <div style={{ height: '140px' }} />;

    const hour = time.getHours();
    let greeting = "Good evening";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 18) greeting = "Good afternoon";

    const h = time.getHours().toString().padStart(2, '0');
    const m = time.getMinutes().toString().padStart(2, '0');

    const dateStr = time.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    });

    return (
        <div style={{ marginBottom: '4rem', animation: 'fadeIn 0.5s ease', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>le-Shortcut</span>
            </div>
            <h1 style={{
                fontSize: 'clamp(3.5rem, 15vw, 5rem)',
                fontWeight: 200,
                letterSpacing: '-0.06em',
                lineHeight: 1,
                marginBottom: '0.75rem',
                background: 'linear-gradient(to right, var(--text-primary), var(--text-secondary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
            }}>
                {h}:{m}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                {greeting}. {dateStr}.
            </p>
        </div>
    );
}
