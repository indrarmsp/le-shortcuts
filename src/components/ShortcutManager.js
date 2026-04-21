"use client";
import { useState, useEffect, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Plus, Pencil, Trash2, Pin, PinOff, ChevronDown, ChevronRight, GripVertical, CheckSquare, Square, X, FolderInput, Globe } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { resizeImageFileToSquareDataUrl } from '@/lib/imageResize';

function SortableLinkCard({ link, onEdit, onDelete, onTogglePin, onRecordClick, isSelected, onToggleSelect, selectMode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="sortable-link-wrapper">
            <div
                className={`link-item ${isSelected ? 'link-selected' : ''}`}
                style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '16px', borderRadius: '16px', aspectRatio: '1/1',
                    background: isSelected ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'default', position: 'relative',
                    textDecoration: 'none',
                }}
                onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; } }}
                onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; } }}
            >
                {link.pinned && !selectMode && (
                    <div className="pinned-indicator" style={{ position: 'absolute', top: 10, right: 10, transition: 'opacity 0.2s' }}>
                        <Pin size={15} style={{ fill: 'var(--accent)', stroke: 'var(--accent)' }} />
                    </div>
                )}

                <div className="link-hover-actions" style={{
                    position: 'absolute', top: 6, left: 6, right: 6,
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', zIndex: 10
                }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                        <button {...attributes} {...listeners} className="btn-icon drag-handle"
                            style={{ width: '26px', height: '26px', cursor: 'grab', touchAction: 'none' }}
                            onClick={e => e.stopPropagation()}>
                            <GripVertical size={15} />
                        </button>
                        {selectMode && (
                            <button className="btn-icon select-checkbox" style={{ width: '26px', height: '26px', opacity: 1 }}
                                onClick={e => { e.stopPropagation(); onToggleSelect(link.id); }}>
                                {isSelected ? <CheckSquare size={16} style={{ color: 'var(--accent)' }} /> : <Square size={16} />}
                            </button>
                        )}
                    </div>
                    <div className="link-actions" style={{ display: 'flex', gap: '2px' }}>
                        <button className="btn-icon" style={{ width: '26px', height: '26px' }} title={link.pinned ? 'Unpin' : 'Pin to top'}
                            onClick={e => { e.preventDefault(); e.stopPropagation(); onTogglePin(link.id); }}>
                            {link.pinned ? <PinOff size={14} style={{ color: 'var(--accent-text)' }} /> : <Pin size={14} />}
                        </button>
                        <button className="btn-icon" style={{ width: '26px', height: '26px' }}
                            onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit(link); }}>
                            <Pencil size={14} />
                        </button>
                        <button className="btn-icon" style={{ width: '26px', height: '26px' }}
                            onClick={e => { e.preventDefault(); e.stopPropagation(); if (confirm('Delete?')) onDelete(link.id); }}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                <a href={link.url} target="_blank" rel="noopener noreferrer"
                    onClick={() => onRecordClick(link.id)}
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                        width: '100%', textDecoration: 'none', color: 'inherit'
                    }}>
                    {link.customIconUrl ? (
                        <img
                            src={link.customIconUrl}
                            alt=""
                            style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'contain', background: 'transparent' }}
                        />
                    ) : (
                        <Globe size={44} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                    )}
                    <span style={{
                        fontWeight: 500, fontSize: '0.9rem', textAlign: 'center', width: '100%',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden', lineHeight: '1.3'
                    }}>{link.title}</span>
                </a>
            </div>
        </div>
    );
}

function SortableCategorySection({ cat, catLinks, openCat, openLink, deleteCategory, deleteLink, toggleCollapsed, collapsed, recordClick, togglePin, reorderLinks, selectMode, selectedLinks, onToggleSelectLink }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    const handleLinkDragEnd = (event) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const oldIndex = catLinks.findIndex(l => l.id === active.id);
            const newIndex = catLinks.findIndex(l => l.id === over.id);
            const newArr = arrayMove(catLinks, oldIndex, newIndex);
            reorderLinks(cat.id, newArr.map(l => l.id));
        }
    };

    return (
        <section ref={setNodeRef} style={style} className="card" key={cat.id} data-cat-id={cat.id}>
            <div style={{ padding: '1.25rem 1.5rem 0 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: collapsed ? '1.25rem' : '1rem' }}>
                    <button {...attributes} {...listeners} className="btn-icon drag-handle"
                        style={{ width: '28px', height: '28px', cursor: 'grab', flexShrink: 0, touchAction: 'none' }}>
                        <GripVertical size={15} />
                    </button>

                    <button className="btn-icon" style={{ width: '28px', height: '28px', flexShrink: 0 }}
                        onClick={() => toggleCollapsed(cat.id)}>
                        {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {cat.customIconUrl ? (
                        <img src={cat.customIconUrl} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                    ) : (
                        <span style={{ fontSize: '1.15rem' }}>{cat.icon}</span>
                    )}
                    <span style={{ fontWeight: 600, fontSize: '1.05rem', letterSpacing: '-0.02em', cursor: 'pointer' }}
                        onClick={() => toggleCollapsed(cat.id)}>{cat.name}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                        {catLinks.length}
                    </span>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                        <button className="btn-icon" onClick={() => openCat(cat)}><Pencil size={15} /></button>
                        <button className="btn-icon" onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteCategory(cat.id); }}><Trash2 size={15} /></button>
                    </div>
                </div>
            </div>

            <div style={{
                overflow: 'hidden',
                maxHeight: collapsed ? '0' : '2000px',
                opacity: collapsed ? 0 : 1,
                transition: 'max-height 0.35s ease, opacity 0.25s ease, padding 0.35s ease',
                padding: collapsed ? '0 1.5rem' : '0.5rem 1.5rem 1.25rem 1.5rem',
            }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLinkDragEnd}>
                    <SortableContext items={catLinks.map(l => l.id)} strategy={rectSortingStrategy}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                            {catLinks.map(link => (
                                <SortableLinkCard
                                    key={link.id}
                                    link={link}
                                    onEdit={openLink}
                                    onDelete={deleteLink}
                                    onTogglePin={togglePin}
                                    onRecordClick={recordClick}
                                    isSelected={selectedLinks.has(link.id)}
                                    onToggleSelect={onToggleSelectLink}
                                    selectMode={selectMode}
                                />
                            ))}

                            <button onClick={() => openLink(null, cat.id)}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    padding: '16px', borderRadius: '16px', aspectRatio: '1/1',
                                    background: 'transparent', border: '1px dashed var(--border-strong)',
                                    color: 'var(--text-tertiary)', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'pointer',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent-text)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.transform = 'none'; }}
                            >
                                <Plus size={32} />
                                <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Add shortcut</span>
                            </button>
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </section>
    );
}

export default function ShortcutManager() {
    const {
        categories, links, collapsedCats, isLoaded, user, signInWithEmail, signOut,
        addCategory, updateCategory, deleteCategory, reorderCategories,
        addLink, updateLink, deleteLink, deleteLinks, moveLinks,
        recordClick, togglePin, reorderLinks, toggleCollapsed
    } = useDashboardData();

    const [modal, setModal] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [catForm, setCatForm] = useState({ name: '', icon: '📁', color: '#8b5cf6', customIconUrl: '' });
    const [linkForm, setLinkForm] = useState({ title: '', url: '', categoryId: '', customIconUrl: '' });
    const [search, setSearch] = useState('');
    const [selectMode, setSelectMode] = useState(false);
    const [selectedLinks, setSelectedLinks] = useState(new Set());
    const [moveModal, setMoveModal] = useState(false);

    // Auth Modal State
    const [authModal, setAuthModal] = useState(false);
    const [email, setEmail] = useState('');
    const [authSent, setAuthSent] = useState(false);

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        const { error } = await signInWithEmail(email);
        if (!error) {
            setAuthSent(true);
        } else {
            alert("Error sending link: " + error.message);
        }
    };

    // Privacy helper for the UI
    const censorEmail = (email) => {
        if (!email) return '';
        const [name, domain] = email.split('@');
        if (!domain) return email;
        if (name.length <= 2) return `${name[0]}***@${domain}`;
        return `${name[0]}***${name[name.length - 1]}@${domain}`;
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const toggleSelectLink = useCallback((id) => {
        setSelectedLinks(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
                e.preventDefault();
                document.getElementById('shortcut-search')?.focus();
            }
            if (e.key === 'Escape') {
                if (selectMode) { setSelectMode(false); setSelectedLinks(new Set()); }
                else setModal(null);
            }
            if (e.key === 'n' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
                e.preventDefault();
                openLinkModal(null, categories[0]?.id);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [categories, selectMode]);

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

    const openCat = (cat = null) => {
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

    const filtered = links.filter(l =>
        l.title.toLowerCase().includes(search.toLowerCase()) || l.url.toLowerCase().includes(search.toLowerCase())
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

    const selectAllInCategory = (catId) => {
        const catLinkIds = filtered.filter(l => l.categoryId === catId).map(l => l.id);
        setSelectedLinks(prev => {
            const next = new Set(prev);
            const allSelected = catLinkIds.every(id => next.has(id));
            catLinkIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
            return next;
        });
    };

    const handleBulkDelete = () => {
        if (selectedLinks.size === 0) return;
        if (confirm(`Delete ${selectedLinks.size} shortcut(s)?`)) {
            deleteLinks([...selectedLinks]);
            setSelectedLinks(new Set());
            setSelectMode(false);
        }
    };

    const handleBulkMove = (targetCatId) => {
        if (selectedLinks.size === 0) return;
        moveLinks([...selectedLinks], targetCatId);
        setSelectedLinks(new Set());
        setSelectMode(false);
        setMoveModal(false);
    };

    const handleImagePaste = async (e, setForm) => {
        const file = e.clipboardData?.files?.[0];
        if (file && file.type.startsWith('image/')) {
            e.preventDefault();
            try {
                const resizedImage = await resizeImageFileToSquareDataUrl(file, 256);
                setForm(prev => ({ ...prev, customIconUrl: resizedImage }));
            } catch (error) {
                console.error('Failed to process pasted image:', error);
            }
        }
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

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>Shortcuts</h2>
                    {user ? (
                        <button onClick={signOut} className="btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}>Sign out ({censorEmail(user.email)})</button>
                    ) : (
                        <button onClick={() => setAuthModal(true)} className="btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px', background: 'var(--success)' }}>Sign in to Sync</button>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <input id="shortcut-search" type="text" placeholder="Search (/) ..." value={search} onChange={e => setSearch(e.target.value)}
                        style={{ width: '200px', background: 'var(--bg-elevated)' }} />
                    <button
                        onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelectedLinks(new Set()); }}
                        className={selectMode ? 'btn-primary' : 'btn-ghost'}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', padding: '10px 14px' }}>
                        <CheckSquare size={15} />
                        <span style={{ fontSize: '0.88rem' }}>Select</span>
                    </button>
                    <button onClick={() => openCat()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                        <Plus size={16} /> Category
                    </button>
                </div>
            </div>

            {selectMode && selectedLinks.size > 0 && (
                <div className="card" style={{
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 20px',
                    marginBottom: '1rem', animation: 'fadeIn 0.15s ease',
                    border: '1px solid var(--accent)', background: 'var(--accent-muted)',
                }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent-text)' }}>
                        {selectedLinks.size} selected
                    </span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.85rem' }}
                            onClick={() => setMoveModal(true)}>
                            <FolderInput size={14} /> Move
                        </button>
                        <button className="btn-ghost" style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.85rem',
                            color: 'var(--danger)', borderColor: 'var(--danger)'
                        }}
                            onClick={handleBulkDelete}>
                            <Trash2 size={14} /> Delete
                        </button>
                        <button className="btn-icon" onClick={() => { setSelectMode(false); setSelectedLinks(new Set()); }}
                            style={{ width: '32px', height: '32px' }}>
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {categories.length === 0 && (
                <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🦥</p>
                    <p style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No categories yet</p>
                    <p>Create a category to add your shortcuts.</p>
                </div>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
                <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {categories.map(cat => {
                            const catLinks = filtered
                                .filter(l => l.categoryId === cat.id)
                                .sort((a, b) => {
                                    if (a.pinned && !b.pinned) return -1;
                                    if (!a.pinned && b.pinned) return 1;
                                    return (a.order ?? 0) - (b.order ?? 0);
                                });
                            if (search && catLinks.length === 0) return null;
                            const collapsed = !!collapsedCats[cat.id];

                            return (
                                <SortableCategorySection
                                    key={cat.id}
                                    cat={cat}
                                    catLinks={catLinks}
                                    openCat={openCat}
                                    openLink={openLinkModal}
                                    deleteCategory={deleteCategory}
                                    deleteLink={deleteLink}
                                    toggleCollapsed={toggleCollapsed}
                                    collapsed={collapsed}
                                    recordClick={recordClick}
                                    togglePin={togglePin}
                                    reorderLinks={reorderLinks}
                                    selectMode={selectMode}
                                    selectedLinks={selectedLinks}
                                    onToggleSelectLink={toggleSelectLink}
                                    selectAllInCategory={() => selectAllInCategory(cat.id)}
                                />
                            );
                        })}
                    </div>
                </SortableContext>
            </DndContext>

            {modal && (
                <div onClick={() => setModal(null)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, animation: 'fadeIn 0.15s ease'
                }}>
                    <div onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', animation: 'scaleIn 0.2s ease', boxShadow: 'var(--shadow-lg)' }}>
                        {modal === 'category' ? (
                            <form
                                onSubmit={submitCat}
                                style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                                onPaste={(e) => handleImagePaste(e, setCatForm)}
                            >
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{editingId ? 'Edit Category' : 'New Category'}</h3>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Name</label>
                                    <input required autoFocus value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Icon (Emoji)</label>
                                    <input value={catForm.icon} onChange={e => setCatForm({ ...catForm, icon: e.target.value })} maxLength={2} placeholder="Emoji" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Custom Category Icon</label>
                                    <div style={{
                                        border: '2px dashed var(--border-strong)', borderRadius: '8px', padding: '16px', textAlign: 'center',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative'
                                    }}>
                                        <input
                                            id="cat-icon-upload"
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={(e) => handleFileUpload(e, setCatForm)}
                                        />
                                        {catForm.customIconUrl ? (
                                            <>
                                                <img src={catForm.customIconUrl} alt="Custom Category Icon" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Paste another image to change</span>
                                                <button type="button" onClick={() => setCatForm({ ...catForm, customIconUrl: '' })} style={{ position: 'absolute', top: 4, right: 4, background: 'var(--bg-elevated)', borderRadius: '50%', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Press <kbd style={{ padding: '2px 4px', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border)' }}>Ctrl+V</kbd> anywhere to paste</span>
                                                <button type="button" onClick={(e) => { e.preventDefault(); document.getElementById('cat-icon-upload')?.click(); }} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>or Browse Files</button>
                                            </>
                                        )}
                                    </div>
                                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: '1.4' }}>
                                        Overrides the Emoji icon.
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <button type="button" onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
                                    <button type="submit" className="btn-primary">Save</button>
                                </div>
                            </form>
                        ) : (
                            <form
                                onSubmit={submitLink}
                                style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                                onPaste={(e) => handleImagePaste(e, setLinkForm)}
                            >
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{editingId ? 'Edit Shortcut' : 'New Shortcut'}</h3>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Title</label>
                                    <input required autoFocus value={linkForm.title} onChange={e => setLinkForm({ ...linkForm, title: e.target.value })} placeholder="GitHub" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>URL</label>
                                    <input required value={linkForm.url} onChange={e => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="github.com" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Category</label>
                                    <select value={linkForm.categoryId} onChange={e => setLinkForm({ ...linkForm, categoryId: e.target.value })} required>
                                        <option value="" disabled>Select…</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.customIconUrl ? '' : c.icon} {c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Custom Icon</label>
                                    <div style={{
                                        border: '2px dashed var(--border-strong)', borderRadius: '8px', padding: '16px', textAlign: 'center',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative'
                                    }}>
                                        <input
                                            id="icon-upload"
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={(e) => handleFileUpload(e, setLinkForm)}
                                        />
                                        {linkForm.customIconUrl ? (
                                            <>
                                                <img src={linkForm.customIconUrl} alt="Custom Icon" style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '8px' }} />
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Paste another image to change</span>
                                                <button type="button" onClick={() => setLinkForm({ ...linkForm, customIconUrl: '' })} style={{ position: 'absolute', top: 4, right: 4, background: 'var(--bg-elevated)', borderRadius: '50%', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Press <kbd style={{ padding: '2px 4px', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border)' }}>Ctrl+V</kbd> anywhere to paste</span>
                                                <button type="button" onClick={(e) => { e.preventDefault(); document.getElementById('icon-upload')?.click(); }} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>or Browse Files</button>
                                            </>
                                        )}
                                    </div>
                                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: '1.4' }}>
                                        You can paste an icon from Flaticon here.<br />
                                        If the default icon looks great, just leave this blank!
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <button type="button" onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
                                    <button type="submit" className="btn-primary">Save</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {moveModal && (
                <div onClick={() => setMoveModal(false)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, animation: 'fadeIn 0.15s ease'
                }}>
                    <div onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: '360px', padding: '2rem', animation: 'scaleIn 0.2s ease', boxShadow: 'var(--shadow-lg)' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1.25rem' }}>
                            Move {selectedLinks.size} shortcut(s) to…
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {categories.map(c => (
                                <button key={c.id} onClick={() => handleBulkMove(c.id)}
                                    className="btn-ghost" style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '10px 14px', justifyContent: 'flex-start', width: '100%'
                                    }}>
                                    {c.customIconUrl ? (
                                        <img src={c.customIconUrl} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                                    ) : (
                                        <span>{c.icon}</span>
                                    )}
                                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                            <button className="btn-ghost" onClick={() => setMoveModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {authModal && (
                <div onClick={() => { setAuthModal(false); setAuthSent(false); }} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, animation: 'fadeIn 0.15s ease'
                }}>
                    <div onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: '360px', padding: '2rem', animation: 'scaleIn 0.2s ease', boxShadow: 'var(--shadow-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Sync Across Devices</h3>
                            <button onClick={() => { setAuthModal(false); setAuthSent(false); }} className="btn-icon"><X size={16} /></button>
                        </div>
                        {authSent ? (
                            <div style={{ textAlign: 'center', color: 'var(--success)', padding: '1rem 0' }}>
                                <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>💌</p>
                                <p style={{ fontWeight: 500 }}>Magic link sent!</p>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Check your email to sign in.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Enter your email to receive a secure login link. No password required.</p>
                                <input required type="email" autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@example.com" />
                                <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Send Magic Link</button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            <style jsx global>{`
                .link-item .link-actions { opacity: 0; }
                .link-item .pinned-indicator { opacity: 1; }
                .link-item:hover .link-actions { opacity: 1; }
                .link-item:hover .pinned-indicator { opacity: 0; }
                .drag-handle { opacity: 0; transition: opacity 0.15s; }
                .link-item:hover .drag-handle,
                .card:hover > div .drag-handle { opacity: 0.8; }
                .drag-handle:hover { opacity: 1 !important; color: var(--text-primary); }
                .link-selected { box-shadow: 0 0 0 2px var(--accent) !important; }
                .sortable-link-wrapper { touch-action: manipulation; }
            `}</style>
        </>
    );
}
