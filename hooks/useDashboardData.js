"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { normalizeImageSourceToSquareDataUrl } from '@/lib/imageResize';

const CATEGORIES_KEY = 'le-shortcuts_categories';
const LINKS_KEY = 'le-shortcuts_links';
const COLLAPSED_KEY = 'le-shortcuts_collapsed';
const ICON_MIGRATION_KEY = 'le-shortcuts_icons_256_migrated_v1';
const CATEGORY_PIN_KEY = 'le-shortcuts_category_pins_v1';
const SESSION_CACHE_KEY = 'le-shortcuts_dashboard_cache_v1';

export function useDashboardData() {
    const [categories, setCategories] = useState([]);
    const [links, setLinks] = useState([]);
    const [collapsedCats, setCollapsedCats] = useState({});
    const [isLoaded, setIsLoaded] = useState(false);

    // Auth State
    const [user, setUser] = useState(null);

    const readCategoryPins = useCallback(() => {
        try {
            const raw = localStorage.getItem(CATEGORY_PIN_KEY);
            if (!raw) return {};
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }, []);

    const withPinnedCategories = useCallback((cats) => {
        const pinMap = readCategoryPins();
        return cats.map((cat, index) => {
            const fromMap = pinMap[cat.id];
            const pinned = typeof cat.pinned === 'boolean' ? cat.pinned : !!fromMap;
            return { order: index, pinned: false, ...cat, pinned };
        });
    }, [readCategoryPins]);

    const persistCategoryPins = useCallback((cats) => {
        const pinMap = cats.reduce((acc, cat) => {
            if (cat?.id) acc[cat.id] = !!cat.pinned;
            return acc;
        }, {});
        localStorage.setItem(CATEGORY_PIN_KEY, JSON.stringify(pinMap));
    }, []);

    const persistSessionCache = useCallback((nextCats, nextLinks, nextCollapsed) => {
        try {
            sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
                categories: nextCats,
                links: nextLinks,
                collapsedCats: nextCollapsed
            }));
        } catch {
            // Ignore quota/storage errors and continue with normal flow.
        }
    }, []);

    // Initial auth listener
    useEffect(() => {
        if (!supabase) return; // Skip auth check entirely if DB not connected

        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadLocalData = () => {
        let localCats = [], localLinks = [], localCollapsed = {};
        try {
            const sc = localStorage.getItem(CATEGORIES_KEY);
            const sl = localStorage.getItem(LINKS_KEY);
            const scol = localStorage.getItem(COLLAPSED_KEY);
            if (sc) localCats = JSON.parse(sc).map((c, i) => ({ order: i, pinned: false, ...c, pinned: !!c.pinned }));
            if (sl) localLinks = JSON.parse(sl).map((l, i) => ({ pinned: false, order: i, ...l }));
            if (scol) localCollapsed = JSON.parse(scol);
        } catch (e) {
            console.error('Failed to load data from localStorage', e);
        }
        return { localCats: withPinnedCategories(localCats), localLinks, localCollapsed };
    };

    const migrateStoredIconsTo256 = useCallback(async (cats, dashboardLinks) => {
        if (typeof window === 'undefined') return { cats, dashboardLinks, changed: false };

        const alreadyMigrated = localStorage.getItem(ICON_MIGRATION_KEY) === '1';
        if (alreadyMigrated) return { cats, dashboardLinks, changed: false };

        let changed = false;

        const normalizedCats = await Promise.all(cats.map(async (cat) => {
            if (!cat.customIconUrl) return cat;
            try {
                const resized = await normalizeImageSourceToSquareDataUrl(cat.customIconUrl, 256);
                if (resized !== cat.customIconUrl) {
                    changed = true;
                    return { ...cat, customIconUrl: resized };
                }
            } catch {
                // Keep original icon if normalization fails (e.g. non-CORS external URLs).
            }
            return cat;
        }));

        const normalizedLinks = await Promise.all(dashboardLinks.map(async (link) => {
            if (!link.customIconUrl) return link;
            try {
                const resized = await normalizeImageSourceToSquareDataUrl(link.customIconUrl, 256);
                if (resized !== link.customIconUrl) {
                    changed = true;
                    return { ...link, customIconUrl: resized };
                }
            } catch {
                // Keep original icon if normalization fails (e.g. non-CORS external URLs).
            }
            return link;
        }));

        localStorage.setItem(ICON_MIGRATION_KEY, '1');

        return { cats: normalizedCats, dashboardLinks: normalizedLinks, changed };
    }, []);

    useEffect(() => {
        if (!supabase) {
            // Environment keys are missing, gracefully fallback to local only and finish loading.
            const bootstrapLocal = async () => {
                const { localCats, localLinks, localCollapsed } = loadLocalData();
                const migrated = await migrateStoredIconsTo256(localCats, localLinks);

                setCategories(migrated.cats);
                setLinks(migrated.dashboardLinks);
                setCollapsedCats(localCollapsed);
                persistCategoryPins(migrated.cats);
                persistSessionCache(migrated.cats, migrated.dashboardLinks, localCollapsed);

                if (migrated.changed) {
                    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(migrated.cats));
                    localStorage.setItem(LINKS_KEY, JSON.stringify(migrated.dashboardLinks));
                }

                setIsLoaded(true);
            };

            bootstrapLocal();
            return;
        }

        const fetchCloudData = async () => {
            try {
                const { data: supaCats } = await supabase.from('categories').select('*').order('order', { ascending: true });
                const { data: supaLinks } = await supabase.from('links').select('*').order('order', { ascending: true });

                // Map Postgres lowercase columns back to JS camelCase
                const mappedCats = (supaCats || []).map(c => ({
                    ...c, customIconUrl: c.customiconurl, pinned: false
                }));
                const mappedLinks = (supaLinks || []).map(l => ({
                    ...l, categoryId: l.categoryid, clickCount: l.clickcount, customIconUrl: l.customiconurl
                }));

                const migrated = await migrateStoredIconsTo256(withPinnedCategories(mappedCats), mappedLinks);

                setCategories(migrated.cats);
                setLinks(migrated.dashboardLinks);
                persistCategoryPins(migrated.cats);

                if (migrated.changed && user) {
                    const sanitizedCats = migrated.cats.map(d => ({
                        id: d.id,
                        user_id: user.id,
                        order: d.order,
                        name: d.name,
                        icon: d.icon,
                        color: d.color,
                        customiconurl: d.customIconUrl
                    }));
                    const sanitizedLinks = migrated.dashboardLinks.map(d => ({
                        id: d.id,
                        user_id: user.id,
                        categoryid: d.categoryId,
                        order: d.order,
                        title: d.title,
                        url: d.url,
                        pinned: d.pinned,
                        clickcount: d.clickCount,
                        customiconurl: d.customIconUrl
                    }));

                    await supabase.from('categories').upsert(sanitizedCats);
                    await supabase.from('links').upsert(sanitizedLinks);
                }

                const { localCollapsed } = loadLocalData();
                setCollapsedCats(localCollapsed);
                persistSessionCache(migrated.cats, migrated.dashboardLinks, localCollapsed);
            } catch (e) {
                console.error("Cloud fetch failed:", e);
            } finally {
                setIsLoaded(true);
            }
        };

        if (user) {
            fetchCloudData();
        } else {
            const bootstrapLocal = async () => {
                const { localCats, localLinks, localCollapsed } = loadLocalData();
                const migrated = await migrateStoredIconsTo256(localCats, localLinks);

                setCategories(migrated.cats);
                setLinks(migrated.dashboardLinks);
                setCollapsedCats(localCollapsed);
                persistCategoryPins(migrated.cats);
                persistSessionCache(migrated.cats, migrated.dashboardLinks, localCollapsed);

                if (migrated.changed) {
                    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(migrated.cats));
                    localStorage.setItem(LINKS_KEY, JSON.stringify(migrated.dashboardLinks));
                }

                setIsLoaded(true);
            };

            bootstrapLocal();
        }
    }, [migrateStoredIconsTo256, persistCategoryPins, persistSessionCache, user, withPinnedCategories]);

    useEffect(() => {
        if (!isLoaded) return;
        persistSessionCache(categories, links, collapsedCats);
    }, [categories, collapsedCats, isLoaded, links, persistSessionCache]);

    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.hidden && isLoaded) {
                persistSessionCache(categories, links, collapsedCats);
            }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, [categories, collapsedCats, isLoaded, links, persistSessionCache]);

    const saveCategories = useCallback(async (data) => {
        setCategories(data);
        persistCategoryPins(data);
        persistSessionCache(data, links, collapsedCats);
        if (supabase && user) {
            // Postgres automatically lowercases unquoted columns in SQL (customIconUrl -> customiconurl)
            const sanitized = data.map(d => ({
                id: d.id, user_id: user.id, order: d.order, name: d.name, icon: d.icon, color: d.color, customiconurl: d.customIconUrl
            }));
            const { error } = await supabase.from('categories').upsert(sanitized);
            if (error) console.error("Categories Sync Error:", error);
        } else {
            localStorage.setItem(CATEGORIES_KEY, JSON.stringify(data));
        }
    }, [collapsedCats, links, persistCategoryPins, persistSessionCache, user]);

    const saveLinks = useCallback(async (data) => {
        setLinks(data);
        persistSessionCache(categories, data, collapsedCats);
        if (supabase && user) {
            const sanitized = data.map(d => ({
                id: d.id, user_id: user.id, categoryid: d.categoryId, order: d.order, title: d.title, url: d.url, pinned: d.pinned, clickcount: d.clickCount, customiconurl: d.customIconUrl
            }));
            const { error } = await supabase.from('links').upsert(sanitized);
            if (error) console.error("Links Sync Error:", error);
        } else {
            localStorage.setItem(LINKS_KEY, JSON.stringify(data));
        }
    }, [categories, collapsedCats, persistSessionCache, user]);

    const saveCollapsed = useCallback((data) => {
        setCollapsedCats(data);
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(data));
        persistSessionCache(categories, links, data);
    }, [categories, links, persistSessionCache]);

    const addCategory = (category) => {
        const maxOrder = categories.reduce((max, c) => Math.max(max, c.order ?? 0), -1);
        const newId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
        const newCategory = { id: newId, order: maxOrder + 1, pinned: false, ...category };
        saveCategories([...categories, newCategory]);
    };

    const updateCategory = (id, updates) => {
        saveCategories(categories.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const deleteCategory = async (id) => {
        const nextCats = categories.filter(c => c.id !== id);
        setCategories(nextCats);
        persistCategoryPins(nextCats);
        if (supabase && user) await supabase.from('categories').delete().eq('id', id);
        else localStorage.setItem(CATEGORIES_KEY, JSON.stringify(nextCats));

        saveLinks(links.filter(l => l.categoryId !== id));
    };

    const deleteCategories = async (ids) => {
        if (!Array.isArray(ids) || ids.length === 0) return;

        const nextCats = categories.filter(c => !ids.includes(c.id));
        const nextLinks = links.filter(l => !ids.includes(l.categoryId));

        setCategories(nextCats);
        setLinks(nextLinks);
        persistCategoryPins(nextCats);
        persistSessionCache(nextCats, nextLinks, collapsedCats);

        if (supabase && user) {
            await supabase.from('categories').delete().in('id', ids);
            await supabase.from('links').delete().in('categoryid', ids);
        } else {
            localStorage.setItem(CATEGORIES_KEY, JSON.stringify(nextCats));
            localStorage.setItem(LINKS_KEY, JSON.stringify(nextLinks));
        }
    };

    const reorderCategories = (newOrder) => {
        const reordered = newOrder.map((id, i) => {
            const cat = categories.find(c => c.id === id);
            return { ...cat, order: i };
        });
        saveCategories(reordered);
    };

    const addLink = (link) => {
        const catLinks = links.filter(l => l.categoryId === link.categoryId);
        const maxOrder = catLinks.reduce((max, l) => Math.max(max, l.order ?? 0), -1);
        const newId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
        const newLink = {
            id: newId,
            clickCount: 0,
            pinned: false,
            order: maxOrder + 1,
            ...link
        };
        saveLinks([...links, newLink]);
    };

    const updateLink = (id, updates) => {
        saveLinks(links.map(l => l.id === id ? { ...l, ...updates } : l));
    };

    const deleteLink = async (id) => {
        const nextLinks = links.filter(l => l.id !== id);
        setLinks(nextLinks);
        if (supabase && user) await supabase.from('links').delete().eq('id', id);
        else localStorage.setItem(LINKS_KEY, JSON.stringify(nextLinks));
    };

    const deleteLinks = async (ids) => {
        const nextLinks = links.filter(l => !ids.includes(l.id));
        setLinks(nextLinks);
        if (supabase && user) await supabase.from('links').delete().in('id', ids);
        else localStorage.setItem(LINKS_KEY, JSON.stringify(nextLinks));
    };

    const moveLinks = (ids, targetCategoryId) => {
        saveLinks(links.map(l => ids.includes(l.id) ? { ...l, categoryId: targetCategoryId } : l));
    };

    const recordClick = (id) => {
        saveLinks(links.map(l => l.id === id ? { ...l, clickCount: (l.clickCount || 0) + 1 } : l));
    };

    const togglePin = (id) => {
        saveLinks(links.map(l => l.id === id ? { ...l, pinned: !l.pinned } : l));
    };

    const toggleCategoryPin = (id) => {
        saveCategories(categories.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));
    };

    const reorderLinks = (categoryId, newOrder) => {
        const reordered = links.map(l => {
            if (l.categoryId === categoryId) {
                const idx = newOrder.indexOf(l.id);
                return { ...l, order: idx >= 0 ? idx : l.order };
            }
            return l;
        });
        saveLinks(reordered);
    };

    const toggleCollapsed = (catId) => {
        const next = { ...collapsedCats, [catId]: !collapsedCats[catId] };
        saveCollapsed(next);
    };

    // Cloud Sync utilities for UI
    const signInWithEmail = async (email) => {
        if (!supabase) {
            alert("Supabase keys are not configured in your environment!");
            return { error: new Error('Keys missing') };
        }
        return await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.origin }
        });
    };

    const signOut = async () => {
        if (supabase) {
            await supabase.auth.signOut();
            setIsLoaded(false); // trigger a re-fetch
        }
    };

    const sortedCategories = [...categories].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (a.order ?? 0) - (b.order ?? 0);
    });

    return {
        user,
        signInWithEmail,
        signOut,
        categories: sortedCategories,
        links,
        collapsedCats,
        isLoaded,
        addCategory,
        updateCategory,
        deleteCategory,
        deleteCategories,
        reorderCategories,
        addLink,
        updateLink,
        deleteLink,
        deleteLinks,
        moveLinks,
        recordClick,
        togglePin,
        toggleCategoryPin,
        reorderLinks,
        toggleCollapsed
    };
}

