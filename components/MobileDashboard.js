"use client";
import { useState, useEffect, useRef } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Plus, Pencil, Trash2, Globe, X, Clock as ClockIcon, Settings, Cloud, GripVertical, Pin, PinOff, CheckSquare, Square } from 'lucide-react';
import {
    DndContext, closestCenter, TouchSensor, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, useSortable, rectSortingStrategy, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { resizeImageFileToSquareDataUrl } from '@/lib/imageResize';

function MobileClock({ user, requestSignIn, signOut, editMode, setEditMode }) {
    const [time, setTime] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hour = time.getHours();
    let greeting = "Good evening";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 18) greeting = "Good afternoon";

    const h = time.getHours().toString().padStart(2, '0');
    const m = time.getMinutes().toString().padStart(2, '0');
    const dateStr = time.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric'
    });

    return (
        <div style={{ padding: '0.5rem 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h1 style={{
                    fontSize: '3.5rem', fontWeight: 300, letterSpacing: '-0.04em', lineHeight: 1, margin: 0,
                    background: 'linear-gradient(to right, var(--text-primary), var(--text-secondary))',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                    {h}:{m}
                </h1>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={() => setEditMode(!editMode)} className={editMode ? "btn-primary" : "btn-ghost"} style={{ padding: '6px 14px', fontSize: '0.75rem', borderRadius: '10px', fontWeight: 600 }}>
                        {editMode ? 'Done' : 'Edit'}
                    </button>
                    <button onClick={user ? signOut : requestSignIn} className="btn-ghost" style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Cloud size={14} style={{ color: user ? 'var(--success)' : 'inherit' }} />
                        {user ? 'Synced' : 'Sync'}
                    </button>
                </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500 }}>
                {greeting}. {dateStr}.
            </p>
        </div>
    );
}
function SortableMobileLink({ link, openLinkModal, editMode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });
    const dragProps = editMode ? { ...attributes, ...listeners } : {};
    const longPressTimeoutRef = useRef(null);
    const longPressTriggeredRef = useRef(false);

    const clearLongPress = () => {
        if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
        }
    };

    const startLongPress = () => {
        if (editMode) return;
        clearLongPress();
        longPressTriggeredRef.current = false;
        longPressTimeoutRef.current = setTimeout(() => {
            longPressTriggeredRef.current = true;
            openLinkModal(link);
        }, 450);
    };

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        WebkitTouchCallout: 'none',
        userSelect: 'none',
        position: 'relative',
        zIndex: isDragging ? 99 : 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
        padding: '12px 8px', background: editMode ? 'var(--bg-hover)' : 'var(--bg-elevated)', borderRadius: '16px',
        border: editMode ? '1px dashed var(--accent)' : '1px solid var(--border)', WebkitTapHighlightColor: 'transparent',
        textDecoration: 'none', color: 'inherit',
        touchAction: editMode ? 'none' : 'pan-y'
    };

    return (
        <a href={editMode ? "#" : link.url} target={editMode ? "_self" : "_blank"} rel="noopener noreferrer" ref={setNodeRef} style={style} {...dragProps}
            onTouchStart={startLongPress}
            onTouchMove={clearLongPress}
            onTouchEnd={clearLongPress}
            onTouchCancel={clearLongPress}
            onClick={(e) => {
                if (isDragging) { e.preventDefault(); return; }

                if (longPressTriggeredRef.current) {
                    longPressTriggeredRef.current = false;
                    e.preventDefault();
                    return;
                }

                if (editMode) {
                    e.preventDefault();
                }
            }}
        >
            {link.customIconUrl ? (
                <img src={link.customIconUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'contain' }} />
            ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Globe size={20} style={{ color: 'var(--text-tertiary)' }} />
                </div>
            )}
            <span style={{ fontSize: '0.75rem', fontWeight: 500, textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {link.title}
            </span>
        </a>
    );
}

function SortableMobileCategory({ cat, children, editMode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
    const dragProps = editMode ? { attributes, listeners } : { attributes: {}, listeners: {} };

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        WebkitTouchCallout: 'none',
        userSelect: 'none',
        position: 'relative',
        zIndex: isDragging ? 50 : 1,
        touchAction: editMode ? 'none' : 'pan-y'
    };

    return (
        <div ref={setNodeRef} style={style}>
            {children(dragProps)}
        </div>
    );
}

export default function MobileDashboard() {
    const {
        categories, links, isLoaded, user, signInWithEmail, signOut,
        addCategory, updateCategory, deleteCategory, deleteCategories, reorderCategories,
        addLink, updateLink, deleteLink, toggleCategoryPin, reorderLinks
    } = useDashboardData();

    const [modal, setModal] = useState(null); // 'link', 'category', 'auth'
    const [editingId, setEditingId] = useState(null);
    const [catForm, setCatForm] = useState({ name: '', icon: '📁', color: '#8b5cf6', customIconUrl: '' });
    const [linkForm, setLinkForm] = useState({ title: '', url: '', categoryId: '', customIconUrl: '' });
    const [editMode, setEditMode] = useState(false);
    const [categorySelectMode, setCategorySelectMode] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState(new Set());

    // Auth Modal State
    const [email, setEmail] = useState('');
    const [authSent, setAuthSent] = useState(false);

    const sensors = useSensors(
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 10 } }),
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
    );

    const handleCategoryDragEnd = (event) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const oldIndex = categories.findIndex(c => c.id === active.id);
            const newIndex = categories.findIndex(c => c.id === over.id);
            const newArr = arrayMove(categories, oldIndex, newIndex);
            reorderCategories(newArr.map(c => c.id));
        }
    };

    const handleLinkDragEnd = (event, catId, catLinks) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const oldIndex = catLinks.findIndex(l => l.id === active.id);
            const newIndex = catLinks.findIndex(l => l.id === over.id);
            const newArr = arrayMove(catLinks, oldIndex, newIndex);
            reorderLinks(catId, newArr.map(l => l.id));
        }
    };

    if (!isLoaded) {
        return (
            <div className="loading-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="loading-content">
                    <div className="loading-spinner" aria-hidden="true" />
                    <p className="loading-text">Please wait a moment...</p>
                </div>
            </div>
        );
    }

    const openCatModal = (cat = null) => {
        setEditingId(cat?.id || null);
        setCatForm(cat ? { name: cat.name, icon: cat.icon, color: cat.color, customIconUrl: cat.customIconUrl || '' } : { name: '', icon: '📁', color: '#8b5cf6', customIconUrl: '' });
        setModal('category');
    };

    const openLinkModal = (link = null, catId = '') => {
        setEditingId(link?.id || null);
        setLinkForm(link ? { title: link.title, url: link.url, categoryId: link.categoryId, customIconUrl: link.customIconUrl || '' } : { title: '', url: '', customIconUrl: '', categoryId: catId || categories[0]?.id || '' });
        setModal('link');
    };

    const submitCat = (e) => {
        e.preventDefault();
        editingId ? updateCategory(editingId, catForm) : addCategory(catForm);
        setModal(null);
    };

    const submitLink = (e) => {
        e.preventDefault();
        let url = linkForm.url;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        editingId ? updateLink(editingId, { ...linkForm, url }) : addLink({ ...linkForm, url });
        setModal(null);
    };

    const handleFileUpload = async (e, setForm) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const resizedImage = await resizeImageFileToSquareDataUrl(file, 256);
                setForm(prev => ({ ...prev, customIconUrl: resizedImage }));
            } catch (error) {
                console.error('Failed to process uploaded image:', error);
            } finally {
                e.target.value = '';
            }
        }
    };

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        const { error } = await signInWithEmail(email);
        if (!error) {
            setAuthSent(true);
        } else {
            alert("Error sending link: " + error.message);
        }
    };

    const toggleSelectCategory = (id) => {
        setSelectedCategories(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBulkDeleteCategories = () => {
        if (selectedCategories.size === 0) return;
        const count = selectedCategories.size;
        if (confirm(`Delete ${count} categor${count > 1 ? 'ies' : 'y'} and all shortcuts inside?`)) {
            deleteCategories([...selectedCategories]);
            setSelectedCategories(new Set());
            setCategorySelectMode(false);
        }
    };

    const toggleCategorySelectMode = () => {
        const next = !categorySelectMode;
        setCategorySelectMode(next);
        if (next) {
            setEditMode(true);
        } else {
            setSelectedCategories(new Set());
        }
    };

    const handleEditModeChange = (nextEditMode) => {
        setEditMode(nextEditMode);
        if (!nextEditMode) {
            setCategorySelectMode(false);
            setSelectedCategories(new Set());
        }
    };

    return (
        <div style={{ paddingBottom: '80px', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
            <MobileClock user={user} requestSignIn={() => setModal('auth')} signOut={signOut} editMode={editMode} setEditMode={handleEditModeChange} />

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                    onClick={() => {
                        const next = !(categorySelectMode || editMode);
                        setCategorySelectMode(next);
                        setEditMode(next);
                        if (!next) setSelectedCategories(new Set());
                    }}
                    className={categorySelectMode || editMode ? 'btn-primary' : 'btn-ghost'}
                    style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                >
                    <CheckSquare size={14} /> Select
                </button>

                {categorySelectMode && selectedCategories.size > 0 && (
                    <button
                        onClick={handleBulkDeleteCategories}
                        className="btn-ghost"
                        style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    >
                        Delete ({selectedCategories.size})
                    </button>
                )}
            </div>

            {categories.length === 0 ? (
                <div style={{ textAlign: 'center', margin: '4rem 0', color: 'var(--text-secondary)' }}>
                    <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>🦥</p>
                    <p>No categories yet. Tap + to start.</p>
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd} autoScroll={false}>
                    <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {categories.map(cat => {
                                const catLinks = links.filter(l => l.categoryId === cat.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                                return (
                                    <SortableMobileCategory key={cat.id} cat={cat} editMode={editMode}>
                                        {({ attributes, listeners }) => (
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                    <div {...attributes} {...listeners} style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, touchAction: editMode ? 'none' : 'auto' }}>
                                                        {editMode && <GripVertical size={18} style={{ color: 'var(--text-tertiary)' }} />}
                                                        {editMode && categorySelectMode && (
                                                            <button onClick={() => toggleSelectCategory(cat.id)} className="btn-icon" title="Select category" style={{ width: '28px', height: '28px' }}>
                                                                {selectedCategories.has(cat.id)
                                                                    ? <CheckSquare size={16} style={{ color: 'var(--accent)' }} />
                                                                    : <Square size={16} />}
                                                            </button>
                                                        )}
                                                        {cat.customIconUrl ? (
                                                            <img src={cat.customIconUrl} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                                                        ) : (
                                                            <span style={{ fontSize: '1.1rem' }}>{cat.icon}</span>
                                                        )}
                                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{cat.name}</h3>
                                                    </div>
                                                    {editMode && (
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <button onClick={() => toggleCategoryPin(cat.id)} className="btn-icon" title={cat.pinned ? 'Unpin category' : 'Pin category'}>
                                                                {cat.pinned ? <PinOff size={16} style={{ color: 'var(--accent-text)' }} /> : <Pin size={16} />}
                                                            </button>
                                                            <button onClick={() => openCatModal(cat)} className="btn-icon">
                                                                <Pencil size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleLinkDragEnd(e, cat.id, catLinks)} autoScroll={false}>
                                                    <SortableContext items={catLinks.map(l => l.id)} strategy={rectSortingStrategy}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: '12px', justifyContent: 'center' }}>
                                                            {catLinks.map(link => (
                                                                <SortableMobileLink key={link.id} link={link} openLinkModal={openLinkModal} editMode={editMode} />
                                                            ))}
                                                            {editMode && (
                                                                <button onClick={() => openLinkModal(null, cat.id)} style={{
                                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                                    padding: '12px 8px', background: 'transparent', borderRadius: '16px',
                                                                    border: '1px dashed var(--border-strong)', color: 'var(--text-tertiary)'
                                                                }}>
                                                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <Plus size={24} />
                                                                    </div>
                                                                    <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Add</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </SortableContext>
                                                </DndContext>
                                            </div>
                                        )}
                                    </SortableMobileCategory>
                                );
                            })}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {/* In-line flow Add Category button instead of a fixed blocker */}
            <div style={{ marginTop: '32px', marginBottom: '80px' }}>
                <button onClick={() => openCatModal()} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', borderRadius: '16px', fontSize: '1.05rem', background: 'var(--accent-muted)', color: 'var(--accent-text)', border: '1px dashed var(--accent)', transition: 'all 0.2s ease' }}>
                    <Plus size={20} /> New Category
                </button>
            </div>

            {/* Modals */}
            {modal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'flex-end', zIndex: 1000,
                    animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div style={{
                        background: 'var(--bg-surface)', width: '100%', padding: '24px',
                        borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
                        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
                        animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                                {modal === 'category' ? (editingId ? 'Edit Category' : 'New Category') :
                                    modal === 'link' ? (editingId ? 'Edit Shortcut' : 'New Shortcut') :
                                        'Sign in to Sync'}
                            </h3>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {editingId && modal !== 'auth' && (
                                    <button className="btn-icon" style={{ background: 'var(--danger)', color: '#fff', opacity: 0.9 }} onClick={() => {
                                        if (confirm('Delete?')) {
                                            modal === 'category' ? deleteCategory(editingId) : deleteLink(editingId);
                                            setModal(null);
                                        }
                                    }}>
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <button className="btn-icon" style={{ background: 'var(--bg-elevated)' }} onClick={() => { setModal(null); setAuthSent(false); }}>
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {modal === 'auth' ? (
                            authSent ? (
                                <div style={{ textAlign: 'center', color: 'var(--success)', padding: '2rem 0' }}>
                                    <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>💌</p>
                                    <p style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>Magic link sent!</p>
                                    <p style={{ color: 'var(--text-secondary)' }}>Check your email app to sign in.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>Enter your email to receive a secure login link. No password required.</p>
                                    <input required type="email" autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@example.com" style={{ padding: '16px', borderRadius: '16px' }} />
                                    <button type="submit" className="btn-primary" style={{ padding: '16px', borderRadius: '16px', marginTop: '8px', fontSize: '1.05rem', background: 'var(--success)' }}>Send Magic Link</button>
                                </form>
                            )
                        ) : modal === 'category' ? (
                            <form onSubmit={submitCat} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <input required autoFocus value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="Category Name" style={{ padding: '16px', borderRadius: '16px' }} />
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <input value={catForm.icon} onChange={e => setCatForm({ ...catForm, icon: e.target.value })} maxLength={2} placeholder="Emoji" style={{ width: '80px', padding: '16px', borderRadius: '16px', textAlign: 'center', fontSize: '1.5rem' }} />
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input type="file" id="mob-cat-icon" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileUpload(e, setCatForm)} />
                                        <button type="button" onClick={() => document.getElementById('mob-cat-icon').click()} style={{
                                            width: '100%', height: '100%', border: '1px dashed var(--border-strong)', borderRadius: '16px', background: 'transparent', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}>
                                            {catForm.customIconUrl ? <img src={catForm.customIconUrl} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} /> : 'Upload Icon'}
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary" style={{ padding: '16px', borderRadius: '16px', marginTop: '8px', fontSize: '1.05rem' }}>Save</button>
                            </form>
                        ) : (
                            <form onSubmit={submitLink} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <input required autoFocus value={linkForm.title} onChange={e => setLinkForm({ ...linkForm, title: e.target.value })} placeholder="Title" style={{ padding: '16px', borderRadius: '16px' }} />
                                <input required value={linkForm.url} onChange={e => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="URL" style={{ padding: '16px', borderRadius: '16px' }} />
                                <select value={linkForm.categoryId} onChange={e => setLinkForm({ ...linkForm, categoryId: e.target.value })} required style={{ padding: '16px', borderRadius: '16px', WebkitAppearance: 'none' }}>
                                    <option value="" disabled>Select Category</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                                </select>
                                <div style={{ position: 'relative', height: '60px' }}>
                                    <input type="file" id="mob-link-icon" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileUpload(e, setLinkForm)} />
                                    <button type="button" onClick={() => document.getElementById('mob-link-icon').click()} style={{
                                        width: '100%', height: '100%', border: '1px dashed var(--border-strong)', borderRadius: '16px', background: 'transparent', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}>
                                        {linkForm.customIconUrl ? <img src={linkForm.customIconUrl} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain' }} /> : 'Upload Custom Icon'}
                                    </button>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>Tap &quot;Done&quot; to exit edit mode.</div>
                                <button type="submit" className="btn-primary" style={{ padding: '16px', borderRadius: '16px', marginTop: '8px', fontSize: '1.05rem' }}>Save Shortcut</button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
