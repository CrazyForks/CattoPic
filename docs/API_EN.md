# CattoPic API Documentation

[中文](./API.md)

## Overview

CattoPic is an image hosting and management service that provides image upload, storage, format conversion, and random retrieval features.

### Basic Information

| Item | Description |
|------|-------------|
| Base URL | `https://your-worker.workers.dev` |
| Authentication | Bearer Token (API Key) |
| Response Format | JSON |
| Encoding | UTF-8 |

### Tech Stack

- **Backend Framework**: Hono (Cloudflare Workers)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (Object Storage)

---

## Authentication

All API requests except public endpoints require an API Key in the header:

```
Authorization: Bearer <your-api-key>
```

### Authentication Failure Response

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**HTTP Status Code**: `401`

---

## Public Endpoints

The following endpoints can be accessed without authentication.

### Get Random Image

Get a random image with support for tag filtering and format conversion.

**Request**

```
GET /api/random
```

**Query Parameters**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `tags` | string | No | Comma-separated tags, image must contain ALL tags | `landscape,nature` |
| `exclude` | string | No | Comma-separated tags to exclude | `blurry,test` |
| `orientation` | string | No | Direction: `landscape` / `portrait` / `auto` | `auto` |
| `format` | string | No | Format: `original` / `webp` / `avif` | `webp` |

**Response**

- **Success**: Returns a 302 redirect to the selected image URL
  - `Location`: final image URL (R2 public URL or `/cdn-cgi/image/...` transformed URL)
  - `Cache-Control`: `no-cache, no-store, must-revalidate`

- **Failure** (no matching image):
```json
{
  "success": false,
  "error": "No images found matching criteria"
}
```

**curl Examples**

```bash
# Get random image
curl "https://your-worker.workers.dev/api/random"

# Get random image with tag filtering
curl "https://your-worker.workers.dev/api/random?tags=nature,outdoor&orientation=landscape"

# Get WebP format
curl "https://your-worker.workers.dev/api/random?format=webp" -o random.webp
```

**Use Case Examples**

```bash
# Use Case 1: Random website background (desktop, landscape)
curl "https://your-worker.workers.dev/api/random?orientation=landscape&format=webp"

# Use Case 2: Mobile wallpaper API (portrait)
curl "https://your-worker.workers.dev/api/random?orientation=portrait&tags=wallpaper"

# Use Case 3: Cat pictures API (exclude NSFW content)
curl "https://your-worker.workers.dev/api/random?tags=cat&exclude=nsfw,private"

# Use Case 4: Nature landscapes (multiple tag combination)
curl "https://your-worker.workers.dev/api/random?tags=nature,landscape&exclude=city"

# Use Case 5: Direct use in HTML img tag
# <img src="https://your-worker.workers.dev/api/random?orientation=auto" />

# Use Case 6: Auto orientation detection (based on User-Agent)
# Mobile devices get portrait images, desktop devices get landscape images
curl -A "Mozilla/5.0 (iPhone)" "https://your-worker.workers.dev/api/random?orientation=auto"
```

---

### Get Image File

Directly retrieve image files from R2 storage.

**Request**

```
GET /r2/{path}
```

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | string | Object path in R2 |

**Response**

- **Success**: Returns image binary data
  - `Cache-Control`: `public, max-age=31536000` (1 year cache)

- **Failure**:
```json
{
  "success": false,
  "error": "Not found"
}
```

**curl Example**

```bash
curl "https://your-worker.workers.dev/r2/images/landscape/550e8400-e29b-41d4-a716-446655440000.jpg" -o image.jpg
```

---

## Image Management Endpoints

### List Images

Get all images with pagination, supports tag and orientation filtering.

**Request**

```
GET /api/images
```

**Headers**

```
Authorization: Bearer <api-key>
```

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 12 | Items per page |
| `tag` | string | - | Filter by tag |
| `orientation` | string | - | `landscape` or `portrait` |
| `format` | string | `all` | `all` / `gif` / `webp` / `avif` / `original` |

**Response**

```json
{
  "success": true,
  "images": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "originalName": "photo.jpg",
      "uploadTime": "2024-12-08T10:30:00Z",
      "expiryTime": null,
      "orientation": "landscape",
      "tags": ["nature", "outdoor"],
      "format": "jpg",
      "width": 1920,
      "height": 1080,
      "paths": {
        "original": "images/landscape/550e8400-e29b-41d4-a716-446655440000.jpg",
        "webp": "images/landscape/550e8400-e29b-41d4-a716-446655440000.webp",
        "avif": "images/landscape/550e8400-e29b-41d4-a716-446655440000.avif"
      },
      "sizes": {
        "original": 245632,
        "webp": 156789,
        "avif": 134567
      },
      "urls": {
        "original": "https://your-worker.workers.dev/r2/images/landscape/550e8400-e29b-41d4-a716-446655440000.jpg",
        "webp": "https://your-worker.workers.dev/r2/images/landscape/550e8400-e29b-41d4-a716-446655440000.webp",
        "avif": "https://your-worker.workers.dev/r2/images/landscape/550e8400-e29b-41d4-a716-446655440000.avif"
      }
    }
  ],
  "page": 1,
  "limit": 12,
  "total": 150,
  "totalPages": 13
}
```

**curl Examples**

```bash
# Get first page
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-worker.workers.dev/api/images?page=1&limit=12"

# Filter by tag
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-worker.workers.dev/api/images?tag=nature&orientation=landscape"
```

---

### Get Image Details

Get detailed information for a specific image.

**Request**

```
GET /api/images/{id}
```

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Image UUID |

**Response**

```json
{
  "success": true,
  "image": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "photo.jpg",
    "uploadTime": "2024-12-08T10:30:00Z",
    "expiryTime": null,
    "orientation": "landscape",
    "tags": ["nature", "outdoor"],
    "format": "jpg",
    "width": 1920,
    "height": 1080,
    "paths": {
      "original": "images/landscape/550e8400-e29b-41d4-a716-446655440000.jpg",
      "webp": "images/landscape/550e8400-e29b-41d4-a716-446655440000.webp",
      "avif": "images/landscape/550e8400-e29b-41d4-a716-446655440000.avif"
    },
    "sizes": {
      "original": 245632,
      "webp": 156789,
      "avif": 134567
    },
    "urls": {
      "original": "https://your-worker.workers.dev/r2/images/...",
      "webp": "https://your-worker.workers.dev/r2/images/...",
      "avif": "https://your-worker.workers.dev/r2/images/..."
    }
  }
}
```

**Error Responses**

```json
{
  "success": false,
  "error": "Invalid image ID"
}
```

```json
{
  "success": false,
  "error": "Image not found"
}
```

**curl Example**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-worker.workers.dev/api/images/550e8400-e29b-41d4-a716-446655440000"
```

---

### Update Image Metadata

Update image tags and expiry time.

**Request**

```
PUT /api/images/{id}
```

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Image UUID |

**Request Body**

```json
{
  "tags": ["nature", "outdoor", "landscape"],
  "expiryMinutes": 1440
}
```

| Field | Type | Description |
|-------|------|-------------|
| `tags` | string[] \| string | New tag list (array or comma-separated string) |
| `expiryMinutes` | number | Expiry time in minutes, `0` to remove expiry |

**Response**

```json
{
  "success": true,
  "image": {
    // Updated image object, same format as get details
  }
}
```

**curl Example**

```bash
curl -X PUT \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tags": ["nature", "outdoor"], "expiryMinutes": 1440}' \
  "https://your-worker.workers.dev/api/images/550e8400-e29b-41d4-a716-446655440000"
```

---

### Delete Image

Delete an image and all its format versions.

**Request**

```
DELETE /api/images/{id}
```

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Image UUID |

**Response**

```json
{
  "success": true,
  "message": "Image deleted"
}
```

**Notes**

Delete operation will:
1. Delete all format versions from R2 (original, webp, avif)
2. Delete metadata record from database
3. Auto-cleanup associated tag relationships

**curl Example**

```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-worker.workers.dev/api/images/550e8400-e29b-41d4-a716-446655440000"
```

---

## Upload Endpoint

### Upload Images

Upload a single image file per request. For multiple files, send multiple requests (the frontend uses concurrent uploads).

**Request**

```
POST /api/upload/single
```

**Headers**

```
Authorization: Bearer <api-key>
Content-Type: multipart/form-data
```

**Request Body (FormData)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` (or `file`) | File | Yes | Image file, max 70MB |
| `tags` | string | No | Comma-separated tags |
| `expiryMinutes` | number | No | Expiry time in minutes, `0` for never expires |

**Upload Limits**

| Limit | Value |
|-------|-------|
| Max file size | 70MB |
| Supported formats | jpeg, jpg, png, gif, webp, avif |

**Response**

```json
{
  "success": true,
  "result": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "success",
    "urls": {
      "original": "https://your-worker.workers.dev/r2/images/landscape/550e8400-e29b-41d4-a716-446655440000.jpg",
      "webp": "https://your-worker.workers.dev/r2/images/landscape/550e8400-e29b-41d4-a716-446655440000.webp",
      "avif": "https://your-worker.workers.dev/r2/images/landscape/550e8400-e29b-41d4-a716-446655440000.avif"
    },
    "orientation": "landscape",
    "tags": ["nature", "outdoor"],
    "sizes": {
      "original": 245632,
      "webp": 156789,
      "avif": 134567
    },
    "expiryTime": "2024-12-15T10:30:00Z"
  }
}
```

**Auto Features**

- Auto-detect image orientation (landscape/portrait)
- Auto-generate WebP and AVIF format versions
- Auto-calculate expiry time

**curl Example**

```bash
# Upload single file
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "image=@photo.jpg" \
  -F "tags=nature,outdoor" \
  "https://your-worker.workers.dev/api/upload/single"
```

---

## Tag Management Endpoints

### List All Tags

Get all tags with their usage counts.

**Request**

```
GET /api/tags
```

**Response**

```json
{
  "success": true,
  "tags": [
    { "name": "nature", "count": 45 },
    { "name": "outdoor", "count": 32 },
    { "name": "landscape", "count": 28 },
    { "name": "portrait", "count": 15 }
  ]
}
```

**curl Example**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-worker.workers.dev/api/tags"
```

---

### Create New Tag

Create a new tag.

**Request**

```
POST /api/tags
```

**Request Body**

```json
{
  "name": "mountain"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Tag name (auto-converted to lowercase, supports Chinese) |

**Tag Naming Rules**

- Auto-converted to lowercase
- Supports Chinese characters
- Allows hyphens (-) and underscores (_)
- Maximum 50 characters
- Auto-trims leading/trailing spaces

**Response**

```json
{
  "success": true,
  "tag": {
    "name": "mountain",
    "count": 0
  }
}
```

**curl Example**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "mountain"}' \
  "https://your-worker.workers.dev/api/tags"
```

---

### Rename Tag

Rename a tag, automatically updates all related images.

**Request**

```
PUT /api/tags/{name}
```

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Original tag name (URL encoded) |

**Request Body**

```json
{
  "newName": "mountains"
}
```

**Response**

```json
{
  "success": true,
  "tag": {
    "name": "mountains",
    "count": 12
  }
}
```

**Error Response**

```json
{
  "success": false,
  "error": "New name must be different from old name"
}
```

**curl Example**

```bash
curl -X PUT \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"newName": "mountains"}' \
  "https://your-worker.workers.dev/api/tags/mountain"
```

---

### Delete Tag

Delete a tag and all associated images.

**Request**

```
DELETE /api/tags/{name}
```

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Tag name (URL encoded) |

**Response**

```json
{
  "success": true,
  "message": "Tag and associated images deleted",
  "deletedImages": 28
}
```

**curl Example**

```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-worker.workers.dev/api/tags/mountain"
```

---

### Batch Update Tags

Batch add or remove tags for multiple images.

**Request**

```
POST /api/tags/batch
```

**Request Body**

```json
{
  "imageIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001"
  ],
  "addTags": ["landscape", "nature"],
  "removeTags": ["test", "draft"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `imageIds` | string[] | Array of image UUIDs |
| `addTags` | string[] | Tags to add |
| `removeTags` | string[] | Tags to remove |

**Response**

```json
{
  "success": true,
  "updatedCount": 2
}
```

**curl Example**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "imageIds": ["550e8400-e29b-41d4-a716-446655440000"],
    "addTags": ["landscape"],
    "removeTags": ["draft"]
  }' \
  "https://your-worker.workers.dev/api/tags/batch"
```

---

## System Endpoints

### Validate API Key

Validate if an API Key is valid.

**Request**

```
POST /api/validate-api-key
```

**Headers**

```
Authorization: Bearer <api-key>
```

**Response**

```json
{
  "success": true,
  "valid": true
}
```

**curl Example**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-worker.workers.dev/api/validate-api-key"
```

---

### Get System Config

Get system configuration (upload limits, supported formats, etc.).

**Request**

```
GET /api/config
```

**Response**

```json
{
  "success": true,
  "config": {
    "maxUploadCount": 50,
    "maxFileSize": 73400320,
    "supportedFormats": ["jpeg", "jpg", "png", "gif", "webp", "avif"],
    "imageQuality": 80
  }
}
```

| Field | Description |
|-------|-------------|
| `maxUploadCount` | Max files per upload |
| `maxFileSize` | Max file size in bytes |
| `supportedFormats` | Supported image formats |
| `imageQuality` | Image conversion quality (1-100) |

**curl Example**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-worker.workers.dev/api/config"
```

---

### Cleanup Expired Images

Delete all expired images.

**Request**

```
POST /api/cleanup
```

**Response**

```json
{
  "success": true,
  "deletedCount": 5
}
```

**Notes**

Cleanup operation will:
1. Query all expired images (`expiry_time < current time`)
2. Delete all format versions from R2
3. Delete metadata records from database

**curl Example**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-worker.workers.dev/api/cleanup"
```

---

## Data Types

### ImageMetadata

Image metadata object.

```typescript
interface ImageMetadata {
  id: string;                           // UUID
  originalName: string;                 // Original filename
  uploadTime: string;                   // Upload time (ISO 8601)
  expiryTime?: string;                  // Expiry time (ISO 8601)
  orientation: 'landscape' | 'portrait'; // Orientation
  tags: string[];                       // Tag array
  format: string;                       // Original format
  width: number;                        // Width (pixels)
  height: number;                       // Height (pixels)
  paths: {
    original: string;                   // Original file R2 path
    webp: string;                       // WebP format R2 path
    avif: string;                       // AVIF format R2 path
  };
  sizes: {
    original: number;                   // Original file size (bytes)
    webp: number;                       // WebP file size (bytes)
    avif: number;                       // AVIF file size (bytes)
  };
  urls?: {
    original: string;                   // Original file URL
    webp: string;                       // WebP URL
    avif: string;                       // AVIF URL
  };
}
```

### UploadResult

Upload result object.

```typescript
interface UploadResult {
  id: string;                           // Image ID on success
  status: 'success' | 'error';          // Status
  urls?: {
    original: string;
    webp: string;
    avif: string;
  };
  orientation?: 'landscape' | 'portrait';
  tags?: string[];
  sizes?: {
    original: number;
    webp: number;
    avif: number;
  };
  expiryTime?: string;
  error?: string;                       // Error message on failure
}
```

### Tag

Tag object.

```typescript
interface Tag {
  name: string;   // Tag name
  count: number;  // Number of images using this tag
}
```

### ApiResponse

Generic API response format.

```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request |
| 401 | Unauthorized (missing or invalid API Key) |
| 404 | Resource Not Found |
| 500 | Internal Server Error |

### Error Response Format

All error responses follow a unified format:

```json
{
  "success": false,
  "error": "Error description message"
}
```

### Common Errors

| Error Message | Description |
|---------------|-------------|
| `Unauthorized` | API Key invalid or missing |
| `Invalid image ID` | Image ID format incorrect (not UUID) |
| `Image not found` | Image does not exist |
| `No images found matching criteria` | No images match the criteria |
| `File exceeds maximum size of 10MB` | File exceeds size limit |
| `Too many files. Maximum is 20` | Upload file count exceeds limit |
| `Tag name is required` | Tag name is empty |
| `New name must be different from old name` | New tag name same as old |

---

## CORS Configuration

All API endpoints have CORS enabled:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

---

## Appendix

### Endpoint Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/random` | GET | No | Get random image |
| `/r2/*` | GET | No | Get image file |
| `/api/images` | GET | Yes | List images |
| `/api/images/:id` | GET | Yes | Get image details |
| `/api/images/:id` | PUT | Yes | Update image metadata |
| `/api/images/:id` | DELETE | Yes | Delete image |
| `/api/upload/single` | POST | Yes | Upload image |
| `/api/tags` | GET | Yes | List all tags |
| `/api/tags` | POST | Yes | Create new tag |
| `/api/tags/:name` | PUT | Yes | Rename tag |
| `/api/tags/:name` | DELETE | Yes | Delete tag |
| `/api/tags/batch` | POST | Yes | Batch update tags |
| `/api/validate-api-key` | POST | Yes | Validate API Key |
| `/api/config` | GET | Yes | Get system config |
| `/api/cleanup` | POST | Yes | Cleanup expired images |

### Frontend Request Examples (JavaScript)

```javascript
const API_URL = 'https://your-worker.workers.dev';
const API_KEY = 'your-api-key';

// Get image list
async function getImages(page = 1, limit = 12) {
  const response = await fetch(`${API_URL}/api/images?page=${page}&limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });
  return response.json();
}

// Upload image
async function uploadImage(file, tags = []) {
  const formData = new FormData();
  formData.append('image', file);
  if (tags.length > 0) {
    formData.append('tags', tags.join(','));
  }

  const response = await fetch(`${API_URL}/api/upload/single`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    },
    body: formData
  });
  return response.json();
}

// Delete image
async function deleteImage(id) {
  const response = await fetch(`${API_URL}/api/images/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });
  return response.json();
}
```
