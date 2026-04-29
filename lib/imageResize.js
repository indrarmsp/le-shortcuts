const TARGET_ICON_SIZE = 256;

function loadImageFromSource(source) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = 'async';
        if (!String(source).startsWith('data:')) {
            img.crossOrigin = 'anonymous';
        }
        img.onerror = () => reject(new Error('Failed to load image data.'));
        img.onload = () => resolve(img);
        img.src = String(source);
    });
}

function drawResizedImageToSquareDataUrl(img, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported in this browser.');

    ctx.clearRect(0, 0, size, size);

    const scale = Math.min(size / img.width, size / img.height);
    const drawWidth = Math.round(img.width * scale);
    const drawHeight = Math.round(img.height * scale);
    const x = Math.floor((size - drawWidth) / 2);
    const y = Math.floor((size - drawHeight) / 2);

    // Keep transparent background and fit image within a fixed icon square.
    ctx.drawImage(img, x, y, drawWidth, drawHeight);

    return canvas.toDataURL('image/png');
}

export function resizeImageFileToSquareDataUrl(file, size = TARGET_ICON_SIZE) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type?.startsWith('image/')) {
            reject(new Error('Please provide an image file.'));
            return;
        }

        const reader = new FileReader();

        reader.onerror = () => reject(new Error('Failed to read the selected image.'));
        reader.onload = async () => {
            try {
                const img = await loadImageFromSource(reader.result);
                resolve(drawResizedImageToSquareDataUrl(img, size));
            } catch (error) {
                reject(error);
            }
        };

        reader.readAsDataURL(file);
    });
}

export async function normalizeImageSourceToSquareDataUrl(source, size = TARGET_ICON_SIZE) {
    if (!source) return source;
    const img = await loadImageFromSource(source);
    if (img.width === size && img.height === size && String(source).startsWith('data:image/png')) {
        return source;
    }
    return drawResizedImageToSquareDataUrl(img, size);
}
