import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boxCode = searchParams.get("code") || "BASIC_BOX";
  const customTitle = searchParams.get("title");
  const customSubtitle = searchParams.get("subtitle");

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:3000/2.1.0/mystery-box";

  type TierType = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";
  type RewardType = "COIN" | "XP" | "SUPER_BADGE" | "VIP" | "AVATAR_BORDER" | "STICKER";

  interface Tier {
    id: number;
    tier_type: TierType;
    label: string;
    weight: number;
    reward_type: RewardType;
    coin_min: number;
    coin_max: number;
    xp_min: number;
    xp_max: number;
    image_url: string | null;
    badge: { id: number; code: string; name: string; badge_url: string } | null;
    border: { id: number; code: string; title: string; image_url: string } | null;
    vip_plan: { id: number; name: string; duration_days: number; color: string } | null;
  }

  interface BoxData {
    id: number;
    code: string;
    name: string;
    description: string | null;
    image_url: string | null;
    cost_coins: number;
    tiers: Tier[];
  }

  let boxData: BoxData | null = null;

  try {
    const res = await fetch(`${API_BASE}/${boxCode}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.success) boxData = json.data as BoxData;
    }
  } catch {
    // fallback to defaults below
  }

  const boxName = boxData?.name || boxCode.replace(/_/g, " ");
  const title = customTitle || boxName;
  const subtitle =
    customSubtitle ||
    boxData?.description ||
    "Buka kotak misterius dan menangkan hadiah epik!";
  const costCoins = boxData?.cost_coins ?? 100;
  const tiers = boxData?.tiers ?? [];

  const tierColors: Record<TierType, string> = {
    COMMON: "#94a3b8",
    RARE: "#3b82f6",
    EPIC: "#a855f7",
    LEGENDARY: "#f97316",
    MYTHIC: "#ec4899",
  };

  const tierBg: Record<TierType, string> = {
    COMMON: "linear-gradient(135deg, #475569 0%, #334155 100%)",
    RARE: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    EPIC: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)",
    LEGENDARY: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
    MYTHIC: "linear-gradient(135deg, #db2777 0%, #be185d 100%)",
  };

  const rewardEmoji: Record<RewardType, string> = {
    COIN: "🪙",
    XP: "⭐",
    SUPER_BADGE: "🏆",
    VIP: "👑",
    AVATAR_BORDER: "🖼️",
    STICKER: "🎀",
  };

  const rewardLabelMap: Record<RewardType, string> = {
    COIN: "Koin",
    XP: "XP",
    SUPER_BADGE: "Super Badge",
    VIP: "VIP",
    AVATAR_BORDER: "Avatar Border",
    STICKER: "Stiker",
  };

  function getTierRewardText(tier: Tier): string {
    switch (tier.reward_type) {
      case "COIN":
        return `${tier.coin_min}-${tier.coin_max} koin`;
      case "XP":
        return `${tier.xp_min}-${tier.xp_max} XP`;
      case "SUPER_BADGE":
        return tier.badge?.name || "Super Badge";
      case "AVATAR_BORDER":
        return tier.border?.title || "Avatar Border";
      case "VIP":
        return tier.vip_plan?.name || "VIP";
      case "STICKER":
        return "Stiker";
      default:
        return rewardLabelMap[tier.reward_type] || tier.reward_type;
    }
  }

  const sortedTiers = [...tiers].sort((a, b) => {
    const order: Record<TierType, number> = {
      MYTHIC: 0,
      LEGENDARY: 1,
      EPIC: 2,
      RARE: 3,
      COMMON: 4,
    };
    return order[a.tier_type] - order[b.tier_type];
  });

  const displayTiers = sortedTiers.slice(0, 6);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          position: "relative",
          overflow: "hidden",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Subtle top glow */}
        <div
          style={{
            position: "absolute",
            width: 800,
            height: 300,
            left: 200,
            top: -150,
            borderRadius: 400,
            background: "radial-gradient(ellipse, rgba(245,158,11,0.12) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        {/* Header bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "28px 48px 0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #f59e0b, #ec4899)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#f8fafc",
              }}
            >
              NanimeID Mystery Box
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 9999,
              background: "rgba(30,41,59,0.8)",
              border: "1px solid rgba(148,163,184,0.2)",
            }}
          >
            <span style={{ fontSize: 16 }}>🪙</span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#fbbf24",
              }}
            >
              {costCoins} koin / spin
            </span>
          </div>
        </div>

        {/* Title section */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "20px 48px 0",
          }}
        >
          <h1
            style={{
              fontSize: 52,
              fontWeight: 900,
              color: "#ffffff",
              textAlign: "center",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 20,
              color: "#94a3b8",
              textAlign: "center",
              margin: "10px 0 0",
              maxWidth: 900,
            }}
          >
            {subtitle}
          </p>
        </div>

        {/* Reward tiers grid */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 14,
            padding: "24px 48px 0",
          }}
        >
          {displayTiers.length > 0 ? (
            displayTiers.map((tier) => {
              const color = tierColors[tier.tier_type] || "#94a3b8";
              return (
                <div
                  key={tier.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: 168,
                    borderRadius: 16,
                    border: `1px solid ${color}40`,
                    background: tierBg[tier.tier_type] || "rgba(30,41,59,0.8)",
                    boxShadow: `0 8px 24px -8px ${color}30`,
                    overflow: "hidden",
                  }}
                >
                  {/* Tier badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "6px 0",
                      background: "rgba(0,0,0,0.2)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: 1.5,
                        color: "#ffffff",
                      }}
                    >
                      {tier.tier_type}
                    </span>
                  </div>
                  {/* Icon + reward */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "14px 10px",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.15)",
                        fontSize: 26,
                      }}
                    >
                      {rewardEmoji[tier.reward_type] || "🎁"}
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#ffffff",
                        textAlign: "center",
                      }}
                    >
                      {getTierRewardText(tier)}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      {rewardLabelMap[tier.reward_type] || tier.reward_type}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            // Fallback if API not available
            [0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: 168,
                  borderRadius: 16,
                  border: "1px solid rgba(148,163,184,0.15)",
                  background: "rgba(30,41,59,0.8)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "6px 0",
                    background: "rgba(0,0,0,0.2)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 1.5,
                      color: "#94a3b8",
                    }}
                  >
                    {["COMMON", "RARE", "EPIC", "LEGENDARY"][i]}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "14px 10px",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.1)",
                      fontSize: 26,
                    }}
                  >
                    {["🪙", "👑", "🖼️", "🏆"][i]}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#e2e8f0",
                    }}
                  >
                    {["10-50 koin", "VIP 1-5 hari", "Avatar Border", "Super Badge"][i]}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 56,
            background: "rgba(15,23,42,0.8)",
            borderTop: "1px solid rgba(148,163,184,0.1)",
          }}
        >
          <span style={{ fontSize: 14, color: "#64748b" }}>
            Buka kotak dan menangkan hadiah epik!
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
