import { useState, useEffect } from "react";

// FREE tier limits
const FREE_DAILY_LIMIT = 3;
const FREE_MAX_NAMES = 6;
const PREMIUM_ANIMALS = ["🐠", "🐴"];

const ANIMALS = [
  { emoji: "🐰", label: "Rabbits" },
  { emoji: "🐱", label: "Cats" },
  { emoji: "🐶", label: "Dogs" },
  { emoji: "🐹", label: "Hamsters" },
  { emoji: "🐦", label: "Birds" },
  { emoji: "🐢", label: "Reptiles" },
  { emoji: "🐄", label: "Farm Animals" },
  { emoji: "✨", label: "Other / People" },
  { emoji: "🐠", label: "Fish", premium: true },
  { emoji: "🐴", label: "Horses", premium: true },
];

const GENDER_OPTIONS = [
  { value: "any", label: "Any / Mixed" },
  { value: "female", label: "Girls / Female" },
  { value: "male", label: "Boys / Male" },
];

const THEME_SUGGESTIONS = [
  "Harry Potter characters", "Greek gods & goddesses", "Flowers & plants",
  "Famous musicians", "Shakespeare characters", "Spices & herbs",
  "Constellations & stars", "Classic movies", "Gemstones",
  "Norse mythology", "Famous artists", "Types of tea",
  "Candy & sweets", "Ancient rulers", "Weather phenomena",
];

const FREE_COUNT_OPTIONS = [2, 3, 4, 5, 6];
const ALL_COUNT_OPTIONS = [2, 3, 4, 5, 6, 8, 10, 12];

function getTodayKey() {
  return new Date().toDateString();
}

function getUsageCount() {
  try {
    const stored = JSON.parse(sessionStorage.getItem("namenest_usage") || "{}");
    return stored[getTodayKey()] || 0;
  } catch { return 0; }
}

function incrementUsage() {
  try {
    const stored = JSON.parse(sessionStorage.getItem("namenest_usage") || "{}");
    stored[getTodayKey()] = (stored[getTodayKey()] || 0) + 1;
    sessionStorage.setItem("namenest_usage", JSON.stringify(stored));
  } catch {}
}

function parseNames(text) {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const results = [];
  for (const line of lines) {
    const match = line.match(/^[\d\-\*\•]+\.?\s*\*?\*?([^:*\n]+)\*?\*?(?:[:\-–](.*))?$/);
    if (match) {
      const name = match[1].trim().replace(/\*+/g, "");
      const meaning = match[2] ? match[2].trim().replace(/\*+/g, "") : "";
      if (name) results.push({ name, meaning });
    }
  }
  return results;
}

function NameCard({ name, meaning, index, saved, onSave }) {
  return (
    <div className="name-card" style={{
      ...styles.nameCard,
      animationDelay: `${index * 0.07}s`,
      background: saved ? "rgba(139,195,139,0.12)" : styles.nameCard.background,
      borderColor: saved ? "rgba(139,195,139,0.5)" : styles.nameCard.borderColor,
    }}>
      <div style={styles.nameCardTop}>
        <span style={styles.nameCardName}>{name}</span>
        <button
          className="save-btn"
          style={{ ...styles.saveBtn, ...(saved ? styles.saveBtnSaved : {}) }}
          onClick={() => onSave(name, meaning)}
          title={saved ? "Saved!" : "Save this name"}
        >
          {saved ? "♥" : "♡"}
        </button>
      </div>
      {meaning && <p style={styles.nameCardMeaning}>{meaning}</p>}
    </div>
  );
}

function UpgradeModal({ reason, onClose }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalEmoji}>⭐</div>
        <h2 style={styles.modalTitle}>Unlock NameNest Plus</h2>
        <p style={styles.modalReason}>{reason}</p>
        <ul style={styles.modalFeatures}>
          <li style={styles.modalFeatureItem}>✓ Unlimited daily generations</li>
          <li style={styles.modalFeatureItem}>✓ Up to 12 names per batch</li>
          <li style={styles.modalFeatureItem}>✓ All animal categories (Horses & Fish!)</li>
          <li style={styles.modalFeatureItem}>✓ Save favorites across sessions</li>
          <li style={styles.modalFeatureItem}>✓ Printable litter keepsake cards <span style={styles.comingSoon}>soon</span></li>
          <li style={styles.modalFeatureItem}>✓ Litter history & manager <span style={styles.comingSoon}>soon</span></li>
        </ul>
        <div style={styles.modalPricing}>
          <div style={styles.pricingOption}>
            <span style={styles.pricingAmount}>$3</span>
            <span style={styles.pricingPer}>/month</span>
          </div>
          <span style={styles.pricingOr}>or</span>
          <div style={styles.pricingOption}>
            <span style={styles.pricingAmount}>$15</span>
            <span style={styles.pricingPer}>one-time</span>
          </div>
        </div>
        <button style={styles.upgradeBtn}>🚀 Coming Soon — Join Waitlist</button>
        <button style={styles.modalClose} onClick={onClose}>Maybe later</button>
      </div>
    </div>
  );
}

export default function NameGenerator() {
  const [animal, setAnimal] = useState("🐰");
  const [animalLabel, setAnimalLabel] = useState("Rabbits");
  const [gender, setGender] = useState("any");
  const [count, setCount] = useState(6);
  const [theme, setTheme] = useState("");
  const [customAnimal, setCustomAnimal] = useState("");
  const [names, setNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedNames, setSavedNames] = useState([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [usageCount, setUsageCount] = useState(getUsageCount());
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

  const isLimitReached = usageCount >= FREE_DAILY_LIMIT;
  const remainingGenerations = Math.max(0, FREE_DAILY_LIMIT - usageCount);
  const selectedAnimal = animal === "✨" ? (customAnimal || "pets/people") : animalLabel;
  const genderText = gender === "any" ? "" : gender === "female" ? "female" : "male";

  function triggerUpgrade(reason) {
    setUpgradeReason(reason);
    setShowUpgrade(true);
  }

  async function generateNames() {
    if (!theme.trim()) return;
    if (isLimitReached) {
      triggerUpgrade("You've used your 3 free generations for today. Upgrade for unlimited access!");
      return;
    }

    setLoading(true);
    setError("");
    setNames([]);

    const actualCount = Math.min(count, FREE_MAX_NAMES);
    const prompt = `Generate exactly ${actualCount} creative, fun ${genderText} names for ${selectedAnimal} with the theme: "${theme}".

For each name, provide a brief, charming explanation of why it fits (1 sentence max).

Respond ONLY with a JSON array. No preamble, no markdown, no backticks. Just raw JSON like:
[
  {"name": "Luna", "meaning": "Named after the moon goddess, perfect for a mysterious midnight-colored rabbit"},
  {"name": "Orion", "meaning": "The great hunter constellation — bold and adventurous"}
]

Make the names creative and fitting for ${selectedAnimal}. Keep meanings fun and brief.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content.map(b => b.text || "").join("");
      const parsed = parseNames(text);
      if (parsed.length === 0) throw new Error("Couldn't parse names. Try again!");
      setNames(parsed);
      setHasGenerated(true);
      incrementUsage();
      setUsageCount(getUsageCount());
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  function toggleSave(name, meaning) {
    setSavedNames(prev =>
      prev.find(n => n.name === name)
        ? prev.filter(n => n.name !== name)
        : [...prev, { name, meaning }]
    );
  }

  function isSaved(name) {
    return savedNames.some(n => n.name === name);
  }

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,700;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        input::placeholder { color: #b5c5b5; }
        input:focus { outline: none; border-color: #5a9e6f !important; box-shadow: 0 0 0 3px rgba(90,158,111,0.15); }
        .theme-chip:hover { background: rgba(90,158,111,0.2) !important; border-color: rgba(90,158,111,0.5) !important; transform: scale(1.04); }
        .animal-btn:hover { transform: scale(1.06); }
        .generate-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(90,158,111,0.45) !important; }
        .name-card { animation: fadeUp 0.4s ease both; transition: all 0.2s; }
        .name-card:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important; }
        .save-btn:hover { transform: scale(1.2); }
        .upgrade-btn:hover { transform: translateY(-1px); }
      `}</style>

      {showUpgrade && <UpgradeModal reason={upgradeReason} onClose={() => setShowUpgrade(false)} />}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logoRow}>
            <span style={styles.logoEmoji}>🏷️</span>
            <div>
              <h1 style={styles.logoTitle}>NameNest</h1>
              <p style={styles.logoSub}>Themed name ideas for your critters & crew</p>
            </div>
            <div style={styles.usageBadge}>
              <span style={styles.usageCount}>{remainingGenerations}</span>
              <span style={styles.usageLabel}>free today</span>
            </div>
          </div>
        </div>
      </div>

      {isLimitReached && (
        <div style={styles.limitBanner}>
          <span>🌟 You've used your 3 free generations today!</span>
          <button style={styles.limitBannerBtn} onClick={() => triggerUpgrade("Upgrade for unlimited daily generations and all premium features!")}>
            Unlock Unlimited →
          </button>
        </div>
      )}

      <div style={styles.main}>
        <div style={styles.card}>

          {/* Animal selector */}
          <div style={styles.section}>
            <label style={styles.sectionLabel}>What are you naming?</label>
            <div style={styles.animalGrid}>
              {ANIMALS.map(a => (
                <button
                  key={a.emoji + a.label}
                  className="animal-btn"
                  style={{
                    ...styles.animalBtn,
                    ...(animal === a.emoji && !a.premium ? styles.animalBtnActive : {}),
                    ...(a.premium ? styles.animalBtnPremium : {}),
                  }}
                  onClick={() => {
                    if (a.premium) {
                      triggerUpgrade(`${a.label} names are a Plus feature. Upgrade to unlock all animal categories!`);
                      return;
                    }
                    setAnimal(a.emoji);
                    setAnimalLabel(a.label);
                  }}
                >
                  <span style={styles.animalEmoji}>{a.emoji}</span>
                  <span style={styles.animalLabel}>{a.label}</span>
                  {a.premium && <span style={styles.premiumLock}>⭐</span>}
                </button>
              ))}
            </div>
            {animal === "✨" && (
              <input
                style={styles.input}
                placeholder="Describe what you're naming (e.g. baby goats, a new puppy litter...)"
                value={customAnimal}
                onChange={e => setCustomAnimal(e.target.value)}
              />
            )}
          </div>

          {/* Gender + Count */}
          <div style={styles.twoCol}>
            <div style={styles.section}>
              <label style={styles.sectionLabel}>Gender</label>
              <div style={styles.pillRow}>
                {GENDER_OPTIONS.map(g => (
                  <button key={g.value}
                    style={{ ...styles.pill, ...(gender === g.value ? styles.pillActive : {}) }}
                    onClick={() => setGender(g.value)}
                  >{g.label}</button>
                ))}
              </div>
            </div>
            <div style={styles.section}>
              <label style={styles.sectionLabel}>
                How many? <span style={styles.freeNote}>(free: up to 6)</span>
              </label>
              <div style={styles.countGrid}>
                {ALL_COUNT_OPTIONS.map(n => {
                  const isPremiumCount = n > FREE_MAX_NAMES;
                  return (
                    <button key={n}
                      style={{
                        ...styles.countBtn,
                        ...(count === n && !isPremiumCount ? styles.countBtnActive : {}),
                        ...(isPremiumCount ? styles.countBtnPremium : {}),
                      }}
                      onClick={() => {
                        if (isPremiumCount) {
                          triggerUpgrade("Generate up to 12 names at once with NameNest Plus!");
                          return;
                        }
                        setCount(n);
                      }}
                    >
                      {isPremiumCount ? `${n}⭐` : n}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Theme */}
          <div style={styles.section}>
            <label style={styles.sectionLabel}>Theme or Inspiration</label>
            <input
              style={styles.input}
              placeholder="e.g. Greek mythology, spices, Harry Potter characters..."
              value={theme}
              onChange={e => setTheme(e.target.value)}
              onKeyDown={e => e.key === "Enter" && theme.trim() && generateNames()}
            />
            <div style={styles.chipsRow}>
              {THEME_SUGGESTIONS.sort(() => Math.random() - 0.5).slice(0, 8).map(t => (
                <button key={t} className="theme-chip" style={styles.themeChip} onClick={() => setTheme(t)}>{t}</button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            className="generate-btn"
            style={{
              ...styles.generateBtn,
              ...(!theme.trim() || loading ? styles.generateBtnDisabled : {}),
              ...(isLimitReached ? styles.generateBtnLimit : {}),
            }}
            onClick={generateNames}
            disabled={!theme.trim() || loading}
          >
            {loading ? (
              <span style={styles.loadingInner}>
                <span style={styles.spinner} />
                Dreaming up names…
              </span>
            ) : isLimitReached
              ? "⭐ Unlock Unlimited Generations"
              : `✨ Generate ${Math.min(count, FREE_MAX_NAMES)} Names  (${remainingGenerations} free left today)`
            }
          </button>
        </div>

        {error && <div style={styles.errorBox}>⚠️ {error}</div>}

        {/* Results */}
        {names.length > 0 && (
          <div style={styles.resultsSection}>
            <div style={styles.resultsHeader}>
              <div>
                <h2 style={styles.resultsTitle}>
                  {names.length} {genderText || ""} names for your {selectedAnimal}
                </h2>
                <p style={styles.resultsTheme}>Theme: <em>{theme}</em></p>
              </div>
              <button
                className="generate-btn"
                style={{ ...styles.regenBtn, ...(isLimitReached ? styles.regenBtnLocked : {}) }}
                onClick={generateNames}
                disabled={loading}
              >
                {isLimitReached ? "⭐ Upgrade" : "🔄 New Batch"}
              </button>
            </div>
            <div style={styles.namesGrid}>
              {names.map((n, i) => (
                <NameCard key={`${n.name}-${i}`} name={n.name} meaning={n.meaning} index={i} saved={isSaved(n.name)} onSave={toggleSave} />
              ))}
            </div>
          </div>
        )}

        {/* Saved names */}
        {savedNames.length > 0 && (
          <div style={styles.savedSection}>
            <div style={styles.savedHeader}>
              <h3 style={styles.savedTitle}>♥ Saved Names ({savedNames.length})</h3>
              <button style={styles.clearBtn} onClick={() => setSavedNames([])}>Clear all</button>
            </div>
            <div style={styles.savedList}>
              {savedNames.map((n, i) => (
                <div key={i} style={styles.savedChip}>
                  <span style={styles.savedChipName}>{n.name}</span>
                  <button style={styles.savedRemove} onClick={() => toggleSave(n.name, n.meaning)}>×</button>
                </div>
              ))}
            </div>
            <div style={styles.savedActions}>
              <button style={styles.copyBtn} onClick={() => navigator.clipboard?.writeText(savedNames.map(n => n.name).join(", "))}>
                📋 Copy all names
              </button>
              <button style={styles.upgradeNudge} onClick={() => triggerUpgrade("Save your favorites permanently with NameNest Plus!")}>
                ⭐ Save permanently with Plus
              </button>
            </div>
          </div>
        )}

        {/* Plus teaser bar */}
        <div style={styles.teaserCard}>
          <div style={styles.teaserLeft}>
            <span style={styles.teaserStar}>⭐</span>
            <div>
              <div style={styles.teaserTitle}>NameNest Plus — Coming Soon</div>
              <div style={styles.teaserDesc}>Unlimited generations · Horses & Fish · Up to 12 names · Printable litter cards</div>
            </div>
          </div>
          <button className="upgrade-btn" style={styles.teaserBtn} onClick={() => triggerUpgrade("Join the waitlist for NameNest Plus!")}>
            Join Waitlist
          </button>
        </div>

        {!hasGenerated && !loading && (
          <div style={styles.emptyState}>
            <span style={{ fontSize: 52, display: "block", marginBottom: 10, animation: "bounce 2s ease infinite" }}>🐰</span>
            <p style={styles.emptyText}>Pick a theme and generate your first batch of names!</p>
            <p style={styles.emptySubtext}>3 free generations per day — no account needed</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "linear-gradient(160deg,#f0f7f0 0%,#e8f4ea 50%,#f5f0e8 100%)", fontFamily: "'Nunito',sans-serif", color: "#2d4a2d" },
  header: { background: "linear-gradient(135deg,#3d7a52,#5a9e6f)", boxShadow: "0 4px 20px rgba(61,122,82,0.3)" },
  headerInner: { maxWidth: 720, margin: "0 auto", padding: "18px 20px" },
  logoRow: { display: "flex", alignItems: "center", gap: 14 },
  logoEmoji: { fontSize: 34 },
  logoTitle: { fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1.1 },
  logoSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2, fontWeight: 400 },
  usageBadge: { marginLeft: "auto", background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "6px 12px", textAlign: "center", border: "1px solid rgba(255,255,255,0.2)", minWidth: 64 },
  usageCount: { display: "block", fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1 },
  usageLabel: { display: "block", fontSize: 9, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.08em" },
  limitBanner: { background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#fff", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, fontSize: 13, fontWeight: 700, flexWrap: "wrap" },
  limitBannerBtn: { background: "rgba(255,255,255,0.25)", border: "2px solid rgba(255,255,255,0.5)", borderRadius: 20, padding: "4px 14px", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "'Nunito',sans-serif", fontWeight: 800 },
  main: { maxWidth: 720, margin: "0 auto", padding: "20px 16px 48px", display: "flex", flexDirection: "column", gap: 16 },
  card: { background: "#fff", borderRadius: 20, padding: "24px 20px", boxShadow: "0 4px 24px rgba(61,122,82,0.1)", display: "flex", flexDirection: "column", gap: 22 },
  section: { display: "flex", flexDirection: "column", gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3d7a52" },
  freeNote: { fontSize: 10, fontWeight: 600, color: "#bbb", textTransform: "none", letterSpacing: 0 },
  animalGrid: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 7 },
  animalBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "9px 4px", background: "#f5faf5", border: "2px solid transparent", borderRadius: 12, cursor: "pointer", transition: "all 0.18s", fontFamily: "'Nunito',sans-serif", position: "relative" },
  animalBtnActive: { background: "rgba(90,158,111,0.12)", border: "2px solid #5a9e6f" },
  animalBtnPremium: { background: "#fffbf0", border: "2px solid rgba(245,158,11,0.3)", opacity: 0.85 },
  animalEmoji: { fontSize: 20 },
  animalLabel: { fontSize: 9, fontWeight: 700, color: "#4a7a55", textAlign: "center", lineHeight: 1.2 },
  premiumLock: { position: "absolute", top: 3, right: 3, fontSize: 9 },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  pillRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  pill: { padding: "6px 11px", borderRadius: 20, border: "2px solid #dde8dd", background: "#f5faf5", color: "#4a7a55", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", fontFamily: "'Nunito',sans-serif" },
  pillActive: { background: "rgba(90,158,111,0.15)", border: "2px solid #5a9e6f", color: "#3d7a52" },
  countGrid: { display: "flex", gap: 5, flexWrap: "wrap" },
  countBtn: { width: 34, height: 34, borderRadius: 9, border: "2px solid #dde8dd", background: "#f5faf5", color: "#4a7a55", fontSize: 11, fontWeight: 800, cursor: "pointer", transition: "all 0.15s", fontFamily: "'Nunito',sans-serif" },
  countBtnActive: { background: "rgba(90,158,111,0.15)", border: "2px solid #5a9e6f", color: "#3d7a52" },
  countBtnPremium: { background: "#fffbf0", border: "2px solid rgba(245,158,11,0.25)", color: "#b08030", fontSize: 9 },
  input: { width: "100%", padding: "11px 14px", borderRadius: 12, border: "2px solid #dde8dd", background: "#f9fcf9", color: "#2d4a2d", fontSize: 14, fontFamily: "'Nunito',sans-serif", fontWeight: 600, transition: "all 0.2s" },
  chipsRow: { display: "flex", flexWrap: "wrap", gap: 6 },
  themeChip: { padding: "5px 10px", borderRadius: 16, border: "1.5px solid rgba(90,158,111,0.25)", background: "rgba(90,158,111,0.07)", color: "#4a7a55", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", fontFamily: "'Nunito',sans-serif" },
  generateBtn: { width: "100%", padding: "14px 24px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#3d7a52,#5a9e6f)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", transition: "all 0.22s", boxShadow: "0 6px 24px rgba(90,158,111,0.35)", fontFamily: "'Nunito',sans-serif" },
  generateBtnDisabled: { opacity: 0.5, cursor: "not-allowed", boxShadow: "none" },
  generateBtnLimit: { background: "linear-gradient(135deg,#f59e0b,#f97316)", boxShadow: "0 6px 24px rgba(245,158,11,0.35)" },
  loadingInner: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10 },
  spinner: { width: 17, height: 17, border: "3px solid rgba(255,255,255,0.3)", borderTop: "3px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" },
  errorBox: { background: "#fff5f5", border: "2px solid #ffcccc", borderRadius: 12, padding: "12px 16px", color: "#c0392b", fontSize: 13, fontWeight: 600 },
  resultsSection: { background: "#fff", borderRadius: 20, padding: "22px 20px", boxShadow: "0 4px 24px rgba(61,122,82,0.1)" },
  resultsHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 12 },
  resultsTitle: { fontFamily: "'Playfair Display',serif", fontSize: 19, fontWeight: 700, color: "#2d4a2d", lineHeight: 1.3, textTransform: "capitalize" },
  resultsTheme: { fontSize: 12, color: "#7a9e7a", marginTop: 4, fontWeight: 600 },
  regenBtn: { width: "auto", padding: "8px 14px", fontSize: 12, borderRadius: 10, boxShadow: "0 3px 12px rgba(90,158,111,0.3)", whiteSpace: "nowrap", flexShrink: 0 },
  regenBtnLocked: { background: "linear-gradient(135deg,#f59e0b,#f97316)", boxShadow: "0 3px 12px rgba(245,158,11,0.3)" },
  namesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 10 },
  nameCard: { background: "#f5faf5", border: "2px solid #e0eee0", borderRadius: 14, padding: "12px 14px", cursor: "default" },
  nameCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  nameCardName: { fontFamily: "'Playfair Display',serif", fontSize: 19, fontWeight: 700, color: "#2d4a2d" },
  saveBtn: { background: "transparent", border: "none", fontSize: 19, cursor: "pointer", color: "#ccc", transition: "all 0.15s", padding: "2px", lineHeight: 1 },
  saveBtnSaved: { color: "#e05c7a" },
  nameCardMeaning: { fontSize: 11, color: "#6a9a7a", lineHeight: 1.5, fontWeight: 600 },
  savedSection: { background: "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 4px 24px rgba(61,122,82,0.1)" },
  savedHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  savedTitle: { fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: "#2d4a2d" },
  clearBtn: { background: "transparent", border: "none", color: "#aaa", fontSize: 11, cursor: "pointer", fontFamily: "'Nunito',sans-serif", fontWeight: 700, textDecoration: "underline" },
  savedList: { display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 },
  savedChip: { display: "flex", alignItems: "center", gap: 5, background: "rgba(224,92,122,0.1)", border: "1.5px solid rgba(224,92,122,0.3)", borderRadius: 20, padding: "4px 10px 4px 12px" },
  savedChipName: { fontSize: 13, fontWeight: 800, color: "#c04060", fontFamily: "'Playfair Display',serif" },
  savedRemove: { background: "transparent", border: "none", color: "#c04060", fontSize: 15, cursor: "pointer", lineHeight: 1, padding: 0, fontWeight: 700 },
  savedActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  copyBtn: { background: "transparent", border: "2px solid #dde8dd", borderRadius: 10, padding: "7px 14px", color: "#4a7a55", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito',sans-serif" },
  upgradeNudge: { background: "transparent", border: "2px solid rgba(245,158,11,0.3)", borderRadius: 10, padding: "7px 14px", color: "#b08030", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito',sans-serif" },
  teaserCard: { background: "linear-gradient(135deg,#fffbf0,#fff8e8)", border: "2px solid rgba(245,158,11,0.25)", borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  teaserLeft: { display: "flex", alignItems: "center", gap: 10 },
  teaserStar: { fontSize: 24 },
  teaserTitle: { fontSize: 14, fontWeight: 800, color: "#7a5500" },
  teaserDesc: { fontSize: 11, color: "#a07030", marginTop: 2, fontWeight: 600 },
  teaserBtn: { background: "linear-gradient(135deg,#f59e0b,#f97316)", border: "none", borderRadius: 10, padding: "9px 18px", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito',sans-serif", whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(245,158,11,0.35)", transition: "all 0.2s" },
  emptyState: { textAlign: "center", padding: "32px 20px", color: "#8ab88a" },
  emptyText: { fontSize: 15, fontWeight: 700, color: "#6a9a6a", marginBottom: 6 },
  emptySubtext: { fontSize: 12, color: "#9ab89a", fontWeight: 600 },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16, animation: "fadeIn 0.2s ease" },
  modal: { background: "#fff", borderRadius: 24, padding: "32px 28px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" },
  modalEmoji: { fontSize: 40, marginBottom: 10 },
  modalTitle: { fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: "#2d4a2d", marginBottom: 8 },
  modalReason: { fontSize: 14, color: "#7a9e7a", marginBottom: 20, fontWeight: 600, lineHeight: 1.5 },
  modalFeatures: { listStyle: "none", textAlign: "left", marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 },
  modalFeatureItem: { fontSize: 13, color: "#2d4a2d", fontWeight: 600, padding: "4px 0" },
  modalPricing: { display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 20, padding: "14px", background: "#f5faf5", borderRadius: 14 },
  pricingOption: { textAlign: "center" },
  pricingAmount: { fontSize: 30, fontWeight: 800, color: "#3d7a52", fontFamily: "'Playfair Display',serif", display: "block" },
  pricingPer: { fontSize: 12, color: "#7a9e7a", fontWeight: 600 },
  pricingOr: { fontSize: 12, color: "#aaa", fontWeight: 600 },
  upgradeBtn: { width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#3d7a52,#5a9e6f)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito',sans-serif", marginBottom: 10, boxShadow: "0 6px 20px rgba(90,158,111,0.35)" },
  modalClose: { background: "transparent", border: "none", color: "#aaa", fontSize: 13, cursor: "pointer", fontFamily: "'Nunito',sans-serif", fontWeight: 600, textDecoration: "underline" },
  comingSoon: { fontSize: 9, background: "#f0f7f0", border: "1px solid #c0d8c0", borderRadius: 6, padding: "1px 5px", color: "#5a9e6f", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", marginLeft: 4 },
};
