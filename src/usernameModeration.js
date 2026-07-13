const blockedParts = [
  "vittu", "perkele", "saatana", "helvetti", "paska", "paskiainen",
  "kusipaa", "kyrpa", "mulkku", "huora", "lutka", "neekeri", "nekru",
  "ryssa", "hintti", "natsi", "nazi", "hitler", "whitepower", "retard",
  "admin", "administrator", "yllapito", "moderaattori", "kadonneetoulu",
  "poliisi",
];

export function normalizeUsername(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[013457@$!]/g, (character) => ({
      0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t",
      "@": "a", "$": "s", "!": "i",
    })[character])
    .replace(/[^a-z0-9]/g, "");
}

export function validateUsername(value) {
  const username = value.trim();
  if (username.length < 3 || username.length > 30)
    return "Käyttäjänimessä pitää olla 3–30 merkkiä.";
  if (!/^[\p{L}\p{N}_-]+$/u.test(username))
    return "Käyttäjänimessä voi käyttää vain kirjaimia, numeroita, alaviivaa ja yhdysmerkkiä.";
  const normalized = normalizeUsername(username);
  if (blockedParts.some((part) => normalized.includes(part)))
    return "Käyttäjänimi ei ole sallittu. Valitse asiallinen käyttäjänimi.";
  return "";
}
