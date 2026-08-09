import test from "node:test";
import assert from "node:assert/strict";
import {
  gearEmoji,
  isKnownGearEmoji,
  normalizeGearItems,
  GEAR_FALLBACK,
} from "../lib/gear.js";

test("reconnaît un équipement au singulier comme au pluriel", () => {
  assert.equal(gearEmoji("sacoche"), "👜");
  assert.equal(gearEmoji("4 sacoches"), "👜");
});

test("ignore la casse et les accents", () => {
  assert.equal(gearEmoji("VÉLO"), gearEmoji("velo"));
  assert.equal(gearEmoji("Réchaud"), "🔥");
});

test("le mot le plus à gauche l'emporte", () => {
  // La règle des sacoches passe avant celle du vélo, comme le documente lib/gear.js
  assert.equal(gearEmoji("4 sacoches / fontes / vélo d'adulte"), "👜");
  assert.equal(gearEmoji("vélo avec sacoches"), "🚲");
});

test("un libellé inconnu reçoit le repli", () => {
  assert.equal(gearEmoji("chose indéfinissable"), GEAR_FALLBACK);
  assert.equal(gearEmoji(""), GEAR_FALLBACK);
});

test("isKnownGearEmoji n'accepte que la palette", () => {
  assert.equal(isKnownGearEmoji("👜"), true);
  assert.equal(isKnownGearEmoji("💣"), false);
  assert.equal(isKnownGearEmoji(""), false);
});

test("normalizeGearItems accepte une liste de chaînes", () => {
  assert.deepEqual(normalizeGearItems(["Tente", "  "]), [{ emoji: "⛺", label: "Tente" }]);
});

test("normalizeGearItems garde un pictogramme choisi à la main", () => {
  const items = normalizeGearItems([{ label: "Tente", emoji: "🔒" }]);
  assert.deepEqual(items, [{ emoji: "🔒", label: "Tente" }]);
});

test("normalizeGearItems déduit le pictogramme quand il manque", () => {
  const items = normalizeGearItems([{ label: "Tente", emoji: "" }]);
  assert.deepEqual(items, [{ emoji: "⛺", label: "Tente" }]);
});

test("normalizeGearItems renvoie null plutôt qu'une liste vide", () => {
  // Règle 5 du projet : un champ facultatif non renseigné n'affiche rien
  assert.equal(normalizeGearItems([]), null);
  assert.equal(normalizeGearItems(["", "   "]), null);
  assert.equal(normalizeGearItems(null), null);
  assert.equal(normalizeGearItems("pas un tableau"), null);
});

test("normalizeGearItems s'arrête à vingt éléments", () => {
  const items = normalizeGearItems(Array.from({ length: 30 }, (_, i) => `objet ${i}`));
  assert.equal(items.length, 20);
});
