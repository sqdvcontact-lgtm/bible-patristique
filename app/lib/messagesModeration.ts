// ── Ce que la modération écrit à l'auteur d'un commentaire ou d'un signalement ──
//
// ⛔ UNE seule copie. La notification reconnaît une certification non retenue en
// comparant `message_admin` à la phrase même que l'action d'administration écrit. Elle
// devinait auparavant à partir de trois booléens, et toute validation ordinaire, qui
// laisse `certifie` à faux, s'annonçait « Certification refusée » (audit du 2026-09-11).
// ⚠️ Changer une phrase ici ne change pas les messages déjà écrits en base.

export const MESSAGE_COMMENTAIRE_VALIDE = 'Votre commentaire a été validé par la modération.'

export const MESSAGE_COMMENTAIRE_CERTIFIE = 'Votre commentaire a été validé et certifié par la modération.'

export const MESSAGE_CERTIFICATION_NON_RETENUE =
  'Votre commentaire a été validé par la modération, mais la demande de certification n’a pas été retenue.'

export const MESSAGE_SIGNALEMENT_TRAITE =
  'Merci pour votre signalement. Il a été transmis à la modération et marqué comme traité.'
