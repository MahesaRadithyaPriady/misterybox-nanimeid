# Mystery Box API

Gacha Mystery Box — endpoint untuk membuka box dan mendapatkan reward (koin, super badge, VIP, avatar border) dengan probabilitas berbasis tier.

## Base URL

```
{API_PREFIX}/mystery-box
```

Contoh: http://localhost:3000/2.1.0/mystery-box 

---

## Konsep Utama

### Cara Kerja Mystery Box

```
1. FE dapat URL: http://localhost:3001/mystery-box?code=BASIC_BOX
2. FE baca ?code=BASIC_BOX
3. FE call GET /mystery-box/BASIC_BOX → dapat info box + daftar tier
4. FE call GET /mystery-box/me/wallet → cek saldo user
5. FE call POST /mystery-box/BASIC_BOX/pull → spin & dapat hadiah
6. FE tampilkan hasil reward ke user
```

### Struktur Box → Tier → Reward

```
MysteryBox (code, cost_coins)
  └─ MysteryBoxTier (banyak tier per box)
       ├─ tier_type   → rarity: COMMON, RARE, EPIC, LEGENDARY, MYTHIC
       ├─ weight      → probabilitas (semakin tinggi = semakin sering)
       └─ reward_type → hadiah: COIN, SUPER_BADGE, VIP, AVATAR_BORDER, XP, STICKER
```

### Reward Types

| reward_type   | Hadiah           | Cara Dapat                              |
|-----------------|------------------|-----------------------------------------|
| COIN          | Koin (random)    | Random antara coin_min - coin_max   |
| XP            | XP Level         | Random antara xp_min - xp_max → ditambahkan ke UserXP |
| SUPER_BADGE   | Super Badge      | Grant badge ke user (idempotent)        |
| VIP           | Membership VIP   | Grant VIP dari VipPlan (durasi default atau random range) |
| AVATAR_BORDER | Avatar Border    | Grant border ke user (idempotent)       |
| STICKER       | Stiker           | Grant stiker ke user via UserSticker (idempotent) |

### Tier Types (Rarity)

| tier_type  | Deskripsi           | Typical Weight |
|--------------|---------------------|----------------|
| COMMON     | Paling sering       | 60-80          |
| RARE       | Jarang              | 15-25          |
| EPIC       | Lebih jarang        | 5-10           |
| LEGENDARY  | Sangat jarang       | 1-3            |
| MYTHIC     | Paling langka       | 0.5-1          |

> **Catatan:** weight menentukan probabilitas. Tier dengan weight 70 dari total 100 = 70% kemungkinan.

---

## Models

### MysteryBox

| Field        | Type      | Description                          |
|--------------|-----------|--------------------------------------|
| id           | Int       | Primary key                          |
| code         | String    | Unique code (e.g. BASIC_BOX)       |
| name         | String    | Display name                         |
| description  | String?   | Optional description                 |
| image_url    | String?   | Box image URL                        |
| is_active    | Boolean   | Whether box is available             |
| cost_coins   | Int       | Coin cost per pull                   |
| createdAt    | DateTime  | Creation timestamp                   |
| updatedAt    | DateTime  | Last update timestamp                |

### MysteryBoxTier

| Field        | Type                  | Description                              |
|--------------|-----------------------|------------------------------------------|
| id           | Int                   | Primary key                              |
| box_id       | Int                   | FK to MysteryBox                         |
| tier_type    | MysteryBoxTierType    | COMMON, RARE, EPIC, LEGENDARY, MYTHIC    |
| label        | String                | Display label                            |
| weight       | Int                   | Probability weight (higher = more likely)|
| reward_type  | MysteryBoxRewardType  | COIN, XP, SUPER_BADGE, VIP, AVATAR_BORDER, STICKER |
| coin_min     | Int                   | Min coins (for COIN reward)              |
| coin_max     | Int                   | Max coins (for COIN reward)              |
| xp_min       | Int                   | Min XP (for XP reward)                   |
| xp_max       | Int                   | Max XP (for XP reward)                   |
| badge_id     | Int?                  | FK to Badge (for SUPER_BADGE)            |
| border_id    | Int?                  | FK to AvatarBorder (for AVATAR_BORDER)   |
| sticker_id   | Int?                  | FK to Sticker (for STICKER)              |
| vip_days     | Int?                  | VIP days (auto-filled from VipPlan)      |
| vip_days_min | Int?                  | VIP days min (for random range)          |
| vip_days_max | Int?                  | VIP days max (for random range)          |
| vip_plan_id  | Int?                  | FK to VipPlan (for VIP reward)           |
| image_url    | String?               | Tier image URL                           |
| is_active    | Boolean               | Whether tier is active                   |

### MysteryBoxPull

| Field         | Type                  | Description                              |
|---------------|-----------------------|------------------------------------------|
| id            | Int                   | Primary key                              |
| user_id       | Int                   | FK to User                               |
| box_id        | Int                   | FK to MysteryBox                         |
| tier_id       | Int                   | FK to MysteryBoxTier                     |
| reward_type   | MysteryBoxRewardType  | COIN, XP, SUPER_BADGE, VIP, AVATAR_BORDER, STICKER |
| coins_won     | Int                   | Coins won (for COIN reward)              |
| xp_won        | Int                   | XP won (for XP reward)                   |
| item_granted  | String?               | JSON snapshot of granted item            |
| rolled_at     | DateTime              | When the pull happened                   |

### MysteryBoxPityLog

| Field              | Type      | Description                                      |
|--------------------|-----------|--------------------------------------------------|
| id                 | Int       | Primary key                                      |
| user_id            | Int       | FK to User                                       |
| box_id             | Int       | FK to MysteryBox                                 |
| spin_count         | Int       | Jumlah spin sejak pity terakhir di-reset         |
| pity_threshold     | Int       | Threshold pity (default 90)                      |
| last_pity_tier_id  | Int?      | Tier yang didapat saat pity terakhir triggered   |
| last_pity_at       | DateTime? | Kapan pity terakhir triggered                    |
| createdAt          | DateTime  | Creation timestamp                               |
| updatedAt          | DateTime  | Last update timestamp                            |

> **Unique:** (user_id, box_id) — satu pity log per user per box.

### Enums

```
enum MysteryBoxTierType {
  COMMON
  RARE
  EPIC
  LEGENDARY
  MYTHIC
}

enum MysteryBoxRewardType {
  COIN
  XP
  SUPER_BADGE
  VIP
  AVATAR_BORDER
  STICKER
}
```

---

## Endpoints

### 1. List All Mystery Boxes

```
GET /mystery-box
```

**Auth:** Not required

**Response:**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": 1,
      "code": "BASIC_BOX",
      "name": "Basic Mystery Box",
      "description": "A basic mystery box with mixed rewards",
      "image_url": "https://...",
      "is_active": true,
      "cost_coins": 100,
      "tiers": [
        {
          "id": 1,
          "tier_type": "COMMON",
          "label": "Common Coins",
          "weight": 70,
          "reward_type": "COIN",
          "coin_min": 10,
          "coin_max": 50,
          "badge_id": null,
          "border_id": null,
          "vip_days": null,
          "vip_days_min": null,
          "vip_days_max": null,
          "vip_plan_id": null,
          "image_url": null,
          "badge": null,
          "border": null,
          "vip_plan": null
        },
        {
          "id": 2,
          "tier_type": "EPIC",
          "label": "Epic Border",
          "weight": 8,
          "reward_type": "AVATAR_BORDER",
          "coin_min": 0,
          "coin_max": 0,
          "badge_id": null,
          "border_id": 5,
          "vip_days": null,
          "vip_days_min": null,
          "vip_days_max": null,
          "vip_plan_id": null,
          "image_url": null,
          "badge": null,
          "border": { "id": 5, "code": "GOLD_FRAME", "title": "Gold Frame", "image_url": "https://..." },
          "vip_plan": null
        },
        {
          "id": 3,
          "tier_type": "LEGENDARY",
          "label": "Legendary Badge",
          "weight": 2,
          "reward_type": "SUPER_BADGE",
          "coin_min": 0,
          "coin_max": 0,
          "badge_id": 3,
          "border_id": null,
          "vip_days": null,
          "vip_days_min": null,
          "vip_days_max": null,
          "vip_plan_id": null,
          "image_url": null,
          "badge": { "id": 3, "code": "SSS_BADGE", "name": "SSS Badge", "badge_url": "https://..." },
          "border": null,
          "vip_plan": null
        },
        {
          "id": 4,
          "tier_type": "RARE",
          "label": "Rare VIP Gold 1-5 Days",
          "weight": 15,
          "reward_type": "VIP",
          "coin_min": 0,
          "coin_max": 0,
          "badge_id": null,
          "border_id": null,
          "vip_days": null,
          "vip_days_min": 1,
          "vip_days_max": 5,
          "vip_plan_id": 2,
          "image_url": null,
          "badge": null,
          "border": null,
          "vip_plan": { "id": 2, "name": "Gold", "duration_days": 30, "color": "#FFD700" }
        },
        {
          "id": 5,
          "tier_type": "MYTHIC",
          "label": "Mythic VIP Gold 30 Days",
          "weight": 1,
          "reward_type": "VIP",
          "coin_min": 0,
          "coin_max": 0,
          "badge_id": null,
          "border_id": null,
          "vip_days": 30,
          "vip_days_min": null,
          "vip_days_max": null,
          "vip_plan_id": 2,
          "image_url": null,
          "badge": null,
          "border": null,
          "vip_plan": { "id": 2, "name": "Gold", "duration_days": 30, "color": "#FFD700" }
        }
      ],
      "_count": { "pulls": 1234 }
    }
  ]
}
```

---

### 2. Get Mystery Box by Code

```
GET /mystery-box/:code
```

**Auth:** Not required

**Response:** Same as single item from list above.

**Contoh:**

```
GET /mystery-box/BASIC_BOX
```

---

### 3. Get My Wallet Balance

```
GET /mystery-box/me/wallet
```

**Auth:** Required

**Response:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "balance_coins": 1500
  }
}
```

---

### 4. Pull (Open) Mystery Box

```
POST /mystery-box/:code/pull
```

**Auth:** Required

**Body:**

```json
{
  "count": 1
}
```

| Parameter | Type | Default | Description                     |
|-----------|------|---------|---------------------------------|
| count     | Int  | 1       | Number of pulls (max 10)        |

**Contoh:**

```
POST /mystery-box/BASIC_BOX/pull
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "count": 1
}
```

---

### 4b. 10x Spin Mystery Box

```
POST /mystery-box/:code/pull10
```

**Auth:** Required

Setiap **10 spin** (baik 1x spin 10 kali maupun 10x langsung) mendapat **guaranteed deterministic drop**:

- **1 slot EPIC** (dipilih random dari tier EPIC box)
- **1 slot random non-common** (dipilih dari RARE/LEGENDARY/MYTHIC berdasarkan bobot + kriteria reduksi)
  - LEGENDARY/MYTHIC weight dikali multiplier pity progressif
  - Border > 10 atau koin > 500K mengurangi LEGENDARY+ lagi
  - VIP aktif mengurangi VIP reward weight 90%
  - Jika tidak ada non-common tersedia, fallback ke RARE tier
- **8 slot COMMON / koin** (dipilih random dari tier COMMON/COIN)
- Posisi EPIC dan random non-common dipilih random di awal setiap siklus 10 spin
- **Fallback ke COMMON:** jika tier target tidak tersedia, slot menjadi COMMON
- Pity system tetap berlaku: jika spin ke-90 jatuh di dalam siklus, dipaksa menjadi LEGENDARY/MYTHIC dan counter reset

**Contoh:**

```
POST /mystery-box/BASIC_BOX/pull10
Authorization: Bearer <access_token>
```

**Response:** Sama seperti pull dengan count: 10, tapi dengan dedup rules diterapkan.

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "box": { "id": 1, "code": "BASIC_BOX", "name": "Basic Mystery Box" },
    "pulls": [
      { "pull_id": 501, "tier": { "id": 1, "tier_type": "COMMON", "label": "Common Coins", "image_url": null }, "reward": { "type": "COIN", "coins": 50 }, "is_pity": false },
      { "pull_id": 502, "tier": { "id": 2, "tier_type": "RARE", "label": "Rare Coins", "image_url": null }, "reward": { "type": "COIN", "coins": 100 }, "is_pity": false },
      { "pull_id": 503, "tier": { "id": 4, "tier_type": "EPIC", "label": "Epic Border", "image_url": null }, "reward": { "type": "AVATAR_BORDER", "id": 5, "name": "Gold Frame", "image_url": "https://...", "already_owned": false }, "is_pity": false },
      { "pull_id": 504, "tier": { "id": 1, "tier_type": "COMMON", "label": "Common Coins", "image_url": null }, "reward": { "type": "COIN", "coins": 30 }, "is_pity": false },
      { "pull_id": 505, "tier": { "id": 1, "tier_type": "COMMON", "label": "Common Coins", "image_url": null }, "reward": { "type": "COIN", "coins": 45 }, "is_pity": false },
      { "pull_id": 506, "tier": { "id": 2, "tier_type": "RARE", "label": "Rare Coins", "image_url": null }, "reward": { "type": "COIN", "coins": 80 }, "is_pity": false },
      { "pull_id": 507, "tier": { "id": 1, "tier_type": "COMMON", "label": "Common Coins", "image_url": null }, "reward": { "type": "COIN", "coins": 20 }, "is_pity": false },
      { "pull_id": 508, "tier": { "id": 1, "tier_type": "COMMON", "label": "Common Coins", "image_url": null }, "reward": { "type": "COIN", "coins": 50 }, "is_pity": false },
      { "pull_id": 509, "tier": { "id": 2, "tier_type": "RARE", "label": "Rare VIP Gold", "image_url": null }, "reward": { "type": "VIP", "vip_days": 3, "plan_name": "Gold", "plan_color": "#FFD700", "end_at": "2026-06-30T14:00:00.000Z", "already_owned": false }, "is_pity": false },
      { "pull_id": 510, "tier": { "id": 1, "tier_type": "COMMON", "label": "Common Coins", "image_url": null }, "reward": { "type": "COIN", "coins": 40 }, "is_pity": false }
    ],
    "total_coins_won": 415,
    "total_xp_won": 0,
    "total_cost": 1000,
    "net_coins": -585,
    "wallet_balance": 9415,
    "pull_count": 10,
    "pity": {
      "spin_count": 10,
      "threshold": 90,
      "remaining": 80,
      "triggered": false
    }
  }
}
```

> **Dedup Rules di 10x Spin:**
> - EPIC item hanya muncul 1x (pull ke-3 di contoh di atas)
> - LEGENDARY/MYTHIC tidak akan muncul 2x dalam sesi yang sama
> - Jika semua item langka sudah didapat, sisa spin → COIN (fallback)
> - pull_count: 10 di response menandakan ini sesi 10x spin

#### Response: COIN Reward

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "box": { "id": 1, "code": "BASIC_BOX", "name": "Basic Mystery Box" },
    "pulls": [
      {
        "pull_id": 100,
        "tier": { "id": 1, "tier_type": "COMMON", "label": "Common Coins", "image_url": null },
        "reward": { "type": "COIN", "coins": 45 }
      }
    ],
    "total_coins_won": 45,
    "total_cost": 100,
    "net_coins": -55,
    "wallet_balance": 1455
  }
}
```

#### Response: SUPER_BADGE Reward

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "box": { "id": 1, "code": "BASIC_BOX", "name": "Basic Mystery Box" },
    "pulls": [
      {
        "pull_id": 101,
        "tier": { "id": 3, "tier_type": "LEGENDARY", "label": "Legendary Badge", "image_url": null },
        "reward": {
          "type": "SUPER_BADGE",
          "id": 3,
          "name": "SSS Badge",
          "image_url": "https://...",
          "already_owned": false
        }
      }
    ],
    "total_coins_won": 0,
    "total_cost": 100,
    "net_coins": -100,
    "wallet_balance": 1355
  }
}
```

#### Response: SUPER_BADGE Reward (already owned → converted to 5000 coins)

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "box": { "id": 1, "code": "BASIC_BOX", "name": "Basic Mystery Box" },
    "pulls": [
      {
        "pull_id": 101b,
        "tier": { "id": 3, "tier_type": "LEGENDARY", "label": "Legendary Badge", "image_url": null },
        "reward": {
          "type": "SUPER_BADGE",
          "id": 3,
          "name": "SSS Badge",
          "image_url": "https://...",
          "already_owned": true,
          "converted_to_coins": 5000
        }
      }
    ],
    "total_coins_won": 5000,
    "total_cost": 100,
    "net_coins": 4900,
    "wallet_balance": 6355
  }
}
```

> **Badge duplikat:** Jika user sudah punya badge tersebut, tidak di-grant ulang. Dikonversi menjadi **5000 koin**.

#### Response: AVATAR_BORDER Reward

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "box": { "id": 1, "code": "BASIC_BOX", "name": "Basic Mystery Box" },
    "pulls": [
      {
        "pull_id": 102,
        "tier": { "id": 2, "tier_type": "EPIC", "label": "Epic Border", "image_url": null },
        "reward": {
          "type": "AVATAR_BORDER",
          "id": 5,
          "name": "Gold Frame",
          "image_url": "https://...",
          "already_owned": false
        }
      }
    ],
    "total_coins_won": 0,
    "total_cost": 100,
    "net_coins": -100,
    "wallet_balance": 1255
  }
}
```

#### Response: VIP Reward (default duration from plan)

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "box": { "id": 1, "code": "BASIC_BOX", "name": "Basic Mystery Box" },
    "pulls": [
      {
        "pull_id": 103,
        "tier": { "id": 5, "tier_type": "MYTHIC", "label": "Mythic VIP Gold 30 Days", "image_url": null },
        "reward": {
          "type": "VIP",
          "vip_days": 30,
          "plan_name": "Gold",
          "plan_color": "#FFD700",
          "end_at": "2026-07-27T14:00:00.000Z",
          "already_owned": false
        }
      }
    ],
    "total_coins_won": 0,
    "total_cost": 100,
    "net_coins": -100,
    "wallet_balance": 1155
  }
}
```

#### Response: VIP Reward (random range, e.g. 1-5 days)

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "box": { "id": 1, "code": "BASIC_BOX", "name": "Basic Mystery Box" },
    "pulls": [
      {
        "pull_id": 104,
        "tier": { "id": 4, "tier_type": "RARE", "label": "Rare VIP Gold 1-5 Days", "image_url": null },
        "reward": {
          "type": "VIP",
          "vip_days": 3,
          "plan_name": "Gold",
          "plan_color": "#FFD700",
          "end_at": "2026-06-30T14:00:00.000Z",
          "already_owned": false
        }
      }
    ],
    "total_coins_won": 0,
    "total_cost": 100,
    "net_coins": -100,
    "wallet_balance": 1055
  }
}
```

> **Catatan VIP:** vip_days bisa fixed (dari duration_days VipPlan) atau random (dari vip_days_min + vip_days_max). plan_name dan plan_color selalu ada untuk VIP reward.

#### Response: VIP Reward (user already has VIP — duration = remaining / 2)

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "box": { "id": 1, "code": "BASIC_BOX", "name": "Basic Mystery Box" },
    "pulls": [
      {
        "pull_id": 105,
        "tier": { "id": 5, "tier_type": "MYTHIC", "label": "Mythic VIP Master", "image_url": null },
        "reward": {
          "type": "VIP",
          "vip_days": 25,
          "plan_name": "Master",
          "plan_color": "#FF0000",
          "end_at": "2026-07-22T14:00:00.000Z",
          "already_owned": true
        }
      }
    ],
    "total_coins_won": 0,
    "total_cost": 100,
    "net_coins": -100,
    "wallet_balance": 955,
    "pity": {
      "spin_count": 0,
      "threshold": 90,
      "remaining": 90,
      "triggered": false
    }
  }
}
```

> **Sudah VIP:** Jika user sudah punya VIP aktif (mis. Gold sisa 50 hari), dan dapat VIP Master → durasi = 50 / 2 = 25 hari. VIP level upgrade ke Master. already_owned: true. Peluang dapat VIP juga 90% lebih kecil karena weight reduction.

#### Response: Multi-pull (count=2, mixed rewards)

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "box": { "id": 1, "code": "BASIC_BOX", "name": "Basic Mystery Box" },
    "pulls": [
      {
        "pull_id": 200,
        "tier": { "id": 1, "tier_type": "COMMON", "label": "Common Coins", "image_url": null },
        "reward": { "type": "COIN", "coins": 45 }
      },
      {
        "pull_id": 201,
        "tier": { "id": 4, "tier_type": "RARE", "label": "Rare VIP Gold 1-5 Days", "image_url": null },
        "reward": {
          "type": "VIP",
          "vip_days": 2,
          "plan_name": "Gold",
          "plan_color": "#FFD700",
          "end_at": "2026-06-29T14:00:00.000Z",
          "already_owned": false
        }
      }
    ],
    "total_coins_won": 45,
    "total_cost": 200,
    "net_coins": -155,
    "wallet_balance": 900
  }
}
```

#### Response: Pity Triggered (90 spins → auto LEGENDARY+)

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "box": { "id": 1, "code": "BASIC_BOX", "name": "Basic Mystery Box" },
    "pulls": [
      {
        "pull_id": 300,
        "tier": { "id": 3, "tier_type": "LEGENDARY", "label": "Legendary Badge", "image_url": null },
        "reward": {
          "type": "SUPER_BADGE",
          "id": 3,
          "name": "SSS Badge",
          "image_url": "https://...",
          "already_owned": false,
          "pity": true
        },
        "is_pity": true
      }
    ],
    "total_coins_won": 0,
    "total_cost": 100,
    "net_coins": -100,
    "wallet_balance": 955,
    "pity": {
      "spin_count": 0,
      "threshold": 90,
      "remaining": 90,
      "triggered": true
    }
  }
}
```

> **Pity System:** Setiap 90 spin (per box), user **dijamin** dapat tier LEGENDARY atau MYTHIC. Counter reset setelah pity triggered, atau jika user dapat LEGENDARY+ secara natural.

#### Reward Field Reference

| reward.type     | Field                                                   | Description |
|-------------------|---------------------------------------------------------|-------------|
| COIN            | coins                                                 | Jumlah koin yang dimenangkan |
| XP              | xp, level, progress                               | Jumlah XP yang didapat. level berisi level saat ini, progress berisi persentase ke level berikutnya |
| SUPER_BADGE     | id, name, image_url, already_owned, converted_to_coins | Badge info. Jika already_owned=true → dikonversi 5000 koin (converted_to_coins: 5000) |
| AVATAR_BORDER   | id, name, image_url, already_owned              | Border info. already_owned=true jika user sudah punya |
| STICKER         | id, name, image_url, already_owned              | Stiker info. already_owned=true jika user sudah punya |
| VIP             | vip_days, plan_name, plan_color, end_at, already_owned | VIP info. vip_days bisa fixed atau random |
| * (any)         | pity                                                 | true jika reward ini dari pity system (guaranteed LEGENDARY+) |

#### Errors

| Status | Message                              |
|--------|--------------------------------------|
| 401    | Unauthorized                         |
| 404    | Mystery Box tidak ditemukan          |
| 400    | Mystery Box tidak aktif              |
| 400    | Mystery Box tidak memiliki tier      |
| 400    | Saldo koin tidak cukup               |
| 400    | Badge tidak ditemukan                |
| 400    | Avatar border tidak ditemukan        |
| 400    | vip_days tidak valid                 |

---

### 5. Get My Pull History

```
GET /mystery-box/me/history?page=1&limit=20
```

**Auth:** Required

**Response:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "items": [
      {
        "id": 101,
        "user_id": 1702,
        "box_id": 1,
        "tier_id": 3,
        "reward_type": "SUPER_BADGE",
        "coins_won": 0,
        "item_granted": {
          "type": "SUPER_BADGE",
          "id": 3,
          "name": "SSS Badge",
          "image_url": "https://...",
          "already_owned": false
        },
        "rolled_at": "2026-06-26T14:00:00.000Z",
        "box": { "id": 1, "code": "BASIC_BOX", "name": "Basic Mystery Box", "image_url": null },
        "tier": { "id": 3, "tier_type": "LEGENDARY", "label": "Legendary Badge", "image_url": null, "reward_type": "SUPER_BADGE" }
      },
      {
        "id": 102,
        "user_id": 1702,
        "box_id": 1,
        "tier_id": 4,
        "reward_type": "VIP",
        "coins_won": 0,
        "item_granted": {
          "type": "VIP",
          "vip_days": 3,
          "plan_name": "Gold",
          "plan_color": "#FFD700",
          "end_at": "2026-06-30T14:00:00.000Z",
          "already_owned": false
        },
        "rolled_at": "2026-06-27T14:00:00.000Z",
        "box": { "id": 1, "code": "BASIC_BOX", "name": "Basic Mystery Box", "image_url": null },
        "tier": { "id": 4, "tier_type": "RARE", "label": "Rare VIP Gold 1-5 Days", "image_url": null, "reward_type": "VIP" }
      }
    ]
  }
}
```

---

### 6. Get My Stats

```
GET /mystery-box/me/stats
```

**Auth:** Required

**Response:**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "total_pulls": 50,
    "total_coins_won": 3500,
    "tier_breakdown": [
      { "id": 1, "tier_type": "COMMON", "label": "Common Coins", "image_url": null, "count": 35, "total_coins": 1200 },
      { "id": 2, "tier_type": "RARE", "label": "Rare VIP Gold 1-5 Days", "image_url": null, "count": 10, "total_coins": 0 },
      { "id": 3, "tier_type": "LEGENDARY", "label": "Legendary Badge", "image_url": null, "count": 1, "total_coins": 0 }
    ],
    "reward_breakdown": [
      { "reward_type": "COIN", "count": 38 },
      { "reward_type": "SUPER_BADGE", "count": 1 },
      { "reward_type": "AVATAR_BORDER", "count": 1 },
      { "reward_type": "VIP", "count": 10 }
    ]
  }
}
```

---

### 7. Get My Pity Info

```
GET /mystery-box/me/pity
```

**Auth:** Required

Cek progress pity counter per box. User bisa lihat berapa spin lagi sampai guaranteed LEGENDARY+.

**Response:**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "box": { "id": 1, "code": "BASIC_BOX", "name": "Basic Mystery Box", "image_url": "https://..." },
      "spin_count": 87,
      "threshold": 90,
      "remaining": 3,
      "last_pity_at": "2026-06-20T14:00:00.000Z"
    },
    {
      "box": { "id": 2, "code": "EVENT_BOX_2026", "name": "Event Box 2026", "image_url": null },
      "spin_count": 15,
      "threshold": 90,
      "remaining": 75,
      "last_pity_at": null
    }
  ]
}
```

> **Field:**
> - spin_count — jumlah spin sejak pity terakhir di-reset
> - threshold — target spin untuk pity (default 90)
> - remaining — berapa spin lagi sampai pity triggered
> - last_pity_at — kapan pity terakhir triggered (null jika belum pernah)

---

## Pity System

### Cara Kerja Pity

```
1. Setiap pull (per box) → spin_count +1
2. Progressive weight reduction untuk LEGENDARY+ tiers:
   - spin_count < 50  → LEGENDARY+ weight × 0.05 (dikurangi 95%)
   - spin_count >= 50 → LEGENDARY+ weight × 0.50 (dikurangi 50%)
3. Jika spin_count >= 90 → PITY TRIGGERED:
   - User dijamin dapat tier LEGENDARY atau MYTHIC (random berdasarkan weight)
   - spin_count reset ke 0
   - last_pity_at = now
4. Jika user dapat LEGENDARY+ secara natural (sebelum 90 spin):
   - spin_count reset ke 0 (tidak perlu tunggu 90)
5. Pity counter terpisah per box (spin di BASIC_BOX tidak affect EVENT_BOX)
```

> **Progressive Pity:** Semakin banyak spin tanpa LEGENDARY+, semakin tinggi peluang:
> - **Spin 1-49:** LEGENDARY+ sangat langka (weight dikali 0.05)
> - **Spin 50-89:** LEGENDARY+ lebih sering (weight dikali 0.50)
> - **Spin 90:** LEGENDARY+ dijamin (pity triggered)
>
> **Extra Reduction (stackable):**
> - Koleksi border > 10 → LEGENDARY+ weight dikali 0.50 lagi
> - Saldo koin > 500,000 → LEGENDARY+ weight dikali 0.50 lagi

### Pity di Pull Response

Setiap response pull sekarang include pity object:

```json
"pity": {
  "spin_count": 87,
  "threshold": 90,
  "remaining": 3,
  "triggered": false
}
```

- spin_count — spin saat ini setelah pull ini
- threshold — 90
- remaining — spin lagi sampai pity
- triggered — true jika pity terjadi pada pull ini

Jika pity triggered, pull yang ke-90 akan punya is_pity: true dan reward akan include pity: true.

### FE Integration untuk Pity

1. **Tampilkan pity counter** — setelah pull, baca data.pity.remaining → tampilkan "3 spin lagi untuk guaranteed LEGENDARY!"
2. **Highlight pity reward** — jika pulls[].is_pity === true → tampilkan animasi khusus / badge "GUARANTEED"
3. **Cek pity sebelum spin** — GET /mystery-box/me/pity → tampilkan progress bar pity per box

---

## How It Works

### 1. Weighted Random Selection

Each tier has a weight value. When a user pulls, a random number is generated and tiers are selected based on their weight proportion.

**Contoh:** 3 tier dengan weight 70, 20, 10 (total 100):
- Tier A: 70% kemungkinan
- Tier B: 20% kemungkinan
- Tier C: 10% kemungkinan

### 2. Reward Processing

- **COIN:** Random amount between coin_min and coin_max (inclusive) → credited to wallet.
- **XP:** Random amount between xp_min and xp_max (inclusive) → ditambahkan ke UserXP dan level di-update otomatis. Response mengembalikan level dan progress.
- **SUPER_BADGE:** Badge granted to user via UserSuperBadge. Jika sudah dimiliki → dikonversi **5000 koin** (converted_to_coins: 5000, already_owned: true).
- **AVATAR_BORDER:** Border granted to user via UserAvatarBorder. Idempotent — if already owned, returns already_owned: true.
- **STICKER:** Stiker granted to user via UserSticker. Idempotent — if already owned, returns already_owned: true.
- **VIP:** VIP membership granted dari VipPlan yang dipilih admin.
  - **User belum VIP:** durasi pakai vip_days (dari duration_days VipPlan) atau random range (vip_days_min + vip_days_max).
  - **User sudah VIP:** durasi = sisa hari VIP saat ini ÷ 2 (min 1 hari). VIP level upgrade ke plan baru (mis. Gold → Master). already_owned: true.
  - plan_name dan plan_color selalu di-include dari VipPlan.
  - **Weight reduction:** jika user sudah VIP aktif, weight tier VIP dikali 0.10 (dikurangi 90%) → peluang dapat VIP jauh lebih kecil.

### 3. Cost Deduction

cost_coins dari MysteryBox dikurangi dari wallet user sebelum pull. Jika saldo tidak cukup, pull gagal.

### 4. Audit Trail

Setiap pull dicatat di MysteryBoxPull dengan tier, reward type, coins won, xp won, dan JSON snapshot granted item. Coin transactions juga dicatat di CoinTransaction.

### 4a. COMMON Slot Behavior

Slot COMMON dalam 10-spin cycle bisa berisi:
- **COIN** — koin random coin_min - coin_max 
- **XP** — XP random xp_min - xp_max 

Keduanya dipilih secara weighted random dari tier dengan tier_type = COMMON dan reward_type = COIN atau XP. Jika tidak ada tier COMMON, fallback ke tier mana pun dengan reward_type COIN atau XP. Tier RARE/EPIC/LEGENDARY/MYTHIC tidak akan pernah muncul di slot COMMON.

### 5. VIP Reward Logic

**User belum punya VIP (atau expired):**
- start_at = now
- end_at = now + vip_days (dari plan atau random range)
- vip_level = plan name (mis. "Gold", "Master")
- already_owned = false

**User sudah punya VIP aktif:**
- Durasi = sisa hari VIP saat ini ÷ 2 (min 1 hari)
  - Contoh: sisa 50 hari → dapat 25 hari VIP Master
- start_at = now (reset, bukan extend)
- end_at = now + (sisa_hari / 2)
- vip_level = plan name baru (upgrade, mis. Gold → Master)
- already_owned = true
- **Weight reduction:** tier VIP weight dikali 0.10 (90% lebih kecil) → peluang dapat VIP saat sudah VIP jauh lebih kecil

### 6. Pity System (Guaranteed LEGENDARY+)

- Setiap 90 spin per box, user **dijamin** dapat tier LEGENDARY atau MYTHIC.
- **Progressive weight reduction:**
  - Spin 1-49: LEGENDARY+ weight dikali 0.05 (95% lebih kecil)
  - Spin 50-89: LEGENDARY+ weight dikali 0.50 (50% lebih kecil)
  - Spin 90: guaranteed LEGENDARY+ (pity triggered)
- **Extra reduction (stackable):**
  - Koleksi border > 10 → LEGENDARY+ weight dikali 0.50 lagi
  - Saldo koin > 500,000 → LEGENDARY+ weight dikali 0.50 lagi
  - Contoh: spin 50 + 15 borders + 600K koin → multiplier = 0.50 × 0.50 × 0.50 = 0.125 (87.5% lebih kecil)
- Counter reset setelah pity triggered, atau jika user dapat LEGENDARY+ secara natural.
- Pity counter terpisah per box.
- Pity tier dipilih random dari pool LEGENDARY + MYTHIC (berdasarkan weight).

### 7. Super Badge Coin Conversion

Jika user sudah memiliki super badge yang didapat dari Mystery Box:
- Badge **tidak di-grant ulang** (no duplicate)
- Dikonversi menjadi **5000 koin** → dikredit ke wallet
- Response: already_owned: true, converted_to_coins: 5000 

### 8. 10x Spin Dedup Rules

Backend menyimpan **10-spin cycle** per user per box (MysteryBoxPityLog):

- Setiap spin (baik count: 1 maupun count: 10) menaikkan ten_spin_count 
- Saat ten_spin_count kembali ke 0, sistem generate 2 posisi random untuk siklus baru:
  - **1 posisi EPIC**
  - **1 posisi random non-common** (RARE/LEGENDARY/MYTHIC)
- Posisi lain di siklus tersebut = COMMON / koin
- Jadi setiap 10 spin (apapun caranya) menghasilkan: **1 EPIC + 1 random non-common + 8 COMMON**
- Random non-common dipilih berdasarkan bobot + kriteria reduksi (pity, border, koin, VIP)
- **LEGENDARY/MYTHIC masih mungkin** muncul di 10x cycle melalui random non-common slot, tapi sangat kecil kemungkinannya
- **Fallback ke COMMON / RARE:** jika non-common tidak tersedia, fallback ke RARE tier; jika RARE tidak ada, jadi COMMON
- Tier / item spesifik yang sudah didapat tidak akan muncul 2x dalam 1 siklus (no duplicate)
- Pity system tetap berlaku: jika spin ke-90 jatuh di dalam siklus, dipaksa menjadi LEGENDARY/MYTHIC
- **10x spin** akan reset cycle dan selalu menghasilkan 1 siklus penuh (1 EPIC + 1 random non-common + 8 COMMON)

> **Contoh hasil yang tidak mungkin lagi:** Dapat >2 non-common item dalam 10 spin. Sekarang setiap 10 spin = 1 EPIC + 1 random non-common + 8 COMMON.

---

## FE Integration Guide

### Step-by-step

1. **Baca ?code= dari URL** — FE dapat URL seperti http://localhost:3001/mystery-box?code=BASIC_BOX 
2. **Ambil detail box** — GET /mystery-box/BASIC_BOX → dapat info box + tiers
3. **Tampilkan info box** — nama, image, cost_coins, daftar tier dengan reward type
4. **Cek saldo user** — GET /mystery-box/me/wallet → tampilkan balance
5. **Spin/pull** — POST /mystery-box/BASIC_BOX/pull dengan body { "count": 1 } 
6. **Tampilkan hasil** — baca pulls[].reward:

| reward.type     | Tampilkan apa                                      |
|-------------------|----------------------------------------------------|
| COIN            | Jumlah koin: reward.coins                        |
| SUPER_BADGE     | Badge: reward.name, reward.image_url. Cek already_owned — jika true, tampilkan "Badge sudah dimiliki, dikonversi 5000 koin" (reward.converted_to_coins) |
| AVATAR_BORDER   | Border: reward.name, reward.image_url. Cek already_owned |
| VIP             | VIP: reward.plan_name, reward.plan_color, reward.vip_days hari sampai reward.end_at. Cek already_owned — jika true, user sudah VIP dan durasi = sisa hari / 2 (upgrade plan) |
| * (pity)        | Jika reward.pity === true → tampilkan badge "GUARANTEED LEGENDARY+" |

### Contoh UI per Reward

**COIN:**
```
Anda mendapatkan 45 koin!
```

**SUPER_BADGE (already_owned=false):**
```
Anda mendapatkan badge: SSS Badge!
[badge image]
```

**SUPER_BADGE (already_owned=true, converted to coins):**
```
Badge SSS Badge sudah Anda miliki.
Dikonversi menjadi 5000 koin!
```

**VIP (default 30 days):**
```
Anda mendapatkan VIP Gold (30 hari)!
Aktif sampai: 27 Juli 2026
```

**VIP (random 3 days from 1-5 range):**
```
Anda mendapatkan VIP Gold (3 hari)!
Aktif sampai: 30 Juni 2026
```

**VIP (already_owned=true, upgrade from Gold to Master):**
```
VIP Anda di-upgrade ke Master!
Durasi: 25 hari (dari sisa 50 hari Gold Anda)
Aktif sampai: 22 Juli 2026
```

---

## Authentication

Semua endpoint yang membutuhkan auth menggunakan **JWT Bearer Token**.

### Token Types

| Token         | Secret          | Expiry | Description                        |
|---------------|-----------------|--------|------------------------------------|
| Access Token  | JWT_SECRET    | 7d     | Digunakan untuk akses API          |
| Refresh Token | REFRESH_SECRET| 7d     | Digunakan untuk generate access token baru |

### Login

```
POST /auth/login
```

**Response:**

```json
{
  "message": "Login success",
  "status": 200,
  "token": "<access_token>",
  "refreshToken": "<refresh_token>",
  "user": { ... }
}
```

Kedua token juga disimpan di HTTP-only cookies (token dan refresh_token).

### Refresh Token

```
POST /auth/refresh-token
```

**Body (opsional jika ada cookie):**

```json
{
  "refreshToken": "<refresh_token>"
}
```

**Response:**

```json
{
  "message": "Token refreshed successfully",
  "status": 200,
  "token": "<new_access_token>",
  "user": { ... }
}
```

**Mekanisme:**

1. Client kirim refresh token (dari body atau cookie refresh_token)
2. Server verify JWT signature dengan REFRESH_SECRET 
3. Server cek token type harus refresh 
4. Server cek token ada di database (Authenticate table)
5. Server generate access token baru dengan JWT_SECRET, preserve fingerprint_hash 
6. Server update access token di database
7. Return access token baru + user data

**Catatan:**
- Refresh token **tidak diperpanjang** saat refresh — hanya access token yang di-generate ulang
- Refresh token tetap valid sampai expired (7 hari) atau user logout
- Validasi 2 lapis: JWT signature + database lookup
- fingerprint_hash di-preserve untuk device binding

### Logout

```
POST /auth/logout
```

**Auth:** Required (Bearer token)

Set access_token dan refresh_token ke null di database + clear cookies.

### Cara Pakai Token di Mystery Box

```
GET /mystery-box/me/wallet
Authorization: Bearer <access_token>
```

```
POST /mystery-box/BASIC_BOX/pull
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "count": 1
}
```

Jika access token expired (401 response), gunakan refresh token untuk dapat access token baru:

```
POST /auth/refresh-token
```

Lalu retry request dengan access token baru.

---

## Summary Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | /mystery-box | No | List all active boxes + tiers |
| GET    | /mystery-box/:code | No | Get box by code + tiers |
| GET    | /mystery-box/me/wallet | Yes | Get user coin balance |
| POST   | /mystery-box/:code/pull | Yes | Pull/spin box (max 10x) |
| POST   | /mystery-box/:code/pull10 | Yes | 10x spin with dedup rules (no rare dup, EPIC max 1x) |
| GET    | /mystery-box/me/history | Yes | Get pull history (paginated) |
| GET    | /mystery-box/me/stats | Yes | Get pull stats |
| GET    | /mystery-box/me/pity | Yes | Get pity progress per box |

