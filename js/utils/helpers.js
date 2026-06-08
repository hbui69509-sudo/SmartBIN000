function eid(key) {
    return key.replace(/ /g, "-");
}

function norm(s) {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").trim();
}

function matchKey(className) {
    const raw = className.toLowerCase().trim();

    if (TRASH_DICT[raw]) return raw;
    if (CLASS_ALIASES[raw]) return CLASS_ALIASES[raw];

    for (const k of Object.keys(TRASH_DICT)) {
        if (raw.includes(k)) return k;
    }

    const normalized = norm(raw);
    for (const k of Object.keys(TRASH_DICT)) {
        if (normalized.includes(norm(k))) return k;
    }
    for (const [alias, mapped] of Object.entries(CLASS_ALIASES)) {
        if (normalized.includes(norm(alias))) return mapped;
    }

    return null;
}
