import hashlib
import re
import unicodedata


def hash_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to only include ASCII characters safe for storage.
    
    Converts Unicode characters to ASCII equivalents where possible,
    removes any remaining non-ASCII characters, and ensures the filename
    is safe for file systems and cloud storage.
    """
    # Normalize unicode characters (e.g., é -> e)
    filename = unicodedata.normalize('NFKD', filename)
    
    # Convert to ASCII, ignoring characters that can't be converted
    filename = filename.encode('ascii', 'ignore').decode('ascii')
    
    # Replace spaces and multiple underscores with single underscore
    filename = re.sub(r'[\s_]+', '_', filename)
    
    # Remove any characters that aren't alphanumeric, dash, underscore, or dot
    filename = re.sub(r'[^a-zA-Z0-9._-]', '', filename)
    
    # Remove leading/trailing underscores or dashes
    filename = filename.strip('_-')
    
    # Ensure we have something left, otherwise use a default
    if not filename or filename == '.':
        filename = 'document'
    
    return filename
